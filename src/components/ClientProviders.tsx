'use client';

import { ReactNode } from 'react';
import { ToastProvider } from '@/contexts';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ErrorBoundary>
      <ToastProvider>{children}</ToastProvider>
    </ErrorBoundary>
  );
}

export default ClientProviders;
