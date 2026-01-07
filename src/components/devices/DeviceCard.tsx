'use client';

import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui';

export interface Device {
  id: string;
  name: string;
  hostname: string;
  online: boolean;
  lastSeen: Date | string;
}

interface DeviceCardProps {
  device: Device;
  className?: string;
}

export function DeviceCard({ device, className }: DeviceCardProps) {
  const lastSeenDate = typeof device.lastSeen === 'string'
    ? new Date(device.lastSeen)
    : device.lastSeen;

  const lastSeenRelative = formatDistanceToNow(lastSeenDate, { addSuffix: true });

  return (
    <div
      className={clsx(
        'bg-slate-800 rounded-lg border border-slate-700 p-4',
        'transition-all duration-200',
        'hover:bg-slate-750 hover:border-slate-600',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-white truncate">{device.name}</h3>
          <p className="text-sm text-slate-400 truncate">{device.hostname}</p>
        </div>
        <Badge variant={device.online ? 'success' : 'neutral'} size="sm">
          {device.online ? 'Online' : 'Offline'}
        </Badge>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Last seen {lastSeenRelative}
      </p>
    </div>
  );
}
