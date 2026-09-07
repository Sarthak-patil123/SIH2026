import React from 'react';
import { cn } from '@/lib/utils';

interface ConfidenceBarProps {
  value: number; // 0 to 100
  segmentsCount?: number;
  showSegments?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function ConfidenceBar({
  value,
  segmentsCount = 12,
  showSegments = true,
  showLabel = true,
  size = 'sm',
  className,
}: ConfidenceBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const activeSegments = Math.round((clamped / 100) * segmentsCount);

  // Determine color scheme
  let barColor = 'bg-emerald-500';
  let textColor = 'text-emerald-700';

  if (clamped < 60) {
    barColor = 'bg-rose-500';
    textColor = 'text-rose-700';
  } else if (clamped < 80) {
    barColor = 'bg-amber-500';
    textColor = 'text-amber-700';
  }

  if (showSegments) {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <div className="flex items-center gap-[2.5px]">
          {Array.from({ length: segmentsCount }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'rounded-full transition-all duration-150',
                size === 'sm' ? 'w-[3px] h-3.5' : 'w-1 h-5',
                i < activeSegments ? barColor : 'bg-slate-200'
              )}
            />
          ))}
        </div>
        {showLabel && (
          <span className={cn('text-xs font-semibold tabular-nums', textColor)}>
            {clamped}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2.5 w-full', className)}>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('text-xs font-semibold tabular-nums shrink-0', textColor)}>
          {clamped}%
        </span>
      )}
    </div>
  );
}
