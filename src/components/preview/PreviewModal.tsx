'use client';

import { useEffect, useCallback } from 'react';
import { X, Send, PencilLine, Monitor } from 'lucide-react';
import { Button } from '@/components/ui';
import { NotificationPreview } from './NotificationPreview';
import type { MessageData } from '@/components/messages/MessageComposer';

interface PreviewModalProps {
  isOpen: boolean;
  message: MessageData;
  targetDeviceCount: number;
  onClose: () => void;
  onSend: () => void;
  onEdit: () => void;
}

export function PreviewModal({
  isOpen,
  message,
  targetDeviceCount,
  onClose,
  onSend,
  onEdit,
}: PreviewModalProps) {
  // Handle escape key
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 p-8 animate-scale-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close preview"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Title */}
        <div className="text-center">
          <h2
            id="preview-modal-title"
            className="text-xl font-semibold text-white"
          >
            Preview Notification
          </h2>
          {targetDeviceCount > 0 ? (
            <p className="text-sm text-slate-400 mt-1">
              This is how your message will appear on {targetDeviceCount} device
              {targetDeviceCount !== 1 ? 's' : ''}
            </p>
          ) : (
            <p className="text-sm text-yellow-400 mt-1">
              No devices selected - select devices before sending
            </p>
          )}
        </div>

        {/* Mac Screen Bezel Frame */}
        <div className="relative">
          {/* Screen bezel */}
          <div className="bg-slate-950 rounded-2xl p-4 shadow-2xl border border-slate-700/50">
            {/* Screen header (menu bar mockup) */}
            <div className="flex items-center justify-between px-2 py-1 mb-3 rounded-t-lg bg-slate-800/50">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Monitor className="w-3 h-3" />
                <span>Desktop Preview</span>
              </div>
            </div>

            {/* Notification preview area */}
            <div className="min-w-[420px] min-h-[280px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-start justify-end p-4">
              <NotificationPreview message={message} animate={false} />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onEdit} iconLeft={<PencilLine className="w-4 h-4" />}>
            Edit
          </Button>
          <Button
            variant="primary"
            onClick={onSend}
            disabled={targetDeviceCount === 0}
            iconLeft={<Send className="w-4 h-4" />}
          >
            {targetDeviceCount === 0 ? 'Select Devices First' : 'Looks good - Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
