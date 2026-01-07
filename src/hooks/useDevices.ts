/**
 * CreaBomber - useDevices Hook
 * Fetches devices via API and subscribes to real-time updates
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import type { Device } from '@/types';

interface DevicesUpdatePayload {
  devices: Device[];
}

interface DevicesApiResponse {
  devices: Device[];
}

interface UseDevicesOptions {
  socket: Socket | null;
  autoFetch?: boolean;
}

interface UseDevicesReturn {
  devices: Device[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  onlineCount: number;
  offlineCount: number;
}

export function useDevices(options: UseDevicesOptions): UseDevicesReturn {
  const { socket, autoFetch = true } = options;
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Fetch devices from API
  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/devices');

      if (!response.ok) {
        throw new Error(`Failed to fetch devices: ${response.statusText}`);
      }

      const data: DevicesApiResponse = await response.json();

      if (mountedRef.current) {
        // Parse dates from JSON
        const parsedDevices = data.devices.map((d) => ({
          ...d,
          lastSeen: new Date(d.lastSeen),
          createdAt: new Date(d.createdAt),
        }));
        setDevices(parsedDevices);
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('[useDevices] Fetch error:', message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Refresh function exposed to consumers
  const refresh = useCallback(async () => {
    await fetchDevices();
  }, [fetchDevices]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;

    if (autoFetch) {
      fetchDevices();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoFetch, fetchDevices]);

  // Subscribe to real-time updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleDevicesUpdate = (payload: DevicesUpdatePayload) => {
      if (mountedRef.current) {
        // Parse dates from socket payload
        const parsedDevices = payload.devices.map((d) => ({
          ...d,
          lastSeen: new Date(d.lastSeen),
          createdAt: new Date(d.createdAt),
        }));
        setDevices(parsedDevices);
      }
    };

    socket.on('devices:update', handleDevicesUpdate);

    return () => {
      socket.off('devices:update', handleDevicesUpdate);
    };
  }, [socket]);

  // Computed properties
  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const offlineCount = devices.filter((d) => d.status === 'offline').length;

  return {
    devices,
    loading,
    error,
    refresh,
    onlineCount,
    offlineCount,
  };
}
