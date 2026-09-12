'use client';

import React from 'react';
import ReportsView from '@/components/reports/ReportsView';

export default function AdminReportsPage() {
  return <ReportsView userRole="ADMIN" />;
}
