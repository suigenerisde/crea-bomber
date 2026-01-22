/**
 * CreaBomber - useMessages Hook
 * Fetches message history, creates messages, and subscribes to real-time updates
 * Enhanced with retry logic and error handling
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import type { Message, MessageType, DeliveryStatusUpdate, MessageDelivery } from '@/types';
import { fetchWithRetry, postWithRetry, messageQueue } from '@/lib/fetch-with-retry';
import { getErrorMessage } from '@/lib/errors';

interface MessagesApiResponse {
  messages: Message[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface CreateMessageResponse {
  message: Message;
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
  enableRetry?: boolean;
  enableOfflineQueue?: boolean;
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
  queuedCount: number;
  processQueue: () => Promise<void>;
}

const DEFAULT_LIMIT = 20;

export function useMessages(options: UseMessagesOptions = { socket: null }): UseMessagesReturn {
  const {
    socket,
    autoFetch = true,
    initialLimit = DEFAULT_LIMIT,
    type,
    search,
    enableRetry = true,
    enableOfflineQueue = true,
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: initialLimit,
    offset: 0,
    hasMore: false,
  });
  const mountedRef = useRef(true);

  // Update queued count on mount
  useEffect(() => {
    setQueuedCount(messageQueue.getLength());
  }, []);

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

  // Fetch messages from API with retry logic
  const fetchMessages = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      try {
        if (!append) {
          setLoading(true);
        }
        setError(null);

        const queryString = buildQueryString(offset);
        const result = await fetchWithRetry<MessagesApiResponse>(
          `/api/messages?${queryString}`,
          { method: 'GET' },
          enableRetry
            ? {
                maxRetries: 3,
                onRetry: (attempt, err, delay) => {
                  console.log(
                    `[useMessages] Retry ${attempt}: ${err.message}, waiting ${delay}ms`
                  );
                },
              }
            : { maxRetries: 0 }
        );

        if (result.error) {
          throw result.error;
        }

        if (!result.data) {
          throw new Error('No data received from API');
        }

        if (mountedRef.current) {
          const parsedMessages = result.data.messages.map(parseMessage);

          if (append) {
            setMessages((prev) => [...prev, ...parsedMessages]);
          } else {
            setMessages(parsedMessages);
          }

          setPagination(result.data.pagination);
        }
      } catch (err) {
        if (mountedRef.current) {
          const message = getErrorMessage(err);
          setError(message);
          console.error('[useMessages] Fetch error:', message);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [buildQueryString, enableRetry]
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

  // Create a new message via API with retry logic
  const createMessage = useCallback(
    async (payload: CreateMessagePayload): Promise<Message> => {
      setCreating(true);
      setError(null);

      try {
        const result = await postWithRetry<CreateMessageResponse>(
          '/api/messages',
          payload,
          enableRetry
            ? {
                maxRetries: 3,
                onRetry: (attempt, err, delay) => {
                  console.log(
                    `[useMessages] Create retry ${attempt}: ${err.message}, waiting ${delay}ms`
                  );
                },
              }
            : { maxRetries: 0 }
        );

        if (result.error) {
          // If offline and queue is enabled, add to queue
          if (
            enableOfflineQueue &&
            (result.error.message.includes('fetch failed') ||
              result.error.message.includes('Network') ||
              result.error.message.includes('offline'))
          ) {
            messageQueue.add(
              '/api/messages',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              },
              payload
            );
            setQueuedCount(messageQueue.getLength());

            // Create a temporary local message
            const tempMessage: Message = {
              id: `temp-${Date.now()}`,
              type: payload.type,
              content: payload.content,
              targetDevices: payload.targetDevices,
              imageUrl: payload.imageUrl,
              videoUrl: payload.videoUrl,
              audioUrl: payload.audioUrl,
              audioAutoplay: payload.audioAutoplay,
              status: 'pending',
              createdAt: new Date(),
            };

            if (mountedRef.current) {
              setMessages((prev) => [tempMessage, ...prev]);
              setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
            }

            return tempMessage;
          }

          throw result.error;
        }

        if (!result.data?.message) {
          throw new Error('No message returned from API');
        }

        const newMessage = parseMessage(result.data.message);

        // Optimistically add to the list
        if (mountedRef.current) {
          setMessages((prev) => [newMessage, ...prev]);
          setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
        }

        // Note: Server now handles WebSocket broadcast directly in the API route
        // No need to emit 'message:send' from client anymore

        return newMessage;
      } catch (err) {
        const message = getErrorMessage(err);
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
    [socket, enableRetry, enableOfflineQueue]
  );

  // Process queued messages when back online
  const processQueue = useCallback(async () => {
    await messageQueue.processQueue(
      (id) => {
        console.log(`[useMessages] Queued message ${id} sent successfully`);
        setQueuedCount(messageQueue.getLength());
        // Refresh to get updated message list
        refresh();
      },
      (id, err) => {
        console.error(`[useMessages] Failed to send queued message ${id}:`, err);
        setQueuedCount(messageQueue.getLength());
      }
    );
  }, [refresh]);

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

    // Listen for delivery status updates
    const handleDeliveryUpdate = (data: DeliveryStatusUpdate) => {
      if (mountedRef.current) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== data.messageId) return msg;

            // Update the delivery record for this device
            const updatedDeliveries: MessageDelivery[] = (msg.deliveries || []).map((d) =>
              d.deviceId === data.deviceId
                ? { ...d, status: data.status, deliveredAt: new Date(data.timestamp) }
                : d
            );

            // If no delivery record exists for this device, add it
            if (!updatedDeliveries.some((d) => d.deviceId === data.deviceId)) {
              updatedDeliveries.push({
                deviceId: data.deviceId,
                status: data.status,
                deliveredAt: new Date(data.timestamp),
              });
            }

            return {
              ...msg,
              status: data.overallStatus,
              deliveries: updatedDeliveries,
            };
          })
        );
      }
    };

    // Listen for full message updates (includes all delivery data)
    const handleMessageUpdated = (data: { message: Message }) => {
      if (mountedRef.current && data.message) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.message.id ? parseMessage(data.message) : msg
          )
        );
      }
    };

    // Process queue when socket reconnects
    const handleConnect = () => {
      if (messageQueue.getLength() > 0) {
        processQueue();
      }
    };

    socket.on('message:sent', handleMessageSent);
    socket.on('message:delivery:update', handleDeliveryUpdate);
    socket.on('message:updated', handleMessageUpdated);
    socket.on('connect', handleConnect);

    return () => {
      socket.off('message:sent', handleMessageSent);
      socket.off('message:delivery:update', handleDeliveryUpdate);
      socket.off('message:updated', handleMessageUpdated);
      socket.off('connect', handleConnect);
    };
  }, [socket, processQueue]);

  return {
    messages,
    loading,
    error,
    pagination,
    refresh,
    loadMore,
    createMessage,
    creating,
    queuedCount,
    processQueue,
  };
}
