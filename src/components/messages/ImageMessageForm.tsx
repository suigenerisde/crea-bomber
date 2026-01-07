'use client';

import { useState, useEffect } from 'react';
import { Textarea, Input } from '@/components/ui';
import { ImageOff } from 'lucide-react';

interface ImageMessagePayload {
  content: string;
  imageUrl: string;
}

interface ImageMessageFormProps {
  value: ImageMessagePayload;
  onChange: (payload: ImageMessagePayload) => void;
}

export function ImageMessageForm({ value, onChange }: ImageMessageFormProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    if (!value.imageUrl) {
      setImageError(false);
      setImageLoading(false);
      return;
    }

    setImageLoading(true);
    setImageError(false);

    const img = new window.Image();
    img.onload = () => {
      setImageLoading(false);
      setImageError(false);
    };
    img.onerror = () => {
      setImageLoading(false);
      setImageError(true);
    };
    img.src = value.imageUrl;
  }, [value.imageUrl]);

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
        label="Image URL"
        type="url"
        placeholder="https://example.com/image.png"
        value={value.imageUrl}
        onChange={(e) => onChange({ ...value, imageUrl: e.target.value })}
      />

      {value.imageUrl && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-300 mb-2">Image Preview</p>
          <div className="rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
            {imageLoading && (
              <div className="flex items-center justify-center h-48 text-slate-500">
                <div className="animate-pulse">Loading image...</div>
              </div>
            )}
            {imageError && !imageLoading && (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
                <ImageOff className="w-8 h-8" />
                <p className="text-sm">Invalid image URL</p>
              </div>
            )}
            {!imageError && !imageLoading && (
              <img
                src={value.imageUrl}
                alt="Preview"
                className="w-full max-h-64 object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
