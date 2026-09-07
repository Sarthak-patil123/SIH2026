'use client';

import React from 'react';
import Link from 'next/link';
import {
  FolderOpen, AlertTriangle, Clock, CheckCircle, ArrowRight,
  Eye, Shield, Activity,
} from 'lucide-react';
import { mockCases, mockAlerts, mockAdminActivity } from '@/lib/mock-data';
import { timeAgo, formatDateTime } from '@/lib/utils';
import { StatusBadge, RiskBadge, SeverityBadge } from '@/components/ui/Badge';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Avatar from '@/components/ui/Avatar';
import { getAlertTypeLabel } from '@/lib/utils';

export default function AdminDashboard() {
  const stats = [
    {
      label: 'Total Cases',
      value: mockCases.length,
      icon: <FolderOpen size={20} />,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border border-blue-500/20',
    },
    {
      label: 'Pending Review',
      value: mockCases.filter((c) => c.status === 'FLAGGED' || c.status === 'UNDER_REVIEW').length,
      icon: <Clock size={20} />,
      color: 'text-warning',
      bg: 'bg-warning/10 border border-warning/20',
    },
    {
      label: 'High Risk Alerts',
      value: mockAlerts.filter((a) => a.severity === 'HIGH' || a.severity === 'CRITICAL').length,
      icon: <AlertTriangle size={20} />,
      color: 'text-danger',
      bg: 'bg-danger/10 border border-danger/20',
    },
    {
      label: 'Resolved Today',
      value: mockCases.filter((c) => c.status === 'APPROVED' || c.status === 'REJECTED').length,
      icon: <CheckCircle size={20} />,
      color: 'text-success',
      bg: 'bg-success/10 border border-success/20',
    },
  ];

  const pendingAlerts = mockAlerts.filter((a) => a.status === 'PENDING');

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Security Review Center"
        subtitle="Monitor and review all verification cases"
        badge={
          <span className="flex items-center gap-1.5 text-xs bg-danger/10 border border-danger/30 text-danger px-2.5 py-1 rounded-full font-semibold">
            <span className="w-1.5 h-1.5 bg-danger rounded-full animate-pulse-slow" />
            {pendingAlerts.length} active alerts
          </span>
        }
      />

      {/* Stats */}
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
        {/* Priority Alerts Table */}
        <div className="xl:col-span-2">
          <Card padding="none">
            <div className="px-5 py-4 border-b border-navy-600 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>Priority Alerts</CardTitle>
                {pendingAlerts.length > 0 && (
                  <span className="w-5 h-5 bg-danger rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {pendingAlerts.length}
                  </span>
                )}
              </div>
              <Link href="/admin/alerts" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Officer</th>
                    <th>Alert Type</th>
                    <th>Severity</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 text-sm">
                        No pending alerts
                      </td>
                    </tr>
                  ) : (
                    pendingAlerts.map((alert) => (
                      <tr key={alert.id}>
                        <td>
                          <span className="font-mono text-xs font-bold text-blue-400">{alert.caseNumber}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar name={alert.officerName} size="sm" />
                            <span className="text-sm text-slate-200">{alert.officerName}</span>
                          </div>
                        </td>
                        <td className="text-xs text-slate-300">{getAlertTypeLabel(alert.alertType)}</td>
                        <td><SeverityBadge severity={alert.severity} /></td>
                        <td className="text-xs text-slate-500">{timeAgo(alert.detectedAt)}</td>
                        <td>
                          <span className="text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/30">
                            {alert.status}
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/admin/cases/${alert.caseId}`}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                          >
                            <Eye size={11} /> Review
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

        {/* System Activity */}
        <div className="space-y-4">
          <Card padding="none">
            <div className="px-5 py-4 border-b border-navy-600">
              <CardTitle>System Activity</CardTitle>
            </div>
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {mockAdminActivity.map((act) => (
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

          {/* Quick links */}
          <Card>
            <CardTitle className="mb-3">Quick Navigation</CardTitle>
            <div className="space-y-2">
              {[
                { label: 'All Cases', href: '/admin/cases', icon: <FolderOpen size={15} />, color: 'text-blue-400' },
                { label: 'Anomaly Alerts', href: '/admin/alerts', icon: <AlertTriangle size={15} />, color: 'text-danger' },
                { label: 'Audit Trail', href: '/admin/audit', icon: <Shield size={15} />, color: 'text-purple-400' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-sm font-medium text-slate-300 transition-colors"
                >
                  <span className={item.color}>{item.icon}</span>
                  {item.label}
                  <ArrowRight size={12} className="ml-auto text-slate-500" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
