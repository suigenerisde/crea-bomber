/**
 * Crea-Bomber Scheduled Messages
 * Queries Supabase for scheduled/recurring messages on client startup
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
export interface ScheduledMessage {
  id: string;
  date: string;
  recurring: boolean;
  type: 'TEXT' | 'TEXT_IMAGE' | 'VIDEO' | 'AUDIO';
  content: string;
  image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  video_autoplay: boolean;
  audio_autoplay: boolean;
  target_devices: string[] | null;
  created_at: string;
  updated_at: string;
  last_shown_year: number | null;
}

export interface NotificationPayload {
  id: string;
  type: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  videoAutoplay?: boolean;
  audioAutoplay?: boolean;
}

// Supabase client singleton
let supabase: SupabaseClient | null = null;

/**
 * Initialize Supabase client with environment variables
 */
export function initSupabase(url: string, anonKey: string): SupabaseClient {
  if (!supabase) {
    supabase = createClient(url, anonKey);
    console.log('[Scheduled] Supabase client initialized');
  }
  return supabase;
}

/**
 * Get the Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}

/**
 * Check for scheduled messages for today
 * Handles both one-time and recurring messages
 */
export async function checkScheduledMessages(deviceId: string): Promise<ScheduledMessage[]> {
  if (!supabase) {
    console.error('[Scheduled] Supabase client not initialized');
    return [];
  }

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const thisYear = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');

  console.log(`[Scheduled] Checking messages for date: ${dateStr}, device: ${deviceId}`);

  try {
    // Query for today's messages (exact date match or recurring with same month-day)
    const { data, error } = await supabase
      .from('scheduled_messages')
      .select('*')
      .or(`date.eq.${dateStr},and(recurring.eq.true)`);

    if (error) {
      console.error('[Scheduled] Query error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('[Scheduled] No messages found for today');
      return [];
    }

    // Filter messages
    const filteredMessages = data.filter((msg: ScheduledMessage) => {
      // For recurring messages, check if same month-day
      if (msg.recurring) {
        const msgDate = new Date(msg.date);
        const msgMonth = (msgDate.getMonth() + 1).toString().padStart(2, '0');
        const msgDay = msgDate.getDate().toString().padStart(2, '0');

        // Check if same month and day
        if (msgMonth !== month || msgDay !== day) {
          return false;
        }

        // Check if already shown this year
        if (msg.last_shown_year && msg.last_shown_year >= thisYear) {
          console.log(`[Scheduled] Recurring message ${msg.id} already shown this year`);
          return false;
        }
      }

      // Check target devices
      if (msg.target_devices && msg.target_devices.length > 0) {
        if (!msg.target_devices.includes(deviceId)) {
          console.log(`[Scheduled] Message ${msg.id} not targeted at this device`);
          return false;
        }
      }

      return true;
    });

    console.log(`[Scheduled] Found ${filteredMessages.length} message(s) for today`);
    return filteredMessages;
  } catch (err) {
    console.error('[Scheduled] Unexpected error:', err);
    return [];
  }
}

/**
 * Mark a recurring message as shown for this year
 */
export async function markAsShown(messageId: string): Promise<boolean> {
  if (!supabase) {
    console.error('[Scheduled] Supabase client not initialized');
    return false;
  }

  const thisYear = new Date().getFullYear();

  try {
    const { error } = await supabase
      .from('scheduled_messages')
      .update({ last_shown_year: thisYear })
      .eq('id', messageId);

    if (error) {
      console.error('[Scheduled] Error marking as shown:', error);
      return false;
    }

    console.log(`[Scheduled] Marked message ${messageId} as shown for year ${thisYear}`);
    return true;
  } catch (err) {
    console.error('[Scheduled] Unexpected error marking as shown:', err);
    return false;
  }
}

/**
 * Convert ScheduledMessage to NotificationPayload
 */
export function toNotificationPayload(msg: ScheduledMessage): NotificationPayload {
  return {
    id: `scheduled-${msg.id}`,
    type: msg.type,
    content: msg.content,
    imageUrl: msg.image_url || undefined,
    videoUrl: msg.video_url || undefined,
    audioUrl: msg.audio_url || undefined,
    videoAutoplay: msg.video_autoplay,
    audioAutoplay: msg.audio_autoplay,
  };
}

/**
 * Process all scheduled messages for today
 * Returns notification payloads ready to display
 */
export async function processScheduledMessages(
  deviceId: string
): Promise<NotificationPayload[]> {
  const messages = await checkScheduledMessages(deviceId);
  const payloads: NotificationPayload[] = [];

  for (const msg of messages) {
    payloads.push(toNotificationPayload(msg));

    // Mark recurring messages as shown
    if (msg.recurring) {
      await markAsShown(msg.id);
    }
  }

  return payloads;
}
