/**
 * CreaBomber - useSocket Hook
 * Manages Socket.io client connection with auto-reconnect logic
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface UseSocketOptions {
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface UseSocketReturn {
  socket: Socket | null;
  status: ConnectionStatus;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const DEFAULT_OPTIONS: UseSocketOptions = {
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
};

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setStatus('connecting');

    // Create socket connection - server runs on same host
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: opts.reconnectionAttempts,
      reconnectionDelay: opts.reconnectionDelay,
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
  }, [opts.reconnectionAttempts, opts.reconnectionDelay]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (opts.autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [opts.autoConnect, connect]);

  return {
    socket: socketRef.current,
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
  };
}
