'use client';

import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useSocket } from '@/hooks/useSocket';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  headerActions?: ReactNode;
}

export function MainLayout({
  children,
  title = 'Dashboard',
  headerActions,
}: MainLayoutProps) {
  const { status } = useSocket();
  // Map 'reconnecting' to 'connecting' for Header component
  const connectionStatus = status === 'reconnecting' ? 'connecting' : status;
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="ml-64 min-h-screen flex flex-col">
        {/* Header */}
        <Header
          title={title}
          connectionStatus={connectionStatus}
          actions={headerActions}
        />

        {/* Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
