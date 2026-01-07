'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SoundType = 'success' | 'error' | 'notification' | 'send';

interface SoundSettings {
  enabled: boolean;
  volume: number; // 0-1
}

const STORAGE_KEY = 'creabomber-sound-settings';

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.5,
};

// Web Audio API based sound generation (no external files needed)
function createOscillatorSound(
  audioContext: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
): void {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  // Envelope for smoother sound
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

// Sound patterns for different notification types
const soundPatterns: Record<SoundType, (ctx: AudioContext, vol: number) => void> = {
  success: (ctx, vol) => {
    // Rising two-tone success sound
    createOscillatorSound(ctx, 523.25, 0.15, 'sine', vol); // C5
    setTimeout(() => createOscillatorSound(ctx, 659.25, 0.2, 'sine', vol), 100); // E5
  },
  error: (ctx, vol) => {
    // Descending error sound
    createOscillatorSound(ctx, 440, 0.15, 'square', vol * 0.5); // A4
    setTimeout(() => createOscillatorSound(ctx, 349.23, 0.2, 'square', vol * 0.5), 100); // F4
  },
  notification: (ctx, vol) => {
    // Gentle ping
    createOscillatorSound(ctx, 880, 0.1, 'sine', vol);
    setTimeout(() => createOscillatorSound(ctx, 1108.73, 0.15, 'sine', vol * 0.7), 80);
  },
  send: (ctx, vol) => {
    // Whoosh-like send sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(vol * 0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  },
};

export function useSoundNotification() {
  const [settings, setSettings] = useState<SoundSettings>(DEFAULT_SETTINGS);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      // Ignore parse errors, use defaults
    }
  }, []);

  // Initialize AudioContext lazily (requires user interaction)
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play a sound
  const play = useCallback(
    (type: SoundType) => {
      if (!settings.enabled) return;

      try {
        const ctx = getAudioContext();
        // Resume context if suspended (browser autoplay policy)
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        soundPatterns[type](ctx, settings.volume);
      } catch (err) {
        console.warn('Failed to play sound:', err);
      }
    },
    [settings.enabled, settings.volume, getAudioContext]
  );

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<SoundSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  // Toggle enabled
  const toggleEnabled = useCallback(() => {
    updateSettings({ enabled: !settings.enabled });
  }, [settings.enabled, updateSettings]);

  // Set volume
  const setVolume = useCallback(
    (volume: number) => {
      updateSettings({ volume: Math.max(0, Math.min(1, volume)) });
    },
    [updateSettings]
  );

  // Convenience methods
  const playSuccess = useCallback(() => play('success'), [play]);
  const playError = useCallback(() => play('error'), [play]);
  const playNotification = useCallback(() => play('notification'), [play]);
  const playSend = useCallback(() => play('send'), [play]);

  return {
    settings,
    play,
    playSuccess,
    playError,
    playNotification,
    playSend,
    updateSettings,
    toggleEnabled,
    setVolume,
  };
}
