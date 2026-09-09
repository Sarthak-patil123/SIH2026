'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity, Shield, CheckCircle2, AlertTriangle, Clock,
  Search, RefreshCw, ChevronRight, FileText, Filter
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime, timeAgo } from '@/lib/utils';
import Button from '@/components/ui/Button';

interface ActivityItem {
  id: string;
  caseId?: string;
  caseNumber?: string;
  applicantName?: string;
  action?: string;
  time: string;
  description: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';
  createdAt?: string;
}

export default function OfficerActivityPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  async function loadActivity() {
    setLoading(true);
    try {
      const data = await apiFetch<{ activities: ActivityItem[] }>('/cases/activity?limit=50');
      if (data?.activities) {
        setActivities(data.activities);
      }
    } catch (err) {
      console.warn('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();
  }, [user?.id]);

  const filtered = useMemo(() => {
    return activities.filter((act) => {
      const query = search.toLowerCase();
      const matchSearch =
        !search ||
        act.description.toLowerCase().includes(query) ||
        (act.caseNumber && act.caseNumber.toLowerCase().includes(query)) ||
        (act.applicantName && act.applicantName.toLowerCase().includes(query));

      const matchType = !typeFilter || act.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [activities, search, typeFilter]);

  const totalCount = activities.length;
  const successCount = activities.filter((a) => a.type === 'SUCCESS').length;
  const warningCount = activities.filter((a) => a.type === 'WARNING').length;
  const dangerCount = activities.filter((a) => a.type === 'DANGER').length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Recent Activity
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
              <Activity size={13} className="text-blue-600" /> Operations Feed
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Chronological log of all identity screening events, document checks, and supervisory actions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={loadActivity}
          >
            Refresh
          </Button>
          <Link href="/officer/cases">
            <Button variant="primary" size="sm">
              View All Cases
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Recorded</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Clock size={15} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-mono">{totalCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Events on record</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved &amp; Cleared</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2 font-mono">{successCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Valid verifications</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Flagged Reviews</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={15} />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2 font-mono">{warningCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Discrepancies identified</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rejected Entries</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Shield size={15} />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2 font-mono">{dangerCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Security interventions</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search by case reference, applicant, or event description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-10 pr-3.5 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all shadow-subtle"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-subtle cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="SUCCESS">Approved / Valid</option>
              <option value="WARNING">Flagged / Review</option>
              <option value="DANGER">Rejected / High Risk</option>
              <option value="INFO">Initiated / Logged</option>
            </select>

            {(search || typeFilter) && (
              <button
                onClick={() => { setSearch(''); setTypeFilter(''); }}
                className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="bg-white border border-slate-200/90 rounded-card shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-heading text-sm font-bold text-slate-900">Event Stream</h3>
            <p className="text-xs text-slate-400 mt-0.5">Chronological audit stream from operational terminal</p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {filtered.length} Recorded Events
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw size={24} className="animate-spin mx-auto text-slate-300 mb-2" />
              Loading operations activity stream...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <FileText size={32} className="mx-auto text-slate-300 mb-2" />
              No matching activity events found.
            </div>
          ) : (
            filtered.map((act) => {
              const dotColor =
                act.type === 'SUCCESS' ? 'bg-emerald-500' :
                act.type === 'DANGER' ? 'bg-rose-500' :
                act.type === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500';

              const badgeColor =
                act.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                act.type === 'DANGER' ? 'bg-rose-50 text-rose-700 border-rose-200/80' :
                act.type === 'WARNING' ? 'bg-amber-50 text-amber-700 border-amber-200/80' :
                'bg-blue-50 text-blue-700 border-blue-200/80';

              return (
                <div
                  key={act.id}
                  className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeColor}`}>
                          {act.type}
                        </span>
                        {act.caseNumber && (
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/70">
                            {act.caseNumber}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium">
                          {act.createdAt ? timeAgo(act.createdAt) : act.time}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 leading-snug">
                        {act.description}
                      </p>
                      {act.createdAt && (
                        <p className="text-xs text-slate-400 font-mono">
                          {formatDateTime(act.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {act.caseId ? (
                    <Link
                      href={`/officer/cases/${act.caseId}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline shrink-0 sm:self-center"
                    >
                      Inspect Case <ChevronRight size={13} />
                    </Link>
                  ) : (
                    <Link
                      href="/officer/cases"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline shrink-0 sm:self-center"
                    >
                      View Cases <ChevronRight size={13} />
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
