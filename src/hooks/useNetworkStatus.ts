/**
 * CreaBomber - useNetworkStatus Hook
 * Network connectivity monitoring and offline detection
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type NetworkStatus = 'online' | 'offline' | 'slow';

interface UseNetworkStatusOptions {
  // Ping endpoint to check connectivity (optional)
  pingUrl?: string;
  // Interval for connectivity checks in ms (default: 30000)
  checkInterval?: number;
  // Threshold for slow network detection in ms (default: 3000)
  slowThreshold?: number;
  // Enable periodic connectivity checks
  enablePeriodicCheck?: boolean;
}

interface UseNetworkStatusReturn {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  isSlow: boolean;
  lastChecked: Date | null;
  checkNow: () => Promise<NetworkStatus>;
}

export function useNetworkStatus(
  options: UseNetworkStatusOptions = {}
): UseNetworkStatusReturn {
  const {
    pingUrl = '/api/devices', // Use existing endpoint as ping
    checkInterval = 30000,
    slowThreshold = 3000,
    enablePeriodicCheck = false,
  } = options;

  const [status, setStatus] = useState<NetworkStatus>('online');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const checkInProgressRef = useRef(false);

  // Check connectivity by attempting a fetch
  const checkConnectivity = useCallback(async (): Promise<NetworkStatus> => {
    if (checkInProgressRef.current) {
      return status;
    }

    checkInProgressRef.current = true;

    // First check browser's online status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('offline');
      setLastChecked(new Date());
      checkInProgressRef.current = false;
      return 'offline';
    }

    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), slowThreshold * 2);

      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (!response.ok && response.status !== 404) {
        // Server error but we're connected
        setStatus('online');
        setLastChecked(new Date());
        checkInProgressRef.current = false;
        return 'online';
      }

      const newStatus: NetworkStatus =
        duration > slowThreshold ? 'slow' : 'online';
      setStatus(newStatus);
      setLastChecked(new Date());
      checkInProgressRef.current = false;
      return newStatus;
    } catch (error) {
      // Network error - determine if offline or slow
      if (error instanceof Error && error.name === 'AbortError') {
        setStatus('slow');
        setLastChecked(new Date());
        checkInProgressRef.current = false;
        return 'slow';
      }

      setStatus('offline');
      setLastChecked(new Date());
      checkInProgressRef.current = false;
      return 'offline';
    }
  }, [pingUrl, slowThreshold, status]);

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setStatus('online');
      // Verify with actual check
      checkConnectivity();
    };

    const handleOffline = () => {
      setStatus('offline');
      setLastChecked(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnectivity]);

  // Periodic connectivity check
  useEffect(() => {
    if (!enablePeriodicCheck) return;

    const intervalId = setInterval(() => {
      checkConnectivity();
    }, checkInterval);

    return () => clearInterval(intervalId);
  }, [enablePeriodicCheck, checkInterval, checkConnectivity]);

  return {
    status,
    isOnline: status === 'online',
    isOffline: status === 'offline',
    isSlow: status === 'slow',
    lastChecked,
    checkNow: checkConnectivity,
  };
}

export default useNetworkStatus;
