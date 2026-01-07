'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useEscapeKey } from '@/hooks';
import { MessageType, type Message, type Device, type DeviceDeliveryStatus } from '@/types';

interface MessageDetailModalProps {
  message: Message;
  devices?: Device[];
  isOpen: boolean;
  onClose: () => void;
}

const MESSAGE_TYPE_ICONS: Record<MessageType, string> = {
  [MessageType.TEXT]: '💬',
  [MessageType.TEXT_IMAGE]: '🖼️',
  [MessageType.VIDEO]: '🎬',
  [MessageType.AUDIO]: '🔊',
};

const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  [MessageType.TEXT]: 'Text Message',
  [MessageType.TEXT_IMAGE]: 'Image Message',
  [MessageType.VIDEO]: 'Video Message',
  [MessageType.AUDIO]: 'Audio Message',
};

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  delivered: 'success',
  sent: 'info',
  pending: 'warning',
  partial: 'info',
  failed: 'neutral',
};

const DELIVERY_STATUS_ICONS: Record<DeviceDeliveryStatus, string> = {
  delivered: '✓',
  sent: '↗',
  pending: '•',
  failed: '✕',
};

export function MessageDetailModal({
  message,
  devices = [],
  isOpen,
  onClose,
}: MessageDetailModalProps) {
  // Close on Escape key
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const createdAt =
    typeof message.createdAt === 'string' ? new Date(message.createdAt) : message.createdAt;
  const formattedDate = format(createdAt, 'PPpp');

  // Get device details for target devices with delivery status
  const targetDeviceDetails = message.targetDevices.map((deviceId) => {
    const device = devices.find((d) => d.id === deviceId);
    const delivery = message.deliveries?.find((d) => d.deviceId === deviceId);
    return {
      id: deviceId,
      name: device?.name || 'Unknown Device',
      connectionStatus: device?.status || 'offline',
      deliveryStatus: delivery?.status || 'pending',
      deliveredAt: delivery?.deliveredAt,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-lg border border-slate-700 shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{MESSAGE_TYPE_ICONS[message.type]}</span>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {MESSAGE_TYPE_LABELS[message.type]}
              </h2>
              <span className="text-xs text-slate-500">{formattedDate}</span>
            </div>
          </div>
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
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-6">
          {/* Status */}
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">
              Status
            </span>
            <Badge
              variant={STATUS_VARIANTS[message.status] || 'neutral'}
              size="md"
            >
              {message.status}
            </Badge>
          </div>

          {/* Text Content */}
          {message.content && (
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">
                Message Content
              </span>
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <p className="text-white whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          )}

          {/* Image Preview */}
          {message.imageUrl && (
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">
                Image
              </span>
              <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                <img
                  src={message.imageUrl}
                  alt="Message attachment"
                  className="w-full h-auto max-h-64 object-contain"
                />
              </div>
              <a
                href={message.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline mt-1 inline-block"
              >
                Open full image
              </a>
            </div>
          )}

          {/* Video Preview */}
          {message.videoUrl && (
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">
                Video
              </span>
              <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                <video
                  src={message.videoUrl}
                  controls
                  className="w-full h-auto max-h-64"
                />
              </div>
              <a
                href={message.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline mt-1 inline-block"
              >
                Open video
              </a>
            </div>
          )}

          {/* Audio Preview */}
          {message.audioUrl && (
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">
                Audio {message.audioAutoplay && '(Autoplay enabled)'}
              </span>
              <div className="bg-slate-900 rounded-lg border border-slate-700 p-3">
                <audio
                  src={message.audioUrl}
                  controls
                  className="w-full"
                />
              </div>
              <a
                href={message.audioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline mt-1 inline-block"
              >
                Download audio
              </a>
            </div>
          )}

          {/* Target Devices with Delivery Status */}
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">
              Target Devices ({targetDeviceDetails.length})
            </span>
            <div className="space-y-2">
              {targetDeviceDetails.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-3 bg-slate-900 rounded-lg p-3 border border-slate-700"
                >
                  {/* Connection status indicator */}
                  <span
                    className={clsx(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      device.connectionStatus === 'online' ? 'bg-green-500' : 'bg-slate-500'
                    )}
                    title={device.connectionStatus === 'online' ? 'Online' : 'Offline'}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-white text-sm block truncate">{device.name}</span>
                    <span className="text-xs text-slate-500 font-mono">
                      {device.id.slice(0, 8)}...
                    </span>
                  </div>
                  {/* Delivery status */}
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium',
                        device.deliveryStatus === 'delivered' && 'bg-green-500/20 text-green-400',
                        device.deliveryStatus === 'sent' && 'bg-blue-500/20 text-blue-400',
                        device.deliveryStatus === 'pending' && 'bg-yellow-500/20 text-yellow-400',
                        device.deliveryStatus === 'failed' && 'bg-red-500/20 text-red-400'
                      )}
                      title={`Delivery: ${device.deliveryStatus}`}
                    >
                      {DELIVERY_STATUS_ICONS[device.deliveryStatus]}
                    </span>
                    {device.deliveredAt && (
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(
                          typeof device.deliveredAt === 'string'
                            ? new Date(device.deliveredAt)
                            : device.deliveredAt,
                          { addSuffix: true }
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Delivery summary */}
            {message.deliveries && message.deliveries.length > 0 && (
              <div className="mt-3 text-xs text-slate-500">
                {message.deliveries.filter(d => d.status === 'delivered').length} of{' '}
                {targetDeviceDetails.length} delivered
              </div>
            )}
          </div>

          {/* Message ID */}
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">
              Message ID
            </span>
            <code className="text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded font-mono break-all">
              {message.id}
            </code>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50">
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
