'use client';

import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface NotificationBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  pulse?: boolean;
  showZero?: boolean;
  className?: string;
  children?: ReactNode;
}

const variantStyles = {
  default: 'bg-blue-500 text-white',
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-500 text-white',
  danger: 'bg-red-500 text-white',
};

const sizeStyles = {
  sm: 'min-w-[18px] h-[18px] text-[10px] px-1',
  md: 'min-w-[22px] h-[22px] text-xs px-1.5',
};

export function NotificationBadge({
  count,
  max = 99,
  variant = 'default',
  size = 'sm',
  pulse = false,
  showZero = false,
  className,
  children,
}: NotificationBadgeProps) {
  const displayCount = count > max ? `${max}+` : count.toString();
  const shouldShow = showZero || count > 0;

  if (!children) {
    // Standalone badge
    if (!shouldShow) return null;

    return (
      <span
        className={clsx(
          'inline-flex items-center justify-center font-semibold rounded-full',
          variantStyles[variant],
          sizeStyles[size],
          pulse && count > 0 && 'animate-pulse',
          className
        )}
      >
        {displayCount}
      </span>
    );
  }

  // Badge with children (positioned)
  return (
    <span className={clsx('relative inline-flex', className)}>
      {children}
      {shouldShow && (
        <span
          className={clsx(
            'absolute -top-1 -right-1',
            'inline-flex items-center justify-center font-semibold rounded-full',
            variantStyles[variant],
            sizeStyles[size],
            pulse && count > 0 && 'animate-pulse',
            'transform transition-transform',
            count > 0 ? 'scale-100' : 'scale-0'
          )}
        >
          {displayCount}
        </span>
      )}
    </span>
  );
}

// Dot indicator (for simple presence indication)
export function NotificationDot({
  show = true,
  variant = 'default',
  pulse = false,
  className,
  children,
}: {
  show?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  pulse?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const dotStyles = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  if (!children) {
    // Standalone dot
    if (!show) return null;

    return (
      <span
        className={clsx(
          'inline-block w-2 h-2 rounded-full',
          dotStyles[variant],
          pulse && 'animate-pulse',
          className
        )}
      />
    );
  }

  // Dot with children (positioned)
  return (
    <span className={clsx('relative inline-flex', className)}>
      {children}
      {show && (
        <span
          className={clsx(
            'absolute -top-0.5 -right-0.5',
            'w-2.5 h-2.5 rounded-full',
            dotStyles[variant],
            pulse && 'animate-pulse',
            'transform transition-transform',
            show ? 'scale-100' : 'scale-0'
          )}
        />
      )}
    </span>
  );
}
