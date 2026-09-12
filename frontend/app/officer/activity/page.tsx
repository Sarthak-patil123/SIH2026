'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity, Shield, CheckCircle2, AlertTriangle, Clock,
  Search, RefreshCw, ChevronRight, FileText, Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockCases, mockAlerts } from '@/lib/mock-data';
import { formatDateTime, timeAgo } from '@/lib/utils';
import Button from '@/components/ui/Button';

interface ActivityItem {
  id: string;
  caseId?: string;
  caseNumber?: string;
  applicantName?: string;
  action?: string;
  time: string;
  description: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  createdAt?: string;
}

function generateStaticActivities(): ActivityItem[] {
  const list: ActivityItem[] = [
    {
      id: 'act-1',
      caseId: 'case-SSB1025',
      caseNumber: 'SSB-1025',
      applicantName: 'Arjun Verma',
      action: 'Biometric Discrepancy Flagged',
      time: '2026-09-07T18:02:18Z',
      createdAt: '2026-09-07T18:02:18Z',
      description: 'Facial similarity 38.2% flagged below 70% threshold. Referred to Supervisory Admin.',
      type: 'DANGER',
    },
    {
      id: 'act-2',
      caseId: 'case-SSB1021',
      caseNumber: 'SSB-1021',
      applicantName: 'Rajesh Kumar',
      action: 'Verification Approved & Sealed',
      time: '2026-09-07T17:15:00Z',
      createdAt: '2026-09-07T17:15:00Z',
      description: 'Multi-factor verification completed successfully (OCR 96.8%, Face 97.8%).',
      type: 'SUCCESS',
    },
    {
      id: 'act-3',
      caseId: 'case-SSB1028',
      caseNumber: 'SSB-1028',
      applicantName: 'Priya Sharma',
      action: 'Secondary Inspection Requested',
      time: '2026-09-07T16:45:00Z',
      createdAt: '2026-09-07T16:45:00Z',
      description: 'OCR confidence score borderline (88.3%). Secondary manual inspection active.',
      type: 'WARNING',
    },
    {
      id: 'act-4',
      caseId: 'case-SSB1030',
      caseNumber: 'SSB-1030',
      applicantName: 'Meera Joshi',
      action: 'Driving License Ingested',
      time: '2026-09-07T15:10:00Z',
      createdAt: '2026-09-07T15:10:00Z',
      description: 'Digital tamper analysis verified clean (97.2% integrity confidence).',
      type: 'INFO',
    },
    {
      id: 'act-5',
      caseId: 'case-SSB1022',
      caseNumber: 'SSB-1022',
      applicantName: 'Suresh Patel',
      action: 'Visa Stamp Validated',
      time: '2026-09-07T14:50:00Z',
      createdAt: '2026-09-07T14:50:00Z',
      description: 'Cross-border entry visa stamp validated against immigration database.',
      type: 'SUCCESS',
    },
    {
      id: 'act-6',
      caseId: 'case-SSB1023',
      caseNumber: 'SSB-1023',
      applicantName: 'Kavita Nair',
      action: 'Fraudulent Dossier Rejected',
      time: '2026-09-07T13:00:00Z',
      createdAt: '2026-09-07T13:00:00Z',
      description: 'Supervisory review confirmed fabricated identification credentials. Dossier locked.',
      type: 'DANGER',
    },
  ];
  return list;
}

export default function OfficerActivityPage() {
  const { user } = useAuth();
  const [activities] = useState<ActivityItem[]>(() => generateStaticActivities());
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filtered = useMemo(() => {
    return activities.filter((act) => {
      const query = search.toLowerCase();
      const matchSearch =
        !search ||
        act.description.toLowerCase().includes(query) ||
        (act.caseNumber && act.caseNumber.toLowerCase().includes(query)) ||
        (act.applicantName && act.applicantName.toLowerCase().includes(query));

      const matchType = !typeFilter || act.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [activities, search, typeFilter]);

  const typeConfig: Record<string, { label: string; badge: string; dot: string }> = {
    SUCCESS: { label: 'Approved', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    WARNING: { label: 'Review', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    DANGER: { label: 'Flagged', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
    INFO: { label: 'Scanned', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Screening Activity Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time chronological timeline of terminal events, scan results, and verification decisions
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-card p-4 shadow-card flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search activity events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="">All Event Types</option>
            <option value="SUCCESS">Approved</option>
            <option value="WARNING">Review Required</option>
            <option value="DANGER">Flagged Anomalies</option>
            <option value="INFO">Scanned Documents</option>
          </select>

          {(search || typeFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No activity records match your filter criteria.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {filtered.map((item) => {
              const cfg = typeConfig[item.type] || typeConfig.INFO;
              return (
                <div key={item.id} className="relative group">
                  <div className={`absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${cfg.dot}`} />
                  <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-4 transition-all duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${cfg.badge}`}>
                          {item.action || cfg.label}
                        </span>
                        {item.caseNumber && (
                          <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md">
                            {item.caseNumber}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatDateTime(item.time || item.createdAt || new Date().toISOString())}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed mt-1">
                      {item.description}
                    </p>

                    {item.caseId && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          Subject: <strong className="text-slate-700 font-medium">{item.applicantName || 'Applicant'}</strong>
                        </span>
                        <Link
                          href={`/officer/cases/${item.caseId}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          View Dossier <ChevronRight size={13} />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
