'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, AlertTriangle, Eye, Filter, ShieldAlert, ChevronRight } from 'lucide-react';
import { mockAlerts } from '@/lib/mock-data';
import { timeAgo, getAlertTypeLabel } from '@/lib/utils';
import { SeverityBadge } from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

const severityOptions = [
  { value: '', label: 'All Severities' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'DISMISSED', label: 'Dismissed' },
];

const typeOptions = [
  { value: '', label: 'All Alert Types' },
  { value: 'FACE_MISMATCH', label: 'Face Mismatch' },
  { value: 'OCR_INCONSISTENCY', label: 'OCR Inconsistency' },
  { value: 'TAMPERING_DETECTED', label: 'Tampering Detected' },
  { value: 'SUSPICIOUS_IDENTITY', label: 'Suspicious Identity' },
];

export default function AdminAlertsPage() {
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filtered = mockAlerts.filter((a) => {
    const matchSeverity = !severityFilter || a.severity === severityFilter;
    const matchStatus = !statusFilter || a.status === statusFilter;
    const matchType = !typeFilter || a.alertType === typeFilter;
    return matchSeverity && matchStatus && matchType;
  });

  const pendingCount = mockAlerts.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Fraud &amp; Anomaly Alert Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {pendingCount} Pending Review
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Automated alerts triggered by biometric mismatch, altered credentials, and officer escalations
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-card p-4 shadow-card flex flex-wrap items-center gap-3">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-subtle cursor-pointer"
        >
          {severityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-subtle cursor-pointer"
        >
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-subtle cursor-pointer"
        >
          {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {(severityFilter || statusFilter || typeFilter) && (
          <button
            onClick={() => { setSeverityFilter(''); setStatusFilter(''); setTypeFilter(''); }}
            className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Alert Cards Grid */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-card p-12 text-center text-slate-400">
            <ShieldAlert size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No alerts match the selected criteria</p>
            <p className="text-xs text-slate-400 mt-0.5">All monitored channels are currently within normal thresholds.</p>
          </div>
        ) : (
          filtered.map((alert) => {
            const isHigh = alert.severity === 'HIGH' || alert.severity === 'CRITICAL';
            return (
              <div
                key={alert.id}
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-card p-5 shadow-card transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {alert.caseNumber}
                    </span>
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-xs font-bold text-slate-800">
                      {getAlertTypeLabel(alert.alertType)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                    {alert.reason}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Avatar name={alert.officerName} size="xs" />
                      <span className="text-slate-600 font-medium">{alert.officerName}</span>
                    </div>
                    <span>·</span>
                    <span>Detected {timeAgo(alert.detectedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/admin/cases/${alert.caseId}`}>
                    <Button variant={isHigh ? 'danger' : 'secondary'} size="sm" iconRight={<ChevronRight size={13} />}>
                      Investigate Case
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
