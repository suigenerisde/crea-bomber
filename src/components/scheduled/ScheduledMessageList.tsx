'use client';

import { useMemo } from 'react';
import { Calendar, Repeat, Trash2, Edit2, Users, Clock } from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';
import { MessageType, type ScheduledMessage } from '@/types';

interface ScheduledMessageListProps {
  messages: ScheduledMessage[];
  onEdit: (message: ScheduledMessage) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
  });
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  return Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getTypeIcon(type: MessageType): string {
  switch (type) {
    case MessageType.TEXT:
      return '📝';
    case MessageType.TEXT_IMAGE:
      return '🖼️';
    case MessageType.VIDEO:
      return '🎬';
    case MessageType.AUDIO:
      return '🔊';
    default:
      return '📝';
  }
}

function getTypeLabel(type: MessageType): string {
  switch (type) {
    case MessageType.TEXT:
      return 'Text';
    case MessageType.TEXT_IMAGE:
      return 'Bild';
    case MessageType.VIDEO:
      return 'Video';
    case MessageType.AUDIO:
      return 'Audio';
    default:
      return 'Text';
  }
}

interface MessageCardProps {
  message: ScheduledMessage;
  onEdit: () => void;
  onDelete: () => void;
  isUpcoming: boolean;
}

function MessageCard({ message, onEdit, onDelete, isUpcoming }: MessageCardProps) {
  const daysUntil = getDaysUntil(message.date);

  // For recurring messages, calculate days until next occurrence
  let displayDaysUntil = daysUntil;
  if (message.recurring && daysUntil < 0) {
    // Next occurrence is next year
    const nextDate = new Date(message.date);
    nextDate.setFullYear(new Date().getFullYear() + 1);
    displayDaysUntil = getDaysUntil(nextDate.toISOString().split('T')[0]);
  }

  const daysLabel = displayDaysUntil === 0
    ? 'Heute'
    : displayDaysUntil === 1
      ? 'Morgen'
      : displayDaysUntil > 0
        ? `In ${displayDaysUntil} Tagen`
        : `Vor ${Math.abs(displayDaysUntil)} Tagen`;

  return (
    <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors group">
      {/* Date Badge */}
      <div className="flex-shrink-0 w-16 text-center">
        <div className="text-2xl font-bold text-white">
          {new Date(message.date).getDate()}
        </div>
        <div className="text-xs text-slate-400 uppercase">
          {new Date(message.date).toLocaleDateString('de-DE', { month: 'short' })}
        </div>
        {message.recurring && (
          <Repeat className="w-3 h-3 text-blue-400 mx-auto mt-1" title="Jaehrlich" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{getTypeIcon(message.type)}</span>
          <Badge variant={isUpcoming ? 'primary' : 'neutral'} size="sm">
            {getTypeLabel(message.type)}
          </Badge>
          {message.recurring && (
            <Badge variant="info" size="sm">
              Jaehrlich
            </Badge>
          )}
          {!message.targetDevices && (
            <Badge variant="success" size="sm">
              Alle Geraete
            </Badge>
          )}
        </div>
        <p className="text-white text-sm line-clamp-2 mb-2">
          {message.content}
        </p>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(message.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {daysLabel}
          </span>
          {message.targetDevices && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {message.targetDevices.length} Geraet{message.targetDevices.length !== 1 ? 'e' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          iconLeft={<Edit2 className="w-4 h-4" />}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          iconLeft={<Trash2 className="w-4 h-4" />}
        >
          Del
        </Button>
      </div>
    </div>
  );
}

export function ScheduledMessageList({
  messages,
  onEdit,
  onDelete,
  isLoading,
}: ScheduledMessageListProps) {
  // Separate upcoming and past messages
  const { upcoming, past } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const upcomingList: ScheduledMessage[] = [];
    const pastList: ScheduledMessage[] = [];

    messages.forEach((msg) => {
      if (msg.recurring) {
        // Recurring messages are always "upcoming"
        upcomingList.push(msg);
      } else if (msg.date >= today) {
        upcomingList.push(msg);
      } else {
        pastList.push(msg);
      }
    });

    // Sort upcoming by date (ascending)
    upcomingList.sort((a, b) => a.date.localeCompare(b.date));

    // Sort past by date (descending)
    pastList.sort((a, b) => b.date.localeCompare(a.date));

    return { upcoming: upcomingList, past: pastList };
  }, [messages]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-slate-800/50 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <Card className="text-center py-12">
        <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <p className="text-slate-400 text-lg mb-2">Keine geplanten Nachrichten</p>
        <p className="text-slate-500 text-sm">
          Erstelle deine erste geplante Nachricht fuer Geburtstage, Feiertage oder andere Anlaesse.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Upcoming Messages */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
            Anstehend ({upcoming.length})
          </h3>
          <div className="space-y-3">
            {upcoming.map((msg) => (
              <MessageCard
                key={msg.id}
                message={msg}
                onEdit={() => onEdit(msg)}
                onDelete={() => onDelete(msg.id)}
                isUpcoming={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Messages */}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
            Vergangen ({past.length})
          </h3>
          <div className="space-y-3 opacity-60">
            {past.map((msg) => (
              <MessageCard
                key={msg.id}
                message={msg}
                onEdit={() => onEdit(msg)}
                onDelete={() => onDelete(msg.id)}
                isUpcoming={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
