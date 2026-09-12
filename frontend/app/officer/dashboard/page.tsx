'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FolderOpen, Clock, Flag, CheckCircle2, Plus, ArrowRight,
  FileText, ChevronRight, ScanLine, Shield, Activity, Camera, Hash,
  Sparkles, Check, AlertTriangle, Layers, Laptop
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockCases } from '@/lib/mock-data';
import { timeAgo } from '@/lib/utils';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [quickHashInput, setQuickHashInput] = useState('');
  const [hashResult, setHashResult] = useState<string | null>(null);

  const myCases = mockCases;
  const pendingCases = myCases.filter((c) => c.status === 'PENDING' || c.status === 'UNDER_REVIEW');
  const verifiedCount = myCases.filter((c) => c.status === 'APPROVED').length;
  const flaggedCount = myCases.filter((c) => c.status === 'FLAGGED').length;

  const firstName = user?.name ? user.name.split(' ')[0] : 'Officer';

  const handleHashCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickHashInput) return;
    setHashResult('Integrity Verified · Hash matches official registry (ICAO 9303 Compliant)');
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* ── 1. Active Shift Terminal Header (Officer Operation Center) ── */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-card relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Terminal Lane #4 Active
              </span>
              <span className="text-xs text-slate-400 font-mono">Border Checkpoint North-Alpha</span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome to Duty, Officer {firstName}
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Optical Document Ingestion &amp; ArcFace biometric scanner ready for passenger screening.
            </p>
          </div>

          {/* Quick Terminal Action */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/officer/verify">
              <Button
                variant="primary"
                size="lg"
                icon={<ScanLine size={18} />}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30"
              >
                Start New Verification
              </Button>
            </Link>
          </div>
        </div>

        {/* Live Shift KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">Today's Target</span>
            <p className="text-xl font-bold font-heading text-white mt-0.5">18 / 25 <span className="text-xs text-emerald-400 font-normal font-sans">(72%)</span></p>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">Active In Queue</span>
            <p className="text-xl font-bold font-heading text-amber-400 mt-0.5">{pendingCases.length} Dossiers</p>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">Verified Authentic</span>
            <p className="text-xl font-bold font-heading text-emerald-400 mt-0.5">{verifiedCount} Approved</p>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase font-bold tracking-wider">Escalations Flagged</span>
            <p className="text-xl font-bold font-heading text-rose-400 mt-0.5">{flaggedCount} Flags</p>
          </div>
        </div>
      </div>

      {/* ── 2. Officer Quick Tools & Terminal Shortcuts ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Quick Tool 1: Start Screening */}
        <Link
          href="/officer/verify"
          className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card hover:border-blue-300 hover:shadow-card-hover transition-all group block"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ScanLine size={20} />
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <h3 className="font-heading text-sm font-bold text-slate-900">Multi-Document Verification</h3>
          <p className="text-xs text-slate-500 mt-1">
            Scan Passport, Nationality ID, Visa, Driving Licence, or DOB Proof.
          </p>
        </Link>

        {/* Quick Tool 2: My Assigned Cases */}
        <Link
          href="/officer/cases"
          className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card hover:border-blue-300 hover:shadow-card-hover transition-all group block"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FolderOpen size={20} />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {pendingCases.length} Pending
            </span>
          </div>
          <h3 className="font-heading text-sm font-bold text-slate-900">My Assigned Dossiers</h3>
          <p className="text-xs text-slate-500 mt-1">
            Review active queue, cross-document checks, and blockchain audit trails.
          </p>
        </Link>

        {/* Quick Tool 3: Shift Reports */}
        <Link
          href="/officer/reports"
          className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card hover:border-blue-300 hover:shadow-card-hover transition-all group block"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText size={20} />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
              Weekly PDF
            </span>
          </div>
          <h3 className="font-heading text-sm font-bold text-slate-900">Operational Reports</h3>
          <p className="text-xs text-slate-500 mt-1">
            Download date and month-wise official compliance dossiers for superiors.
          </p>
        </Link>
      </div>

      {/* ── 3. Active Priority Screening Queue ── */}
      <div className="bg-white border border-slate-200/90 rounded-card shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderOpen size={16} />
            </div>
            <div>
              <h3 className="font-heading text-sm font-bold text-slate-900">Active Priority Queue</h3>
              <p className="text-xs text-slate-400 mt-0.5">Dossiers assigned to your screening lane</p>
            </div>
          </div>
          <Link
            href="/officer/cases"
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
                <th className="px-4 py-3.5">Document Proofs</th>
                <th className="px-4 py-3.5 min-w-[150px]">Risk Score</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right pr-6">Screening Action</th>
              </tr>
            </thead>
            <tbody>
              {myCases.slice(0, 5).map((c) => {
                const docCount = c.documents?.length || 1;
                const primaryDocType = c.documents?.[0]?.docType ?? 'PASSPORT';
                const riskScore = c.riskScore ?? 15;
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
                      <div className="flex flex-col items-start gap-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                          <FileText size={13} className="text-slate-500" />
                          {primaryDocType.replace('_', ' ')}
                        </span>
                        {docCount > 1 && (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                            +{docCount - 1} more proof
                          </span>
                        )}
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
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-4 text-right pr-6">
                      <Link
                        href={`/officer/cases/${c.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-subtle transition-all"
                      >
                        Inspect Dossier <ChevronRight size={13} />
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
