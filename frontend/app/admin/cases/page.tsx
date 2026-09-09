'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, FileText, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { mockCases } from '@/lib/mock-data';
import { formatDate, timeAgo } from '@/lib/utils';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import ConfidenceBar from '@/components/ui/ConfidenceBar';

const PAGE_SIZE = 7;

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FLAGGED', label: 'Flagged' },
];

const riskOptions = [
  { value: '', label: 'All Risk Levels' },
  { value: 'LOW', label: 'Low Risk' },
  { value: 'MEDIUM', label: 'Medium Risk' },
  { value: 'HIGH', label: 'High Risk' },
];

function getCaseConfidence(c: any): number {
  if (c.documents && Array.isArray(c.documents) && c.documents.length > 0) {
    const scores = c.documents
      .map((d: any) => d.ocrConfidence ?? d.ocrData?.overallConfidence)
      .filter((s: any) => typeof s === 'number' && s > 0);
    if (scores.length > 0) {
      return Math.round(scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length);
    }
  }
  if (typeof c.ocrConfidence === 'number' && c.ocrConfidence > 0) {
    return Math.round(c.ocrConfidence);
  }
  if (c.riskScore !== undefined && c.riskScore !== null) {
    return Math.round(Math.max(10, 100 - Number(c.riskScore)));
  }
  return 92;
}

export default function AdminCasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [officerFilter, setOfficerFilter] = useState('');
  const [page, setPage] = useState(1);

  React.useEffect(() => {
    async function loadCases() {
      try {
        const data = await apiFetch<{ cases: any[] }>('/cases');
        if (data?.cases && data.cases.length > 0) {
          setCases(
            data.cases.map((c) => ({
              ...c,
              caseNumber: c.caseNumber || 'SSB-' + c.id.slice(0, 6).toUpperCase(),
              applicantName: c.applicantName || c.personName || 'Unknown Subject',
              officerName: c.officer?.name || c.officerName || 'Officer',
              documents: c.documents || [{ fileName: 'document.jpg', docType: 'PASSPORT' }],
            }))
          );
        } else {
          setCases(mockCases);
        }
      } catch {
        setCases(mockCases);
      }
    }
    loadCases();
  }, []);

  const allCases = cases.length > 0 ? cases : mockCases;
  const uniqueOfficers = Array.from(new Set(allCases.map((c) => c.officerName).filter(Boolean)));

  const filtered = useMemo(() => {
    return allCases.filter((c) => {
      const matchSearch =
        !search ||
        c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.applicantName?.toLowerCase().includes(search.toLowerCase()) ||
        c.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || c.status === statusFilter;
      const matchRisk = !riskFilter || c.riskLevel === riskFilter;
      const matchOfficer = !officerFilter || c.officerName === officerFilter;
      return matchSearch && matchStatus && matchRisk && matchOfficer;
    });
  }, [search, statusFilter, riskFilter, officerFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function reset() {
    setSearch('');
    setStatusFilter('');
    setRiskFilter('');
    setOfficerFilter('');
    setPage(1);
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          All Cases
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Master registry of all verified and flagged identity cases across border checkpoints ({allCases.length} total)
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search across all cases, applicant name, ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-10 pr-3.5 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all shadow-subtle"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-subtle cursor-pointer"
            >
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-subtle cursor-pointer"
            >
              {riskOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              value={officerFilter}
              onChange={(e) => { setOfficerFilter(e.target.value); setPage(1); }}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-subtle cursor-pointer"
            >
              <option value="">All Officers</option>
              {uniqueOfficers.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>

            {(search || statusFilter || riskFilter || officerFilter) && (
              <button
                onClick={reset}
                className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white border border-slate-200/90 rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-56 min-w-[200px] pl-6 pr-6 py-3.5">Case ID</th>
                <th className="px-4 py-3.5">Applicant</th>
                <th className="px-4 py-3.5">Document</th>
                <th className="px-4 py-3.5 min-w-[150px]">AI Confidence Score</th>
                <th className="px-4 py-3.5">Risk Level</th>
                <th className="px-4 py-3.5">Assigned Officer</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileText size={36} className="text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No matching cases</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((c) => {
                  const docCount = c.documents?.length || 1;
                  const primaryDocType = c.documents?.[0]?.docType ?? 'PASSPORT';
                  const confidence = getCaseConfidence(c);
                  return (
                    <tr key={c.id}>
                      <td className="w-56 min-w-[200px] pl-6 pr-6 py-4">
                        <div className="space-y-1">
                          <span className="inline-block font-mono text-xs font-bold text-slate-900 bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-lg tracking-wider shadow-2xs">
                            {c.caseNumber}
                          </span>
                          <span className="block text-[11px] text-slate-400 font-medium pl-0.5">{timeAgo(c.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={c.applicantName} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{c.applicantName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{c.applicantDob}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                            <FileText size={13} className="text-slate-500" />
                            {primaryDocType.replace('_', ' ')}
                          </span>
                          {docCount > 1 && (
                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                              +{docCount - 1} more proof{docCount > 2 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 min-w-[150px]">
                        <ConfidenceBar value={confidence} segmentsCount={10} />
                      </td>
                      <td className="px-4 py-4">
                        <RiskBadge level={c.riskLevel} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Avatar name={c.officerName} size="xs" />
                          <span className="text-xs text-slate-700 font-medium">{c.officerName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/cases/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-900">{paginated.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{filtered.length}</span> cases
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              icon={<ChevronLeft size={14} />}
            >
              Previous
            </Button>
            <span className="text-xs text-slate-500 px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              iconRight={<ChevronRight size={14} />}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
