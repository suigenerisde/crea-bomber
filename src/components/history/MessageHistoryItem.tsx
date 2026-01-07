'use client';

import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { MessageType, type Message } from '@/types';

interface MessageHistoryItemProps {
  message: Message;
  onClick?: () => void;
}

const MESSAGE_TYPE_ICONS: Record<MessageType, string> = {
  [MessageType.TEXT]: '💬',
  [MessageType.TEXT_IMAGE]: '🖼️',
  [MessageType.VIDEO]: '🎬',
  [MessageType.AUDIO]: '🔊',
};

const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  [MessageType.TEXT]: 'Text',
  [MessageType.TEXT_IMAGE]: 'Image',
  [MessageType.VIDEO]: 'Video',
  [MessageType.AUDIO]: 'Audio',
};

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'info' | 'neutral'> = {
  delivered: 'success',
  sent: 'info',
  pending: 'warning',
  partial: 'info',
  failed: 'neutral',
};

// Get status label with delivery count for partial status
function getStatusLabel(message: Message): string {
  if (message.status === 'partial' && message.deliveries) {
    const delivered = message.deliveries.filter(d => d.status === 'delivered').length;
    const total = message.targetDevices.length;
    return `${delivered}/${total}`;
  }
  return message.status;
}

export function MessageHistoryItem({ message, onClick }: MessageHistoryItemProps) {
  const createdAt =
    typeof message.createdAt === 'string' ? new Date(message.createdAt) : message.createdAt;
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });

  const truncatedContent =
    message.content.length > 80 ? `${message.content.substring(0, 80)}...` : message.content;

  const deviceCount = message.targetDevices.length;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left p-4 rounded-lg border transition-all',
        'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Type Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-xl">
          {MESSAGE_TYPE_ICONS[message.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-500 uppercase tracking-wide">
              {MESSAGE_TYPE_LABELS[message.type]}
            </span>
            <Badge
              variant={STATUS_VARIANTS[message.status] || 'neutral'}
              size="sm"
            >
              {getStatusLabel(message)}
            </Badge>
          </div>

          <p className="text-white text-sm line-clamp-2 mb-2">
            {truncatedContent || <span className="text-slate-500 italic">No text content</span>}
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              {deviceCount} device{deviceCount !== 1 ? 's' : ''}
            </span>
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* Arrow Indicator */}
        <div className="flex-shrink-0 text-slate-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </button>
  );
}
