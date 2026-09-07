'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, FileText, ChevronLeft, ChevronRight, Plus, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockCases } from '@/lib/mock-data';
import { formatDate, timeAgo } from '@/lib/utils';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ConfidenceBar from '@/components/ui/ConfidenceBar';
import Avatar from '@/components/ui/Avatar';
import { CaseStatus, RiskLevel } from '@/types';

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

  // Officer sees ONLY their own cases
  const myCases = mockCases.filter((c) => c.officerId === user?.id);

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

  function handleFilterChange() {
    setPage(1);
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            My Cases
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Assigned identity verification queues and case screening files ({myCases.length} total)
          </p>
        </div>

        <Link href="/officer/verify">
          <Button variant="primary" icon={<Plus size={15} />}>
            New Verification
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar (Inspired by Doculyst Reference) */}
      <div className="bg-white border border-slate-200/90 rounded-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search by Case ID, applicant name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-10 pr-3.5 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all shadow-subtle"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); handleFilterChange(); }}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-subtle cursor-pointer"
            >
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              value={riskFilter}
              onChange={(e) => { setRiskFilter(e.target.value); handleFilterChange(); }}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-subtle cursor-pointer"
            >
              {riskOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {(search || statusFilter || riskFilter) && (
              <button
                onClick={() => { setSearch(''); setStatusFilter(''); setRiskFilter(''); setPage(1); }}
                className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Card (Doculyst Style) */}
      <div className="bg-white border border-slate-200/90 rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Applicant</th>
                <th>Document</th>
                <th>AI Confidence Score</th>
                <th>Risk Level</th>
                <th>Status</th>
                <th>Recorded</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileText size={36} className="text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No matching cases found</p>
                      <p className="text-xs text-slate-400">Try adjusting your search criteria or create a new verification.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((c) => {
                  const doc = c.documents[0];
                  const confidence = Math.max(0, 100 - c.riskScore);
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="font-mono text-xs font-bold text-slate-900 block">{c.caseNumber}</span>
                        <span className="text-[10px] text-slate-400">{timeAgo(c.createdAt)}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={c.applicantName} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{c.applicantName}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{c.applicantDob}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                            <FileText size={13} />
                          </div>
                          <span className="text-xs text-slate-700 font-medium">{doc?.docType ?? 'PASSPORT'}</span>
                        </div>
                      </td>
                      <td>
                        <ConfidenceBar value={confidence} segmentsCount={10} />
                      </td>
                      <td>
                        <RiskBadge level={c.riskLevel} />
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="text-xs text-slate-500 tabular-nums">
                        {formatDate(c.createdAt)}
                      </td>
                      <td>
                        <Link
                          href={`/officer/cases/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Inspect →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
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
