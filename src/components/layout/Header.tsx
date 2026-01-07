'use client';

import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface HeaderProps {
  title: string;
  connectionStatus?: ConnectionStatus;
  actions?: ReactNode;
}

const statusConfig: Record<ConnectionStatus, { label: string; dotClass: string; textClass: string }> = {
  connected: {
    label: 'Connected',
    dotClass: 'bg-green-500 status-online',
    textClass: 'text-green-400',
  },
  disconnected: {
    label: 'Disconnected',
    dotClass: 'bg-red-500',
    textClass: 'text-red-400',
  },
  connecting: {
    label: 'Connecting...',
    dotClass: 'bg-yellow-500 animate-pulse-custom',
    textClass: 'text-yellow-400',
  },
};

export function Header({ title, connectionStatus = 'disconnected', actions }: HeaderProps) {
  const status = statusConfig[connectionStatus];

  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6">
      {/* Page Title */}
      <h1 className="text-xl font-semibold text-white">{title}</h1>

      {/* Right side: Status + Actions */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className={clsx('w-2.5 h-2.5 rounded-full', status.dotClass)} />
          <span className={clsx('text-sm font-medium', status.textClass)}>
            {status.label}
          </span>
        </div>

        {/* Optional Action Buttons */}
        {actions && (
          <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
