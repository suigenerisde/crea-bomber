'use client';

import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  return (
    <div
      className={clsx(
        'bg-slate-700',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-md',
        variant === 'text' && 'rounded',
        animation === 'pulse' && 'animate-pulse',
        animation === 'wave' && 'skeleton-wave',
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}

// Skeleton variants for specific use cases
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-slate-800 rounded-lg border border-slate-700 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="h-5 w-3/4" />
          <Skeleton variant="text" className="h-4 w-1/2" />
        </div>
        <Skeleton variant="rectangular" className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton variant="text" className="h-3 w-1/3 mt-3" />
    </div>
  );
}

export function SkeletonDeviceCard({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-slate-800 rounded-lg border border-slate-700 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="h-5 w-2/3" />
          <Skeleton variant="text" className="h-4 w-1/2" />
        </div>
        <Skeleton variant="rectangular" className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton variant="text" className="h-3 w-1/4 mt-3" />
    </div>
  );
}

export function SkeletonMessageItem({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-slate-800 rounded-lg border border-slate-700 p-4', className)}>
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" className="h-10 w-10 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" className="h-5 w-1/4" />
            <Skeleton variant="rectangular" className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton variant="text" className="h-4 w-full" />
          <Skeleton variant="text" className="h-4 w-3/4" />
          <div className="flex items-center gap-4 mt-2">
            <Skeleton variant="text" className="h-3 w-20" />
            <Skeleton variant="text" className="h-3 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonStatsCard({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-slate-800 rounded-lg border border-slate-700 p-4', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-4 w-24" />
          <Skeleton variant="text" className="h-8 w-16" />
          <Skeleton variant="text" className="h-3 w-16" />
        </div>
        <Skeleton variant="text" className="h-8 w-8" />
      </div>
    </div>
  );
}

// Loading grid for device list
export function DeviceListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonDeviceCard key={i} />
      ))}
    </div>
  );
}

// Loading list for message history
export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonMessageItem key={i} />
      ))}
    </div>
  );
}

// Stats row skeleton
export function StatsRowSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonStatsCard key={i} />
      ))}
    </div>
  );
}
