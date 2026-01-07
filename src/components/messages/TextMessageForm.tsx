'use client';

import { Textarea } from '@/components/ui';

interface TextMessagePayload {
  content: string;
}

interface TextMessageFormProps {
  value: TextMessagePayload;
  onChange: (payload: TextMessagePayload) => void;
}

export function TextMessageForm({ value, onChange }: TextMessageFormProps) {
  return (
    <div className="space-y-4">
      <Textarea
        label="Message Content"
        placeholder="Enter your notification message..."
        value={value.content}
        onChange={(e) => onChange({ content: e.target.value })}
        maxLength={500}
        showCount
      />
    </div>
  );
}
