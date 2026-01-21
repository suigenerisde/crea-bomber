'use client';

import { useState, useCallback } from 'react';
import { Plus, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { useSocket, useDevices, useScheduledMessages } from '@/hooks';
import { ScheduledMessageForm, ScheduledMessageList } from '@/components/scheduled';
import { Button, PageTransition, Card } from '@/components/ui';
import { useToast } from '@/contexts';
import { type ScheduledMessage, type ScheduledMessageFormData, MessageType } from '@/types';

export default function ScheduledPage() {
  const toast = useToast();
  const { socket } = useSocket();
  const { devices } = useDevices({ socket });
  const {
    messages,
    loading,
    error,
    isConfigured,
    refresh,
    create,
    update,
    remove,
  } = useScheduledMessages();

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle create new message
  const handleCreate = useCallback(async (data: ScheduledMessageFormData) => {
    try {
      await create(data);
      toast.success('Nachricht erfolgreich geplant');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Erstellen');
      throw err;
    }
  }, [create, toast]);

  // Handle edit message
  const handleEdit = useCallback((message: ScheduledMessage) => {
    setEditingMessage(message);
    setIsFormOpen(true);
  }, []);

  // Handle update message
  const handleUpdate = useCallback(async (data: ScheduledMessageFormData) => {
    if (!editingMessage) return;
    try {
      await update(editingMessage.id, data);
      toast.success('Nachricht aktualisiert');
      setEditingMessage(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern');
      throw err;
    }
  }, [editingMessage, update, toast]);

  // Handle delete message
  const handleDelete = useCallback(async (id: string) => {
    // Simple confirmation
    if (!window.confirm('Diese Nachricht wirklich loeschen?')) {
      return;
    }

    try {
      await remove(id);
      toast.success('Nachricht geloescht');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Loeschen');
    }
  }, [remove, toast]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  // Close form
  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingMessage(null);
  }, []);

  // Open create form
  const handleOpenCreate = useCallback(() => {
    setEditingMessage(null);
    setIsFormOpen(true);
  }, []);

  // Supabase not configured warning
  if (!isConfigured) {
    return (
      <PageTransition>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-white">Geplante Nachrichten</h1>
            <p className="text-slate-400 text-sm mt-1">
              Nachrichten fuer Geburtstage, Feiertage und andere Anlaesse vorplanen
            </p>
          </div>

          {/* Not Configured Warning */}
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <div className="flex items-start gap-4 p-6">
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-yellow-400 mb-2">
                  Supabase nicht konfiguriert
                </h3>
                <p className="text-slate-300 text-sm mb-4">
                  Um geplante Nachrichten zu nutzen, muessen die Supabase-Umgebungsvariablen
                  konfiguriert werden:
                </p>
                <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm text-slate-400">
                  <p>NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co</p>
                  <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...</p>
                </div>
                <p className="text-slate-400 text-sm mt-4">
                  Fuehre ausserdem die Migration in{' '}
                  <code className="text-blue-400">supabase/migrations/001_scheduled_messages.sql</code>{' '}
                  aus.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <Calendar className="w-7 h-7 text-blue-400" />
              Geplante Nachrichten
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Nachrichten fuer Geburtstage, Feiertage und andere Anlaesse vorplanen
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              loading={isRefreshing}
              iconLeft={
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              }
            >
              Aktualisieren
            </Button>
            {/* Add Button */}
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              iconLeft={<Plus className="w-4 h-4" />}
            >
              Neue Nachricht
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>
            {messages.length} geplante Nachricht{messages.length !== 1 ? 'en' : ''}
          </span>
          <span className="text-slate-600">|</span>
          <span>
            {messages.filter((m) => m.recurring).length} jaehrlich wiederkehrend
          </span>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 animate-fade-in">
            <p className="text-red-400 text-sm">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-red-400"
              onClick={handleRefresh}
            >
              Erneut versuchen
            </Button>
          </div>
        )}

        {/* Message List */}
        <ScheduledMessageList
          messages={messages}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={loading}
        />

        {/* Form Modal */}
        <ScheduledMessageForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={editingMessage ? handleUpdate : handleCreate}
          devices={devices}
          initialData={
            editingMessage
              ? {
                  date: editingMessage.date,
                  recurring: editingMessage.recurring,
                  type: editingMessage.type,
                  content: editingMessage.content,
                  imageUrl: editingMessage.imageUrl,
                  videoUrl: editingMessage.videoUrl,
                  audioUrl: editingMessage.audioUrl,
                  videoAutoplay: editingMessage.videoAutoplay,
                  audioAutoplay: editingMessage.audioAutoplay,
                  targetDevices: editingMessage.targetDevices,
                }
              : undefined
          }
          isEditing={!!editingMessage}
        />
      </div>
    </PageTransition>
  );
}
