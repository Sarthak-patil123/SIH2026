'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Bot, User, Loader2, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

interface AskResponse {
  answer: string;
  error?: string;
}

const EXAMPLE_QUESTIONS = [
  'Show me all high-risk cases.',
  'Which officer flagged the most cases?',
  'Show me cases waiting for Admin review.',
  'How many documents have OCR confidence below 75%?',
  'Which Admin reviewed the most cases?',
  'Show me all FLAGGED cases.',
];

function parseTableFromAnswer(text: string): { headers: string[]; rows: string[][] } | null {
  // Detect markdown tables in the answer
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
    .slice(2) // skip separator row
    .filter((l) => !/^\|[\s\-|:]+\|$/.test(l))
    .map(parse)
    .filter((r) => r.length > 0);

  if (headers.length === 0 || rows.length === 0) return null;
  return { headers, rows };
}

function AnswerBlock({ content }: { content: string }) {
  const table = parseTableFromAnswer(content);

  // Split out any text before/after the table
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
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-subtle">
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
    </div>
  );
}

export default function AdminChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I\'m the SSB Admin AI assistant. Ask me anything about your verification cases, officers, documents, or audit logs.',
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

    try {
      const { answer } = await apiFetch<AskResponse>('/chatbot/ask', {
        method: 'POST',
        body: JSON.stringify({ question: q }),
      });
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: answer },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: message,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto p-6 lg:p-8 gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-subtle">
            <MessageSquare size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">
              AI Chatbot
            </h1>
            <p className="text-sm text-slate-500">
              Ask natural-language questions about cases, officers, and documents
            </p>
          </div>
        </div>
      </div>

      {/* Example questions */}
      <div className="flex-shrink-0 flex flex-wrap gap-2">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-150 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  msg.isError ? 'bg-rose-100' : 'bg-blue-100'
                }`}
              >
                {msg.isError ? (
                  <AlertTriangle size={16} className="text-rose-600" />
                ) : (
                  <Bot size={16} className="text-blue-600" />
                )}
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-subtle ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white ml-auto'
                  : msg.isError
                  ? 'bg-rose-50 border border-rose-200'
                  : 'bg-white border border-slate-200/80'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              ) : msg.isError ? (
                <p className="text-sm text-rose-700 leading-relaxed">{msg.content}</p>
              ) : (
                <AnswerBlock content={msg.content} />
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={16} className="text-slate-600" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-blue-600" />
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-subtle flex items-center gap-2">
              <Loader2 size={15} className="text-blue-500 animate-spin" />
              <span className="text-sm text-slate-500">Generating SQL and fetching results…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0">
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 bg-white border border-slate-200/90 rounded-2xl shadow-card px-4 py-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your database…"
            disabled={isLoading}
            autoFocus
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-150 flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 size={16} className="text-slate-400 animate-spin" />
            ) : (
              <Send size={16} className="text-white" />
            )}
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-400 mt-2">
          Admin only · Read-only · Powered by Claude + LangChain
        </p>
      </div>
    </div>
  );
}
