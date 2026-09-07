'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, ScanLine, Bell, ClipboardList,
  User, LogOut, Shield, ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from './Avatar';

interface NavSection {
  title: string;
  items: {
    label: string;
    href: string;
    icon: React.ReactNode;
  }[];
}

const officerSections: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Dashboard', href: '/officer/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'My Cases', href: '/officer/cases', icon: <FolderOpen size={18} /> },
      { label: 'New Verification', href: '/officer/verify', icon: <ScanLine size={18} /> },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', href: '/officer/profile', icon: <User size={18} /> },
    ],
  },
];

const adminSections: NavSection[] = [
  {
    title: 'Oversight',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'All Cases', href: '/admin/cases', icon: <FolderOpen size={18} /> },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { label: 'Alerts', href: '/admin/alerts', icon: <Bell size={18} /> },
      { label: 'Audit Trail', href: '/admin/audit', icon: <ClipboardList size={18} /> },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', href: '/admin/profile', icon: <User size={18} /> },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const sections = user?.role === 'ADMIN' ? adminSections : officerSections;

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-white border-r border-slate-200/90 transition-all duration-200 flex-shrink-0 z-20 select-none',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className={cn(
        'flex items-center gap-3 px-5 h-16 border-b border-slate-100 flex-shrink-0',
        collapsed && 'justify-center px-2'
      )}>
        <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-subtle flex-shrink-0">
          <Shield size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-heading text-sm font-bold text-slate-900 tracking-tight leading-none">
              IDVerify
            </p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1 leading-none">
              Security Ops
            </p>
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/officer/dashboard' &&
                  item.href !== '/admin/dashboard' &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                    collapsed ? 'justify-center px-2' : '',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-subtle'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  )}
                >
                  <span className={cn('flex-shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Info & Actions */}
      <div className="border-t border-slate-100 p-3 space-y-1 bg-slate-50/50">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/70 shadow-subtle mb-1">
            <Avatar name={user.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.employeeId}</p>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
              {user.role}
            </span>
          </div>
        )}

        <button
          onClick={logout}
          title={collapsed ? 'Sign Out' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-slate-600',
            'hover:text-rose-600 hover:bg-rose-50 transition-all duration-150',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all',
            collapsed && 'justify-center px-1'
          )}
        >
          {collapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}

// ── Mobile Sidebar Toggle Button ───────────────────────────────
export function MobileSidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
      aria-label="Open menu"
    >
      <Menu size={20} />
    </button>
  );
}

// ── Mobile Drawer ──────────────────────────────────────────────
export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const sections = user?.role === 'ADMIN' ? adminSections : officerSections;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden" onClick={onClose} />
      <aside className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col md:hidden animate-slide-in">
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
              <Shield size={16} />
            </div>
            <span className="font-heading text-sm font-bold text-slate-900">IDVerify</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {section.title}
              </p>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                      isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    )}
                  >
                    <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button
            onClick={() => { logout(); onClose(); }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-all"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
