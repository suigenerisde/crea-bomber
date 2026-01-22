/**
 * CreaBomber - Socket Context
 * Provides a single shared Socket.io connection across the app
 */

'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface SocketContextValue {
  socket: Socket | null;
  status: ConnectionStatus;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export function SocketProvider({
  children,
  autoConnect = true,
  reconnectionAttempts = 5,
  reconnectionDelay = 1000,
}: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const isInitializedRef = useRef(false);

  const connect = useCallback(() => {
    // If already connected or connecting, skip
    if (socketRef.current?.connected) return;

    // If socket exists but not connected, just reconnect
    if (socketRef.current) {
      setStatus('connecting');
      socketRef.current.connect();
      return;
    }

    setStatus('connecting');

    // Create socket connection - server runs on same host
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts,
      reconnectionDelay,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setStatus('disconnected');
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      console.log('[Socket] Reconnecting, attempt:', attempt);
      setStatus('reconnecting');
    });

    socket.io.on('reconnect', () => {
      console.log('[Socket] Reconnected');
      setStatus('connected');
    });

    socket.io.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed');
      setStatus('disconnected');
    });

    socketRef.current = socket;
  }, [reconnectionAttempts, reconnectionDelay]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      setStatus('disconnected');
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [autoConnect, connect]);

  const value: SocketContextValue = {
    socket: socketRef.current,
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
