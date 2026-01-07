'use client';

import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui';
import type { Device } from '@/types';

interface DeviceCardProps {
  device: Device;
  onClick?: () => void;
  className?: string;
}

export function DeviceCard({ device, onClick, className }: DeviceCardProps) {
  const lastSeenDate =
    typeof device.lastSeen === 'string' ? new Date(device.lastSeen) : device.lastSeen;

  const lastSeenRelative = formatDistanceToNow(lastSeenDate, { addSuffix: true });
  const isOnline = device.status === 'online';

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'bg-slate-800 rounded-lg border border-slate-700 p-4 w-full text-left',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:bg-slate-750 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900',
        !onClick && 'hover:bg-slate-750 hover:border-slate-600',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-white truncate">{device.name}</h3>
          <p className="text-sm text-slate-400 truncate">{device.hostname}</p>
        </div>
        <Badge variant={isOnline ? 'success' : 'neutral'} size="sm">
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>
      <p className="mt-3 text-xs text-slate-500">Last seen {lastSeenRelative}</p>
    </Component>
  );
}
