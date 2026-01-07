'use client';

import { clsx } from 'clsx';
import { DeviceCard } from './DeviceCard';
import type { Device } from '@/types';

type FilterTab = 'all' | 'online' | 'offline';

interface DeviceListProps {
  devices: Device[];
  activeFilter: FilterTab;
  onDeviceClick?: (device: Device) => void;
  className?: string;
}

export function DeviceList({
  devices,
  activeFilter,
  onDeviceClick,
  className,
}: DeviceListProps) {
  // Filter devices based on active tab
  const filteredDevices =
    activeFilter === 'all'
      ? devices
      : devices.filter((device) =>
          activeFilter === 'online'
            ? device.status === 'online'
            : device.status === 'offline'
        );

  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const offlineCount = devices.filter((d) => d.status === 'offline').length;

  return (
    <div className={clsx('space-y-4', className)}>
      <p className="text-sm text-slate-400">
        {activeFilter === 'all'
          ? `${devices.length} device${devices.length !== 1 ? 's' : ''} total • ${onlineCount} online`
          : activeFilter === 'online'
            ? `${onlineCount} device${onlineCount !== 1 ? 's' : ''} online`
            : `${offlineCount} device${offlineCount !== 1 ? 's' : ''} offline`}
      </p>

      {filteredDevices.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">
            {activeFilter === 'online' ? '🔌' : activeFilter === 'offline' ? '✅' : '📱'}
          </div>
          <p className="text-slate-400">
            {activeFilter === 'online'
              ? 'No devices are currently online'
              : activeFilter === 'offline'
                ? 'All devices are online!'
                : 'No devices registered yet'}
          </p>
          {activeFilter === 'all' && (
            <p className="text-slate-500 text-sm mt-1">
              Devices will appear here once they connect
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onClick={onDeviceClick ? () => onDeviceClick(device) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
