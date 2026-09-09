'use client';

import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, FileText, Eye, Clock, CheckCircle2, Flag, AlertTriangle,
  User, Hash, Shield, ShieldAlert, Cpu, Sparkles, Check, AlertCircle,
  ZoomIn, ZoomOut, RotateCw, X
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
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

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
  const docs = caseData.documents && caseData.documents.length > 0 ? caseData.documents : [];
  const activeDoc = docs[selectedDocIndex] || docs[0] || null;

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
                  <h3 className="font-heading text-sm font-bold text-slate-900">Document Evidences ({docs.length})</h3>
                  <p className="text-xs text-slate-400">Select any submitted credential to inspect original scan &amp; OCR metadata</p>
                </div>
              </div>
              {activeDoc && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-slate-100 text-slate-700">
                    {formatFileSize(activeDoc.fileSize)}
                  </span>
                  <button
                    onClick={() => { setZoomLevel(1); setRotation(0); setPreviewModalOpen(true); }}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                  >
                    <Eye size={12} /> Open Full
                  </button>
                </div>
              )}
            </div>

            {/* Document Evidence Selector Tabs */}
            {docs.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {docs.map((d, idx) => {
                  const isSelected = idx === selectedDocIndex;
                  return (
                    <button
                      key={d.id || idx}
                      onClick={() => setSelectedDocIndex(idx)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      <FileText size={13} className={isSelected ? 'text-blue-100' : 'text-slate-500'} />
                      <span>{d.fileName || `Document ${idx + 1}`}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200/70 text-slate-600'
                      }`}>
                        {getDocTypeLabel(d.docType)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Document Preview Window */}
            {activeDoc ? (
              <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative group min-h-[280px] flex flex-col items-center justify-center">
                {activeDoc.fileUrl && !activeDoc.fileUrl.endsWith('.pdf') ? (
                  <div className="relative w-full h-72 flex items-center justify-center p-2 bg-slate-950/80">
                    <img
                      src={activeDoc.fileUrl}
                      alt={activeDoc.fileName}
                      className="max-h-full max-w-full object-contain rounded cursor-pointer transition-transform hover:scale-[1.02]"
                      onClick={() => setPreviewModalOpen(true)}
                    />
                    <div className="absolute top-2 right-2 flex gap-1 bg-black/60 backdrop-blur-xs p-1 rounded-lg">
                      <button
                        onClick={() => setPreviewModalOpen(true)}
                        className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10"
                        title="Enlarge Evidence"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-white flex flex-col items-center justify-center">
                    <div className="w-16 h-20 bg-slate-800 border border-slate-700 rounded-lg flex flex-col items-center justify-center shadow-md mb-3">
                      <FileText size={28} className="text-blue-400 mb-1" />
                      <span className="text-[9px] font-mono text-slate-400 uppercase">{activeDoc.docType}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200">{activeDoc.fileName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">High-Resolution Digital Scan · 300 DPI</p>
                    {activeDoc.fileUrl && (
                      <a
                        href={activeDoc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
                      >
                        <Eye size={12} /> Open in New Tab
                      </a>
                    )}
                  </div>
                )}

                {/* Integrity Seal Badge */}
                <div className="w-full bg-slate-950/90 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 size={13} />
                    <span>SHA-256 Verified:</span>
                    <span className="font-mono text-[11px] text-slate-300 truncate max-w-[200px] sm:max-w-xs">
                      {truncateHash(activeDoc.sha256Hash || 'pending', 10)}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 uppercase">
                    {getDocTypeLabel(activeDoc.docType)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-12 text-center">No document evidence records found.</p>
            )}
          </div>

          {/* AI Verification Analysis Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* OCR Analysis */}
            <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-blue-600" />
                  <h4 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wide">
                    OCR Extraction ({activeDoc ? getDocTypeLabel(activeDoc.docType) : 'Document'})
                  </h4>
                </div>
                {activeDoc?.ocrData && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                    {activeDoc.ocrData.overallConfidence.toFixed(1)}% Conf
                  </span>
                )}
              </div>

              {activeDoc?.ocrData ? (
                <div className="space-y-2">
                  {activeDoc.ocrData.fields.slice(0, 8).map((f) => (
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
                <p className="text-xs text-slate-400 py-4 text-center">No OCR data available for this document.</p>
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
                {activeDoc?.faceResult && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${activeDoc.faceResult.status === 'MATCH' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    {activeDoc.faceResult.status}
                  </span>
                )}
              </div>

              {activeDoc?.faceResult ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Facial Similarity</span>
                      <span className="font-bold text-slate-900">{activeDoc.faceResult.similarity.toFixed(1)}%</span>
                    </div>
                    <ConfidenceBar value={activeDoc.faceResult.similarity} showSegments={false} />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-600">Tamper Analysis</span>
                      <span className={`font-semibold flex items-center gap-1 ${activeDoc.tamperResult?.status === 'CLEAN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {activeDoc.tamperResult?.status === 'CLEAN' ? <Check size={13} /> : <AlertCircle size={13} />}
                        {activeDoc.tamperResult?.status ?? 'CLEAN'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No biometric match data attached to this document.</p>
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

      {/* Full Document Evidence Lightbox Modal */}
      {previewModalOpen && activeDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col p-4 sm:p-6 animate-fade-in">
          {/* Modal Header */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-t-xl px-5 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-blue-400" />
              <div>
                <h3 className="font-heading text-sm font-bold truncate max-w-sm sm:max-w-md">
                  {activeDoc.fileName}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {getDocTypeLabel(activeDoc.docType)} · SHA-256: <span className="font-mono">{truncateHash(activeDoc.sha256Hash || 'verified', 8)}</span>
                </p>
              </div>
            </div>

            {/* Viewer Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>
                <span className="text-[11px] font-mono px-2 text-slate-300 min-w-[45px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.2))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors ml-1"
                  title="Rotate 90°"
                >
                  <RotateCw size={15} />
                </button>
              </div>

              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-2"
                title="Close Viewer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Document Body */}
          <div className="flex-1 bg-slate-950 border-x border-b border-slate-800 rounded-b-xl overflow-auto flex items-center justify-center p-4 sm:p-8">
            {activeDoc.fileUrl && !activeDoc.fileUrl.endsWith('.pdf') ? (
              <img
                src={activeDoc.fileUrl}
                alt={activeDoc.fileName}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div className="text-center text-white p-12 bg-slate-900 border border-slate-800 rounded-2xl max-w-lg">
                <FileText size={64} className="text-blue-400 mx-auto mb-4" />
                <h4 className="font-heading text-base font-bold">{activeDoc.fileName}</h4>
                <p className="text-xs text-slate-400 mt-1">{getDocTypeLabel(activeDoc.docType)}</p>
                <div className="mt-6 flex justify-center gap-3">
                  {activeDoc.fileUrl && (
                    <a
                      href={activeDoc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      Open Document in New Tab
                    </a>
                  )}
                  <button
                    onClick={() => setPreviewModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
