'use client';

import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, FileText, Eye, Clock, CheckCircle2, Flag, AlertTriangle,
  User, Hash, Shield, ShieldAlert, Cpu, Sparkles, Check, AlertCircle
} from 'lucide-react';
import { mockCases, mockAuditLogs } from '@/lib/mock-data';
import {
  formatDate, formatDateTime, formatTime, getDocTypeLabel,
  truncateHash, formatFileSize,
} from '@/lib/utils';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ConfidenceBar from '@/components/ui/ConfidenceBar';
import Avatar from '@/components/ui/Avatar';

const timelineIcons: Record<string, React.ReactNode> = {
  CASE_CREATED: <FileText size={13} />,
  DOCUMENT_UPLOADED: <FileText size={13} />,
  OCR_COMPLETED: <Eye size={13} />,
  FACE_VERIFICATION: <User size={13} />,
  CASE_FLAGGED: <Flag size={13} />,
  ADMIN_REVIEW_STARTED: <Clock size={13} />,
  ADMIN_DECISION: <CheckCircle2 size={13} />,
};

const timelineColors: Record<string, string> = {
  CASE_CREATED: 'bg-blue-50 text-blue-700 border-blue-200',
  DOCUMENT_UPLOADED: 'bg-blue-50 text-blue-700 border-blue-200',
  OCR_COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FACE_VERIFICATION: 'bg-purple-50 text-purple-700 border-purple-200',
  CASE_FLAGGED: 'bg-rose-50 text-rose-700 border-rose-200',
  ADMIN_REVIEW_STARTED: 'bg-amber-50 text-amber-700 border-amber-200',
  ADMIN_DECISION: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function OfficerCaseDetailPage({ params }: { params: { caseId: string } }) {
  const caseData = mockCases.find((c) => c.id === params.caseId);
  if (!caseData) return notFound();

  const auditLogs = mockAuditLogs.filter((l) => l.caseId === caseData.id);
  const primaryDoc = caseData.documents[0];

  const isHighRisk = caseData.riskScore > 60;
  const isMediumRisk = caseData.riskScore > 30 && caseData.riskScore <= 60;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Back Link */}
      <div>
        <Link
          href="/officer/cases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} /> Back to My Cases
        </Link>
      </div>

      {/* Case Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                {caseData.caseNumber}
              </span>
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {caseData.title}
              </h1>
              <StatusBadge status={caseData.status} />
              <RiskBadge level={caseData.riskLevel} />
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-slate-400" />
                Applicant: <strong className="text-slate-800 font-semibold">{caseData.applicantName ?? caseData.title.split('—')[1]?.trim() ?? 'Applicant'}</strong>
              </span>
              <span>·</span>
              <span>DOB: <strong className="font-mono text-slate-700">{caseData.applicantDob ?? '12/05/1998'}</strong></span>
              <span>·</span>
              <span>Created: {formatDate(caseData.createdAt)}</span>
              <span>·</span>
              <span>Assigned Officer: <strong className="text-slate-700">{caseData.officerName}</strong></span>
            </div>
          </div>

          {/* Risk Score Highlight */}
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 self-start lg:self-center">
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Risk Assessment</p>
              <div className="flex items-baseline gap-1 justify-end mt-0.5">
                <span className={`font-heading text-2xl font-bold tabular-nums ${isHighRisk ? 'text-rose-600' : isMediumRisk ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {caseData.riskScore}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ 100</span>
              </div>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isHighRisk ? 'bg-rose-100 text-rose-600' : isMediumRisk ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {isHighRisk ? <ShieldAlert size={20} /> : <Shield size={20} />}
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Evidence, Documents, AI Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Preview & File Metadata */}
          <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-slate-900">Document Evidence</h3>
                  <p className="text-xs text-slate-400">Primary credential submitted for screening</p>
                </div>
              </div>
              {primaryDoc && (
                <span className="text-xs font-mono px-2 py-1 rounded bg-slate-100 text-slate-700">
                  {formatFileSize(primaryDoc.fileSize)}
                </span>
              )}
            </div>

            {/* Document Preview Window */}
            <div className="bg-slate-900 rounded-xl p-6 text-center text-white relative overflow-hidden flex flex-col items-center justify-center min-h-[200px] border border-slate-800">
              <div className="w-16 h-20 bg-slate-800 border border-slate-700 rounded-lg flex flex-col items-center justify-center shadow-md mb-3">
                <FileText size={28} className="text-blue-400 mb-1" />
                <span className="text-[9px] font-mono text-slate-400">PASSPORT</span>
              </div>
              <p className="text-xs font-semibold text-slate-200">{primaryDoc?.fileName ?? 'document.pdf'}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">High-Resolution Digital Scan · 300 DPI</p>

              {/* Integrity Seal Badge */}
              <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs text-emerald-400">
                <CheckCircle2 size={13} />
                <span>SHA-256 Integrity Verified:</span>
                <span className="font-mono text-[10px] text-slate-300">
                  {primaryDoc ? truncateHash(primaryDoc.sha256Hash, 6) : '4f8a92c...91bc'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Verification Analysis Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* OCR Analysis */}
            <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-blue-600" />
                  <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wide">
                    OCR Extraction
                  </h4>
                </div>
                {primaryDoc?.ocrData && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                    {primaryDoc.ocrData.overallConfidence.toFixed(1)}% Conf
                  </span>
                )}
              </div>

              {primaryDoc?.ocrData ? (
                <div className="space-y-2">
                  {primaryDoc.ocrData.fields.slice(0, 5).map((f) => (
                    <div key={f.label} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{f.label}</span>
                        <span className="font-semibold text-slate-900">{f.value}</span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-emerald-600">
                        {f.confidence.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No OCR data available.</p>
              )}
            </div>

            {/* Biometric & Face Verification */}
            <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Cpu size={16} className="text-purple-600" />
                  <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Biometric Match
                  </h4>
                </div>
                {primaryDoc?.faceResult && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${primaryDoc.faceResult.status === 'MATCH' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {primaryDoc.faceResult.status}
                  </span>
                )}
              </div>

              {primaryDoc?.faceResult ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Facial Similarity</span>
                      <span className="font-bold text-slate-900">{primaryDoc.faceResult.similarity.toFixed(1)}%</span>
                    </div>
                    <ConfidenceBar value={primaryDoc.faceResult.similarity} showSegments={false} />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Liveness Detection</span>
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <Check size={13} /> {primaryDoc.faceResult.liveness.toFixed(1)}% (Passed)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-600">Tamper Analysis</span>
                      <span className={`font-semibold flex items-center gap-1 ${primaryDoc.tamperResult?.status === 'CLEAN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {primaryDoc.tamperResult?.status === 'CLEAN' ? <Check size={13} /> : <AlertCircle size={13} />}
                        {primaryDoc.tamperResult?.status ?? 'CLEAN'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No face match data available.</p>
              )}
            </div>
          </div>

          {/* Human-in-the-loop: Officer Observations & Findings */}
          {(caseData.flagReason || caseData.officerObservations) && (
            <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Flag size={16} className="text-rose-500" />
                  <h4 className="font-heading text-sm font-bold text-slate-900">
                    Officer Review &amp; Observations
                  </h4>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  FLAGGED FOR REVIEW
                </span>
              </div>

              {caseData.flagReason && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trigger Reason</p>
                  <p className="text-xs font-semibold text-rose-700 mt-0.5">{caseData.flagReason.replace(/_/g, ' ')}</p>
                </div>
              )}

              {caseData.officerObservations && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Observation Notes</p>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                    "{caseData.officerObservations}"
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Audit Trail */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider">
                Case Timeline
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Audit Chain</span>
            </div>

            <div className="space-y-4">
              {auditLogs.map((log, idx) => (
                <div key={log.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${timelineColors[log.action] ?? 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                      {timelineIcons[log.action] ?? <Clock size={12} />}
                    </div>
                    {idx < auditLogs.length - 1 && <div className="w-[1.5px] flex-1 bg-slate-200 my-1" />}
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{log.actorName} · {formatTime(log.createdAt)}</p>
                    {log.txId && (
                      <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">
                        TX: {log.txId.slice(0, 16)}...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
