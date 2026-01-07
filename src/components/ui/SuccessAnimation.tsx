'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';

interface SuccessAnimationProps {
  show: boolean;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  onComplete?: () => void;
  duration?: number;
  className?: string;
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

const iconSizes = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function SuccessAnimation({
  show,
  size = 'md',
  message,
  onComplete,
  duration = 2000,
  className,
}: SuccessAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Small delay before starting animation for smooth entry
      const animateTimer = setTimeout(() => setIsAnimating(true), 50);

      // Auto-hide after duration
      const hideTimer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => {
          setIsVisible(false);
          onComplete?.();
        }, 300);
      }, duration);

      return () => {
        clearTimeout(animateTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [show, duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={clsx(
        'fixed inset-0 flex items-center justify-center z-50',
        'transition-opacity duration-300',
        isAnimating ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Content */}
      <div
        className={clsx(
          'relative flex flex-col items-center gap-4',
          'transition-transform duration-300 ease-out',
          isAnimating ? 'scale-100' : 'scale-90'
        )}
      >
        {/* Success Circle */}
        <div
          className={clsx(
            'relative rounded-full bg-green-500/20 flex items-center justify-center',
            sizeClasses[size]
          )}
        >
          {/* Animated ring */}
          <div
            className={clsx(
              'absolute inset-0 rounded-full border-2 border-green-500',
              isAnimating && 'animate-ping'
            )}
            style={{ animationDuration: '1s', animationIterationCount: '1' }}
          />

          {/* Check icon */}
          <svg
            className={clsx(
              'text-green-500',
              iconSizes[size],
              'transition-all duration-500 ease-out',
              isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            )}
            style={{ transitionDelay: '150ms' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              className={clsx(
                isAnimating && 'animate-draw-check'
              )}
              style={{
                strokeDasharray: 24,
                strokeDashoffset: isAnimating ? 0 : 24,
                transition: 'stroke-dashoffset 0.4s ease-out 0.2s',
              }}
            />
          </svg>
        </div>

        {/* Message */}
        {message && (
          <p
            className={clsx(
              'text-white font-medium text-center',
              'transition-all duration-300 ease-out',
              isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
            style={{ transitionDelay: '200ms' }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

// Inline success indicator (for forms, buttons, etc.)
export function SuccessCheck({
  show,
  size = 'sm',
  className,
}: {
  show: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center',
        'transition-all duration-300',
        show ? 'opacity-100 scale-100' : 'opacity-0 scale-50',
        className
      )}
    >
      <svg
        className={clsx('text-green-500', sizeClass)}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
    </div>
  );
}
