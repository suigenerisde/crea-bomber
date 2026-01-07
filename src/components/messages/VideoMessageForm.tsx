'use client';

import { Textarea, Input } from '@/components/ui';
import { detectVideoType, getEmbedUrl } from '@/lib/video-utils';
import { Video, AlertCircle } from 'lucide-react';

interface VideoMessagePayload {
  content: string;
  videoUrl: string;
}

interface VideoMessageFormProps {
  value: VideoMessagePayload;
  onChange: (payload: VideoMessagePayload) => void;
}

export function VideoMessageForm({ value, onChange }: VideoMessageFormProps) {
  const videoType = value.videoUrl ? detectVideoType(value.videoUrl) : null;
  const embedUrl = value.videoUrl ? getEmbedUrl(value.videoUrl) : null;

  return (
    <div className="space-y-4">
      <Textarea
        label="Message Content"
        placeholder="Enter your notification message..."
        value={value.content}
        onChange={(e) => onChange({ ...value, content: e.target.value })}
        maxLength={500}
        showCount
      />

      <Input
        label="Video URL"
        type="url"
        placeholder="https://youtube.com/watch?v=... or https://loom.com/share/..."
        value={value.videoUrl}
        onChange={(e) => onChange({ ...value, videoUrl: e.target.value })}
      />

      {value.videoUrl && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-300 mb-2">
            Video Preview
            {videoType && videoType !== 'unknown' && (
              <span className="ml-2 text-xs text-slate-500 capitalize">
                ({videoType})
              </span>
            )}
          </p>
          <div className="rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
            {videoType === 'unknown' ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
                <AlertCircle className="w-8 h-8" />
                <p className="text-sm">Unsupported video URL</p>
                <p className="text-xs text-slate-600">
                  Supports YouTube and Loom URLs
                </p>
              </div>
            ) : embedUrl ? (
              <div className="aspect-video">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video preview"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
                <Video className="w-8 h-8" />
                <p className="text-sm">Enter a video URL to preview</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
