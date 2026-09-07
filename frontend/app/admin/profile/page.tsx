'use client';

import React from 'react';
import { Mail, User, Building, Hash, Clock, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/utils';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import { RoleBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

export default function AdminProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const fields = [
    { icon: <User size={15} />, label: 'Administrator Name', value: user.name },
    { icon: <Hash size={15} />, label: 'Staff Credential ID', value: user.employeeId },
    { icon: <Mail size={15} />, label: 'Official Secure Email', value: user.email },
    { icon: <User size={15} />, label: 'Supervisory Account', value: user.username },
    { icon: <Building size={15} />, label: 'Division', value: user.department },
    { icon: <Clock size={15} />, label: 'Active Session Start', value: formatDateTime(user.lastLogin) },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Supervisory Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Administrative permissions, credentials, and security oversight settings
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card">
        <div className="flex items-center gap-5">
          <Avatar name={user.name} size="xl" />
          <div className="space-y-1">
            <h2 className="font-heading text-xl font-bold text-slate-900">{user.name}</h2>
            <div className="flex items-center gap-2">
              <RoleBadge role={user.role} />
              <span className="text-xs text-slate-500 font-medium">{user.department}</span>
            </div>
            <div className="flex items-center gap-1.5 pt-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 size={13} />
              <span>Full Supervisory Adjudication Rights Granted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-4">
        <h3 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
          Security Division Record
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                {f.icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">{f.label}</span>
              </div>
              <p className="text-xs font-semibold text-slate-900">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-3">
        <h3 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
          Session &amp; Access Controls
        </h3>
        <div>
          <Button variant="danger" onClick={logout} icon={<LogOut size={15} />}>
            Sign Out of Admin Console
          </Button>
        </div>
      </div>
    </div>
  );
}
