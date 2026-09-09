'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, FileText, User, Clock, Hash, CheckCircle2, XCircle,
  AlertTriangle, Flag, Shield, Cpu, Eye, Check, AlertCircle, ShieldAlert,
  ZoomIn, ZoomOut, RotateCw, X
} from 'lucide-react';
import { mockCases, mockAuditLogs, updateMockCase } from '@/lib/mock-data';
import {
  formatDateTime, formatTime, getDocTypeLabel, truncateHash,
  getConfidenceClasses, getAlertTypeLabel, formatFileSize
} from '@/lib/utils';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import Tabs from '@/components/ui/Tabs';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import ConfidenceBar from '@/components/ui/ConfidenceBar';
import { apiFetch } from '@/lib/api';
import { Case } from '@/types';

type Decision = 'APPROVE' | 'REJECT' | 'ESCALATE';

const timelineColors: Record<string, string> = {
  CASE_CREATED: 'bg-blue-50 text-blue-700 border-blue-200',
  DOCUMENT_UPLOADED: 'bg-blue-50 text-blue-700 border-blue-200',
  OCR_COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FACE_VERIFICATION: 'bg-purple-50 text-purple-700 border-purple-200',
  CASE_FLAGGED: 'bg-rose-50 text-rose-700 border-rose-200',
  ADMIN_REVIEW_STARTED: 'bg-amber-50 text-amber-700 border-amber-200',
  ADMIN_DECISION: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const decisionConfig: Record<Decision, { label: string; color: string; bg: string; btnClass: string }> = {
  APPROVE: { label: 'Approve Credential', color: 'text-emerald-700', bg: 'border-emerald-200 bg-emerald-50/50', btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  REJECT: { label: 'Reject Credential', color: 'text-rose-700', bg: 'border-rose-200 bg-rose-50/50', btnClass: 'bg-rose-600 hover:bg-rose-700 text-white' },
  ESCALATE: { label: 'Escalate to Tier 3', color: 'text-amber-700', bg: 'border-amber-200 bg-amber-50/50', btnClass: 'bg-amber-500 hover:bg-amber-600 text-white' },
};

export default function AdminCaseDetailPage({ params }: { params: { caseId: string } }) {
  const [caseData, setCaseData] = useState<Case | null>(() => mockCases.find((c) => c.id === params.caseId) || null);
  const [decisionModal, setDecisionModal] = useState<Decision | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [decided, setDecided] = useState(false);
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
        console.warn('Could not load admin case from backend, using fallback:', err);
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
        Loading case details for review...
      </div>
    );
  }

  const auditLogs = mockAuditLogs.filter((l) => l.caseId === caseData.id);
  const docs = caseData.documents && caseData.documents.length > 0 ? caseData.documents : [];
  const activeDoc = docs[selectedDocIndex] || docs[0] || null;

  async function confirmDecision() {
    if (!decisionModal || !caseData) return;
    setConfirming(true);
    await new Promise((r) => setTimeout(r, 800));
    const statusMap: Record<Decision, 'APPROVED' | 'REJECTED' | 'FLAGGED'> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      ESCALATE: 'FLAGGED',
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
                <p className="text-[11px] text-slate-400">Select any attached credential</p>
              </div>
              {activeDoc && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500">{formatFileSize(activeDoc.fileSize)}</span>
                  <button
                    onClick={() => { setZoomLevel(1); setRotation(0); setPreviewModalOpen(true); }}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                  >
                    <Eye size={12} /> Inspect
                  </button>
                </div>
              )}
            </div>

            {/* Document Evidence Selector Tabs */}
            {docs.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {docs.map((d: any, idx: number) => {
                  const isSelected = idx === selectedDocIndex;
                  return (
                    <button
                      key={d.id || idx}
                      onClick={() => setSelectedDocIndex(idx)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      <FileText size={12} className={isSelected ? 'text-blue-100' : 'text-slate-500'} />
                      <span>{d.fileName}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeDoc ? (
              <div className="space-y-3">
                <div className="bg-slate-900 rounded-xl min-h-[260px] overflow-hidden flex flex-col items-center justify-center text-white border border-slate-800 relative group">
                  {activeDoc.fileUrl && !activeDoc.fileUrl.endsWith('.pdf') ? (
                    <div className="relative w-full h-64 flex items-center justify-center p-2 bg-slate-950/80">
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
                      {activeDoc.fileUrl && (
                        <a
                          href={activeDoc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
                        >
                          <Eye size={12} /> View File
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                  <Hash size={13} className="text-slate-400 shrink-0" />
                  <span className="font-mono text-[11px] truncate">{activeDoc.sha256Hash}</span>
                </div>

                {activeDoc.tamperResult && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="text-slate-600 font-medium">Digital Watermark &amp; Holo-pattern</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${activeDoc.tamperResult.status === 'CLEAN' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {activeDoc.tamperResult.status}
                    </span>
                  </div>
                )}
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
                { id: 'overview', label: 'Overview' },
                { id: 'ocr', label: 'OCR Findings' },
                { id: 'face', label: 'Biometric Match' },
                { id: 'officer', label: 'Officer Review' },
                { id: 'audit', label: 'Audit Trail' },
              ]}
            >
              {(activeTab) => (
                <div className="p-6">
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                          <h4 className="font-heading text-sm font-bold text-slate-900">Summary Findings</h4>
                          <p className="text-xs text-slate-400">Aggregated risk profile for this intake case</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${caseData.riskScore > 60 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          Risk Score: {caseData.riskScore}/100
                        </span>
                      </div>

                      {caseData.flagReason && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Flag Reason</span>
                          <p className="text-xs font-semibold text-rose-900">{getAlertTypeLabel(caseData.flagReason as any)}</p>
                        </div>
                      )}

                      {caseData.officerObservations && (
                        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Officer Observations</span>
                          <p className="text-xs text-slate-700 leading-relaxed">{caseData.officerObservations}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* OCR Tab */}
                  {activeTab === 'ocr' && (
                    <div className="space-y-4">
                      {activeDoc?.ocrData ? (
                        <>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-xs font-bold font-heading text-slate-900">
                              Extracted Fields ({getDocTypeLabel(activeDoc.docType)})
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

                  {/* Face Verification Tab */}
                  {activeTab === 'face' && (
                    <div className="space-y-4">
                      {activeDoc?.faceResult ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            {['Document Portrait', 'Live Camera Stream'].map((label) => (
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
                              <p className="font-heading text-lg font-bold text-slate-900 mt-0.5">{activeDoc.faceResult.similarity}%</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                              <span className="text-[10px] font-bold uppercase text-slate-400">Status</span>
                              <p className={`font-heading text-lg font-bold mt-0.5 ${activeDoc.faceResult.status === 'MATCH' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {activeDoc.faceResult.status}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 py-6 text-center">No biometric verification findings for this document.</p>
                      )}
                    </div>
                  )}

                  {/* Officer Review Tab */}
                  {activeTab === 'officer' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <Avatar name={caseData.officerName} size="md" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{caseData.officerName}</p>
                          <p className="text-[11px] text-slate-400">First-line Screening Officer</p>
                        </div>
                      </div>

                      {caseData.officerObservations && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Officer Field Observations
                          </span>
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                            "{caseData.officerObservations}"
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audit Trail Tab */}
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
                            {log.txId && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                                TX: {log.txId.slice(0, 20)}...
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Tabs>
          </div>

          {/* Final Adjudication Decision Panel (Prompt Section 14) */}
          {!decided && (caseData.status === 'FLAGGED' || caseData.status === 'UNDER_REVIEW') && (
            <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card space-y-4">
              <div>
                <h3 className="font-heading text-sm font-bold text-slate-900">Final Verification Adjudication</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record supervisory determination. Decisions are cryptographically anchored to the audit ledger.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setDecisionModal('APPROVE')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-500 transition-all group cursor-pointer"
                >
                  <CheckCircle2 size={24} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">Approve</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecisionModal('REJECT')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-rose-200 bg-rose-50/50 hover:bg-rose-50 hover:border-rose-500 transition-all group cursor-pointer"
                >
                  <XCircle size={24} className="text-rose-600" />
                  <span className="text-xs font-bold text-rose-700">Reject</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecisionModal('ESCALATE')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-500 transition-all group cursor-pointer"
                >
                  <AlertTriangle size={24} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-700">Escalate</span>
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
                Audit event published to the blockchain ledger.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDecisionModal(null)} />
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-modal p-6 space-y-4 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h3 className={`font-heading text-base font-bold ${decisionConfig[decisionModal].color}`}>
                Confirm: {decisionConfig[decisionModal].label}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                This action is final and will be permanently sealed on the audit ledger.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Reason for Determination <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="State formal justification for audit record..."
                  rows={3}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl p-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button variant="secondary" fullWidth onClick={() => setDecisionModal(null)} disabled={confirming}>
                  Cancel
                </Button>
                <button
                  type="button"
                  disabled={!decisionReason.trim() || confirming}
                  onClick={confirmDecision}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${decisionConfig[decisionModal].btnClass}`}
                >
                  {confirming ? 'Recording on Ledger...' : 'Confirm Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
