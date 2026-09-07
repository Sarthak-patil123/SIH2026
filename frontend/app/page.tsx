'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'ADMIN') {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/officer/dashboard');
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading IDVerify...</p>
      </div>
    </div>
  );
}
