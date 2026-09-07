'use client';

import React from 'react';
import { Mail, User, Building, Hash, Clock, CheckCircle, Lock, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/utils';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Avatar from '@/components/ui/Avatar';
import { RoleBadge } from '@/components/ui/Badge';

export default function AdminProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const fields = [
    { icon: <User size={15} />, label: 'Full Name', value: user.name },
    { icon: <Hash size={15} />, label: 'Employee ID', value: user.employeeId },
    { icon: <Mail size={15} />, label: 'Email', value: user.email },
    { icon: <User size={15} />, label: 'Username', value: user.username },
    { icon: <Building size={15} />, label: 'Department', value: user.department },
    { icon: <Clock size={15} />, label: 'Last Login', value: formatDateTime(user.lastLogin) },
  ];

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <PageHeader title="My Profile" subtitle="Your account and security settings" />

      <Card>
        <div className="flex items-center gap-5">
          <Avatar name={user.name} size="xl" />
          <div>
            <h2 className="text-xl font-bold text-slate-100">{user.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <RoleBadge role={user.role} />
              <span className="text-sm text-slate-400">{user.department}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-success">
              <CheckCircle size={12} /> Account Active
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.label} className="flex items-center gap-3 py-2 border-b border-navy-700 last:border-0">
              <span className="text-slate-500 flex-shrink-0">{f.icon}</span>
              <div className="flex-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">{f.label}</p>
                <p className="text-sm font-medium text-slate-200 mt-0.5">{f.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>Security</CardTitle></CardHeader>
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-navy-700 hover:bg-navy-600 text-sm text-slate-300 font-medium transition-colors text-left">
            <Lock size={15} className="text-blue-400" /> Change Password
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-danger/10 hover:bg-danger/20 text-sm text-danger font-medium border border-danger/30 transition-colors text-left">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </Card>
    </div>
  );
}
