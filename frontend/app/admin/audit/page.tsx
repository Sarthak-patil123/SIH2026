'use client';

import React from 'react';
import { Shield, CheckCircle, Hash, Link2, Layers, Clock } from 'lucide-react';
import { mockAuditLogs } from '@/lib/mock-data';
import { formatTime, formatDateTime, truncateHash } from '@/lib/utils';
import Card, { CardHeader, CardTitle } from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';

const actionColors: Record<string, string> = {
  CASE_CREATED: 'bg-info/20 border-info/40 text-info',
  DOCUMENT_UPLOADED: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
  OCR_COMPLETED: 'bg-success/20 border-success/40 text-success',
  FACE_VERIFICATION: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
  CASE_FLAGGED: 'bg-danger/20 border-danger/40 text-danger',
  ADMIN_REVIEW_STARTED: 'bg-warning/20 border-warning/40 text-warning',
  ADMIN_DECISION: 'bg-success/20 border-success/40 text-success',
  CASE_APPROVED: 'bg-success/20 border-success/40 text-success',
  CASE_REJECTED: 'bg-danger/20 border-danger/40 text-danger',
  CASE_ESCALATED: 'bg-warning/20 border-warning/40 text-warning',
};

const actionLabels: Record<string, string> = {
  CASE_CREATED: 'Case Created',
  DOCUMENT_UPLOADED: 'Document Uploaded',
  OCR_COMPLETED: 'OCR Completed',
  FACE_VERIFICATION: 'Face Verification',
  CASE_FLAGGED: 'Case Flagged',
  ADMIN_REVIEW_STARTED: 'Admin Review Started',
  ADMIN_DECISION: 'Admin Decision',
  CASE_APPROVED: 'Case Approved',
  CASE_REJECTED: 'Case Rejected',
  CASE_ESCALATED: 'Case Escalated',
};

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-medium text-slate-300 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export default function AdminAuditPage() {
  const allLogs = [...mockAuditLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Group by caseId for display
  const caseLogs: Record<string, typeof allLogs> = {};
  allLogs.forEach((log) => {
    if (!caseLogs[log.caseId]) caseLogs[log.caseId] = [];
    caseLogs[log.caseId].push(log);
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Blockchain Audit Trail"
        subtitle="Immutable chronological record of all system events"
        badge={
          <span className="flex items-center gap-1.5 text-xs bg-success/10 border border-success/30 text-success px-2.5 py-1 rounded-full font-semibold">
            <CheckCircle size={12} /> Blockchain Integrity Verified
          </span>
        }
      />

      {/* Blockchain Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Events', value: allLogs.length.toString(), icon: <Layers size={18} />, color: 'text-blue-400' },
          { label: 'Latest Block', value: `#${Math.max(...allLogs.map((l) => l.blockNumber ?? 0))}`, icon: <Shield size={18} />, color: 'text-purple-400' },
          { label: 'Chain Status', value: 'Verified', icon: <CheckCircle size={18} />, color: 'text-success' },
        ].map((item) => (
          <Card key={item.label} className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl bg-navy-700 ${item.color}`}>{item.icon}</div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">{item.label}</p>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {allLogs.map((log, idx) => (
          <Card key={log.id} className="hover:border-navy-500 transition-colors">
            <div className="flex gap-4">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${actionColors[log.action] ?? 'bg-navy-700 border-navy-500 text-slate-400'}`}>
                <Clock size={18} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-slate-500">{formatTime(log.createdAt)}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${actionColors[log.action] ?? 'bg-navy-700 border-navy-500 text-slate-400'}`}>
                      {actionLabels[log.action] ?? log.action}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0.5 mb-3">
                  <DetailRow label="Actor" value={log.actorName} />
                  <DetailRow label="Case" value={log.caseId.replace('case-', '').toUpperCase()} mono />
                  {Object.entries(log.details).slice(0, 2).map(([k, v]) => (
                    <DetailRow key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={String(v)} />
                  ))}
                </div>

                {/* Blockchain data */}
                {log.txId && (
                  <div className="mt-3 pt-3 border-t border-navy-700 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <Hash size={11} className="text-slate-600" />
                      <span>Event Hash:</span>
                      <span className="font-mono text-slate-400">{truncateHash(log.eventHash)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <Link2 size={11} className="text-slate-600" />
                      <span>Transaction ID:</span>
                      <span className="font-mono text-slate-400">{log.txId.slice(0, 30)}...</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <Layers size={11} className="text-slate-600" />
                      <span>Block Number:</span>
                      <span className="font-mono text-purple-400 font-semibold">#{log.blockNumber}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Verified badge */}
              {log.txId && (
                <div className="flex-shrink-0 flex items-start">
                  <div className="flex items-center gap-1 text-[10px] text-success bg-success/10 border border-success/30 px-2 py-1 rounded-full">
                    <CheckCircle size={10} /> Verified
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Blockchain integrity section */}
      <Card className="border-success/30 bg-success/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-success/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield size={24} className="text-success" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-success">✓ Blockchain Integrity Verified</p>
            <p className="text-xs text-slate-400 mt-1">
              All audit events are cryptographically signed and recorded on the Hyperledger Fabric blockchain.
              Event hashes are immutable and tamper-evident.
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-success/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {[
            { label: 'Network', value: 'Hyperledger Fabric v2.5' },
            { label: 'Channel', value: 'ssb-identity-channel' },
            { label: 'Chaincode', value: 'idverify-audit-cc v1.0' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-slate-500 uppercase tracking-wide mb-0.5">{item.label}</p>
              <p className="font-mono text-slate-300 font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
