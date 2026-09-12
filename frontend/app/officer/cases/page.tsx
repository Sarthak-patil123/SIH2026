'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, FileText, ChevronLeft, ChevronRight, Plus, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockCases } from '@/lib/mock-data';
import { formatDate, timeAgo } from '@/lib/utils';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';

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

export default function OfficerCasesPage() {
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [page, setPage] = useState(1);

  const myCases = mockCases;

  const filtered = useMemo(() => {
    return myCases.filter((c) => {
      const matchSearch =
        !search ||
        c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.applicantName?.toLowerCase().includes(search.toLowerCase()) ||
        c.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || c.status === statusFilter;
      const matchRisk = !riskFilter || c.riskLevel === riskFilter;
      return matchSearch && matchStatus && matchRisk;
    });
  }, [myCases, search, statusFilter, riskFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Verification Cases Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter, and review active screening dossiers
          </p>
        </div>

        <Link href="/officer/verify">
          <Button variant="primary" icon={<Plus size={15} />}>
            New Verification
          </Button>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-card p-4 shadow-card flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by case ID, applicant name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            {riskOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {(search || statusFilter || riskFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setRiskFilter('');
                setPage(1);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white border border-slate-200/90 rounded-card shadow-card overflow-hidden">
        <div className="w-full">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="w-48 pl-6 pr-4 py-3.5">Case ID</th>
                <th className="px-4 py-3.5">Applicant Details</th>
                <th className="px-4 py-3.5">Document Proofs</th>
                <th className="px-4 py-3.5 min-w-[150px]">Risk Score</th>
                <th className="px-4 py-3.5">Verification Status</th>
                <th className="px-4 py-3.5 text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    No cases match your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((c) => {
                  const docCount = c.documents?.length || 1;
                  const primaryDocType = c.documents?.[0]?.docType ?? 'PASSPORT';
                  const riskScore = c.riskScore ?? 15;
                  const riskLevel = c.riskLevel ?? (riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW');

                  return (
                    <tr key={c.id}>
                      <td className="w-48 pl-6 pr-4 py-4">
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
                            <p className="text-[11px] text-slate-400 truncate font-mono">{c.applicantDob}</p>
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
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-md border ${
                              riskScore > 60
                                ? 'text-rose-700 bg-rose-50 border-rose-200'
                                : riskScore > 30
                                ? 'text-amber-700 bg-amber-50 border-amber-200'
                                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            }`}
                          >
                            {riskScore}/100
                          </span>
                          <RiskBadge level={riskLevel} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-4 text-right pr-6">
                        <Link
                          href={`/officer/cases/${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-xs font-semibold text-slate-700 transition-all"
                        >
                          Inspect Case
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} cases
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-slate-700 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
