'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Repeat, Image, Video, Music, Send } from 'lucide-react';
import { Button, Input, Select, Card } from '@/components/ui';
import { MessageType, type ScheduledMessageFormData, type Device } from '@/types';

interface ScheduledMessageFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ScheduledMessageFormData) => Promise<void>;
  devices: Device[];
  initialData?: Partial<ScheduledMessageFormData>;
  isEditing?: boolean;
}

const MESSAGE_TYPE_OPTIONS = [
  { value: MessageType.TEXT, label: 'Text' },
  { value: MessageType.TEXT_IMAGE, label: 'Text + Bild' },
  { value: MessageType.VIDEO, label: 'Video' },
  { value: MessageType.AUDIO, label: 'Audio' },
];

export function ScheduledMessageForm({
  isOpen,
  onClose,
  onSubmit,
  devices,
  initialData,
  isEditing = false,
}: ScheduledMessageFormProps) {
  const [formData, setFormData] = useState<ScheduledMessageFormData>({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    recurring: initialData?.recurring || false,
    type: initialData?.type || MessageType.TEXT,
    content: initialData?.content || '',
    imageUrl: initialData?.imageUrl || '',
    videoUrl: initialData?.videoUrl || '',
    audioUrl: initialData?.audioUrl || '',
    videoAutoplay: initialData?.videoAutoplay || false,
    audioAutoplay: initialData?.audioAutoplay || false,
    targetDevices: initialData?.targetDevices || undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: initialData?.date || new Date().toISOString().split('T')[0],
        recurring: initialData?.recurring || false,
        type: initialData?.type || MessageType.TEXT,
        content: initialData?.content || '',
        imageUrl: initialData?.imageUrl || '',
        videoUrl: initialData?.videoUrl || '',
        audioUrl: initialData?.audioUrl || '',
        videoAutoplay: initialData?.videoAutoplay || false,
        audioAutoplay: initialData?.audioAutoplay || false,
        targetDevices: initialData?.targetDevices || undefined,
      });
      setError(null);
    }
  }, [isOpen, initialData]);

  // Handle keyboard escape
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!formData.content.trim()) {
      setError('Bitte gib einen Nachrichtentext ein');
      return;
    }

    if (!formData.date) {
      setError('Bitte waehle ein Datum');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeviceSelection = (deviceId: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        targetDevices: [...(prev.targetDevices || []), deviceId],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        targetDevices: prev.targetDevices?.filter((id) => id !== deviceId),
      }));
    }
  };

  const handleAllDevices = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      targetDevices: checked ? undefined : [],
    }));
  };

  if (!isOpen) return null;

  const showImageInput = formData.type === MessageType.TEXT_IMAGE;
  const showVideoInput = formData.type === MessageType.VIDEO;
  const showAudioInput = formData.type === MessageType.AUDIO;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-xl bg-slate-800 rounded-xl border border-slate-700 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              {isEditing ? 'Nachricht bearbeiten' : 'Neue geplante Nachricht'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date & Recurring */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Datum
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.recurring}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      recurring: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                />
                <span className="text-sm text-slate-300 flex items-center gap-1">
                  <Repeat className="w-4 h-4" />
                  Jaehrlich wiederholen
                </span>
              </label>
            </div>
          </div>

          {/* Message Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nachrichtentyp
            </label>
            <Select
              options={MESSAGE_TYPE_OPTIONS}
              value={formData.type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  type: e.target.value as MessageType,
                }))
              }
            />
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nachricht
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Deine Nachricht..."
            />
          </div>

          {/* Image URL */}
          {showImageInput && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                <Image className="w-4 h-4 inline mr-1" />
                Bild-URL
              </label>
              <Input
                type="url"
                value={formData.imageUrl || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
          )}

          {/* Video URL */}
          {showVideoInput && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                <Video className="w-4 h-4 inline mr-1" />
                Video-URL (YouTube, Loom, Vimeo)
              </label>
              <Input
                type="url"
                value={formData.videoUrl || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, videoUrl: e.target.value }))
                }
                placeholder="https://youtube.com/watch?v=..."
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.videoAutoplay || false}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      videoAutoplay: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                />
                <span className="text-sm text-slate-400">
                  Video automatisch abspielen (muted)
                </span>
              </label>
            </div>
          )}

          {/* Audio URL */}
          {showAudioInput && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                <Music className="w-4 h-4 inline mr-1" />
                Audio-URL
              </label>
              <Input
                type="url"
                value={formData.audioUrl || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, audioUrl: e.target.value }))
                }
                placeholder="https://..."
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.audioAutoplay || false}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      audioAutoplay: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                />
                <span className="text-sm text-slate-400">
                  Audio automatisch abspielen
                </span>
              </label>
            </div>
          )}

          {/* Target Devices */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Zielgeraete
            </label>
            <div className="space-y-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.targetDevices === undefined}
                  onChange={(e) => handleAllDevices(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                />
                <span className="text-sm text-white font-medium">
                  Alle Geraete
                </span>
              </label>
              {formData.targetDevices !== undefined && (
                <div className="ml-4 space-y-1 border-l border-slate-700 pl-3">
                  {devices.map((device) => (
                    <label
                      key={device.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.targetDevices?.includes(device.id) || false}
                        onChange={(e) =>
                          handleDeviceSelection(device.id, e.target.checked)
                        }
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                      />
                      <span className="text-sm text-slate-300">{device.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <Button variant="ghost" onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              iconLeft={<Send className="w-4 h-4" />}
            >
              {isEditing ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
