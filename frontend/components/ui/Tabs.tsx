'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (id: string) => void;
  className?: string;
  children?: (activeTab: string) => React.ReactNode;
}

export default function Tabs({ tabs, defaultTab, onChange, className, children }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? '');

  const handleChange = (id: string) => {
    setActiveTab(id);
    onChange?.(id);
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Tab Bar */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150',
                isActive
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              )}
            >
              {tab.icon && <span className="w-4 h-4 flex items-center justify-center">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={cn(
                  'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
                  isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {children && <div className="flex-1">{children(activeTab)}</div>}
    </div>
  );
}
