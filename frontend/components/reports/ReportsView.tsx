'use client';

import React, { useState } from 'react';
import {
  FileText, Download, Calendar, Shield, CheckCircle2, AlertTriangle,
  Eye, Filter, ArrowDownToLine, Printer, Check, Clock, Building2, User
} from 'lucide-react';
import { mockCases } from '@/lib/mock-data';
import { formatDate, formatDateTime } from '@/lib/utils';
import Button from '@/components/ui/Button';

export interface ReportItem {
  id: string;
  title: string;
  type: 'WEEKLY' | 'MONTHLY';
  period: string;
  generatedAt: string;
  totalCases: number;
  approvedCases: number;
  flaggedCases: number;
  rejectedCases: number;
  avgOcrConfidence: number;
  tamperCount: number;
  fileSize: string;
  hash: string;
  generatedBy: string;
  status: 'SEALED' | 'ARCHIVED';
}

const mockReportsList: ReportItem[] = [
  {
    id: 'rep-w37-2026',
    title: 'Weekly Border Screening & Fraud Audit Report (Week 37)',
    type: 'WEEKLY',
    period: '01 Sep 2026 — 07 Sep 2026',
    generatedAt: '2026-09-08T00:00:00Z',
    totalCases: 28,
    approvedCases: 22,
    flaggedCases: 4,
    rejectedCases: 2,
    avgOcrConfidence: 96.2,
    tamperCount: 2,
    fileSize: '2.4 MB',
    hash: '0x8f3c1a92e4b78912cd3456ef78901234a56b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
    generatedBy: 'Automated SSB Ledger Bot',
    status: 'SEALED',
  },
  {
    id: 'rep-w36-2026',
    title: 'Weekly Border Screening & Fraud Audit Report (Week 36)',
    type: 'WEEKLY',
    period: '25 Aug 2026 — 31 Aug 2026',
    generatedAt: '2026-09-01T00:00:00Z',
    totalCases: 34,
    approvedCases: 29,
    flaggedCases: 3,
    rejectedCases: 2,
    avgOcrConfidence: 95.8,
    tamperCount: 1,
    fileSize: '2.8 MB',
    hash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
    generatedBy: 'Automated SSB Ledger Bot',
    status: 'ARCHIVED',
  },
  {
    id: 'rep-aug-2026',
    title: 'Monthly Executive Security & Dossier Summary (August 2026)',
    type: 'MONTHLY',
    period: '01 Aug 2026 — 31 Aug 2026',
    generatedAt: '2026-09-01T06:00:00Z',
    totalCases: 142,
    approvedCases: 124,
    flaggedCases: 12,
    rejectedCases: 6,
    avgOcrConfidence: 96.5,
    tamperCount: 5,
    fileSize: '8.6 MB',
    hash: '0x1f2e3d4c5b6a789012345678abcdef0123456789abcdef0123456789abcdef01',
    generatedBy: 'Supervisory Division (Admin Anil Sharma)',
    status: 'SEALED',
  },
  {
    id: 'rep-jul-2026',
    title: 'Monthly Executive Security & Dossier Summary (July 2026)',
    type: 'MONTHLY',
    period: '01 Jul 2026 — 31 Jul 2026',
    generatedAt: '2026-08-01T06:00:00Z',
    totalCases: 156,
    approvedCases: 139,
    flaggedCases: 11,
    rejectedCases: 6,
    avgOcrConfidence: 95.1,
    tamperCount: 4,
    fileSize: '9.1 MB',
    hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    generatedBy: 'Supervisory Division (Admin Anil Sharma)',
    status: 'ARCHIVED',
  },
];

export default function ReportsView({ userRole }: { userRole: 'OFFICER' | 'ADMIN' }) {
  const [reports] = useState<ReportItem[]>(mockReportsList);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'WEEKLY' | 'MONTHLY'>('ALL');
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filtered = reports.filter((r) => {
    if (typeFilter === 'ALL') return true;
    return r.type === typeFilter;
  });

  const handleDownload = (r: ReportItem) => {
    setDownloadingId(r.id);
    setTimeout(() => {
      setDownloadingId(null);
      // Trigger printable PDF dialog
      setSelectedReport(r);
    }, 600);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {userRole === 'ADMIN' ? 'Supervisory & Compliance Dossier Reports' : 'Operational Screening Reports'}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Shield size={13} className="text-blue-600" />
              Automated PDF Generation Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Weekly and monthly consolidated verification dossiers ready for higher command submission.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              typeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-subtle'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Reports
          </button>
          <button
            onClick={() => setTypeFilter('WEEKLY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              typeFilter === 'WEEKLY'
                ? 'bg-blue-600 text-white shadow-subtle'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Weekly Reports
          </button>
          <button
            onClick={() => setTypeFilter('MONTHLY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              typeFilter === 'MONTHLY'
                ? 'bg-purple-600 text-white shadow-subtle'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Monthly Reports
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Scheduled Generation</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <p className="font-heading text-lg font-bold text-slate-900">Every Monday @ 00:00 IST</p>
          <p className="text-xs text-slate-500 mt-1">Monthly dossiers generate automatically on the 1st of every month.</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Higher Authority Format</span>
            <Building2 size={16} className="text-blue-600" />
          </div>
          <p className="font-heading text-lg font-bold text-slate-900">MHA / SSB Standard Form-7</p>
          <p className="text-xs text-slate-500 mt-1">Formatted with official seals, cryptographic verification hashes, and officer logs.</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Blockchain Sealed</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="font-heading text-lg font-bold text-slate-900">100% Immutable Anchored</p>
          <p className="text-xs text-slate-500 mt-1">All weekly dossiers are tamper-sealed on the Hyperledger Fabric ledger.</p>
        </div>
      </div>

      {/* Reports List Table */}
      <div className="bg-white border border-slate-200/90 rounded-card shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-sm font-bold text-slate-900">Archived PDF Dossiers</h3>
            <p className="text-xs text-slate-400 mt-0.5">Click preview or download to inspect the official report</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((r) => (
            <div key={r.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-slate-50/50 transition-colors">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                      r.type === 'WEEKLY'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}
                  >
                    {r.type} REPORT
                  </span>
                  <span className="font-mono text-xs text-slate-500 font-medium">
                    Period: <strong>{r.period}</strong>
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">Generated: {formatDate(r.generatedAt)}</span>
                </div>

                <h3 className="font-heading text-base font-bold text-slate-900">{r.title}</h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Cases</span>
                    <strong className="text-slate-900 font-mono text-sm">{r.totalCases}</strong>
                  </div>
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2 text-xs">
                    <span className="text-emerald-700 block text-[10px] uppercase font-semibold">Approved</span>
                    <strong className="text-emerald-800 font-mono text-sm">{r.approvedCases}</strong>
                  </div>
                  <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-2 text-xs">
                    <span className="text-rose-700 block text-[10px] uppercase font-semibold">Flagged / Rejected</span>
                    <strong className="text-rose-800 font-mono text-sm">{r.flaggedCases + r.rejectedCases}</strong>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Avg OCR Accuracy</span>
                    <strong className="text-slate-900 font-mono text-sm">{r.avgOcrConfidence}%</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono truncate">
                  <Shield size={12} className="text-emerald-500 shrink-0" />
                  <span className="truncate">Seal: {r.hash}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Eye size={14} />}
                  onClick={() => setSelectedReport(r)}
                >
                  View Dossier
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ArrowDownToLine size={14} />}
                  disabled={downloadingId === r.id}
                  onClick={() => handleDownload(r)}
                >
                  {downloadingId === r.id ? 'Exporting...' : 'Download PDF'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Printable PDF Modal View */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
            {/* Modal Top Bar */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText size={18} className="text-blue-400" />
                <span className="font-heading text-sm font-bold tracking-tight">Official PDF Dossier Document</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                >
                  <Printer size={14} /> Print / Save as PDF
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Content (Styled as official Govt Document) */}
            <div className="p-8 sm:p-12 overflow-y-auto space-y-8 bg-white text-slate-900 font-sans">
              {/* Header */}
              <div className="text-center pb-6 border-b-2 border-slate-900 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Government of India · Ministry of Home Affairs</p>
                <h2 className="font-heading text-xl sm:text-2xl font-bold uppercase tracking-tight text-slate-900">
                  Sashastra Seema Bal (SSB) — Border Security Terminal
                </h2>
                <p className="text-xs text-slate-600 font-medium">Multi-Factor Identity &amp; Cross-Document Verification Audit Dossier</p>
                <div className="pt-2 flex items-center justify-center gap-4 text-[11px] font-mono text-slate-500">
                  <span>Dossier ID: <strong>{selectedReport.id.toUpperCase()}</strong></span>
                  <span>·</span>
                  <span>Classification: <strong>CONFIDENTIAL / OFFICIAL USE ONLY</strong></span>
                </div>
              </div>

              {/* Report Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">REPORT PERIOD</span>
                  <span className="font-bold text-slate-900">{selectedReport.period}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">GENERATED TIMESTAMP</span>
                  <span className="font-bold text-slate-900">{formatDateTime(selectedReport.generatedAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">TOTAL CASES AUDITED</span>
                  <span className="font-bold text-slate-900">{selectedReport.totalCases} Dossiers</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">COMPLIANCE STATUS</span>
                  <span className="font-bold text-emerald-700">100% SEALED</span>
                </div>
              </div>

              {/* Executive Summary Narrative */}
              <div className="space-y-2">
                <h3 className="font-heading text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-1">
                  1. Executive Summary &amp; Fraud Prevention Velocity
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  During the designated audit period (<strong>{selectedReport.period}</strong>), the Border Security Terminal processed a cumulative total of <strong>{selectedReport.totalCases} verification cases</strong>. 
                  Out of these, <strong>{selectedReport.approvedCases} cases ({Math.round((selectedReport.approvedCases / selectedReport.totalCases) * 100)}%)</strong> were verified authentic and approved. 
                  A total of <strong>{selectedReport.flaggedCases + selectedReport.rejectedCases} suspicious anomalies</strong> were intercepted, including <strong>{selectedReport.tamperCount} document tampering attempts</strong> and biometric facial mismatch incidents.
                </p>
              </div>

              {/* Document Breakdown Table */}
              <div className="space-y-2">
                <h3 className="font-heading text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-1">
                  2. Document Category Distribution &amp; Extraction Integrity
                </h3>
                <table className="w-full text-xs border border-slate-200">
                  <thead className="bg-slate-100 font-bold text-slate-800">
                    <tr>
                      <th className="p-2.5 text-left border">Document Type</th>
                      <th className="p-2.5 text-center border">Scanned Count</th>
                      <th className="p-2.5 text-center border">Avg OCR Confidence</th>
                      <th className="p-2.5 text-center border">Tamper Flags</th>
                      <th className="p-2.5 text-center border">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono text-slate-700">
                    <tr>
                      <td className="p-2.5 font-sans font-semibold border">Passport</td>
                      <td className="p-2.5 text-center border">14</td>
                      <td className="p-2.5 text-center border">97.8%</td>
                      <td className="p-2.5 text-center border text-rose-600 font-bold">1</td>
                      <td className="p-2.5 text-center border text-emerald-700 font-bold">VERIFIED</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-semibold border">National ID</td>
                      <td className="p-2.5 text-center border">8</td>
                      <td className="p-2.5 text-center border">95.4%</td>
                      <td className="p-2.5 text-center border">0</td>
                      <td className="p-2.5 text-center border text-emerald-700 font-bold">VERIFIED</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-semibold border">Visa</td>
                      <td className="p-2.5 text-center border">3</td>
                      <td className="p-2.5 text-center border">96.2%</td>
                      <td className="p-2.5 text-center border text-rose-600 font-bold">1</td>
                      <td className="p-2.5 text-center border text-amber-700 font-bold">FLAGGED</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-semibold border">Driving License</td>
                      <td className="p-2.5 text-center border">2</td>
                      <td className="p-2.5 text-center border">94.1%</td>
                      <td className="p-2.5 text-center border">0</td>
                      <td className="p-2.5 text-center border text-emerald-700 font-bold">VERIFIED</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans font-semibold border">DOB Proof</td>
                      <td className="p-2.5 text-center border">1</td>
                      <td className="p-2.5 text-center border">93.5%</td>
                      <td className="p-2.5 text-center border">0</td>
                      <td className="p-2.5 text-center border text-emerald-700 font-bold">VERIFIED</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signature & Cryptographic Seal */}
              <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">Submitted to Higher Authority:</p>
                  <p className="text-slate-600">Directorate General, Sashastra Seema Bal</p>
                  <p className="text-slate-600">East Block V, R.K. Puram, New Delhi</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-2">Anchor Hash: {selectedReport.hash.slice(0, 32)}...</p>
                </div>
                <div className="text-right space-y-3">
                  <div className="inline-block border-b border-slate-900 pb-1 px-6 font-serif italic text-sm text-slate-800">
                    Anil Sharma / Rajesh Kumar
                  </div>
                  <p className="text-[11px] font-bold text-slate-900 uppercase">Authorized Border Verification Seal</p>
                  <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                    VALIDATED BY HYPERLEDGER FABRIC
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
