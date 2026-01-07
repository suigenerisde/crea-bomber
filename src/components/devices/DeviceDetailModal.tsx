'use client';

import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Device } from '@/types';

interface DeviceDetailModalProps {
  device: Device;
  isOpen: boolean;
  onClose: () => void;
  onRemove?: (deviceId: string) => Promise<void>;
}

export function DeviceDetailModal({
  device,
  isOpen,
  onClose,
  onRemove,
}: DeviceDetailModalProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  if (!isOpen) return null;

  const lastSeenDate =
    typeof device.lastSeen === 'string' ? new Date(device.lastSeen) : device.lastSeen;
  const createdAtDate =
    typeof device.createdAt === 'string' ? new Date(device.createdAt) : device.createdAt;

  const lastSeenRelative = formatDistanceToNow(lastSeenDate, { addSuffix: true });
  const lastSeenFormatted = format(lastSeenDate, 'PPpp');
  const createdAtFormatted = format(createdAtDate, 'PPpp');

  const isOnline = device.status === 'online';

  const handleRemove = async () => {
    if (!onRemove) return;
    setIsRemoving(true);
    try {
      await onRemove(device.id);
      onClose();
    } catch {
      // Error handling is done in parent
    } finally {
      setIsRemoving(false);
      setShowConfirmRemove(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-lg border border-slate-700 shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Device Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'w-12 h-12 rounded-full flex items-center justify-center',
                isOnline ? 'bg-green-500/20' : 'bg-slate-600/40'
              )}
            >
              <span className="text-2xl">📱</span>
            </div>
            <div>
              <h3 className="text-xl font-medium text-white">{device.name}</h3>
              <Badge variant={isOnline ? 'success' : 'neutral'} size="sm">
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-3 mt-4">
            <DetailRow label="Device ID" value={device.id} mono />
            <DetailRow label="Hostname" value={device.hostname} />
            <DetailRow
              label="Last Seen"
              value={lastSeenRelative}
              subvalue={lastSeenFormatted}
            />
            <DetailRow label="Registered" value={createdAtFormatted} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50">
          {showConfirmRemove ? (
            <div className="space-y-3">
              <p className="text-sm text-yellow-400">
                Are you sure you want to remove this device? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirmRemove(false)}
                  disabled={isRemoving}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleRemove}
                  loading={isRemoving}
                >
                  Remove Device
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
              {onRemove && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowConfirmRemove(true)}
                >
                  Remove Device
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  subvalue,
  mono = false,
}: {
  label: string;
  value: string;
  subvalue?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      <span
        className={clsx('text-white', mono && 'font-mono text-sm break-all')}
      >
        {value}
      </span>
      {subvalue && <span className="text-xs text-slate-500">{subvalue}</span>}
    </div>
  );
}
