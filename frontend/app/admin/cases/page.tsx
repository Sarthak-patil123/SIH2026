'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, FileText, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { mockCases } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';
import { StatusBadge, RiskBadge } from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import Avatar from '@/components/ui/Avatar';

const PAGE_SIZE = 8;

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
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

export default function AdminCasesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [officerFilter, setOfficerFilter] = useState('');
  const [page, setPage] = useState(1);

  const uniqueOfficers = Array.from(new Set(mockCases.map((c) => c.officerName)));

  const filtered = useMemo(() => {
    return mockCases.filter((c) => {
      const matchSearch = !search ||
        c.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || c.status === statusFilter;
      const matchRisk = !riskFilter || c.riskLevel === riskFilter;
      const matchOfficer = !officerFilter || c.officerName === officerFilter;
      return matchSearch && matchStatus && matchRisk && matchOfficer;
    });
  }, [search, statusFilter, riskFilter, officerFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function reset() { setSearch(''); setStatusFilter(''); setRiskFilter(''); setOfficerFilter(''); setPage(1); }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Case Management"
        subtitle={`${mockCases.length} total cases across all officers`}
      />

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search by Case ID or title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-navy-700 border border-navy-600 text-slate-100 rounded-md pl-9 pr-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select value={officerFilter} onChange={(e) => { setOfficerFilter(e.target.value); setPage(1); }}
            className="bg-navy-700 border border-navy-600 text-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
            <option value="">All Officers</option>
            {uniqueOfficers.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-navy-700 border border-navy-600 text-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={riskFilter} onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
            className="bg-navy-700 border border-navy-600 text-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
            {riskOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(search || statusFilter || riskFilter || officerFilter) && (
            <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-200">Clear filters</button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Officer</th>
                <th>Title</th>
                <th>Documents</th>
                <th>Risk Score</th>
                <th>Risk Level</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <FileText size={32} className="opacity-40" />
                      <p className="text-sm font-medium">No cases found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((c) => (
                  <tr key={c.id}>
                    <td><span className="font-mono text-xs font-bold text-blue-400">{c.caseNumber}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar name={c.officerName} size="sm" />
                        <span className="text-sm text-slate-200 whitespace-nowrap">{c.officerName}</span>
                      </div>
                    </td>
                    <td><p className="text-sm text-slate-300 max-w-[200px] truncate">{c.title}</p></td>
                    <td>
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <FileText size={12} /> {c.documents.length}
                      </span>
                    </td>
                    <td>
                      <span className={`text-sm font-bold ${c.riskScore <= 30 ? 'text-success' : c.riskScore <= 60 ? 'text-warning' : 'text-danger'}`}>
                        {c.riskScore}
                      </span>
                    </td>
                    <td><RiskBadge level={c.riskLevel} /></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                    <td>
                      <Link href={`/admin/cases/${c.id}`}>
                        <button className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium px-2.5 py-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                          <Eye size={12} /> View
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-navy-600">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} cases
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-navy-700">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`w-7 h-7 text-xs rounded font-medium transition-colors ${page === i + 1 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-navy-700'}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-navy-700">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
