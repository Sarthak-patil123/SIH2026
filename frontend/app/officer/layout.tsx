'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import DashboardShell from '@/components/ui/DashboardShell';

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace('/login');
    else if (user.role !== 'OFFICER') router.replace('/admin/dashboard');
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'OFFICER') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
}
