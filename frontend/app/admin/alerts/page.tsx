'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, AlertTriangle, Eye, Filter } from 'lucide-react';
import { mockAlerts } from '@/lib/mock-data';
import { timeAgo, getAlertTypeLabel } from '@/lib/utils';
import { SeverityBadge } from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Avatar from '@/components/ui/Avatar';

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
  { value: '', label: 'All Types' },
  { value: 'FACE_MISMATCH', label: 'Face Mismatch' },
  { value: 'OCR_INCONSISTENCY', label: 'OCR Inconsistency' },
  { value: 'TAMPERING_DETECTED', label: 'Tampering Detected' },
  { value: 'SUSPICIOUS_IDENTITY', label: 'Suspicious Identity' },
];

const severityBorderColors: Record<string, string> = {
  CRITICAL: 'border-l-4 border-l-danger bg-danger/5',
  HIGH: 'border-l-4 border-l-danger/60 bg-danger/3',
  MEDIUM: 'border-l-4 border-l-warning bg-warning/5',
  LOW: 'border-l-4 border-l-info bg-info/5',
};

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
    <div className="p-6 space-y-6">
      <PageHeader
        title="Anomaly Alerts"
        subtitle="Review and investigate detected anomalies"
        badge={
          pendingCount > 0 ? (
            <span className="text-xs bg-danger/10 border border-danger/30 text-danger px-2.5 py-1 rounded-full font-semibold">
              {pendingCount} pending
            </span>
          ) : undefined
        }
      />

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-3 items-center">
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-navy-700 border border-navy-600 text-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
            {severityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-navy-700 border border-navy-600 text-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-navy-700 border border-navy-600 text-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
            {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(severityFilter || statusFilter || typeFilter) && (
            <button onClick={() => { setSeverityFilter(''); setStatusFilter(''); setTypeFilter(''); }}
              className="text-xs text-slate-400 hover:text-slate-200">Clear filters</button>
          )}
          <span className="ml-auto text-xs text-slate-400">{filtered.length} alert{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </Card>

      {/* Alert Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No alerts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <div
              key={alert.id}
              className={`bg-navy-800 rounded-xl border border-navy-600 overflow-hidden transition-shadow hover:shadow-card-hover ${severityBorderColors[alert.severity] ?? ''}`}
            >
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'bg-danger/20' : 'bg-warning/20'
                    }`}>
                      <AlertTriangle size={20} className={alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'text-danger' : 'text-warning'} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <SeverityBadge severity={alert.severity} />
                        <h3 className="text-base font-bold text-slate-100">{getAlertTypeLabel(alert.alertType)}</h3>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-1.5">
                        <span>Case: <span className="font-mono text-blue-400 font-semibold">{alert.caseNumber}</span></span>
                        <span className="flex items-center gap-1.5">
                          <Avatar name={alert.officerName} size="sm" />
                          Officer: <span className="text-slate-300">{alert.officerName}</span>
                        </span>
                        <span>Detected: <span className="text-slate-300">{timeAgo(alert.detectedAt)}</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      alert.status === 'PENDING' ? 'bg-warning/10 text-warning border-warning/30' :
                      alert.status === 'REVIEWED' ? 'bg-success/10 text-success border-success/30' :
                      'bg-slate-700 text-slate-400 border-slate-600'
                    }`}>
                      {alert.status}
                    </span>
                    <Link href={`/admin/cases/${alert.caseId}`}>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors">
                        <Eye size={13} /> Review Case
                      </button>
                    </Link>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-navy-700">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    <span className="font-medium text-slate-400">Reason: </span>
                    {alert.reason}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
