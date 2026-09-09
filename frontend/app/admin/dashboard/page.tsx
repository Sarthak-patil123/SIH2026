'use client';

import React from 'react';
import Link from 'next/link';
import {
  FolderOpen, AlertTriangle, Clock, CheckCircle2, ArrowRight,
  Shield, ShieldAlert, Activity, ChevronRight, User, Eye, Sparkles
} from 'lucide-react';
import { mockCases, mockAlerts, mockAdminActivity } from '@/lib/mock-data';
import { timeAgo, formatDateTime, getAlertTypeLabel } from '@/lib/utils';
import { StatusBadge, RiskBadge, SeverityBadge } from '@/components/ui/Badge';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import ConfidenceBar from '@/components/ui/ConfidenceBar';

export default function AdminDashboard() {
  const pendingAlerts = mockAlerts.filter((a) => a.status === 'PENDING');
  const reviewCases = mockCases.filter((c) => c.status === 'FLAGGED' || c.status === 'UNDER_REVIEW');
  const resolvedCases = mockCases.filter((c) => c.status === 'APPROVED' || c.status === 'REJECTED');

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Security Oversight &amp; Investigation
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {pendingAlerts.length} Active Anomaly Alerts
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Central review terminal for flagged cases, audit validation, and officer escalations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/cases">
            <Button variant="secondary" icon={<FolderOpen size={15} />}>
              All Cases
            </Button>
          </Link>
          <Link href="/admin/audit">
            <Button variant="primary" icon={<Shield size={15} />}>
              Audit Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* Visual Focal Point: PRIORITY ALERTS SECTION (Prompt Section 8) */}
      <div className="bg-white border-2 border-rose-200 rounded-card p-6 shadow-card space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-slate-900">Priority Security Alerts</h2>
              <p className="text-xs text-slate-500">High-risk cases requiring immediate supervisory adjudication</p>
            </div>
          </div>
          <Link
            href="/admin/alerts"
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
          >
            View all alerts <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingAlerts.slice(0, 4).map((alert) => {
            const linkedCase = mockCases.find((c) => c.id === alert.caseId);
            return (
              <div
                key={alert.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-rose-300 hover:bg-white transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-200">
                      {alert.caseNumber}
                    </span>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <span className="text-[11px] text-slate-400">{timeAgo(alert.detectedAt)}</span>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900">{getAlertTypeLabel(alert.alertType)}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{alert.reason}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar name={alert.officerName} size="sm" />
                    <span className="text-slate-600 font-medium">{alert.officerName}</span>
                  </div>

                  <Link href={`/admin/cases/${alert.caseId}`}>
                    <Button size="xs" variant="danger" iconRight={<ChevronRight size={13} />}>
                      Investigate
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Monitored Cases"
          value={mockCases.length}
          change="Across all stations"
          changeType="neutral"
          icon={<FolderOpen size={20} className="text-blue-600" />}
          iconBg="bg-blue-50"
          subtitle="System registry"
        />
        <StatCard
          title="Review Queue"
          value={reviewCases.length}
          change={reviewCases.length > 0 ? 'Action required' : 'Clear'}
          changeType={reviewCases.length > 0 ? 'warning' : 'positive'}
          icon={<Clock size={20} className="text-amber-600" />}
          iconBg="bg-amber-50"
          subtitle="Awaiting admin verdict"
        />
        <StatCard
          title="Adjudicated Today"
          value={resolvedCases.length}
          change="+8 closed"
          changeType="positive"
          icon={<CheckCircle2 size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
          subtitle="Approved / Rejected"
        />
        <StatCard
          title="Audit Ledger"
          value="100%"
          change="Tamper-evident"
          changeType="positive"
          icon={<Shield size={20} className="text-purple-600" />}
          iconBg="bg-purple-50"
          subtitle="Blockchain verified"
        />
      </div>

      {/* Secondary Grid: Review Queue + System Activity Stream */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Escalated Review Queue Table */}
        <div className="xl:col-span-2">
          <div className="bg-white border border-slate-200/90 rounded-card shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-slate-900">Escalated Review Queue</h3>
                <p className="text-xs text-slate-400 mt-0.5">Cases requiring formal supervisor decision</p>
              </div>
              <Link
                href="/admin/cases"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                All cases <ArrowRight size={13} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Applicant</th>
                    <th>Risk Score</th>
                    <th>Reporting Officer</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewCases.slice(0, 5).map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className="font-mono text-xs font-bold text-slate-900 block">{c.caseNumber}</span>
                        <span className="text-[10px] text-slate-400">{timeAgo(c.createdAt)}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={c.applicantName} size="sm" />
                          <span className="text-xs font-semibold text-slate-900">{c.applicantName}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold tabular-nums ${c.riskScore > 60 ? 'text-rose-600' : 'text-amber-600'}`}>
                            {c.riskScore}/100
                          </span>
                          <RiskBadge level={c.riskLevel} />
                        </div>
                      </td>
                      <td>
                        <span className="text-xs text-slate-600">{c.officerName}</span>
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td>
                        <Link
                          href={`/admin/cases/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Review <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* System Activity Stream */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider">
                Audit Stream
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Live Chain</span>
            </div>

            <div className="space-y-4">
              {mockAdminActivity.map((act) => {
                const dotColor =
                  act.type === 'SUCCESS' ? 'bg-emerald-500' :
                  act.type === 'DANGER' ? 'bg-rose-500' :
                  act.type === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500';

                return (
                  <div key={act.id} className="flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{act.description}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{act.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
