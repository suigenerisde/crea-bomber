/**
 * CreaBomber - useMessages Hook
 * Fetches message history, creates messages, and subscribes to real-time updates
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import type { Message, MessageType } from '@/types';

interface MessagesApiResponse {
  messages: Message[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface CreateMessagePayload {
  type: MessageType;
  content: string;
  targetDevices: string[];
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  audioAutoplay?: boolean;
}

interface UseMessagesOptions {
  socket: Socket | null;
  autoFetch?: boolean;
  initialLimit?: number;
  type?: MessageType;
  search?: string;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  createMessage: (payload: CreateMessagePayload) => Promise<Message>;
  creating: boolean;
}

const DEFAULT_LIMIT = 20;

export function useMessages(options: UseMessagesOptions = { socket: null }): UseMessagesReturn {
  const { socket, autoFetch = true, initialLimit = DEFAULT_LIMIT, type, search } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: initialLimit,
    offset: 0,
    hasMore: false,
  });
  const mountedRef = useRef(true);

  // Build query string from params
  const buildQueryString = useCallback(
    (offset: number = 0) => {
      const params = new URLSearchParams();
      params.set('limit', String(initialLimit));
      params.set('offset', String(offset));
      if (type) params.set('type', type);
      if (search) params.set('search', search);
      return params.toString();
    },
    [initialLimit, type, search]
  );

  // Parse message dates from API response
  const parseMessage = (msg: Message): Message => ({
    ...msg,
    createdAt: new Date(msg.createdAt),
  });

  // Fetch messages from API
  const fetchMessages = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      try {
        if (!append) {
          setLoading(true);
        }
        setError(null);

        const queryString = buildQueryString(offset);
        const response = await fetch(`/api/messages?${queryString}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.statusText}`);
        }

        const data: MessagesApiResponse = await response.json();

        if (mountedRef.current) {
          const parsedMessages = data.messages.map(parseMessage);

          if (append) {
            setMessages((prev) => [...prev, ...parsedMessages]);
          } else {
            setMessages(parsedMessages);
          }

          setPagination(data.pagination);
        }
      } catch (err) {
        if (mountedRef.current) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setError(message);
          console.error('[useMessages] Fetch error:', message);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [buildQueryString]
  );

  // Refresh - reload from beginning
  const refresh = useCallback(async () => {
    await fetchMessages(0, false);
  }, [fetchMessages]);

  // Load more - fetch next page and append
  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || loading) return;

    const nextOffset = pagination.offset + pagination.limit;
    await fetchMessages(nextOffset, true);
  }, [pagination, loading, fetchMessages]);

  // Create a new message via API
  const createMessage = useCallback(
    async (payload: CreateMessagePayload): Promise<Message> => {
      setCreating(true);
      setError(null);

      try {
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to create message: ${response.statusText}`);
        }

        const data = await response.json();
        const newMessage = parseMessage(data.message);

        // Optimistically add to the list
        if (mountedRef.current) {
          setMessages((prev) => [newMessage, ...prev]);
          setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
        }

        // If socket is connected, emit the message to devices
        if (socket?.connected) {
          socket.emit('message:send', {
            id: newMessage.id,
            type: payload.type,
            content: payload.content,
            targetDevices: payload.targetDevices,
            imageUrl: payload.imageUrl,
            videoUrl: payload.videoUrl,
            audioUrl: payload.audioUrl,
            audioAutoplay: payload.audioAutoplay,
            timestamp: newMessage.createdAt.getTime(),
          });
        }

        return newMessage;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (mountedRef.current) {
          setError(message);
        }
        throw new Error(message);
      } finally {
        if (mountedRef.current) {
          setCreating(false);
        }
      }
    },
    [socket]
  );

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;

    if (autoFetch) {
      fetchMessages();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoFetch, fetchMessages]);

  // Re-fetch when filters change
  useEffect(() => {
    if (autoFetch) {
      fetchMessages(0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, search]);

  // Subscribe to real-time message updates via socket
  useEffect(() => {
    if (!socket) return;

    // Listen for confirmation that our message was sent
    const handleMessageSent = (data: { messageId: string }) => {
      if (mountedRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId ? { ...msg, status: 'sent' as const } : msg
          )
        );
      }
    };

    socket.on('message:sent', handleMessageSent);

    return () => {
      socket.off('message:sent', handleMessageSent);
    };
  }, [socket]);

  return {
    messages,
    loading,
    error,
    pagination,
    refresh,
    loadMore,
    createMessage,
    creating,
  };
}
