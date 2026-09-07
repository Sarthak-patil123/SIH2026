'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, ScanLine, Bell, ClipboardList,
  User, LogOut, Shield, ChevronLeft, ChevronRight, Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from './Avatar';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const officerNav: NavItem[] = [
  { label: 'Dashboard', href: '/officer/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'My Cases', href: '/officer/cases', icon: <FolderOpen size={18} /> },
  { label: 'New Verification', href: '/officer/verify', icon: <ScanLine size={18} /> },
  { label: 'Profile', href: '/officer/profile', icon: <User size={18} /> },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Cases', href: '/admin/cases', icon: <FolderOpen size={18} /> },
  { label: 'Alerts', href: '/admin/alerts', icon: <Bell size={18} /> },
  { label: 'Audit Trail', href: '/admin/audit', icon: <ClipboardList size={18} /> },
  { label: 'Profile', href: '/admin/profile', icon: <User size={18} /> },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = user?.role === 'ADMIN' ? adminNav : officerNav;

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-navy-800 border-r border-navy-600 transition-all duration-200 flex-shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 h-16 border-b border-navy-600 flex-shrink-0',
        collapsed && 'justify-center px-2'
      )}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight">IDVerify</p>
            <p className="text-[10px] text-slate-400 leading-tight">Border Security System</p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            {user?.role === 'ADMIN' ? 'Administration' : 'Operations'}
          </p>
        )}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/officer/dashboard' && item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-blue-600 text-white shadow-glow-blue'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-navy-700'
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: User + Logout */}
      <div className="border-t border-navy-600 p-2 space-y-0.5">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-navy-700/50 mb-1">
            <Avatar name={user.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.employeeId}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-slate-400',
            'hover:text-danger hover:bg-danger/10 transition-all duration-150',
            collapsed && 'justify-center'
          )}
        >
          <LogOut size={18} />
          {!collapsed && 'Logout'}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-md text-xs text-slate-500 hover:text-slate-300 hover:bg-navy-700 transition-all duration-150',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}

// ── Mobile sidebar toggle button ───────────────────────────────
export function MobileSidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="md:hidden p-2 text-slate-400 hover:text-white">
      <Menu size={20} />
    </button>
  );
}

// ── Mobile Drawer ──────────────────────────────────────────────
export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const navItems = user?.role === 'ADMIN' ? adminNav : officerNav;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-navy-950/80 md:hidden" onClick={onClose} />
      <aside className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-navy-800 border-r border-navy-600 flex flex-col md:hidden">
        <div className="flex items-center justify-between px-4 h-16 border-b border-navy-600">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white">IDVerify</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">✕</button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150',
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-navy-700'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-navy-600 p-2">
          <button
            onClick={() => { logout(); onClose(); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-slate-400 hover:text-danger hover:bg-danger/10 transition-all duration-150"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
