import React from 'react';
import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
  xl: 'w-16 h-16 text-xl',
};

// Deterministic color based on name
function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-600', 'bg-purple-600', 'bg-emerald-600',
    'bg-indigo-600', 'bg-cyan-600', 'bg-teal-600',
  ];
  const safeName = name || 'User';
  const idx = safeName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
}

export default function Avatar({ name = 'User', size = 'md', className }: AvatarProps) {
  const safeName = name || 'User';
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 select-none shadow-subtle',
        sizeClasses[size],
        getAvatarColor(safeName),
        className
      )}
      title={safeName}
    >
      {getInitials(safeName)}
    </div>
  );
}
