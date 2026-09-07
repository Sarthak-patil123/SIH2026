'use client';

import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, FileText, Eye, Clock, CheckCircle2, Flag, AlertTriangle,
  User, Hash,
} from 'lucide-react';
import { mockCases, mockAuditLogs } from '@/lib/mock-data';
import {
  formatDate, formatDateTime, formatTime, getDocTypeLabel,
  truncateHash, formatFileSize, getConfidenceClasses,
} from '@/lib/utils';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';

const timelineIcons: Record<string, React.ReactNode> = {
  CASE_CREATED: <FileText size={14} />,
  DOCUMENT_UPLOADED: <FileText size={14} />,
  OCR_COMPLETED: <Eye size={14} />,
  FACE_VERIFICATION: <User size={14} />,
  CASE_FLAGGED: <Flag size={14} />,
  ADMIN_REVIEW_STARTED: <Clock size={14} />,
  ADMIN_DECISION: <CheckCircle2 size={14} />,
};

const timelineColors: Record<string, string> = {
  CASE_CREATED: 'bg-info/20 border-info/40 text-info',
  DOCUMENT_UPLOADED: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
  OCR_COMPLETED: 'bg-success/20 border-success/40 text-success',
  FACE_VERIFICATION: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
  CASE_FLAGGED: 'bg-danger/20 border-danger/40 text-danger',
  ADMIN_REVIEW_STARTED: 'bg-warning/20 border-warning/40 text-warning',
  ADMIN_DECISION: 'bg-success/20 border-success/40 text-success',
};

export default function OfficerCaseDetailPage({ params }: { params: { caseId: string } }) {
  const caseData = mockCases.find((c) => c.id === params.caseId);
  if (!caseData) return notFound();

  const auditLogs = mockAuditLogs.filter((l) => l.caseId === caseData.id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3">
        <Link href="/officer/cases" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 w-fit transition-colors">
          <ArrowLeft size={14} /> Back to My Cases
        </Link>
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-100">
              Case <span className="font-mono text-blue-400">#{caseData.caseNumber}</span>
            </h1>
            <StatusBadge status={caseData.status} />
            <RiskBadge level={caseData.riskLevel} />
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Risk Score</p>
            <p className={`text-2xl font-bold ${caseData.riskScore <= 30 ? 'text-success' : caseData.riskScore <= 60 ? 'text-warning' : 'text-danger'}`}>{caseData.riskScore}</p>
          </div>
        </div>
        <p className="text-slate-300">{caseData.title}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Case Overview</CardTitle></CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Case Number', value: caseData.caseNumber, mono: true },
                { label: 'Officer', value: caseData.officerName },
                { label: 'Created', value: formatDateTime(caseData.createdAt) },
                { label: 'Last Updated', value: formatDateTime(caseData.updatedAt) },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{item.label}</p>
                  <p className={`text-sm font-semibold text-slate-200 ${item.mono ? 'font-mono' : ''}`}>{item.value}</p>
                </div>
              ))}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</p>
                <StatusBadge status={caseData.status} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Risk Level</p>
                <RiskBadge level={caseData.riskLevel} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Documents ({caseData.documents.length})</CardTitle></CardHeader>
            <div className="space-y-3">
              {caseData.documents.length === 0 ? (
                <p className="text-sm text-slate-500">No documents uploaded.</p>
              ) : (
                caseData.documents.map((doc) => (
                  <div key={doc.id} className="bg-navy-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-navy-600 rounded-lg flex items-center justify-center">
                          <FileText size={16} className="text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{doc.fileName}</p>
                          <p className="text-xs text-slate-500">{getDocTypeLabel(doc.docType)} · {formatFileSize(doc.fileSize)}</p>
                        </div>
                      </div>
                      {doc.tamperResult && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${doc.tamperResult.status === 'CLEAN' ? 'bg-success/20 text-success' : doc.tamperResult.status === 'SUSPICIOUS' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'}`}>
                          {doc.tamperResult.status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Hash size={11} />
                      <span className="font-mono">{truncateHash(doc.sha256Hash)}</span>
                    </div>
                    {doc.ocrData && (
                      <div className="border-t border-navy-600 pt-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">OCR Results — {doc.ocrData.overallConfidence.toFixed(1)}% confidence</p>
                        <div className="grid grid-cols-2 gap-2">
                          {doc.ocrData.fields.slice(0, 6).map((field) => (
                            <div key={field.label} className="bg-navy-600/50 rounded p-2">
                              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{field.label}</p>
                              <p className="text-xs font-semibold text-slate-200 mt-0.5">{field.value}</p>
                              <p className={`text-[10px] mt-0.5 ${getConfidenceClasses(field.confidence)}`}>{field.confidence.toFixed(1)}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {doc.faceResult && (
                      <div className="border-t border-navy-600 pt-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Face Verification</p>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-[10px] text-slate-500">Similarity</p>
                            <p className={`text-base font-bold ${getConfidenceClasses(doc.faceResult.similarity)}`}>{doc.faceResult.similarity.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500">Liveness</p>
                            <p className={`text-base font-bold ${getConfidenceClasses(doc.faceResult.liveness)}`}>{doc.faceResult.liveness.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500">Result</p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${doc.faceResult.status === 'MATCH' ? 'bg-success/20 text-success' : doc.faceResult.status === 'REVIEW' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'}`}>
                              {doc.faceResult.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {(caseData.flagReason || caseData.officerObservations) && (
            <Card>
              <CardHeader>
                <CardTitle>Officer Decision</CardTitle>
                <span className="flex items-center gap-1 text-xs text-danger font-semibold"><AlertTriangle size={13} /> Flagged</span>
              </CardHeader>
              <div className="space-y-3">
                {caseData.flagReason && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Flag Reason</p>
                    <p className="text-sm font-semibold text-danger">{caseData.flagReason.replace(/_/g, ' ')}</p>
                  </div>
                )}
                {caseData.officerObservations && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Officer Observations</p>
                    <p className="text-sm text-slate-300 leading-relaxed bg-navy-700 rounded p-3">{caseData.officerObservations}</p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div>
          <Card padding="none">
            <div className="px-5 py-4 border-b border-navy-600"><CardTitle>Audit Timeline</CardTitle></div>
            <div className="p-4">
              {auditLogs.length > 0 ? (
                <div className="space-y-1">
                  {auditLogs.map((log, idx) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 ${timelineColors[log.action] ?? 'bg-navy-700 border-navy-500 text-slate-400'}`}>
                          {timelineIcons[log.action] ?? <Clock size={12} />}
                        </div>
                        {idx < auditLogs.length - 1 && <div className="w-px flex-1 bg-navy-600 my-1" />}
                      </div>
                      <div className="pb-4 flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-200">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{log.actorName} · {formatTime(log.createdAt)}</p>
                        {log.txId && <p className="text-[10px] text-slate-600 font-mono mt-1 truncate">Tx: {log.txId.slice(0, 18)}...</p>}
                      </div>
                    </div>
                  ))}
                  {caseData.status === 'FLAGGED' && (
                    <div className="flex gap-3 pt-2">
                      <div className="w-6 h-6 rounded-lg border border-warning/40 bg-warning/10 flex items-center justify-center flex-shrink-0">
                        <Clock size={12} className="text-warning" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-warning">Waiting for Admin Review</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Pending</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: 'Case Created', color: 'bg-info', time: formatDateTime(caseData.createdAt) },
                    ...(caseData.documents.length > 0 ? [{ label: 'Document Uploaded', color: 'bg-blue-500', time: formatDateTime(caseData.documents[0]?.createdAt ?? caseData.createdAt) }] : []),
                    ...(caseData.status === 'FLAGGED' ? [{ label: 'Case Flagged for Admin', color: 'bg-danger', time: formatDateTime(caseData.updatedAt) }] : []),
                    ...(caseData.status === 'APPROVED' ? [{ label: 'Case Approved', color: 'bg-success', time: formatDateTime(caseData.updatedAt) }] : []),
                    ...(caseData.status === 'REJECTED' ? [{ label: 'Case Rejected', color: 'bg-danger', time: formatDateTime(caseData.updatedAt) }] : []),
                  ].map((item, idx, arr) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0 mt-1`} />
                        {idx < arr.length - 1 && <div className="w-px flex-1 bg-navy-600 my-1.5" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
