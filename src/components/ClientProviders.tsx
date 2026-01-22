'use client';

import { ReactNode } from 'react';
import { ToastProvider, SocketProvider } from '@/contexts';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ErrorBoundary>
      <SocketProvider>
        <ToastProvider>{children}</ToastProvider>
      </SocketProvider>
    </ErrorBoundary>
  );
}

export default ClientProviders;
