'use client';

import React from 'react';
import Link from 'next/link';
import {
  FolderOpen, Clock, Flag, CheckCircle2, Plus, ArrowRight,
  FileText, ShieldCheck, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockCases, mockOfficerActivity } from '@/lib/mock-data';
import { formatDate, timeAgo } from '@/lib/utils';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardHeader, CardTitle, CardSubtitle } from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import ConfidenceBar from '@/components/ui/ConfidenceBar';
import Avatar from '@/components/ui/Avatar';

export default function OfficerDashboard() {
  const { user } = useAuth();

  // Officer sees only their own cases
  const myCases = mockCases.filter((c) => c.officerId === user?.id);

  const pendingCount = myCases.filter((c) => c.status === 'PENDING' || c.status === 'UNDER_REVIEW').length;
  const flaggedCount = myCases.filter((c) => c.status === 'FLAGGED').length;
  const verifiedCount = myCases.filter((c) => c.status === 'APPROVED').length;

  const recentCases = [...myCases].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 6);

  const firstName = user?.name ? user.name.split(' ')[0] : 'Officer';

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Welcome / Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Good day, {firstName}
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
              Shift Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Identity screening terminal · Border Security Force operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/officer/cases">
            <Button variant="secondary" icon={<FolderOpen size={15} />}>
              My Cases
            </Button>
          </Link>
          <Link href="/officer/verify">
            <Button variant="primary" icon={<Plus size={15} />}>
              New Verification
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards (Inspired by Spendly & Mare) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Assigned Cases"
          value={myCases.length}
          change="+12 this week"
          changeType="positive"
          icon={<FolderOpen size={20} className="text-blue-600" />}
          iconBg="bg-blue-50"
          subtitle="Assigned queue"
        />
        <StatCard
          title="Pending Review"
          value={pendingCount}
          change={pendingCount > 0 ? 'Requires action' : 'Queue clear'}
          changeType={pendingCount > 0 ? 'warning' : 'positive'}
          icon={<Clock size={20} className="text-amber-600" />}
          iconBg="bg-amber-50"
          subtitle="Awaiting inspection"
        />
        <StatCard
          title="Flagged Anomalies"
          value={flaggedCount}
          change={flaggedCount > 0 ? 'High risk alerts' : 'No flags'}
          changeType={flaggedCount > 0 ? 'negative' : 'positive'}
          icon={<Flag size={20} className="text-rose-600" />}
          iconBg="bg-rose-50"
          subtitle="Escalated to Admin"
        />
        <StatCard
          title="Verified Completed"
          value={verifiedCount}
          change="98.2% Match rate"
          changeType="positive"
          icon={<CheckCircle2 size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
          subtitle="Processed & sealed"
        />
      </div>

      {/* Main Grid: Recent Cases Table + Activity Stream */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Cases Table (Inspired by Doculyst Reference) */}
        <div className="xl:col-span-2">
          <div className="bg-white border border-slate-200/90 rounded-card shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-heading text-sm font-bold text-slate-900">Recent Applications</h3>
                <p className="text-xs text-slate-400 mt-0.5">Latest document screening tasks assigned to you</p>
              </div>
              <Link
                href="/officer/cases"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
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
                    <th>Document</th>
                    <th>AI Confidence</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                        No cases found in your queue.
                      </td>
                    </tr>
                  ) : (
                    recentCases.map((c) => {
                      const docType = c.documents[0]?.docType ?? 'PASSPORT';
                      return (
                        <tr key={c.id}>
                          <td>
                            <div className="space-y-0.5">
                              <span className="font-mono text-xs font-bold text-slate-900">{c.caseNumber}</span>
                              <span className="block text-[10px] text-slate-400">{timeAgo(c.createdAt)}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <Avatar name={c.applicantName} size="sm" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 truncate">{c.applicantName}</p>
                                <p className="text-[11px] text-slate-400 truncate font-mono">{c.applicantDob}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                              <FileText size={13} className="text-slate-500" />
                              {docType}
                            </span>
                          </td>
                          <td>
                            <ConfidenceBar value={100 - c.riskScore} segmentsCount={10} />
                          </td>
                          <td>
                            <StatusBadge status={c.status} />
                          </td>
                          <td>
                            <Link
                              href={`/officer/cases/${c.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              Inspect <ChevronRight size={13} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Action + Recent Activity Feed */}
        <div className="space-y-6">
          {/* Quick Start Card */}
          <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card space-y-3">
            <h3 className="font-heading text-xs font-bold text-slate-400 uppercase tracking-wider">
              Screening Actions
            </h3>
            <div className="space-y-2">
              <Link href="/officer/verify" className="block">
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-100 hover:bg-blue-50 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                      <Plus size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700">Start New Verification</p>
                      <p className="text-[11px] text-slate-500">Scan or upload applicant identity</p>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </Link>

              <Link href="/officer/cases" className="block">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
                      <Clock size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Review Pending Queue</p>
                      <p className="text-[11px] text-slate-500">{pendingCount} cases waiting for review</p>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                </div>
              </Link>
            </div>
          </div>

          {/* Activity Stream */}
          <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Activity
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Live Stream</span>
            </div>

            <div className="space-y-4">
              {mockOfficerActivity.map((act) => {
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
