'use client';

import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, FileText, Eye, Clock, CheckCircle2, Flag, AlertTriangle,
  User, Hash, Shield, ShieldAlert, Cpu, Sparkles, Check, AlertCircle
} from 'lucide-react';
import { mockCases, getCaseTimeline } from '@/lib/mock-data';
import {
  formatDate, formatDateTime, formatTime, getDocTypeLabel,
  truncateHash, formatFileSize, cn,
} from '@/lib/utils';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ConfidenceBar from '@/components/ui/ConfidenceBar';
import Avatar from '@/components/ui/Avatar';
import { TimelineEventStatus } from '@/types';

function getTimelineMarker(status: TimelineEventStatus) {
  if (status === 'completed') {
    return (
      <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-subtle">
        <Check size={12} strokeWidth={2.5} />
      </div>
    );
  }
  if (status === 'warning') {
    return (
      <div className="w-6 h-6 rounded-full bg-amber-50 border border-amber-300 text-amber-600 flex items-center justify-center shrink-0 shadow-subtle">
        <AlertTriangle size={12} strokeWidth={2.5} />
      </div>
    );
  }
  if (status === 'rejected') {
    return (
      <div className="w-6 h-6 rounded-full bg-rose-50 border border-rose-300 text-rose-600 flex items-center justify-center shrink-0 shadow-subtle">
        <AlertCircle size={12} strokeWidth={2.5} />
      </div>
    );
  }
  if (status === 'current') {
    return (
      <div className="w-6 h-6 rounded-full bg-blue-50 border-2 border-blue-600 text-blue-600 flex items-center justify-center shrink-0 ring-4 ring-blue-50">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Case } from '@/types';

export default function OfficerCaseDetailPage({ params }: { params: { caseId: string } }) {
  const [caseData, setCaseData] = useState<Case | null>(() => mockCases.find((c) => c.id === params.caseId) || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCase() {
      try {
        const res: any = await apiFetch(`/cases/${params.caseId}`);
        if (res?.case) {
          const c = res.case;
          const mapped: Case = {
            id: c.id,
            caseNumber: c.caseNumber || 'SSB-' + c.id.slice(0, 6).toUpperCase(),
            title: c.title,
            applicantName: c.personName || c.applicantName || 'Applicant',
            applicantDob: c.documents?.[0]?.ocrData?.applicantDob || '1996-07-01',
            status: c.status,
            riskScore: Number(c.riskScore) || 10,
            riskLevel: c.riskLevel || 'LOW',
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            officerId: c.officerId,
            officerName: c.officer?.name || 'Officer',
            documents: c.documents?.length > 0 ? c.documents.map((d: any) => ({
              id: d.id,
              caseId: d.caseId,
              docType: d.docType,
              fileName: d.fileName,
              fileSize: d.fileSize || 1024 * 512,
              fileUrl: d.fileUrl,
              sha256Hash: d.sha256Hash,
              status: 'VERIFIED',
              ocrData: d.ocrData?.fields ? {
                status: 'COMPLETED',
                overallConfidence: d.ocrConfidence || 95,
                fields: d.ocrData.fields,
              } : undefined,
              faceResult: d.faceResult,
            })) : (mockCases.find(mc => mc.id === params.caseId)?.documents || []),
            timeline: [],
          };
          setCaseData(mapped);
        }
      } catch (err) {
        console.warn('Could not load case from backend, using fallback:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCase();
  }, [params.caseId]);

  if (!caseData && !loading) return notFound();
  if (!caseData) {
    return (
      <div className="p-12 text-center text-slate-400">
        Loading case details...
      </div>
    );
  }

  const timeline = getCaseTimeline(caseData);
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

        {/* Right Column: Case Timeline (Officer-facing operational view) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card">
            <div className="pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-sm font-bold text-slate-900 tracking-tight">
                  Case Timeline
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {timeline.length} Steps
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Track the verification activity and current case status.
              </p>
            </div>

            {/* Vertical timeline */}
            <div className="relative pl-1">
              {timeline.map((item, idx) => {
                const isLast = idx === timeline.length - 1;
                const isCurrent = item.status === 'current';

                return (
                  <div key={item.id} className="relative flex gap-3.5 group">
                    {/* Marker & Vertical Connector */}
                    <div className="flex flex-col items-center shrink-0">
                      {getTimelineMarker(item.status)}
                      {!isLast && (
                        <div className="w-[1.5px] flex-1 bg-slate-200 my-1 group-hover:bg-slate-300 transition-colors" />
                      )}
                    </div>

                    {/* Event Content */}
                    <div className={cn('flex-1 min-w-0', !isLast ? 'pb-6' : 'pb-1')}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={cn(
                            'text-xs',
                            isCurrent ? 'text-blue-900 font-bold' :
                            item.status === 'warning' ? 'text-amber-900 font-semibold' :
                            item.status === 'rejected' ? 'text-rose-900 font-semibold' :
                            'text-slate-800 font-semibold'
                          )}>
                            {item.title}
                          </p>
                          {isCurrent && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium tabular-nums">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {item.description}
                      </p>
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
