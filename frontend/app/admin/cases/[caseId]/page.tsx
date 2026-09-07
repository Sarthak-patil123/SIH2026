'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, User, Clock, Hash, CheckCircle, XCircle, AlertTriangle, Flag } from 'lucide-react';
import { mockCases, mockAuditLogs, updateMockCase } from '@/lib/mock-data';
import { formatDateTime, formatTime, getDocTypeLabel, truncateHash, getConfidenceClasses, getAlertTypeLabel } from '@/lib/utils';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import Tabs from '@/components/ui/Tabs';
import Avatar from '@/components/ui/Avatar';

type Decision = 'APPROVE' | 'REJECT' | 'ESCALATE';

const timelineColors: Record<string, string> = {
  CASE_CREATED: 'bg-info/20 border-info/40 text-info',
  DOCUMENT_UPLOADED: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
  OCR_COMPLETED: 'bg-success/20 border-success/40 text-success',
  FACE_VERIFICATION: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
  CASE_FLAGGED: 'bg-danger/20 border-danger/40 text-danger',
  ADMIN_REVIEW_STARTED: 'bg-warning/20 border-warning/40 text-warning',
  ADMIN_DECISION: 'bg-success/20 border-success/40 text-success',
};

const decisionConfig: Record<Decision, { label: string; color: string; bg: string; btnClass: string }> = {
  APPROVE: { label: 'Approve Case', color: 'text-success', bg: 'border-success/30', btnClass: 'bg-success hover:bg-emerald-400 text-white' },
  REJECT: { label: 'Reject Case', color: 'text-danger', bg: 'border-danger/30', btnClass: 'bg-danger hover:bg-red-500 text-white' },
  ESCALATE: { label: 'Escalate Case', color: 'text-warning', bg: 'border-warning/30', btnClass: 'bg-warning hover:bg-amber-400 text-navy-900' },
};

export default function AdminCaseDetailPage({ params }: { params: { caseId: string } }) {
  const [caseData, setCaseData] = useState(() => mockCases.find((c) => c.id === params.caseId));
  const [decisionModal, setDecisionModal] = useState<Decision | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [decided, setDecided] = useState(false);

  if (!caseData) return notFound();

  const auditLogs = mockAuditLogs.filter((l) => l.caseId === caseData.id);
  const primaryDoc = caseData.documents[0];

  async function confirmDecision() {
    if (!decisionModal || !caseData) return;
    setConfirming(true);
    await new Promise((r) => setTimeout(r, 1000));
    const statusMap: Record<Decision, 'APPROVED' | 'REJECTED' | 'FLAGGED'> = {
      APPROVE: 'APPROVED', REJECT: 'REJECTED', ESCALATE: 'FLAGGED',
    };
    const updates = {
      status: statusMap[decisionModal],
      adminDecision: decisionModal,
      adminDecisionReason: decisionReason,
      adminDecisionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateMockCase(caseData.id, updates);
    setCaseData((prev) => prev ? { ...prev, ...updates } : prev);
    setConfirming(false);
    setDecisionModal(null);
    setDecided(true);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/admin/cases" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 w-fit">
          <ArrowLeft size={14} /> Back to Cases
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-100">
              Case Investigation — <span className="font-mono text-blue-400">#{caseData.caseNumber}</span>
            </h1>
            <RiskBadge level={caseData.riskLevel} />
            <StatusBadge status={caseData.status} />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Avatar name={caseData.officerName} size="sm" />
            <span>Officer: <span className="text-slate-200 font-medium">{caseData.officerName}</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Document Viewer */}
        <div className="xl:col-span-2">
          <Card padding="none" className="sticky top-6">
            <div className="px-4 py-3 border-b border-navy-600"><CardTitle>Document Viewer</CardTitle></div>
            <div className="p-4">
              {primaryDoc ? (
                <div className="space-y-3">
                  <div className="bg-navy-900/50 rounded-lg h-72 flex items-center justify-center border border-navy-600 relative group">
                    <div className="flex flex-col items-center gap-2 text-slate-600">
                      <FileText size={52} /><p className="text-sm">{primaryDoc.fileName}</p>
                      <p className="text-xs text-slate-700">{getDocTypeLabel(primaryDoc.docType)}</p>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {['⊕','⊖','↺','⛶'].map((ic,i) => (
                        <button key={i} className="w-7 h-7 bg-navy-700/90 border border-navy-500 rounded text-xs text-slate-300 hover:text-white">{ic}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-navy-700/50 p-2 rounded">
                    <Hash size={11} /><span className="font-mono">{truncateHash(primaryDoc.sha256Hash)}</span>
                  </div>
                  {caseData.documents.length > 1 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">All Documents</p>
                      {caseData.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 p-2 rounded bg-navy-700/50 hover:bg-navy-700 transition-colors cursor-pointer">
                          <FileText size={13} className="text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-300 truncate">{doc.fileName}</p>
                            <p className="text-[10px] text-slate-500">{getDocTypeLabel(doc.docType)}</p>
                          </div>
                          {doc.tamperResult && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${doc.tamperResult.status === 'CLEAN' ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                              {doc.tamperResult.status}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No documents available</div>
              )}
            </div>
          </Card>
        </div>

        {/* Tabbed Panel */}
        <div className="xl:col-span-3 space-y-4">
          <Card padding="none">
            <Tabs tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'ocr', label: 'OCR' },
              { id: 'face', label: 'Face Verification' },
              { id: 'officer', label: 'Officer Review' },
              { id: 'audit', label: 'Audit Trail' },
            ]}>
              {(activeTab) => (
                <div className="p-5">
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Case Number', value: caseData.caseNumber, mono: true },
                          { label: 'Officer', value: caseData.officerName },
                          { label: 'Created', value: formatDateTime(caseData.createdAt) },
                          { label: 'Updated', value: formatDateTime(caseData.updatedAt) },
                        ].map((item) => (
                          <div key={item.label} className="bg-navy-700/50 rounded-lg p-3">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{item.label}</p>
                            <p className={`text-sm font-semibold text-slate-200 ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-navy-700/50 rounded-lg p-3">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Status</p>
                          <StatusBadge status={caseData.status} />
                        </div>
                        <div className="bg-navy-700/50 rounded-lg p-3">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Risk Level</p>
                          <RiskBadge level={caseData.riskLevel} />
                        </div>
                        <div className="bg-navy-700/50 rounded-lg p-3">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Risk Score</p>
                          <p className={`text-xl font-bold ${caseData.riskScore <= 30 ? 'text-success' : caseData.riskScore <= 60 ? 'text-warning' : 'text-danger'}`}>
                            {caseData.riskScore}
                          </p>
                        </div>
                      </div>
                      {caseData.flagReason && (
                        <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Flag size={13} className="text-danger" />
                            <p className="text-xs font-semibold text-danger uppercase tracking-wide">Alert Reason</p>
                          </div>
                          <p className="text-sm text-slate-300">{getAlertTypeLabel(caseData.flagReason as any)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'ocr' && (
                    <div className="space-y-3">
                      {primaryDoc?.ocrData ? (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-300">Extracted Fields</p>
                            <span className={`text-sm font-bold ${getConfidenceClasses(primaryDoc.ocrData.overallConfidence)}`}>
                              {primaryDoc.ocrData.overallConfidence.toFixed(1)}% overall
                            </span>
                          </div>
                          {primaryDoc.ocrData.warnings?.map((w) => (
                            <div key={w} className="flex items-start gap-2 p-2.5 bg-warning/10 border border-warning/30 rounded text-xs text-warning">
                              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" /> {w}
                            </div>
                          ))}
                          <div className="space-y-2">
                            {primaryDoc.ocrData.fields.map((f) => (
                              <div key={f.label} className="flex items-center justify-between p-3 bg-navy-700/50 rounded-lg">
                                <div>
                                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">{f.label}</p>
                                  <p className="text-sm font-semibold text-slate-200 mt-0.5">{f.value}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-14 h-1.5 bg-navy-600 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${f.confidence >= 85 ? 'bg-success' : f.confidence >= 65 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${f.confidence}%` }} />
                                  </div>
                                  <span className={`text-xs font-medium ${getConfidenceClasses(f.confidence)}`}>{f.confidence.toFixed(1)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : <p className="text-sm text-slate-500">No OCR data available</p>}
                    </div>
                  )}

                  {activeTab === 'face' && (
                    <div className="space-y-4">
                      {primaryDoc?.faceResult ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            {['Document Face', 'Live Capture'].map((label) => (
                              <div key={label} className="bg-navy-700/50 rounded-lg p-4 flex flex-col items-center gap-2">
                                <div className={`w-20 h-20 rounded-full bg-navy-600 border-2 flex items-center justify-center ${label === 'Live Capture' ? (primaryDoc.faceResult!.status === 'MATCH' ? 'border-success/50' : primaryDoc.faceResult!.status === 'REVIEW' ? 'border-warning/50' : 'border-danger/50') : 'border-navy-500'}`}>
                                  <User size={32} className="text-slate-500" />
                                </div>
                                <p className="text-xs text-slate-400">{label}</p>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-navy-700/50 rounded-lg p-3 text-center">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Similarity</p>
                              <p className={`text-xl font-bold ${getConfidenceClasses(primaryDoc.faceResult.similarity)}`}>{primaryDoc.faceResult.similarity}%</p>
                            </div>
                            <div className="bg-navy-700/50 rounded-lg p-3 text-center">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Liveness</p>
                              <p className={`text-xl font-bold ${getConfidenceClasses(primaryDoc.faceResult.liveness)}`}>{primaryDoc.faceResult.liveness}%</p>
                            </div>
                            <div className="bg-navy-700/50 rounded-lg p-3 text-center">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Result</p>
                              <span className={`text-sm font-bold px-2 py-0.5 rounded ${primaryDoc.faceResult.status === 'MATCH' ? 'bg-success/20 text-success' : primaryDoc.faceResult.status === 'REVIEW' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'}`}>
                                {primaryDoc.faceResult.status}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : <p className="text-sm text-slate-500">No face verification data available</p>}
                    </div>
                  )}

                  {activeTab === 'officer' && (
                    <div className="space-y-4">
                      {caseData.flagReason || caseData.officerObservations ? (
                        <>
                          <div className="flex items-center gap-3 p-3 bg-navy-700/50 rounded-lg">
                            <Avatar name={caseData.officerName} size="md" />
                            <div>
                              <p className="text-sm font-semibold text-slate-200">{caseData.officerName}</p>
                              <p className="text-xs text-slate-500">{formatDateTime(caseData.updatedAt)}</p>
                            </div>
                          </div>
                          {caseData.flagReason && (
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Decision</p>
                              <div className="flex items-center gap-2 p-2.5 bg-danger/10 border border-danger/30 rounded">
                                <Flag size={14} className="text-danger" />
                                <span className="text-sm font-bold text-danger">{caseData.flagReason.replace(/_/g, ' ')}</span>
                              </div>
                            </div>
                          )}
                          {caseData.officerObservations && (
                            <div>
                              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Observations</p>
                              <p className="text-sm text-slate-300 leading-relaxed bg-navy-700/50 rounded-lg p-3">{caseData.officerObservations}</p>
                            </div>
                          )}
                        </>
                      ) : <p className="text-sm text-slate-500">No officer review data available</p>}
                      {caseData.adminDecision && (
                        <div className="pt-4 border-t border-navy-600">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Admin Decision</p>
                          <div className={`p-3 rounded-lg border ${caseData.adminDecision === 'APPROVE' ? 'bg-success/10 border-success/30' : caseData.adminDecision === 'REJECT' ? 'bg-danger/10 border-danger/30' : 'bg-warning/10 border-warning/30'}`}>
                            <p className={`text-sm font-bold ${caseData.adminDecision === 'APPROVE' ? 'text-success' : caseData.adminDecision === 'REJECT' ? 'text-danger' : 'text-warning'}`}>{caseData.adminDecision}</p>
                            {caseData.adminDecisionReason && <p className="text-xs text-slate-400 mt-1">{caseData.adminDecisionReason}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'audit' && (
                    <div className="space-y-2">
                      {auditLogs.length === 0 ? (
                        <p className="text-sm text-slate-500">No audit logs available for this case.</p>
                      ) : (
                        auditLogs.map((log, idx) => (
                          <div key={log.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 ${timelineColors[log.action] ?? 'bg-navy-700 border-navy-500 text-slate-400'}`}>
                                <Clock size={12} />
                              </div>
                              {idx < auditLogs.length - 1 && <div className="w-px flex-1 bg-navy-600 my-1" />}
                            </div>
                            <div className="pb-4 flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-200">{log.action.replace(/_/g, ' ')}</p>
                                <p className="text-[10px] text-slate-500 font-mono">{formatTime(log.createdAt)}</p>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">Actor: {log.actorName}</p>
                              {log.txId && <p className="text-[10px] text-slate-600 font-mono mt-1">Tx: {log.txId.slice(0, 24)}...</p>}
                              {log.blockNumber && <p className="text-[10px] text-slate-600 mt-0.5">Block: #{log.blockNumber}</p>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </Tabs>
          </Card>

          {/* Decision Panel */}
          {!decided && (caseData.status === 'FLAGGED' || caseData.status === 'UNDER_REVIEW') && (
            <Card>
              <CardTitle className="mb-3">Final Verification Decision</CardTitle>
              <p className="text-xs text-slate-400 mb-4">This decision will be permanently recorded in the audit trail.</p>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setDecisionModal('APPROVE')} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-success/5 border-2 border-success/30 hover:bg-success/10 hover:border-success transition-all">
                  <CheckCircle size={28} className="text-success" />
                  <span className="text-xs font-bold text-success">APPROVE</span>
                </button>
                <button onClick={() => setDecisionModal('REJECT')} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-danger/5 border-2 border-danger/30 hover:bg-danger/10 hover:border-danger transition-all">
                  <XCircle size={28} className="text-danger" />
                  <span className="text-xs font-bold text-danger">REJECT</span>
                </button>
                <button onClick={() => setDecisionModal('ESCALATE')} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-warning/5 border-2 border-warning/30 hover:bg-warning/10 hover:border-warning transition-all">
                  <AlertTriangle size={28} className="text-warning" />
                  <span className="text-xs font-bold text-warning">ESCALATE</span>
                </button>
              </div>
            </Card>
          )}

          {decided && (
            <div className={`p-5 rounded-xl border-2 text-center ${caseData.adminDecision === 'APPROVE' ? 'bg-success/10 border-success/40' : caseData.adminDecision === 'REJECT' ? 'bg-danger/10 border-danger/40' : 'bg-warning/10 border-warning/40'}`}>
              <p className={`text-lg font-bold ${caseData.adminDecision === 'APPROVE' ? 'text-success' : caseData.adminDecision === 'REJECT' ? 'text-danger' : 'text-warning'}`}>
                Decision Recorded: {caseData.adminDecision}
              </p>
              <p className="text-xs text-slate-400 mt-1">Permanently recorded in the audit trail.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={() => setDecisionModal(null)} />
          <div className="relative w-full max-w-md bg-navy-800 border border-navy-500 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-5 py-4 border-b border-navy-600">
              <h3 className={`text-base font-bold ${decisionConfig[decisionModal].color}`}>Confirm Final Decision</h3>
              <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone. The decision will be permanently recorded.</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1.5">
                  {decisionModal} Reason <span className="text-danger">*</span>
                </p>
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Enter reason for this decision..."
                  rows={3}
                  className="w-full bg-navy-700 border border-navy-600 text-slate-100 rounded-md px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDecisionModal(null)} disabled={confirming} className="flex-1 px-4 py-2.5 bg-navy-700 hover:bg-navy-600 text-slate-300 rounded-lg text-sm font-medium border border-navy-500 transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button
                  disabled={!decisionReason.trim() || confirming}
                  onClick={confirmDecision}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${decisionConfig[decisionModal].btnClass}`}
                >
                  {confirming ? (
                    <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Processing...</>
                  ) : `Confirm ${decisionModal}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
