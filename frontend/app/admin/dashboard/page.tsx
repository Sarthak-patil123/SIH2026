'use client';

import React from 'react';
import Link from 'next/link';
import {
  FolderOpen, AlertTriangle, Clock, CheckCircle2, ArrowRight,
  Shield, ShieldAlert, Activity, ChevronRight, User, Eye, Sparkles,
  Layers, Lock, Database, BarChart3, TrendingUp, AlertCircle
} from 'lucide-react';
import { mockCases, mockAlerts } from '@/lib/mock-data';
import { timeAgo, formatDateTime, getAlertTypeLabel } from '@/lib/utils';
import { StatusBadge, RiskBadge, SeverityBadge } from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';

export default function AdminDashboard() {
  const allCases = mockCases;
  const pendingAlerts = mockAlerts.filter((a) => a.status === 'PENDING');
  const reviewCases = allCases.filter((c) => c.status === 'FLAGGED' || c.status === 'UNDER_REVIEW');
  const resolvedCases = allCases.filter((c) => c.status === 'APPROVED' || c.status === 'REJECTED');

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* ── 1. Supervisory Command Banner ── */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-card relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-purple-600/20 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                {reviewCases.length} Critical Adjudications Pending
              </span>
              <span className="text-xs text-slate-400 font-mono">Hyperledger Block #18274 Synced</span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Supervisory Command &amp; Fraud Intelligence
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Cross-checkpoint border surveillance, AI tamper forensics oversight, and final manual case adjudication.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/admin/cases">
              <Button
                variant="primary"
                size="lg"
                icon={<ShieldAlert size={18} />}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-600/30"
              >
                Review Priority Queue
              </Button>
            </Link>
          </div>
        </div>

        {/* Real-time System Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">ACTIVE CHECKPOINTS</span>
            <p className="text-lg font-bold text-white mt-0.5">3 Lanes (Alpha, Bravo, Charlie)</p>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">FRAUD INTERCEPTION RATE</span>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">98.6% Accuracy</p>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">AVG ADJUDICATION TIME</span>
            <p className="text-lg font-bold text-blue-400 mt-0.5">1.8 Minutes</p>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">BLOCKCHAIN SEAL HEIGHT</span>
            <p className="text-lg font-bold text-purple-400 mt-0.5">#18,274 Blocks</p>
          </div>
        </div>
      </div>

      {/* ── 2. KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Screenings Processed"
          value={allCases.length}
          change="+32 today"
          changeType="positive"
          icon={<FolderOpen size={20} className="text-blue-600" />}
          iconBg="bg-blue-50"
          subtitle="All border checkpoints"
        />
        <StatCard
          title="Pending Supervisory Review"
          value={reviewCases.length}
          change="Requires manual decision"
          changeType="warning"
          icon={<Clock size={20} className="text-amber-600" />}
          iconBg="bg-amber-50"
          subtitle="Flagged & escalated dossiers"
        />
        <StatCard
          title="Active Fraud Anomaly Alerts"
          value={pendingAlerts.length}
          change="Biometric & Tamper flags"
          changeType="negative"
          icon={<AlertTriangle size={20} className="text-rose-600" />}
          iconBg="bg-rose-50"
          subtitle="Critical security triggers"
        />
        <StatCard
          title="Total Adjudications Completed"
          value={resolvedCases.length}
          change="99.4% SLA compliance"
          changeType="positive"
          icon={<CheckCircle2 size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
          subtitle="Approved or rejected"
        />
      </div>

      {/* ── 3. Fraud Anomaly Distribution & Officer Performance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fraud Category Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-600" />
              Fraud Breakdown by Anomaly
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">30-Day Velocity</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 font-medium">Biometric Face Mismatch / Deepfake</span>
                <span className="font-bold text-rose-600">42% (14 cases)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: '42%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 font-medium">Document Tampering / Font Modification</span>
                <span className="font-bold text-amber-600">35% (11 cases)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '35%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-700 font-medium">Cross-Document Bio-Data Discrepancies</span>
                <span className="font-bold text-blue-600">23% (7 cases)</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '23%' }} />
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-500 leading-relaxed">
            💡 <strong>Supervisory Note:</strong> Passports and Entry Visas represent 78% of intercepted forgery attempts this month.
          </div>
        </div>

        {/* Screening Officer Performance Oversight */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-heading text-sm font-bold text-slate-900 flex items-center gap-2">
              <User size={16} className="text-blue-600" />
              Screening Officer Throughput &amp; Detection Rate
            </h3>
            <Link href="/admin/reports" className="text-xs font-semibold text-blue-600 hover:underline">
              View full audit →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 pb-2">
                  <th className="pb-2">Officer Name</th>
                  <th className="pb-2">Assigned Unit</th>
                  <th className="pb-2 text-center">Screened</th>
                  <th className="pb-2 text-center">Approval Rate</th>
                  <th className="pb-2 text-center">Flags Raised</th>
                  <th className="pb-2 text-right">Avg Speed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                <tr>
                  <td className="py-2.5 font-sans font-bold text-slate-900">Rajesh Kumar</td>
                  <td className="py-2.5 font-sans text-slate-500">Border Terminal Lane #4</td>
                  <td className="py-2.5 text-center font-bold">18</td>
                  <td className="py-2.5 text-center text-emerald-600 font-bold">88.8%</td>
                  <td className="py-2.5 text-center text-rose-600 font-bold">3</td>
                  <td className="py-2.5 text-right">2.1 min</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans font-bold text-slate-900">Priya Sharma</td>
                  <td className="py-2.5 font-sans text-slate-500">Screening Terminal Lane #2</td>
                  <td className="py-2.5 text-center font-bold">14</td>
                  <td className="py-2.5 text-center text-emerald-600 font-bold">92.8%</td>
                  <td className="py-2.5 text-center text-amber-600 font-bold">1</td>
                  <td className="py-2.5 text-right">2.8 min</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans font-bold text-slate-900">Amit Patel</td>
                  <td className="py-2.5 font-sans text-slate-500">Immigration Checkpoint Bravo</td>
                  <td className="py-2.5 text-center font-bold">12</td>
                  <td className="py-2.5 text-center text-emerald-600 font-bold">83.3%</td>
                  <td className="py-2.5 text-center text-rose-600 font-bold">2</td>
                  <td className="py-2.5 text-right">2.4 min</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 4. Priority Adjudication Queue ── */}
      <div className="bg-white border border-slate-200/90 rounded-card shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-slate-900">Priority Supervisory Adjudication Queue</h3>
              <p className="text-xs text-slate-400 mt-0.5">Flagged dossiers requiring final accept / reject adjudication</p>
            </div>
          </div>
          <Link
            href="/admin/cases"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            All cases <ArrowRight size={13} />
          </Link>
        </div>

        <div className="w-full">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="w-48 pl-6 pr-4 py-3.5">Case ID</th>
                <th className="px-4 py-3.5">Applicant Name</th>
                <th className="px-4 py-3.5">Screening Officer</th>
                <th className="px-4 py-3.5 min-w-[150px]">Risk Score</th>
                <th className="px-4 py-3.5">Flag Trigger Reason</th>
                <th className="px-4 py-3.5 text-right pr-6">Adjudicate</th>
              </tr>
            </thead>
            <tbody>
              {reviewCases.map((c) => {
                const riskScore = c.riskScore ?? 75;
                const riskLevel = c.riskLevel ?? (riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW');
                return (
                  <tr key={c.id}>
                    <td className="w-48 pl-6 pr-4 py-4">
                      <div className="space-y-1">
                        <span className="inline-block font-mono text-xs font-bold text-slate-900 bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-lg tracking-wider shadow-2xs">
                          {c.caseNumber}
                        </span>
                        <span className="block text-[11px] text-slate-400 font-medium pl-0.5">{timeAgo(c.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.applicantName} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{c.applicantName}</p>
                          <p className="text-[11px] text-slate-400 truncate font-mono">{c.applicantDob}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-700 truncate">{c.officerName || 'Rajesh Kumar'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 min-w-[150px]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-md border ${
                            riskScore > 60
                              ? 'text-rose-700 bg-rose-50 border-rose-200'
                              : riskScore > 30
                              ? 'text-amber-700 bg-amber-50 border-amber-200'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          }`}
                        >
                          {riskScore}/100
                        </span>
                        <RiskBadge level={riskLevel} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-rose-700 font-medium truncate block max-w-[220px]">
                        {c.flagReason ? getAlertTypeLabel(c.flagReason) : 'Security Anomaly Detected'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right pr-6">
                      <Link
                        href={`/admin/cases/${c.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle transition-all"
                      >
                        <Eye size={13} />
                        Investigate
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
