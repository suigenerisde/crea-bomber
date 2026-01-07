'use client';

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { useSocket, useDevices } from '@/hooks';
import { DeviceList, DeviceDetailModal } from '@/components/devices';
import { Button } from '@/components/ui/Button';
import type { Device } from '@/types';

type FilterTab = 'all' | 'online' | 'offline';

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'online', label: 'Online Only' },
  { value: 'offline', label: 'Offline Only' },
];

export default function DevicesPage() {
  const { socket, status: socketStatus } = useSocket();
  const { devices, loading, error, refresh, onlineCount, offlineCount } = useDevices({
    socket,
  });

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

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
      setRemoveError(null);
      try {
        const response = await fetch(`/api/devices/${deviceId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to remove device');
        }

        // Refresh the device list
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove device';
        setRemoveError(message);
        throw err;
      }
    },
    [refresh]
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
                'w-2 h-2 rounded-full',
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
                className={clsx('w-4 h-4', isRefreshing && 'animate-spin')}
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
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeFilter === tab.value
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            )}
          >
            {tab.label}
            <span
              className={clsx(
                'ml-2 px-1.5 py-0.5 text-xs rounded-full',
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
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
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

      {/* Remove Error */}
      {removeError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm">{removeError}</p>
          <button
            onClick={() => setRemoveError(null)}
            className="text-red-400 text-sm underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 text-slate-400">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading devices...
          </div>
        </div>
      ) : (
        <DeviceList
          devices={devices}
          activeFilter={activeFilter}
          onDeviceClick={setSelectedDevice}
        />
      )}

      {/* Device Detail Modal */}
      {selectedDevice && (
        <DeviceDetailModal
          device={selectedDevice}
          isOpen={!!selectedDevice}
          onClose={() => setSelectedDevice(null)}
          onRemove={handleRemoveDevice}
        />
      )}
    </div>
  );
}
