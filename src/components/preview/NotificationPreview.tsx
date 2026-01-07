'use client';

import { clsx } from 'clsx';
import { format } from 'date-fns';
import { Zap, Play, Volume2 } from 'lucide-react';
import { MessageType } from '@/types';
import { getThumbnailUrl } from '@/lib/video-utils';
import type { MessageData } from '@/components/messages/MessageComposer';

interface NotificationPreviewProps {
  message: MessageData;
  animate?: boolean;
  className?: string;
}

export function NotificationPreview({
  message,
  animate = true,
  className,
}: NotificationPreviewProps) {
  const timestamp = format(new Date(), 'h:mm a');
  const thumbnailUrl = message.videoUrl ? getThumbnailUrl(message.videoUrl) : null;

  return (
    <div
      className={clsx(
        'w-[380px] bg-slate-800/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden',
        'border border-slate-700/50',
        animate && 'animate-slide-in',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">CreaBomber</p>
          <p className="text-xs text-slate-400">Notification</p>
        </div>
        <span className="text-xs text-slate-500">{timestamp}</span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Text Content */}
        <p className="text-sm text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
          {message.content || 'No message content'}
        </p>

        {/* Image Preview */}
        {message.type === MessageType.TEXT_IMAGE && message.imageUrl && (
          <div className="rounded-lg overflow-hidden bg-slate-900/50">
            <img
              src={message.imageUrl}
              alt="Notification image"
              className="w-full max-h-48 object-cover"
            />
          </div>
        )}

        {/* Video Thumbnail Preview */}
        {message.type === MessageType.VIDEO && thumbnailUrl && (
          <div className="relative rounded-lg overflow-hidden bg-slate-900/50">
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-5 h-5 text-slate-800 ml-1" />
              </div>
            </div>
          </div>
        )}

        {/* Audio Preview */}
        {message.type === MessageType.AUDIO && message.audioUrl && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              {/* Waveform visualization (static for preview) */}
              <div className="flex items-center gap-0.5 h-6">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-blue-400/60 rounded-full"
                    style={{
                      height: `${Math.random() * 100}%`,
                      minHeight: '4px',
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-500">Audio message</span>
                {message.audioAutoplay && (
                  <span className="text-xs text-blue-400">Auto-play</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
