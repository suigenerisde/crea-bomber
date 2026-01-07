'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { Search } from 'lucide-react';
import { useSocket, useDevices, useMessages } from '@/hooks';
import { MessageHistoryList, MessageDetailModal } from '@/components/history';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/contexts';
import { MessageType, type Message } from '@/types';

const MESSAGE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: MessageType.TEXT, label: 'Text' },
  { value: MessageType.TEXT_IMAGE, label: 'Image' },
  { value: MessageType.VIDEO, label: 'Video' },
  { value: MessageType.AUDIO, label: 'Audio' },
];

export default function HistoryPage() {
  const toast = useToast();
  const { socket, status: socketStatus, isConnected } = useSocket();
  const { devices } = useDevices({ socket });
  const wasConnectedRef = useRef(true);

  // Show warning toast when connection is lost
  useEffect(() => {
    if (wasConnectedRef.current && !isConnected && socketStatus === 'disconnected') {
      toast.warning('Connection lost. Real-time updates paused.');
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected, socketStatus, toast]);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<MessageType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    // Simple debounce with setTimeout
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Messages hook with filters
  const {
    messages,
    loading,
    error,
    pagination,
    refresh,
    loadMore,
  } = useMessages({
    socket,
    type: typeFilter || undefined,
    search: debouncedSearch || undefined,
  });

  // Selected message for detail modal
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  // Handle filter reset
  const handleResetFilters = useCallback(() => {
    setTypeFilter('');
    setSearchQuery('');
    setDebouncedSearch('');
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return typeFilter !== '' || debouncedSearch !== '';
  }, [typeFilter, debouncedSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Message History</h1>
          <p className="text-slate-400 text-sm mt-1">
            View and search previously sent messages
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            <span
              className={clsx(
                'w-2 h-2 rounded-full',
                socketStatus === 'connected'
                  ? 'bg-green-500'
                  : socketStatus === 'connecting' || socketStatus === 'reconnecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
              )}
            />
            <span className="text-slate-400 capitalize hidden sm:inline">
              {socketStatus}
            </span>
          </div>
          {/* Refresh Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            iconLeft={
              <svg
                className={clsx('w-4 h-4', isRefreshing && 'animate-spin')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            }
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            iconLeft={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Type Filter */}
        <div className="w-full sm:w-48">
          <Select
            options={MESSAGE_TYPE_OPTIONS}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as MessageType | '')}
          />
        </div>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-4 text-sm text-slate-400">
        <span>
          {pagination.total} message{pagination.total !== 1 ? 's' : ''} found
        </span>
        {hasActiveFilters && (
          <span className="text-blue-400">Filters applied</span>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400 text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-red-400"
            onClick={handleRefresh}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Loading State (initial) */}
      {loading && messages.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 text-slate-400">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading messages...
          </div>
        </div>
      ) : (
        <MessageHistoryList
          messages={messages}
          loading={loading}
          hasMore={pagination.hasMore}
          onLoadMore={loadMore}
          onMessageClick={setSelectedMessage}
        />
      )}

      {/* Message Detail Modal */}
      {selectedMessage && (
        <MessageDetailModal
          message={selectedMessage}
          devices={devices}
          isOpen={!!selectedMessage}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </div>
  );
}
