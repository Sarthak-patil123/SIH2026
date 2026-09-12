'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Send, MessageSquare, Bot, User, Sparkles, CheckCircle2, Shield, Search, ArrowRight, ExternalLink } from 'lucide-react';
import { mockCases, mockAlerts, mockAuditLogs, mockUsers } from '@/lib/mock-data';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

const EXAMPLE_QUESTIONS = [
  'Show me all high-risk cases.',
  'Which officer flagged the most cases?',
  'Show me cases waiting for Admin review.',
  'How many documents have OCR confidence below 75%?',
  'What are the recent fraud alerts?',
  'Show summary of system statistics.',
];

function generateStaticAnswer(query: string): string {
  const q = query.toLowerCase().trim();

  if (q.includes('high-risk') || q.includes('high risk') || q.includes('risk >') || q.includes('flagged')) {
    const highRisk = mockCases.filter((c) => c.riskLevel === 'HIGH' || c.status === 'FLAGGED');
    let res = `Found **${highRisk.length} high-risk / flagged cases** requiring supervisory attention:\n\n`;
    res += `| Case ID | Applicant | Risk Level | Score | Status | Reason |\n`;
    res += `|---|---|---|---|---|---|\n`;
    highRisk.forEach((c) => {
      res += `| ${c.caseNumber} | ${c.applicantName} | ${c.riskLevel} | ${c.riskScore}/100 | ${c.status} | ${c.flagReason || 'Anomaly detected'} |\n`;
    });
    res += `\nDirect Investigation: Click below to inspect individual case dossiers and review biometric discrepancies.`;
    return res;
  }

  if (q.includes('officer') || q.includes('who flagged') || q.includes('staff')) {
    return `### Officer Performance Summary\n\n| Officer | Department | Total Cases | Flagged Cases | Avg Processing Time |\n|---|---|---|---|---|\n| Rajesh Kumar | Border Security Force | 18 | 3 | 2.4 min |\n| Priya Sharma | Screening Division | 14 | 1 | 3.1 min |\n| Amit Patel | Border Security Force | 12 | 2 | 2.8 min |\n\nOfficer **Rajesh Kumar** has conducted the highest number of multi-factor screenings (18 cases) with 3 flagged fraud anomalies (e.g. SSB-1025, SSB-1026).`;
  }

  if (q.includes('review') || q.includes('waiting') || q.includes('pending')) {
    const pending = mockCases.filter((c) => c.status === 'UNDER_REVIEW' || c.status === 'FLAGGED' || c.status === 'PENDING');
    let res = `There are currently **${pending.length} cases** in the administrative oversight queue:\n\n`;
    res += `| Case ID | Applicant | Status | Risk Score | Officer |\n`;
    res += `|---|---|---|---|---|\n`;
    pending.forEach((c) => {
      res += `| ${c.caseNumber} | ${c.applicantName} | ${c.status} | ${c.riskScore}/100 | ${c.officerName || 'Rajesh Kumar'} |\n`;
    });
    return res;
  }

  if (q.includes('ocr') || q.includes('confidence') || q.includes('document')) {
    return `### Document Extraction & OCR Confidence Analysis\n\n- **Total Scanned Documents**: 32\n- **Average OCR Confidence**: 95.4%\n- **Documents < 75% Confidence**: 1 document (*passport_arjun_verma.jpg* with 62.4% confidence — Case SSB-1025 flagged for font irregularity).\n\n| Document Type | Scans | Avg Confidence | Tamper Flags |\n|---|---|---|---|\n| Passport | 16 | 97.2% | 1 |\n| Nationality ID | 10 | 94.8% | 0 |\n| Driving Licence | 4 | 93.1% | 0 |\n| Visa | 2 | 96.0% | 1 |`;
  }

  if (q.includes('alert') || q.includes('fraud')) {
    let res = `### Active Fraud & Security Alerts\n\n| Alert ID | Type | Severity | Case Number | Status |\n|---|---|---|---|---|\n`;
    mockAlerts.forEach((a) => {
      res += `| ${a.id} | ${a.alertType} | ${a.severity} | ${a.caseNumber} | ${a.status} |\n`;
    });
    return res;
  }

  if (q.includes('stat') || q.includes('summary') || q.includes('overview')) {
    return `### System Overview\n\n- **Total Cases Processed**: ${mockCases.length}\n- **Verified & Approved**: ${mockCases.filter((c) => c.status === 'APPROVED').length}\n- **Flagged for Fraud**: ${mockCases.filter((c) => c.status === 'FLAGGED').length}\n- **Under Secondary Review**: ${mockCases.filter((c) => c.status === 'UNDER_REVIEW').length}\n- **Blockchain Anchored Blocks**: 18,274 blocks verified on Hyperledger Fabric.`;
  }

  return `I have analyzed the local security database for "${query}".\n\n- **Status**: Database search complete.\n- **Matched Cases**: ${mockCases.length} total verification records available (including SSB-1021, SSB-1025, SSB-1028).\n- **Blockchain Integrity**: All cryptographic hash seals are valid.`;
}

function parseTableFromAnswer(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const tableStart = lines.findIndex((l) => l.startsWith('|') && l.endsWith('|'));
  if (tableStart === -1) return null;

  const tableLines = lines.slice(tableStart).filter((l) => l.startsWith('|'));
  if (tableLines.length < 2) return null;

  const parse = (line: string) =>
    line
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell !== '' && !/^[-:]+$/.test(cell));

  const headers = parse(tableLines[0]);
  const rows = tableLines
    .slice(2)
    .filter((l) => !/^\|[\s\-|:]+\|$/.test(l))
    .map(parse)
    .filter((r) => r.length > 0);

  if (headers.length === 0 || rows.length === 0) return null;
  return { headers, rows };
}

function extractCaseMatches(content: string): string[] {
  const matches = content.match(/SSB-\d{4}/g) || [];
  return Array.from(new Set(matches));
}

function AnswerBlock({ content }: { content: string }) {
  const table = parseTableFromAnswer(content);
  const caseMatches = extractCaseMatches(content);

  const textBeforeTable = table
    ? content.substring(0, content.indexOf('|')).trim()
    : content;
  const textAfterTable = table
    ? content.substring(content.lastIndexOf('|') + 1).trim()
    : '';

  return (
    <div className="space-y-3">
      {textBeforeTable && (
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{textBeforeTable}</p>
      )}
      {table && (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-subtle my-2">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80">
                {table.headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2.5 text-left font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                >
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {textAfterTable && (
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{textAfterTable}</p>
      )}

      {/* ── Direct Case Navigation Buttons (Requirement 10) ── */}
      {caseMatches.length > 0 && (
        <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Investigate Cases:
          </span>
          {caseMatches.map((cNum) => {
            const foundCase = mockCases.find((mc) => mc.caseNumber === cNum);
            const targetId = foundCase?.id || `case-${cNum.replace('-', '')}`;
            return (
              <Link
                key={cNum}
                href={`/admin/cases/${targetId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold shadow-2xs transition-colors group"
              >
                <span>Inspect {cNum}</span>
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am the SSB AI Assistant. You can ask me queries about verification cases, fraud anomalies, officer screening performance, OCR confidence, or blockchain audit logs.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (question: string) => {
    const q = question.trim();
    if (!q || isLoading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      const answer = generateStaticAnswer(q);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: answer },
      ]);
      setIsLoading(false);
      inputRef.current?.focus();
    }, 250);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              AI Security Intelligence Assistant
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles size={13} className="text-blue-600" />
              Interactive Dossier Routing
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Query border intelligence data, case histories, anomaly rates, and document statistics with 1-click case routing
          </p>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 bg-white border border-slate-200/90 rounded-card shadow-card flex flex-col overflow-hidden">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-subtle ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-white'
                }`}
              >
                {m.role === 'user' ? <User size={15} /> : <Bot size={16} />}
              </div>

              <div
                className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-900 rounded-tl-none'
                }`}
              >
                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <AnswerBlock content={m.content} />
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-subtle">
                <Bot size={16} />
              </div>
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-none p-4 text-slate-500 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs font-medium ml-1">Analyzing database...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggested Queries */}
        <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles size={12} className="text-blue-500" /> Suggestions:
          </span>
          {EXAMPLE_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => sendMessage(q)}
              className="text-xs bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/80 hover:border-blue-200 px-3 py-1 rounded-lg shrink-0 transition-colors shadow-2xs font-medium"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-200/80 flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about cases, anomalies, OCR confidence, or officers..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white p-2.5 rounded-xl transition-all shadow-subtle disabled:text-slate-400"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
