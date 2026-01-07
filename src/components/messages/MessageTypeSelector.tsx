'use client';

import { clsx } from 'clsx';
import { MessageSquare, Image, Video, Volume2 } from 'lucide-react';
import { MessageType } from '@/types';
import type { ReactNode } from 'react';

interface MessageTypeOption {
  type: MessageType;
  icon: ReactNode;
  label: string;
  description: string;
}

const messageTypes: MessageTypeOption[] = [
  {
    type: MessageType.TEXT,
    icon: <MessageSquare className="w-6 h-6" />,
    label: 'Text Only',
    description: 'Simple text notification',
  },
  {
    type: MessageType.TEXT_IMAGE,
    icon: <Image className="w-6 h-6" />,
    label: 'Text + Image',
    description: 'Message with visual',
  },
  {
    type: MessageType.VIDEO,
    icon: <Video className="w-6 h-6" />,
    label: 'Video Link',
    description: 'Embed Loom or YouTube',
  },
  {
    type: MessageType.AUDIO,
    icon: <Volume2 className="w-6 h-6" />,
    label: 'Audio',
    description: 'Voice message or sound',
  },
];

interface MessageTypeSelectorProps {
  value: MessageType;
  onChange: (type: MessageType) => void;
}

export function MessageTypeSelector({ value, onChange }: MessageTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {messageTypes.map((option) => {
        const isSelected = value === option.type;
        return (
          <button
            key={option.type}
            type="button"
            onClick={() => onChange(option.type)}
            className={clsx(
              'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900',
              isSelected
                ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                : 'border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-750'
            )}
          >
            <div
              className={clsx(
                'transition-colors',
                isSelected ? 'text-blue-400' : 'text-slate-400'
              )}
            >
              {option.icon}
            </div>
            <div className="text-center">
              <p
                className={clsx(
                  'font-medium text-sm',
                  isSelected ? 'text-white' : 'text-slate-200'
                )}
              >
                {option.label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
