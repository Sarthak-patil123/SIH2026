'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Search, ChevronDown, User, LogOut, ShieldCheck, CheckCircle2 } from 'lucide-react';
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
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const notifications: Notification[] =
    user?.role === 'ADMIN' ? mockAdminNotifications : mockOfficerNotifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Breadcrumb generator
  const getBreadcrumb = () => {
    if (pathname.includes('/cases/')) return 'Case Investigation';
    if (pathname.includes('/cases')) return user?.role === 'ADMIN' ? 'All Cases' : 'My Cases';
    if (pathname.includes('/verify')) return 'New Document Verification';
    if (pathname.includes('/alerts')) return 'Fraud Alert Center';
    if (pathname.includes('/audit')) return 'Blockchain Audit Trail';
    if (pathname.includes('/profile')) return 'Account Profile';
    return 'Dashboard';
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 flex items-center justify-between px-6 gap-4 flex-shrink-0 z-30 select-none">
      {/* Left: Mobile Toggle + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <MobileSidebarToggle onClick={() => onMobileMenuOpen?.()} />
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-400">
          <span className="font-medium text-slate-500">{user?.role === 'ADMIN' ? 'Admin Portal' : 'Officer Portal'}</span>
          <span>/</span>
          <span className="text-slate-900 font-semibold">{getBreadcrumb()}</span>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4 relative">
        <Search size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Search cases, applicant, document number..."
          className="w-full bg-slate-50 border border-slate-200/90 text-slate-900 rounded-xl pl-9 pr-12 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all duration-150"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-2.5">
        {/* System Status Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Online</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen((o) => !o); setUserMenuOpen(false); }}
            className={cn(
              'relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors',
              notifOpen && 'bg-slate-100 text-slate-900'
            )}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-dropdown z-20 overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold font-heading text-slate-900 uppercase tracking-wide">Notifications</p>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="text-[11px] text-blue-600 hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-xs text-slate-400 text-center">No notifications at this time.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'p-3.5 hover:bg-slate-50 transition-colors',
                          !n.read && 'bg-blue-50/30'
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-blue-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
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

        <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => { setUserMenuOpen((o) => !o); setNotifOpen(false); }}
            className={cn(
              'flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors',
              userMenuOpen && 'bg-slate-100'
            )}
          >
            {user && <Avatar name={user.name} size="sm" />}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{user?.department}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block ml-0.5" />
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-dropdown z-20 overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-xs font-bold font-heading text-slate-900">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{user?.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <RoleBadge role={user?.role ?? 'OFFICER'} />
                    <span className="text-[10px] text-slate-400 font-mono">{user?.employeeId}</span>
                  </div>
                </div>

                <div className="p-1.5">
                  <a
                    href={user?.role === 'ADMIN' ? '/admin/profile' : '/officer/profile'}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User size={14} className="text-slate-400" /> Account Profile
                  </a>
                  <button
                    onClick={async () => { await logout(); setUserMenuOpen(false); router.push('/login'); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
