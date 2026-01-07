'use client';

import { Textarea, Input, Toggle } from '@/components/ui';
import { Volume2 } from 'lucide-react';

interface AudioMessagePayload {
  content: string;
  audioUrl: string;
  autoplay: boolean;
}

interface AudioMessageFormProps {
  value: AudioMessagePayload;
  onChange: (payload: AudioMessagePayload) => void;
}

export function AudioMessageForm({ value, onChange }: AudioMessageFormProps) {
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
        label="Audio URL"
        type="url"
        placeholder="https://example.com/audio.mp3"
        value={value.audioUrl}
        onChange={(e) => onChange({ ...value, audioUrl: e.target.value })}
      />

      <Toggle
        checked={value.autoplay}
        onChange={(checked) => onChange({ ...value, autoplay: checked })}
        label="Auto-play on receive"
      />

      {value.audioUrl && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-300 mb-2">Audio Preview</p>
          <div className="rounded-lg overflow-hidden bg-slate-900 border border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-blue-400" />
              </div>
              <audio
                controls
                className="flex-1 h-10"
                src={value.audioUrl}
                preload="metadata"
              >
                Your browser does not support the audio element.
              </audio>
            </div>
            {value.autoplay && (
              <p className="text-xs text-slate-500 mt-2 ml-13">
                Audio will auto-play when received
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
