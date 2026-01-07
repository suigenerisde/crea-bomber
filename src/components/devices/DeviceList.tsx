'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { DeviceCard, type Device } from './DeviceCard';
import { Toggle } from '@/components/ui';

interface DeviceListProps {
  devices: Device[];
  className?: string;
}

export function DeviceList({ devices, className }: DeviceListProps) {
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  const filteredDevices = showOnlineOnly
    ? devices.filter((device) => device.online)
    : devices;

  const onlineCount = devices.filter((device) => device.online).length;

  return (
    <div className={clsx('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {onlineCount} of {devices.length} devices online
        </p>
        <Toggle
          checked={showOnlineOnly}
          onChange={setShowOnlineOnly}
          label="Online only"
        />
      </div>

      {filteredDevices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">
            {showOnlineOnly
              ? 'No devices are currently online'
              : 'No devices registered yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}
