'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useSocket, useDevices, useMessages } from '@/hooks';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MessageType, type Device, type Message } from '@/types';

// Message type icon mapping
function getMessageTypeIcon(type: MessageType): string {
  switch (type) {
    case MessageType.TEXT:
      return '💬';
    case MessageType.TEXT_IMAGE:
      return '🖼️';
    case MessageType.VIDEO:
      return '🎬';
    case MessageType.AUDIO:
      return '🔊';
    default:
      return '📩';
  }
}

// Stats Card component for the metrics row
function StatsCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string;
}) {
  return (
    <Card className="flex-1 min-w-[180px]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </Card>
  );
}

// Recent activity item component
function RecentActivityItem({ message }: { message: Message }) {
  const createdAt =
    typeof message.createdAt === 'string' ? new Date(message.createdAt) : message.createdAt;
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });
  const preview =
    message.content.length > 50 ? message.content.slice(0, 50) + '...' : message.content;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-700 last:border-0">
      <span className="text-xl">{getMessageTypeIcon(message.type)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{preview}</p>
        <p className="text-xs text-slate-500">
          {message.targetDevices.length} device{message.targetDevices.length !== 1 ? 's' : ''} •{' '}
          {timeAgo}
        </p>
      </div>
      <Badge
        variant={
          message.status === 'delivered'
            ? 'success'
            : message.status === 'sent'
              ? 'info'
              : 'neutral'
        }
        size="sm"
      >
        {message.status}
      </Badge>
    </div>
  );
}

// Device status item for the overview
function DeviceStatusItem({ device }: { device: Device }) {
  const isOnline = device.status === 'online';

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span
        className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-500'}`}
        aria-label={isOnline ? 'Online' : 'Offline'}
      />
      <span className="text-sm text-white flex-1 truncate">{device.name}</span>
      <span className="text-xs text-slate-500 truncate max-w-[120px]">{device.hostname}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { socket, status: socketStatus } = useSocket();
  const { devices, onlineCount, offlineCount, loading: devicesLoading } = useDevices({ socket });
  const { messages, loading: messagesLoading } = useMessages({ socket, initialLimit: 5 });

  // Calculate stats
  const totalDevices = devices.length;

  // Messages sent today
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messagesToday = messages.filter((m) => {
    const createdAt = typeof m.createdAt === 'string' ? new Date(m.createdAt) : m.createdAt;
    return createdAt >= startOfToday;
  }).length;

  // Messages this week
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const messagesThisWeek = messages.filter((m) => {
    const createdAt = typeof m.createdAt === 'string' ? new Date(m.createdAt) : m.createdAt;
    return createdAt >= startOfWeek;
  }).length;

  const isLoading = devicesLoading || messagesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Welcome to CreaBomber - your internal push notification system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              socketStatus === 'connected'
                ? 'bg-green-500'
                : socketStatus === 'connecting' || socketStatus === 'reconnecting'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-slate-400 capitalize">{socketStatus}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Devices"
          value={isLoading ? '—' : totalDevices}
          icon="📱"
          subtitle={`${offlineCount} offline`}
        />
        <StatsCard
          title="Online Devices"
          value={isLoading ? '—' : onlineCount}
          icon="🟢"
          subtitle={totalDevices > 0 ? `${Math.round((onlineCount / totalDevices) * 100)}%` : '—'}
        />
        <StatsCard
          title="Messages Today"
          value={isLoading ? '—' : messagesToday}
          icon="📬"
        />
        <StatsCard
          title="This Week"
          value={isLoading ? '—' : messagesThisWeek}
          icon="📊"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-white">Quick Actions</h2>
            <p className="text-sm text-slate-400">Send messages to your connected devices</p>
          </div>
          <Link href="/compose">
            <Button variant="primary">Compose New Message</Button>
          </Link>
        </div>
      </Card>

      {/* Two Column Layout for Activity and Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card header={<h2 className="text-lg font-medium text-white">Recent Activity</h2>}>
          {isLoading ? (
            <div className="text-center py-6 text-slate-400">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-400">No messages yet</p>
              <Link href="/compose" className="text-blue-400 text-sm hover:underline">
                Send your first message
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.slice(0, 5).map((message) => (
                <RecentActivityItem key={message.id} message={message} />
              ))}
              {messages.length >= 5 && (
                <Link
                  href="/history"
                  className="block text-center text-sm text-blue-400 hover:underline pt-2"
                >
                  View all messages →
                </Link>
              )}
            </div>
          )}
        </Card>

        {/* Device Status Overview */}
        <Card header={<h2 className="text-lg font-medium text-white">Device Status</h2>}>
          {isLoading ? (
            <div className="text-center py-6 text-slate-400">Loading...</div>
          ) : devices.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-400">No devices registered</p>
              <p className="text-slate-500 text-sm mt-1">
                Devices will appear here once they connect
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {devices.map((device) => (
                <DeviceStatusItem key={device.id} device={device} />
              ))}
              <Link
                href="/devices"
                className="block text-center text-sm text-blue-400 hover:underline pt-2"
              >
                Manage devices →
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
