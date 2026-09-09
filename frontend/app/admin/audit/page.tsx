'use client';

import React from 'react';
import { Shield, CheckCircle2, Hash, Link2, Layers, Clock, Database, Check } from 'lucide-react';
import { mockAuditLogs, mockCases } from '@/lib/mock-data';
import { formatTime, formatDateTime, truncateHash } from '@/lib/utils';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';

const actionLabels: Record<string, string> = {
  CASE_CREATED: 'Case Created',
  DOCUMENT_UPLOADED: 'Document Uploaded',
  OCR_COMPLETED: 'OCR Extraction Completed',
  FACE_VERIFICATION: 'Biometric Face Verification',
  CASE_FLAGGED: 'Case Flagged for Review',
  ADMIN_REVIEW_STARTED: 'Admin Investigation Commenced',
  ADMIN_DECISION: 'Final Decision Sealed',
  CASE_APPROVED: 'Case Approved by Supervisor',
  CASE_REJECTED: 'Case Rejected by Supervisor',
  CASE_ESCALATED: 'Case Escalated to Tier 3',
};

const actionDots: Record<string, string> = {
  CASE_CREATED: 'bg-blue-500',
  DOCUMENT_UPLOADED: 'bg-blue-500',
  OCR_COMPLETED: 'bg-emerald-500',
  FACE_VERIFICATION: 'bg-purple-500',
  CASE_FLAGGED: 'bg-rose-500',
  ADMIN_REVIEW_STARTED: 'bg-amber-500',
  ADMIN_DECISION: 'bg-emerald-600',
  CASE_APPROVED: 'bg-emerald-600',
  CASE_REJECTED: 'bg-rose-600',
  CASE_ESCALATED: 'bg-amber-600',
};

export default function AdminAuditPage() {
  const allLogs = [...mockAuditLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Blockchain Audit Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable chronological record of all screening events, officer actions, and supervisory adjudications
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={15} />
          <span>Ledger Integrity Verified · Hyperledger Fabric</span>
        </div>
      </div>

      {/* Enterprise Blockchain Overview Banner (Prompt Section 16) */}
      <div className="bg-white border border-slate-200/90 rounded-card p-6 shadow-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Consensus Engine</span>
            <p className="font-heading text-sm font-bold text-slate-900">Raft Consensus Protocol</p>
            <p className="text-[11px] text-slate-500">Government Peer Network (SSB/MHA)</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Audit Blocks</span>
            <p className="font-heading text-sm font-bold text-slate-900 tabular-nums">#18,271 Blocks</p>
            <p className="text-[11px] text-slate-500">Zero chain reorganizations</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cryptographic Seal</span>
            <p className="font-heading text-sm font-bold text-slate-900">SHA-256 / ECDSA P-256</p>
            <p className="text-[11px] text-slate-500">FIPS 140-3 Compliant</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Immutability Proof</span>
            <p className="font-heading text-sm font-bold text-emerald-600 flex items-center gap-1">
              <Check size={14} /> 100% Tamper Evident
            </p>
            <p className="text-[11px] text-slate-500">Blockchain anchor verification active</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
          <Shield size={14} className="text-slate-400 shrink-0" />
          <span>Blockchain anchor provides tamper-evident verification of every screening event and decision.</span>
        </div>
      </div>

      {/* Chronological Audit Timeline (Prompt Section 15) */}
      <div className="bg-white border border-slate-200/90 rounded-card p-6 sm:p-8 shadow-card space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-heading text-base font-bold text-slate-900">Historical Event Chain</h3>
            <p className="text-xs text-slate-400">Real-time cryptographic audit log sequence</p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {allLogs.length} Logged Events
          </span>
        </div>

        <div className="relative pl-2 sm:pl-4 space-y-6">
          {allLogs.map((log, idx) => {
            const dot = actionDots[log.action] ?? 'bg-blue-500';
            return (
              <div key={log.id} className="relative flex items-start gap-4">
                {/* Timeline connector vertical line */}
                {idx < allLogs.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-0 w-[1.5px] bg-slate-200 -mb-6" />
                )}

                {/* Dot */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-white ring-4 ring-white border-2 border-slate-200 mt-0.5`}>
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                </div>

                {/* Content Box */}
                <div className="flex-1 p-4 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:border-slate-300 transition-all space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900">
                        {actionLabels[log.action] ?? log.action.replace(/_/g, ' ')}
                      </p>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        {mockCases.find((c) => c.id === log.caseId)?.caseNumber ?? log.caseId}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Event recorded by <strong className="text-slate-800 font-semibold">{log.actorName}</strong>.
                  </p>

                  {/* Blockchain proof tags */}
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60 text-[11px] font-mono text-slate-400 flex-wrap">
                    {log.txId && (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-500 font-sans">Tx:</span>
                        <span className="text-slate-700 font-bold">{truncateHash(log.txId, 8)}</span>
                      </span>
                    )}
                    {log.blockNumber && (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-500 font-sans">Block:</span>
                        <span className="text-slate-700 font-bold">#{log.blockNumber}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-emerald-600 font-sans ml-auto">
                      <CheckCircle2 size={12} /> Anchored
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
