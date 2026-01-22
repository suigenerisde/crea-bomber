/**
 * CreaBomber - useSocket Hook
 * Returns the shared Socket.io connection from SocketContext
 */

'use client';

import { useSocketContext, type ConnectionStatus } from '@/contexts';

export type { ConnectionStatus };

interface UseSocketReturn {
  socket: import('socket.io-client').Socket | null;
  status: ConnectionStatus;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export function useSocket(): UseSocketReturn {
  return useSocketContext();
}
