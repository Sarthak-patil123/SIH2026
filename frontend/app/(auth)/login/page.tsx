'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, AlertCircle, Lock, Mail, ChevronRight } from 'lucide-react';
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
    await new Promise((r) => setTimeout(r, 800)); // simulate network
    const result = await login({ email, password });
    setLoading(false);
    if (result.success) {
      const stored = localStorage.getItem('idverify_user');
      const user = stored ? JSON.parse(stored) : null;
      if (user?.role === 'ADMIN') router.push('/admin/dashboard');
      else router.push('/officer/dashboard');
    } else {
      setError(result.error ?? 'Login failed.');
    }
  }

  function fillDemo(role: 'officer' | 'admin') {
    setEmail(role === 'admin' ? 'admin@ssb.gov.in' : 'officer@ssb.gov.in');
    setPassword('password123');
    setError('');
  }

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* LEFT — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 p-12 border-r border-navy-700">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-glow-blue">
            <Shield size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">IDVerify</span>
        </div>

        {/* Main branding content */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              AI-Based Fake Identity
              <br />
              <span className="text-blue-400">&amp; Document Screening</span>
            </h1>
            <p className="text-slate-400 mt-4 text-base leading-relaxed max-w-md">
              Secure identity verification and document screening for border operations.
              Powered by multi-layer AI analysis and immutable audit trails.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {[
              { label: 'AI-powered OCR & Document Analysis' },
              { label: 'Biometric Face Verification' },
              { label: 'Tamper Detection & Risk Scoring' },
              { label: 'Blockchain Audit Trail (Hyperledger)' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-blue-600/20 border border-blue-600/40 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                </div>
                <span className="text-sm text-slate-300">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse-slow" />
          <span>System Status: Operational</span>
          <span className="mx-2">·</span>
          <span>SIH 2026 Demo Environment</span>
        </div>
      </div>

      {/* RIGHT — Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-16">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white">IDVerify</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-navy-800 border border-navy-600 rounded-2xl p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-100">Sign In</h2>
              <p className="text-sm text-slate-400 mt-1">Access the secure verification portal</p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="email" className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Email / Username
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@ssb.gov.in"
                    className="w-full bg-navy-700 border border-navy-600 text-slate-100 rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="password" className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-navy-700 border border-navy-600 text-slate-100 rounded-lg pl-9 pr-10 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50',
                  'text-white font-semibold rounded-lg py-2.5 text-sm transition-all duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 focus:ring-offset-navy-800',
                  'disabled:cursor-not-allowed'
                )}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Notice */}
            <p className="text-center text-xs text-slate-500 mt-4">
              🔒 Authorized personnel only
            </p>
          </div>

          {/* Demo accounts */}
          <div className="mt-4 bg-navy-800/50 border border-navy-600 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Demo Accounts</p>
            <button
              onClick={() => fillDemo('officer')}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-navy-700 hover:bg-navy-600 rounded-lg transition-colors"
            >
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-200">Rajesh Kumar</p>
                <p className="text-[10px] text-slate-500">Officer · officer@ssb.gov.in</p>
              </div>
              <span className="text-[10px] bg-blue-600/20 text-blue-300 border border-blue-600/30 px-2 py-0.5 rounded">OFFICER</span>
            </button>
            <button
              onClick={() => fillDemo('admin')}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-navy-700 hover:bg-navy-600 rounded-lg transition-colors"
            >
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-200">Anil Sharma</p>
                <p className="text-[10px] text-slate-500">Admin · admin@ssb.gov.in</p>
              </div>
              <span className="text-[10px] bg-purple-600/20 text-purple-300 border border-purple-600/30 px-2 py-0.5 rounded">ADMIN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
