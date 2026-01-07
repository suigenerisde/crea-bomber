'use client';

import { clsx } from 'clsx';
import { Button } from '@/components/ui';
import type { Device } from '@/types';

interface DeviceSelectorProps {
  devices: Device[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  className?: string;
}

export function DeviceSelector({
  devices,
  selectedIds,
  onChange,
  className,
}: DeviceSelectorProps) {
  const onlineDevices = devices.filter((device) => device.status === 'online');
  const onlineCount = onlineDevices.length;

  const handleToggle = (deviceId: string) => {
    if (selectedIds.includes(deviceId)) {
      onChange(selectedIds.filter((id) => id !== deviceId));
    } else {
      onChange([...selectedIds, deviceId]);
    }
  };

  const handleSelectAll = () => {
    const onlineDeviceIds = onlineDevices.map((device) => device.id);
    onChange(onlineDeviceIds);
  };

  const handleSelectNone = () => {
    onChange([]);
  };

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {selectedIds.length} selected ({onlineCount} online)
        </p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={onlineCount === 0}
          >
            Select all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectNone}
            disabled={selectedIds.length === 0}
          >
            Select none
          </Button>
        </div>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {devices.map((device) => {
          const isSelected = selectedIds.includes(device.id);
          const isOnline = device.status === 'online';
          const isDisabled = !isOnline;

          return (
            <label
              key={device.id}
              className={clsx(
                'flex items-center gap-3 p-2 rounded-lg cursor-pointer',
                'transition-colors duration-150',
                isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-slate-700/50'
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => !isDisabled && handleToggle(device.id)}
                className={clsx(
                  'h-4 w-4 rounded border-slate-600 bg-slate-700',
                  'text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800'
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {device.name}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {device.hostname}
                </p>
              </div>
              <span
                className={clsx(
                  'w-2 h-2 rounded-full',
                  isOnline ? 'bg-green-500' : 'bg-slate-500'
                )}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
