'use client';

import { MessageHistoryItem } from './MessageHistoryItem';
import { Button } from '@/components/ui/Button';
import type { Message } from '@/types';

interface MessageHistoryListProps {
  messages: Message[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onMessageClick?: (message: Message) => void;
}

export function MessageHistoryList({
  messages,
  loading = false,
  hasMore = false,
  onLoadMore,
  onMessageClick,
}: MessageHistoryListProps) {
  // Empty state
  if (!loading && messages.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
          <span className="text-3xl">📭</span>
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No messages yet</h3>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">
          Messages you send to devices will appear here. Go to Compose to create your first message.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <MessageHistoryItem
          key={message.id}
          message={message}
          onClick={() => onMessageClick?.(message)}
        />
      ))}

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center pt-4">
          <Button
            variant="secondary"
            onClick={onLoadMore}
            loading={loading}
            disabled={loading}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
