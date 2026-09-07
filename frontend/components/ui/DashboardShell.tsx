'use client';

import React, { useState } from 'react';
import Sidebar, { MobileSidebar } from './Sidebar';
import Header from './Header';
import { ToastProvider } from './Toast';

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-navy-900">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Sidebar Drawer */}
        <MobileSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header onMobileMenuOpen={() => setMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
