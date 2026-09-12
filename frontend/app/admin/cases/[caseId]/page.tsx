'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, FileText, User, Clock, Hash, CheckCircle2, XCircle,
  AlertTriangle, Flag, Shield, Cpu, Eye, Check, AlertCircle, ShieldAlert,
  ZoomIn, ZoomOut, RotateCw, X, BadgeAlert, Sparkles, Layers, ShieldCheck
} from 'lucide-react';
import { mockCases, mockAuditLogs, updateMockCase } from '@/lib/mock-data';
import {
  formatDateTime, formatTime, getDocTypeLabel, truncateHash,
  getConfidenceClasses, getAlertTypeLabel, formatFileSize
} from '@/lib/utils';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import ConfidenceBar from '@/components/ui/ConfidenceBar';
import { Case } from '@/types';

type Decision = 'APPROVE' | 'REJECT';

const timelineColors: Record<string, string> = {
  CASE_CREATED: 'bg-blue-50 text-blue-700 border-blue-200',
  DOCUMENT_UPLOADED: 'bg-blue-50 text-blue-700 border-blue-200',
  OCR_COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FACE_VERIFICATION: 'bg-purple-50 text-purple-700 border-purple-200',
  CASE_FLAGGED: 'bg-rose-50 text-rose-700 border-rose-200',
  ADMIN_REVIEW_STARTED: 'bg-amber-50 text-amber-700 border-amber-200',
  ADMIN_DECISION: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const decisionConfig: Record<Decision, { label: string; color: string; bg: string; btnClass: string; requiredWord: string }> = {
  APPROVE: { label: 'Approve Credential', color: 'text-emerald-700', bg: 'border-emerald-200 bg-emerald-50/50', btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white', requiredWord: 'APPROVE' },
  REJECT: { label: 'Reject Credential', color: 'text-rose-700', bg: 'border-rose-200 bg-rose-50/50', btnClass: 'bg-rose-600 hover:bg-rose-700 text-white', requiredWord: 'REJECT' },
};

export default function AdminCaseDetailPage({ params }: { params: { caseId: string } }) {
  const [caseData, setCaseData] = useState<Case | null>(() => mockCases.find((c) => c.id === params.caseId || c.caseNumber === params.caseId) || mockCases[0]);
  const [decisionModal, setDecisionModal] = useState<Decision | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [decided, setDecided] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const found = mockCases.find((c) => c.id === params.caseId || c.caseNumber === params.caseId) || mockCases[0];
    setCaseData(found);
    setLoading(false);
  }, [params.caseId]);

  if (!caseData && !loading) return notFound();
  if (!caseData) {
    return (
      <div className="p-12 text-center text-slate-400">
        Loading case details for review...
      </div>
    );
  }

  const auditLogs = mockAuditLogs.filter((l) => l.caseId === caseData.id);
  const docs = caseData.documents && caseData.documents.length > 0 ? caseData.documents : [];
  const activeDoc = docs[selectedDocIndex] || docs[0] || null;

  // Derived scores for overview
  const crossValidationScore = caseData.status === 'APPROVED' ? 98 : caseData.status === 'FLAGGED' ? 44 : 76;
  const tamperingScore = activeDoc?.tamperResult?.status === 'CLEAN' ? 97 : 34;
  const biometricScore = activeDoc?.faceResult?.similarity || (caseData.status === 'APPROVED' ? 97.4 : 38.2);

  async function confirmDecision() {
    if (!decisionModal || !caseData) return;
    if (typedConfirmation.trim().toUpperCase() !== decisionConfig[decisionModal].requiredWord) return;

    setConfirming(true);
    await new Promise((r) => setTimeout(r, 600));

    const statusMap: Record<Decision, 'APPROVED' | 'REJECTED'> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
    };

    const updates = {
      status: statusMap[decisionModal],
      adminDecision: decisionModal,
      adminDecisionReason: decisionReason,
      adminDecisionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updateMockCase(caseData.id, updates);
    setCaseData((prev) => (prev ? { ...prev, ...updates } : prev));
    setConfirming(false);
    setDecisionModal(null);
    setTypedConfirmation('');
    setDecisionReason('');
    setDecided(true);
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Back Link */}
      <div>
        <Link
          href="/admin/cases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={14} /> Back to All Cases
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
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-slate-900">
                {caseData.title}
              </h1>
              <StatusBadge status={caseData.status} />
              <RiskBadge level={caseData.riskLevel} />
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span>Logged: {formatDateTime(caseData.createdAt)}</span>
              <span>Screening Officer: <strong>{caseData.officerName || 'Rajesh Kumar'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 self-start lg:self-center">
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Risk Assessment</span>
              <p className={`font-heading text-2xl font-bold tabular-nums ${caseData.riskScore > 60 ? 'text-rose-600' : 'text-amber-600'}`}>
                {caseData.riskScore}/100
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${caseData.riskScore > 60 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
              <ShieldAlert size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left Column (2/5): Document Viewer */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-card p-5 shadow-card space-y-3 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Document Evidences ({docs.length})
                </h3>
                <p className="text-[11px] text-slate-400">Select document to inspect bio-data</p>
              </div>
            </div>

            {/* Document Selector Pills */}
            <div className="flex flex-wrap gap-1.5">
              {docs.map((doc, idx) => {
                const isSelected = idx === selectedDocIndex;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocIndex(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <FileText size={13} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                    <span>{getDocTypeLabel(doc.docType)}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Document Frame */}
            {activeDoc ? (
              <div className="space-y-3 pt-2">
                <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center min-h-[220px]">
                  {activeDoc.fileUrl && !activeDoc.fileUrl.endsWith('.pdf') ? (
                    <div className="relative w-full h-56 group">
                      <img
                        src={activeDoc.fileUrl}
                        alt={activeDoc.fileName}
                        className="w-full h-full object-cover rounded-xl"
                      />
                      <div className="absolute top-2 right-2 flex gap-1 bg-black/60 backdrop-blur-xs p-1 rounded-lg">
                        <button
                          onClick={() => setPreviewModalOpen(true)}
                          className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10"
                          title="Open Fullscreen"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-white flex flex-col items-center justify-center">
                      <FileText size={48} className="text-blue-400 mb-2" />
                      <p className="text-xs font-bold text-slate-200">{activeDoc.fileName}</p>
                      <p className="text-[11px] text-slate-400">{getDocTypeLabel(activeDoc.docType)}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 font-mono">
                  <Hash size={13} className="text-slate-400 shrink-0" />
                  <span className="text-[11px] truncate">{activeDoc.sha256Hash}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-12 text-center">No document file attached.</p>
            )}
          </div>
        </div>

        {/* Right Column (3/5): Evidence Tabs & Final Decision */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-card shadow-card overflow-hidden">
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview & AI Reasoning' },
                { id: 'tampering', label: 'Tampering Forensics' },
                { id: 'ocr', label: 'OCR Findings' },
                { id: 'face', label: 'Biometric Match' },
                { id: 'audit', label: 'Audit Trail' },
              ]}
            >
              {(activeTab) => (
                <div className="p-6">
                  {/* ──────────────── OVERVIEW TAB ──────────────── */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <h4 className="font-heading text-sm font-bold text-slate-900">Comprehensive Forensic Synthesis</h4>
                          <p className="text-xs text-slate-400">Aggregated multi-factor verification breakdown</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${caseData.riskScore > 60 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          Risk Score: {caseData.riskScore}/100
                        </span>
                      </div>

                      {/* 3 Key Synthesis Scores: Cross-Validation, Tampering, Biometrics */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Cross-Validation Score</span>
                          <p className={`font-heading text-xl font-bold ${crossValidationScore >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {crossValidationScore}%
                          </p>
                          <span className="text-[10px] text-slate-500">{crossValidationScore >= 80 ? 'Fields match across docs' : 'Bio-data discrepancies'}</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Tampering Detection</span>
                          <p className={`font-heading text-xl font-bold ${tamperingScore >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tamperingScore}% Authentic
                          </p>
                          <span className="text-[10px] text-slate-500">{tamperingScore >= 80 ? 'Microprint clean' : 'Font / Hologram flags'}</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Biometric Match</span>
                          <p className={`font-heading text-xl font-bold ${biometricScore >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {biometricScore}%
                          </p>
                          <span className="text-[10px] text-slate-500">{biometricScore >= 75 ? 'Facial similarity passed' : 'Discrepancy flagged'}</span>
                        </div>
                      </div>

                      {/* AI Reason / Forensic Analysis */}
                      <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-purple-900 font-heading text-xs font-bold uppercase tracking-wider">
                          <Sparkles size={15} className="text-purple-600" />
                          AI Forensic Assessment &amp; Reasoning
                        </div>
                        <p className="text-xs text-purple-950 leading-relaxed">
                          {caseData.status === 'FLAGGED'
                            ? 'AI analysis flagged severe anomaly vectors: Biometric facial similarity index (38.2%) is below confidence thresholds. Microprint and glyph consistency tests indicate possible digital forgery in the bio-data region. Cross-document comparison reveals surname & date of birth inconsistencies.'
                            : 'All document features conform to standard ICAO 9303 layout. Biometric liveness check passed with 97.4% facial landmark similarity. No cut-and-paste boundary artifacts or digital stamp overlays detected.'}
                        </p>
                      </div>

                      {/* Officer Observations */}
                      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-slate-700 font-heading text-xs font-bold uppercase tracking-wider">
                          <User size={15} className="text-slate-500" />
                          Screening Officer Initial Observations
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          "{caseData.officerObservations || 'Screening conducted at Terminal Lane #4. Passport and secondary documentation submitted for verification.'}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ──────────────── TAMPERING FORENSICS TAB (Requirement 9) ──────────────── */}
                  {activeTab === 'tampering' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <h4 className="font-heading text-sm font-bold text-slate-900">Per-Document Tampering Forensics Report</h4>
                          <p className="text-xs text-slate-400">Deep neural inspection of typography, holograms, and metadata</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${tamperingScore >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {tamperingScore}% Integrity
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-slate-900">1. Typography &amp; Font Glyph Integrity</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tamperingScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {tamperingScore >= 80 ? 'AUTHENTIC (99.1%)' : 'ANOMALY DETECTED (94.8%)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            {tamperingScore >= 80
                              ? 'Standard ICAO optical font baseline aligned. No spacing irregularities or font substitutions.'
                              : 'Font mismatch and character kern irregularity detected in document serial number block.'}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-slate-900">2. Error Level Analysis (ELA) &amp; Compression Artifacts</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tamperingScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {tamperingScore >= 80 ? 'CLEAN (98.4%)' : 'SUSPICIOUS (86.4%)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            {tamperingScore >= 80
                              ? 'Uniform JPEG error level frequency across all document regions.'
                              : 'High-frequency gradient discontinuity around photo perimeter suggesting cut-and-paste manipulation.'}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-slate-900">3. Microprint &amp; Security Hologram Fidelity</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tamperingScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {tamperingScore >= 80 ? 'AUTHENTIC (98.0%)' : 'DISTORTION FLAGGED (89.2%)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            {tamperingScore >= 80
                              ? 'Micro-text boundaries uniform and intact with authentic diffraction index.'
                              : 'Distortion and broken line artifacts detected around national emblem.'}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-slate-900">4. Exif Metadata Modification Inspection</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tamperingScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {tamperingScore >= 80 ? 'CONSISTENT (97.9%)' : 'SOFTWARE TAG FOUND'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            {tamperingScore >= 80
                              ? 'No external graphics editor signatures present in metadata headers.'
                              : 'Editing software signature (Adobe Photoshop CC) embedded in file stream headers.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ──────────────── OCR TAB ──────────────── */}
                  {activeTab === 'ocr' && (
                    <div className="space-y-4">
                      {activeDoc?.ocrData ? (
                        <>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-xs font-bold font-heading text-slate-900">
                              Extracted Bio-Data ({getDocTypeLabel(activeDoc.docType)})
                            </span>
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              {activeDoc.ocrData.overallConfidence.toFixed(1)}% Confidence
                            </span>
                          </div>

                          <div className="space-y-2">
                            {activeDoc.ocrData.fields.map((f: any) => (
                              <div key={f.label} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{f.label}</span>
                                  <span className="font-semibold text-slate-900">{f.value}</span>
                                </div>
                                <ConfidenceBar value={f.confidence} segmentsCount={8} />
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 py-6 text-center">No OCR analysis data found for this document.</p>
                      )}
                    </div>
                  )}

                  {/* ──────────────── BIOMETRIC TAB ──────────────── */}
                  {activeTab === 'face' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {['Document Portrait', 'Live Terminal Stream'].map((label) => (
                          <div key={label} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                              <User size={28} className="text-slate-500" />
                            </div>
                            <span className="text-xs font-medium text-slate-600">{label}</span>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Similarity</span>
                          <p className="font-heading text-lg font-bold text-slate-900 mt-0.5">{biometricScore}%</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Status</span>
                          <p className={`font-heading text-lg font-bold mt-0.5 ${biometricScore >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {biometricScore >= 75 ? 'MATCH' : 'MISMATCH'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ──────────────── AUDIT TRAIL TAB ──────────────── */}
                  {activeTab === 'audit' && (
                    <div className="space-y-3">
                      {auditLogs.map((log, idx) => (
                        <div key={log.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${timelineColors[log.action] ?? 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                              <Clock size={12} />
                            </div>
                            {idx < auditLogs.length - 1 && <div className="w-[1.5px] flex-1 bg-slate-200 my-1" />}
                          </div>
                          <div className="pb-3 flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-slate-900">{log.action.replace(/_/g, ' ')}</p>
                              <span className="text-[10px] text-slate-400 font-mono">{formatTime(log.createdAt)}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">{log.actorName}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Tabs>
          </div>

          {/* Final Adjudication Decision Panel (ONLY Approve & Reject — No Escalate) */}
          {!decided && (caseData.status === 'FLAGGED' || caseData.status === 'UNDER_REVIEW') && (
            <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-4">
              <div>
                <h3 className="font-heading text-sm font-bold text-slate-900">Final Supervisory Determination</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record final adjudication. Decisions are cryptographically anchored to the blockchain ledger.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setDecisionModal('APPROVE');
                    setTypedConfirmation('');
                    setDecisionReason('');
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-500 transition-all group cursor-pointer"
                >
                  <CheckCircle2 size={24} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">Approve Credential</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDecisionModal('REJECT');
                    setTypedConfirmation('');
                    setDecisionReason('');
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-rose-200 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-500 transition-all group cursor-pointer"
                >
                  <XCircle size={24} className="text-rose-600" />
                  <span className="text-xs font-bold text-rose-700">Reject Credential</span>
                </button>
              </div>
            </div>
          )}

          {decided && (
            <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <CheckCircle2 size={24} className="text-emerald-600 mx-auto" />
              <p className="font-heading text-base font-bold text-emerald-900">
                Decision Registered: {caseData.adminDecision}
              </p>
              <p className="text-xs text-emerald-700">
                Adjudication officially sealed on Hyperledger Fabric.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ──────────────── TYPED CONFIRMATION MODAL (Requirement 12) ──────────────── */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDecisionModal(null)} />
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-modal p-6 space-y-4 animate-scale-in">
            <div className="border-b border-slate-100 pb-3">
              <h3 className={`font-heading text-base font-bold ${decisionConfig[decisionModal].color}`}>
                Supervisory Adjudication: {decisionConfig[decisionModal].label}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                To confirm, type <strong className="font-mono text-slate-900 uppercase">"{decisionConfig[decisionModal].requiredWord}"</strong> below.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Type <span className="font-mono font-bold text-slate-900">{decisionConfig[decisionModal].requiredWord}</span> to confirm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={typedConfirmation}
                  onChange={(e) => setTypedConfirmation(e.target.value)}
                  placeholder={`Type "${decisionConfig[decisionModal].requiredWord}"`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Supervisory Determination Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="State official justification for blockchain audit record..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setDecisionModal(null)} disabled={confirming}>
                  Cancel
                </Button>
                <Button
                  variant={decisionModal === 'APPROVE' ? 'primary' : 'danger'}
                  fullWidth
                  disabled={
                    confirming ||
                    typedConfirmation.trim().toUpperCase() !== decisionConfig[decisionModal].requiredWord ||
                    !decisionReason.trim()
                  }
                  onClick={confirmDecision}
                >
                  {confirming ? 'Recording Seal...' : 'Confirm Determination'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
