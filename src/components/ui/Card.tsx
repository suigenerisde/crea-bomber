'use client';

import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  hover?: boolean;
  border?: 'none' | 'default' | 'accent';
  className?: string;
}

const borderStyles = {
  none: '',
  default: 'border border-slate-700',
  accent: 'border border-blue-500/50',
};

export function Card({
  children,
  header,
  footer,
  hover = false,
  border = 'default',
  className,
}: CardProps) {
  return (
    <div
      className={clsx(
        'bg-slate-800 rounded-lg overflow-hidden',
        borderStyles[border],
        hover && 'transition-colors hover:bg-slate-750 hover:border-slate-600',
        className
      )}
    >
      {header && (
        <div className="px-4 py-3 border-b border-slate-700">{header}</div>
      )}
      <div className="p-4">{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/50">
          {footer}
        </div>
      )}
    </div>
  );
}
