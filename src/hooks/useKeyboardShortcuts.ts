'use client';

import { useEffect, useCallback } from 'react';

export type KeyboardShortcut = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description?: string;
  disabled?: boolean;
};

/**
 * Hook for handling keyboard shortcuts.
 * Supports meta (Cmd on Mac), ctrl, shift, and alt modifiers.
 *
 * @param shortcuts - Array of shortcut configurations
 * @param options - Additional options for shortcut handling
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: {
    enabled?: boolean;
    preventDefault?: boolean;
    stopPropagation?: boolean;
  } = {}
) {
  const { enabled = true, preventDefault = true, stopPropagation = false } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore shortcuts when typing in input/textarea/contenteditable
      const target = event.target as HTMLElement;
      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        if (shortcut.disabled) continue;

        // Check key match (case-insensitive)
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        if (!keyMatch) continue;

        // Check modifiers
        const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey;
        const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.altKey ? event.altKey : !event.altKey;

        // Special handling: Allow shortcuts that require modifiers in input elements
        // but block non-modifier shortcuts
        if (isInputElement && !shortcut.metaKey && !shortcut.ctrlKey) {
          continue;
        }

        if (keyMatch && metaMatch && ctrlMatch && shiftMatch && altMatch) {
          if (preventDefault) {
            event.preventDefault();
          }
          if (stopPropagation) {
            event.stopPropagation();
          }
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled, preventDefault, stopPropagation]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for handling Escape key to close modals/dialogs.
 */
export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
  useKeyboardShortcuts(
    [{ key: 'Escape', action: onEscape }],
    { enabled }
  );
}

/**
 * Format a shortcut for display (e.g., "⌘N" or "Ctrl+N")
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  const parts: string[] = [];

  if (shortcut.metaKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.ctrlKey && !shortcut.metaKey) {
    parts.push('Ctrl');
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Format key
  const keyDisplay = shortcut.key.length === 1
    ? shortcut.key.toUpperCase()
    : shortcut.key === 'Enter' ? '↵' : shortcut.key;
  parts.push(keyDisplay);

  return isMac ? parts.join('') : parts.join('+');
}
