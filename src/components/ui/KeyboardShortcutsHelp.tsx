'use client';

import { useState, useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useEscapeKey } from '@/hooks/useKeyboardShortcuts';

interface ShortcutItem {
  keys: string;
  description: string;
  context?: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: '⌘N', description: 'Compose new message', context: 'Dashboard' },
  { keys: '⌘↵', description: 'Send message', context: 'Compose (when valid)' },
  { keys: 'Esc', description: 'Close modal/dialog', context: 'Any modal' },
  { keys: 'Tab', description: 'Navigate between fields', context: 'Forms' },
  { keys: '⌘?', description: 'Toggle this help', context: 'Anywhere' },
];

interface KeyboardShortcutsHelpProps {
  className?: string;
}

export function KeyboardShortcutsHelp({ className = '' }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(navigator.platform.includes('Mac'));
  }, []);

  // Close on Escape
  useEscapeKey(() => setIsOpen(false), isOpen);

  // Listen for Cmd+? / Ctrl+? to toggle help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '?') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Convert Mac shortcuts to Windows/Linux format if needed
  const formatKeys = (keys: string): string => {
    if (isMac) return keys;
    return keys
      .replace('⌘', 'Ctrl+')
      .replace('⇧', 'Shift+')
      .replace('⌥', 'Alt+')
      .replace('↵', 'Enter');
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ${className}`}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (⌘?)"
      >
        <Keyboard className="w-5 h-5" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Content */}
          <div className="relative bg-slate-800 rounded-lg border border-slate-700 shadow-xl w-full max-w-md mx-4 animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <Keyboard className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-3">
              {SHORTCUTS.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-white text-sm">{shortcut.description}</p>
                    {shortcut.context && (
                      <p className="text-xs text-slate-500">{shortcut.context}</p>
                    )}
                  </div>
                  <kbd className="ml-4 px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs font-mono text-slate-300 min-w-[3rem] text-center">
                    {formatKeys(shortcut.keys)}
                  </kbd>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-700 bg-slate-800/50">
              <p className="text-xs text-slate-500 text-center">
                Press <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">Esc</kbd> to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
