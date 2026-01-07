'use client';

import { clsx } from 'clsx';
import { useRef, useEffect, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  showCount?: boolean;
  autoResize?: boolean;
}

export function Textarea({
  label,
  error,
  showCount = false,
  autoResize = true,
  maxLength,
  disabled,
  className,
  id,
  value,
  onChange,
  ...props
}: TextareaProps) {
  const textareaId = id || props.name;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value, autoResize]);

  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-slate-300 mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        ref={textareaRef}
        id={textareaId}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        onChange={onChange}
        className={clsx(
          'w-full bg-slate-900 border rounded-lg px-3 py-2 text-white placeholder-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'transition-colors resize-none min-h-[100px]',
          error ? 'border-red-500' : 'border-slate-700',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-800',
          className
        )}
        {...props}
      />
      <div className="flex justify-between mt-1.5">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {showCount && maxLength && (
          <p
            className={clsx(
              'text-sm ml-auto',
              currentLength >= maxLength ? 'text-red-500' : 'text-slate-500'
            )}
          >
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
