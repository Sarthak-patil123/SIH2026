'use client';

import React from 'react';
import Link from 'next/link';
import {
  FolderOpen, Clock, Flag, CheckCircle, Plus, ArrowRight,
  TrendingUp, Activity, FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockCases, mockOfficerActivity } from '@/lib/mock-data';
import { formatDate, timeAgo, getCaseStatusClasses, getCaseStatusLabel } from '@/lib/utils';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Avatar from '@/components/ui/Avatar';

export default function OfficerDashboard() {
  const { user } = useAuth();

  // Officer sees only their own cases
  const myCases = mockCases.filter((c) => c.officerId === user?.id);

  const stats = [
    {
      label: 'Cases Today',
      value: myCases.length,
      icon: <FolderOpen size={20} />,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border border-blue-500/20',
    },
    {
      label: 'Pending Verification',
      value: myCases.filter((c) => c.status === 'PENDING').length,
      icon: <Clock size={20} />,
      color: 'text-warning',
      bg: 'bg-warning/10 border border-warning/20',
    },
    {
      label: 'Flagged Cases',
      value: myCases.filter((c) => c.status === 'FLAGGED').length,
      icon: <Flag size={20} />,
      color: 'text-danger',
      bg: 'bg-danger/10 border border-danger/20',
    },
    {
      label: 'Completed Cases',
      value: myCases.filter((c) => c.status === 'APPROVED' || c.status === 'REJECTED').length,
      icon: <CheckCircle size={20} />,
      color: 'text-success',
      bg: 'bg-success/10 border border-success/20',
    },
  ];

  const recentCases = [...myCases].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Officer Dashboard"
        subtitle="Identity verification operations overview"
        actions={
          <Link href="/officer/verify">
            <Button icon={<Plus size={15} />}>New Verification</Button>
          </Link>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{stat.label}</p>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <span className={stat.color}>{stat.icon}</span>
              </div>
            </div>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Cases Table */}
        <div className="xl:col-span-2">
          <Card padding="none">
            <div className="px-5 py-4 border-b border-navy-600 flex items-center justify-between">
              <CardTitle>Recent Cases</CardTitle>
              <Link href="/officer/cases" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Title</th>
                    <th>Docs</th>
                    <th>Risk</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        No cases found. Start a new verification.
                      </td>
                    </tr>
                  ) : (
                    recentCases.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <span className="font-mono text-xs font-semibold text-blue-400">{c.caseNumber}</span>
                        </td>
                        <td>
                          <p className="text-sm text-slate-200 truncate max-w-[180px]">{c.title}</p>
                        </td>
                        <td>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <FileText size={12} /> {c.documents.length}
                          </span>
                        </td>
                        <td><RiskBadge level={c.riskLevel} /></td>
                        <td><StatusBadge status={c.status} /></td>
                        <td className="text-xs text-slate-500">{formatDate(c.createdAt)}</td>
                        <td>
                          <Link
                            href={`/officer/cases/${c.id}`}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Activity Feed + Quick Actions */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              <Link href="/officer/verify">
                <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold text-white transition-colors">
                  <Plus size={16} /> New Verification
                </button>
              </Link>
              {myCases.filter((c) => c.status === 'PENDING').length > 0 && (
                <Link href="/officer/cases">
                  <button className="w-full flex items-center gap-3 px-4 py-3 bg-navy-700 hover:bg-navy-600 rounded-lg text-sm font-medium text-slate-300 transition-colors">
                    <Clock size={16} className="text-warning" />
                    Continue Pending Case
                  </button>
                </Link>
              )}
              <Link href="/officer/cases">
                <button className="w-full flex items-center gap-3 px-4 py-3 bg-navy-700 hover:bg-navy-600 rounded-lg text-sm font-medium text-slate-300 transition-colors">
                  <FolderOpen size={16} className="text-blue-400" /> View My Cases
                </button>
              </Link>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card padding="none">
            <div className="px-5 py-4 border-b border-navy-600">
              <CardTitle>Recent Activity</CardTitle>
            </div>
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {mockOfficerActivity.map((act) => (
                <div key={act.id} className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    act.type === 'SUCCESS' ? 'bg-success' :
                    act.type === 'DANGER' ? 'bg-danger' :
                    act.type === 'WARNING' ? 'bg-warning' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 leading-relaxed">{act.description}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
