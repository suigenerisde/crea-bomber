'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { useSocket, useDevices, useSoundNotification, useAuth } from '@/hooks';
import { DeviceList, DeviceDetailModal } from '@/components/devices';
import { Button, PageTransition, DeviceListSkeleton } from '@/components/ui';
import { useToast } from '@/contexts';
import type { Device } from '@/types';

type FilterTab = 'all' | 'online' | 'offline';

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'online', label: 'Online Only' },
  { value: 'offline', label: 'Offline Only' },
];

export default function DevicesPage() {
  const toast = useToast();
  const { playSuccess, playError } = useSoundNotification();
  const { socket, status: socketStatus, isConnected } = useSocket();
  const { devices, loading, error, refresh, onlineCount, offlineCount } = useDevices({
    socket,
  });
  const { canManage } = useAuth();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const wasConnectedRef = useRef(true);

  // Show warning toast when connection is lost
  useEffect(() => {
    if (wasConnectedRef.current && !isConnected && socketStatus === 'disconnected') {
      toast.warning('Connection lost. Real-time updates paused.');
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected, socketStatus, toast]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  // Handle device removal
  const handleRemoveDevice = useCallback(
    async (deviceId: string) => {
      try {
        const response = await fetch(`/api/devices/${deviceId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to remove device');
        }

        toast.success('Device removed successfully');
        playSuccess();
        // Refresh the device list
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove device';
        toast.error(message);
        playError();
        throw err;
      }
    },
    [refresh, toast, playSuccess, playError]
  );

  // Get count for each filter tab
  const getTabCount = (filter: FilterTab): number => {
    switch (filter) {
      case 'all':
        return devices.length;
      case 'online':
        return onlineCount;
      case 'offline':
        return offlineCount;
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Devices</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage and monitor connected devices
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              <span
                className={clsx(
                  'w-2 h-2 rounded-full transition-colors',
                  socketStatus === 'connected'
                    ? 'bg-green-500'
                    : socketStatus === 'connecting' || socketStatus === 'reconnecting'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                )}
              />
              <span className="text-slate-400 capitalize hidden sm:inline">
                {socketStatus}
              </span>
            </div>
            {/* Refresh Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              loading={isRefreshing}
              iconLeft={
                <svg
                  className={clsx('w-4 h-4 transition-transform', isRefreshing && 'animate-spin')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              }
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit border border-slate-700">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
                activeFilter === tab.value
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              )}
            >
              {tab.label}
              <span
                className={clsx(
                  'ml-2 px-1.5 py-0.5 text-xs rounded-full transition-colors',
                  activeFilter === tab.value
                    ? 'bg-slate-600 text-slate-200'
                    : 'bg-slate-700 text-slate-400'
                )}
              >
                {getTabCount(tab.value)}
              </span>
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 animate-fade-in">
            <p className="text-red-400 text-sm">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-red-400"
              onClick={handleRefresh}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <DeviceListSkeleton count={6} />
        ) : (
          <div className="animate-fade-in">
            <DeviceList
              devices={devices}
              activeFilter={activeFilter}
              onDeviceClick={setSelectedDevice}
            />
          </div>
        )}

        {/* Device Detail Modal */}
        {selectedDevice && (
          <DeviceDetailModal
            device={selectedDevice}
            isOpen={!!selectedDevice}
            onClose={() => setSelectedDevice(null)}
            onRemove={canManage ? handleRemoveDevice : undefined}
          />
        )}
      </div>
    </PageTransition>
  );
}
