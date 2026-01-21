'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MessageType, type ScheduledMessage, type ScheduledMessageFormData } from '@/types';

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize Supabase client (singleton)
let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[useScheduledMessages] Supabase not configured');
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return supabaseClient;
}

// Database row type (snake_case)
interface ScheduledMessageRow {
  id: string;
  date: string;
  recurring: boolean;
  type: string;
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

// Convert database row to ScheduledMessage
function rowToScheduledMessage(row: ScheduledMessageRow): ScheduledMessage {
  return {
    id: row.id,
    date: row.date,
    recurring: row.recurring,
    type: row.type as MessageType,
    content: row.content,
    imageUrl: row.image_url || undefined,
    videoUrl: row.video_url || undefined,
    audioUrl: row.audio_url || undefined,
    videoAutoplay: row.video_autoplay,
    audioAutoplay: row.audio_autoplay,
    targetDevices: row.target_devices || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastShownYear: row.last_shown_year || undefined,
  };
}

export interface UseScheduledMessagesResult {
  messages: ScheduledMessage[];
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  refresh: () => Promise<void>;
  create: (data: ScheduledMessageFormData) => Promise<ScheduledMessage>;
  update: (id: string, data: Partial<ScheduledMessageFormData>) => Promise<ScheduledMessage>;
  remove: (id: string) => Promise<void>;
}

export function useScheduledMessages(): UseScheduledMessagesResult {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();
  const isConfigured = !!supabase;

  // Fetch all scheduled messages
  const fetchMessages = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('scheduled_messages')
        .select('*')
        .order('date', { ascending: true });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setMessages((data || []).map(rowToScheduledMessage));
    } catch (err) {
      console.error('[useScheduledMessages] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Create a new scheduled message
  const create = useCallback(
    async (data: ScheduledMessageFormData): Promise<ScheduledMessage> => {
      if (!supabase) {
        throw new Error('Supabase nicht konfiguriert');
      }

      const { data: rows, error: insertError } = await supabase
        .from('scheduled_messages')
        .insert({
          date: data.date,
          recurring: data.recurring,
          type: data.type,
          content: data.content,
          image_url: data.imageUrl || null,
          video_url: data.videoUrl || null,
          audio_url: data.audioUrl || null,
          video_autoplay: data.videoAutoplay || false,
          audio_autoplay: data.audioAutoplay || false,
          target_devices: data.targetDevices || null,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      const newMessage = rowToScheduledMessage(rows);
      setMessages((prev) => [...prev, newMessage]);
      return newMessage;
    },
    [supabase]
  );

  // Update an existing scheduled message
  const update = useCallback(
    async (
      id: string,
      data: Partial<ScheduledMessageFormData>
    ): Promise<ScheduledMessage> => {
      if (!supabase) {
        throw new Error('Supabase nicht konfiguriert');
      }

      const updateData: Record<string, unknown> = {};
      if (data.date !== undefined) updateData.date = data.date;
      if (data.recurring !== undefined) updateData.recurring = data.recurring;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl || null;
      if (data.videoUrl !== undefined) updateData.video_url = data.videoUrl || null;
      if (data.audioUrl !== undefined) updateData.audio_url = data.audioUrl || null;
      if (data.videoAutoplay !== undefined) updateData.video_autoplay = data.videoAutoplay;
      if (data.audioAutoplay !== undefined) updateData.audio_autoplay = data.audioAutoplay;
      if (data.targetDevices !== undefined) updateData.target_devices = data.targetDevices || null;

      const { data: rows, error: updateError } = await supabase
        .from('scheduled_messages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      const updatedMessage = rowToScheduledMessage(rows);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? updatedMessage : msg))
      );
      return updatedMessage;
    },
    [supabase]
  );

  // Delete a scheduled message
  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!supabase) {
        throw new Error('Supabase nicht konfiguriert');
      }

      const { error: deleteError } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    },
    [supabase]
  );

  return {
    messages,
    loading,
    error,
    isConfigured,
    refresh: fetchMessages,
    create,
    update,
    remove,
  };
}
