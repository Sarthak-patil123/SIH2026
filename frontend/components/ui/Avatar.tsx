import React from 'react';
import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
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
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
}

export default function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0',
        sizeClasses[size],
        getAvatarColor(name),
        className
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
