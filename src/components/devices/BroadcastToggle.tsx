'use client';

import { useEffect, useState, useCallback } from 'react';
import { clsx } from 'clsx';

type BroadcastMode = 'all' | 'selected';

interface BroadcastToggleProps {
  mode: BroadcastMode;
  onChange: (mode: BroadcastMode) => void;
  onlineCount: number;
  selectedCount: number;
  className?: string;
}

const STORAGE_KEY = 'creabomber-broadcast-mode';

/**
 * BroadcastToggle allows switching between "An alle" (broadcast) and "Ausgewaehlte" (selected) mode
 * Persists selection in localStorage for better UX
 */
export function BroadcastToggle({
  mode,
  onChange,
  onlineCount,
  selectedCount,
  className = '',
}: BroadcastToggleProps) {
  const [mounted, setMounted] = useState(false);

  // Load saved mode from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY) as BroadcastMode | null;
    if (saved && (saved === 'all' || saved === 'selected')) {
      onChange(saved);
    }
  }, [onChange]);

  // Save mode to localStorage when it changes
  const handleModeChange = useCallback(
    (newMode: BroadcastMode) => {
      localStorage.setItem(STORAGE_KEY, newMode);
      onChange(newMode);
    },
    [onChange]
  );

  // Don't render different content on server vs client
  if (!mounted) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex rounded-lg bg-slate-800/50 p-1">
          <div className="flex-1 px-3 py-2" />
          <div className="flex-1 px-3 py-2" />
        </div>
      </div>
    );
  }

  const targetCount = mode === 'all' ? onlineCount : selectedCount;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Toggle Buttons */}
      <div className="flex rounded-lg bg-slate-800/50 p-1">
        <button
          type="button"
          onClick={() => handleModeChange('all')}
          className={clsx(
            'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
            mode === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            An alle
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('selected')}
          className={clsx(
            'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
            mode === 'selected'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          )}
        >
          <span className="flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Ausgewaehlte
          </span>
        </button>
      </div>

      {/* Status Message */}
      <p className="text-xs text-slate-400 text-center">
        {mode === 'all' ? (
          <>
            Wird an{' '}
            <span className="text-green-400 font-medium">{onlineCount} online</span>{' '}
            {onlineCount === 1 ? 'Geraet' : 'Geraete'} gesendet
          </>
        ) : (
          <>
            Wird an{' '}
            <span className="text-blue-400 font-medium">{selectedCount}</span>{' '}
            {selectedCount === 1 ? 'ausgewaehltes Geraet' : 'ausgewaehlte Geraete'} gesendet
          </>
        )}
      </p>

      {/* Warning for no targets */}
      {targetCount === 0 && (
        <div className="px-3 py-2 rounded-md bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-xs text-yellow-400">
            {mode === 'all'
              ? 'Keine Geraete online. Nachricht wird nicht zugestellt.'
              : 'Bitte waehle mindestens ein Geraet aus.'}
          </p>
        </div>
      )}
    </div>
  );
}
