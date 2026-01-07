/**
 * CreaBomber - Fetch with Retry
 * HTTP fetch wrapper with automatic retry logic and error handling
 */

import { getErrorMessage, NetworkError } from './errors';

export interface RetryConfig {
  // Maximum number of retry attempts (default: 3)
  maxRetries?: number;
  // Initial delay in ms before first retry (default: 1000)
  initialDelay?: number;
  // Maximum delay in ms between retries (default: 10000)
  maxDelay?: number;
  // Multiplier for exponential backoff (default: 2)
  backoffMultiplier?: number;
  // HTTP status codes that should trigger retry (default: [408, 429, 500, 502, 503, 504])
  retryStatusCodes?: number[];
  // Callback for each retry attempt
  onRetry?: (attempt: number, error: Error, delay: number) => void;
  // Request timeout in ms (default: 30000)
  timeout?: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
  onRetry: () => {},
  timeout: 30000,
};

// Calculate delay with exponential backoff and jitter
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt);
  const delay = Math.min(exponentialDelay, maxDelay);
  // Add jitter (random 0-25% of delay)
  const jitter = delay * Math.random() * 0.25;
  return Math.floor(delay + jitter);
}

// Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Check if error is retryable
function isRetryableError(error: Error): boolean {
  // Network errors are generally retryable
  if (error instanceof NetworkError) {
    return error.isRetryable;
  }

  const message = error.message.toLowerCase();

  // Retryable network conditions
  const retryableConditions = [
    'fetch failed',
    'network error',
    'network request failed',
    'failed to fetch',
    'timeout',
    'econnrefused',
    'econnreset',
    'etimedout',
    'aborted',
  ];

  return retryableConditions.some((condition) => message.includes(condition));
}

export interface FetchWithRetryResponse<T> {
  data: T | null;
  error: Error | null;
  attempts: number;
  duration: number;
}

export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = {}
): Promise<FetchWithRetryResponse<T>> {
  const config = { ...DEFAULT_CONFIG, ...retryConfig };
  const startTime = Date.now();
  let lastError: Error | null = null;
  let attempts = 0;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    attempts = attempt + 1;

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if status code should trigger retry
      if (
        config.retryStatusCodes.includes(response.status) &&
        attempt < config.maxRetries
      ) {
        const delay = calculateDelay(
          attempt,
          config.initialDelay,
          config.maxDelay,
          config.backoffMultiplier
        );

        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        config.onRetry(attempt + 1, lastError, delay);

        await sleep(delay);
        continue;
      }

      // Parse response
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage =
          (errorBody as { error?: string }).error ??
          `HTTP ${response.status}: ${response.statusText}`;
        return {
          data: null,
          error: new Error(errorMessage),
          attempts,
          duration: Date.now() - startTime,
        };
      }

      const data = await response.json();
      return {
        data: data as T,
        error: null,
        attempts,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this is an abort (timeout)
      if (lastError.name === 'AbortError') {
        lastError = new NetworkError('Request timed out', true);
      }

      // Check if we should retry
      if (!isRetryableError(lastError) || attempt >= config.maxRetries) {
        return {
          data: null,
          error: lastError,
          attempts,
          duration: Date.now() - startTime,
        };
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(
        attempt,
        config.initialDelay,
        config.maxDelay,
        config.backoffMultiplier
      );

      config.onRetry(attempt + 1, lastError, delay);
      await sleep(delay);
    }
  }

  // Should not reach here, but just in case
  return {
    data: null,
    error: lastError ?? new Error('Unknown error'),
    attempts,
    duration: Date.now() - startTime,
  };
}

// Convenience wrapper for JSON POST requests
export async function postWithRetry<T, B = unknown>(
  url: string,
  body: B,
  retryConfig: RetryConfig = {}
): Promise<FetchWithRetryResponse<T>> {
  return fetchWithRetry<T>(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    retryConfig
  );
}

// Message queue for offline scenarios
interface QueuedMessage<T = unknown> {
  id: string;
  url: string;
  options: RequestInit;
  body?: T;
  createdAt: Date;
  retries: number;
}

class MessageQueue {
  private queue: QueuedMessage[] = [];
  private isProcessing = false;
  private readonly storageKey = 'creabomber_message_queue';

  constructor() {
    // Load persisted queue from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.queue = parsed.map((item: QueuedMessage) => ({
            ...item,
            createdAt: new Date(item.createdAt),
          }));
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  private persist(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
      } catch {
        // Ignore storage errors
      }
    }
  }

  add<T>(url: string, options: RequestInit, body?: T): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    this.queue.push({
      id,
      url,
      options,
      body,
      createdAt: new Date(),
      retries: 0,
    });
    this.persist();
    return id;
  }

  remove(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.persist();
  }

  getAll(): QueuedMessage[] {
    return [...this.queue];
  }

  getLength(): number {
    return this.queue.length;
  }

  async processQueue(
    onSuccess?: (id: string) => void,
    onError?: (id: string, error: Error) => void
  ): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];

      try {
        const response = await fetchWithRetry(
          item.url,
          {
            ...item.options,
            body: item.body ? JSON.stringify(item.body) : undefined,
          },
          { maxRetries: 1 }
        );

        if (response.error) {
          throw response.error;
        }

        // Success - remove from queue
        this.queue.shift();
        this.persist();
        onSuccess?.(item.id);
      } catch (error) {
        item.retries++;

        // If too many retries or non-retryable error, move to end or discard
        if (item.retries >= 5) {
          this.queue.shift();
          this.persist();
          onError?.(
            item.id,
            error instanceof Error ? error : new Error(String(error))
          );
        } else {
          // Move to end of queue
          this.queue.shift();
          this.queue.push(item);
          this.persist();
        }

        // Stop processing on network error
        if (
          error instanceof Error &&
          isRetryableError(error)
        ) {
          break;
        }
      }
    }

    this.isProcessing = false;
  }

  clear(): void {
    this.queue = [];
    this.persist();
  }
}

// Export singleton instance
export const messageQueue = new MessageQueue();

export default fetchWithRetry;
