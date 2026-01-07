'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800 rounded-lg border border-slate-700 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              An unexpected error occurred. You can try reloading the component or
              go back to the dashboard.
            </p>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-4 p-3 bg-slate-900 rounded text-left overflow-auto max-h-32">
                <p className="text-red-400 text-xs font-mono">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <p className="text-slate-500 text-xs font-mono mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack.slice(0, 500)}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center mt-6">
              <Button
                variant="secondary"
                onClick={this.handleRetry}
                iconLeft={<RefreshCw className="w-4 h-4" />}
              >
                Try Again
              </Button>
              <Button
                variant="primary"
                onClick={this.handleGoHome}
                iconLeft={<Home className="w-4 h-4" />}
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use with custom error messages
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  name?: string;
}

export function ComponentErrorBoundary({
  children,
  name = 'Component',
}: ErrorBoundaryWrapperProps): ReactNode {
  return (
    <ErrorBoundary
      onError={(error) => {
        console.error(`[${name}] Error caught by boundary:`, error);
      }}
      fallback={
        <div className="p-4 bg-slate-800/50 rounded-lg border border-red-500/20">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              Failed to load {name}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Please refresh the page or try again later.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
