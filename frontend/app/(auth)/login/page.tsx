'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, AlertCircle, Lock, Mail, ChevronRight, CheckCircle2, FileText, Cpu, Database } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login({ email, password });
    setLoading(false);

    if (result.success && result.user) {
      if (result.user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/officer/dashboard');
      }
    } else {
      // Surface backend error, with a friendly message for network/server issues
      const msg = result.error ?? 'Authentication failed.';
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
        setError('Server unavailable. Please ensure the backend service is running.');
      } else {
        setError(msg);
      }
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* LEFT — Clean Login Form */}
      <div className="w-full lg:w-[48%] min-h-screen flex flex-col justify-between p-6 sm:p-12 lg:p-16 xl:p-20">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-subtle">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <span className="font-heading text-base font-bold text-slate-900 tracking-tight">IDVerify</span>
            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none">
              Border Security System
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full max-w-md mx-auto my-8">
          <div className="space-y-2 mb-8">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-sm text-slate-500">
              Enter your authorized credentials to access the verification terminal.
            </p>
          </div>


          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3.5 mb-5 animate-fade-in">
              <AlertCircle size={16} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@ssb.gov.in"
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-10 pr-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-subtle"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-10 pr-10 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-subtle"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400',
                'text-white font-semibold rounded-xl py-2.5 text-sm transition-all duration-150 shadow-sm mt-2',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/30'
              )}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In to Terminal
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Authorized test credentials reference */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Authorized Test Accounts
            </p>
            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => {
                  setEmail('officer@ssb.gov.in');
                  setPassword('password123');
                  setError('');
                }}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400/50 hover:bg-slate-50 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-slate-800">Screening Officer</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">OFC</span>
                </div>
                <p className="text-[11px] font-mono text-slate-500 truncate">officer@ssb.gov.in</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('admin@ssb.gov.in');
                  setPassword('password123');
                  setError('');
                }}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-purple-400/50 hover:bg-slate-50 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-slate-800">Supervisory Admin</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">ADM</span>
                </div>
                <p className="text-[11px] font-mono text-slate-500 truncate">admin@ssb.gov.in</p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-6 border-t border-slate-100">
          <span>🔒 Authorized SSB Personnel Only</span>
          <span>SIH 2026</span>
        </div>
      </div>

      {/* RIGHT — Enterprise Verification Visual Language (Inspired by PineMin Reference) */}
      <div className="hidden lg:flex flex-1 bg-slate-100/70 border-l border-slate-200/90 relative overflow-hidden items-center justify-center p-12 xl:p-16">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:18px_18px] opacity-40" />

        <div className="relative w-full max-w-lg space-y-6">
          {/* Card 1: Document OCR Extraction Preview */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card transition-all duration-300 hover:shadow-card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold font-heading text-slate-900">Live OCR Inspection</p>
                  <p className="text-[11px] text-slate-400">Passport Republic of India</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                98.2% Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 rounded-xl p-3 border border-slate-100 font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block">DOCUMENT NO.</span>
                <span className="text-slate-800 font-medium">P84920194</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">EXPIRY DATE</span>
                <span className="text-slate-800 font-medium">18 OCT 2031</span>
              </div>
            </div>
          </div>

          {/* Card 2: Biometric Face Match & Tampering Detection */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card transition-all duration-300 hover:shadow-card-hover ml-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Cpu size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold font-heading text-slate-900">AI Biometric &amp; Tamper Engine</p>
                  <p className="text-[11px] text-slate-400">Multi-factor Identity Verification</p>
                </div>
              </div>
              <span className="text-xs font-bold font-heading text-slate-900">
                94.4% Match
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Facial Feature Similarity
                </span>
                <span className="font-semibold text-emerald-600">PASSED</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Microprint &amp; Holo-pattern Integrity
                </span>
                <span className="font-semibold text-emerald-600">AUTHENTIC</span>
              </div>
            </div>
          </div>

          {/* Card 3: Blockchain Audit Seal */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card transition-all duration-300 hover:shadow-card-hover">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Database size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold font-heading text-slate-900">Blockchain Audit Anchor</p>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 font-mono">
                    Block #18271
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                  0x7f8a92c4b1d038e9...91c2 (Hyperledger Fabric)
                </p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
