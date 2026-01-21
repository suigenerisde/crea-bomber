'use client';

import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Device } from '@/types';

interface DeviceStatusPanelProps {
  devices: Device[];
  className?: string;
}

/**
 * DeviceStatusPanel shows online/offline devices grouped with last-seen times
 * Designed for quick overview of device connectivity status
 */
export function DeviceStatusPanel({ devices, className = '' }: DeviceStatusPanelProps) {
  const { online, offline } = useMemo(() => {
    const online: Device[] = [];
    const offline: Device[] = [];

    for (const device of devices) {
      if (device.status === 'online') {
        online.push(device);
      } else {
        offline.push(device);
      }
    }

    // Sort by last seen (most recent first)
    const sortByLastSeen = (a: Device, b: Device) => {
      const dateA = typeof a.lastSeen === 'string' ? new Date(a.lastSeen) : a.lastSeen;
      const dateB = typeof b.lastSeen === 'string' ? new Date(b.lastSeen) : b.lastSeen;
      return dateB.getTime() - dateA.getTime();
    };

    online.sort(sortByLastSeen);
    offline.sort(sortByLastSeen);

    return { online, offline };
  }, [devices]);

  const formatLastSeen = (lastSeen: Date | string) => {
    const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return 'Jetzt aktiv';
    } else if (diffMins < 60) {
      return `Vor ${diffMins} Min`;
    } else {
      return formatDistanceToNow(date, { addSuffix: true, locale: de });
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Online Devices */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-green-400">
            ONLINE ({online.length})
          </span>
        </div>
        {online.length === 0 ? (
          <p className="text-sm text-slate-500 ml-4">Keine Geraete online</p>
        ) : (
          <div className="space-y-1">
            {online.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between py-1 px-3 ml-2 border-l-2 border-green-500/30"
              >
                <span className="text-sm text-white">{device.name}</span>
                <span className="text-xs text-slate-400">
                  {formatLastSeen(device.lastSeen)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Offline Devices */}
      {offline.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-sm font-medium text-slate-400">
              OFFLINE ({offline.length})
            </span>
          </div>
          <div className="space-y-1">
            {offline.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between py-1 px-3 ml-2 border-l-2 border-slate-600/30"
              >
                <span className="text-sm text-slate-400">{device.name}</span>
                <span className="text-xs text-slate-500">
                  {formatLastSeen(device.lastSeen)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
