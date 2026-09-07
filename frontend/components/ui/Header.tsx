'use client';

import React, { useState } from 'react';
import { Bell, Search, ChevronDown, User, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockOfficerNotifications, mockAdminNotifications } from '@/lib/mock-data';
import { cn, timeAgo } from '@/lib/utils';
import Avatar from './Avatar';
import { RoleBadge } from './Badge';
import { MobileSidebarToggle } from './Sidebar';
import { Notification } from '@/types';

interface HeaderProps {
  onMobileMenuOpen?: () => void;
}

export default function Header({ onMobileMenuOpen }: HeaderProps) {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { logout } = useAuth();

  const notifications: Notification[] = user?.role === 'ADMIN' ? mockAdminNotifications : mockOfficerNotifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const notifTypeColors: Record<string, string> = {
    INFO: 'bg-info',
    SUCCESS: 'bg-success',
    WARNING: 'bg-warning',
    DANGER: 'bg-danger',
  };

  return (
    <header className="h-16 bg-navy-800 border-b border-navy-600 flex items-center px-4 gap-4 flex-shrink-0 z-30">
      {/* Mobile menu */}
      <MobileSidebarToggle onClick={() => onMobileMenuOpen?.()} />

      {/* Search */}
      <div className="hidden sm:flex items-center flex-1 max-w-sm relative">
        <Search size={15} className="absolute left-3 text-slate-500" />
        <input
          type="search"
          placeholder="Search cases, case IDs..."
          className="w-full bg-navy-700 border border-navy-600 text-slate-300 rounded-md pl-9 pr-3 py-1.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex-1" />

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setNotifOpen((o) => !o); setUserMenuOpen(false); }}
          className="relative p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-md transition-colors"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-danger rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-80 bg-navy-800 border border-navy-500 rounded-xl shadow-2xl z-20 overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-navy-600">
                <p className="text-sm font-semibold text-slate-200">Notifications</p>
                {unreadCount > 0 && (
                  <span className="text-xs text-danger font-medium">{unreadCount} unread</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-slate-500 text-center">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={cn('px-4 py-3 border-b border-navy-700 hover:bg-navy-700/50 transition-colors', !n.read && 'bg-navy-700/30')}>
                      <div className="flex items-start gap-2.5">
                        <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', notifTypeColors[n.type])} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-200">{n.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => { setUserMenuOpen((o) => !o); setNotifOpen(false); }}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-navy-700 transition-colors"
        >
          {user && <Avatar name={user.name} size="sm" />}
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-200 leading-tight">{user?.name}</p>
            <p className="text-[10px] text-slate-500 leading-tight">{user?.employeeId}</p>
          </div>
          <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
        </button>

        {userMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-56 bg-navy-800 border border-navy-500 rounded-xl shadow-2xl z-20 overflow-hidden animate-fade-in">
              {/* User info */}
              <div className="px-4 py-3 border-b border-navy-600">
                <div className="flex items-center gap-3">
                  {user && <Avatar name={user.name} size="md" />}
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{user?.name}</p>
                    <RoleBadge role={user?.role ?? 'OFFICER'} />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">{user?.email}</p>
              </div>
              {/* Menu items */}
              <div className="py-1">
                <a
                  href={user?.role === 'ADMIN' ? '/admin/profile' : '/officer/profile'}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-slate-100 hover:bg-navy-700 transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <User size={15} /> Profile
                </a>
                <button
                  onClick={() => { logout(); setUserMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-400 hover:text-danger hover:bg-danger/10 transition-colors"
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
