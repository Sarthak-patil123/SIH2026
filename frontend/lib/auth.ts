import { User, LoginCredentials } from '@/types';

export const mockUsers: User[] = [
  {
    id: 'officer-1',
    email: 'officer@ssb.gov.in',
    name: 'Rajesh Kumar',
    role: 'OFFICER',
    employeeId: 'OFC-2024-001',
    department: 'Border Security Force',
    username: 'rajesh.kumar',
    accountStatus: 'ACTIVE',
    lastLogin: '2026-09-07T18:00:00Z',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2026-09-07T18:00:00Z',
  },
  {
    id: 'admin-1',
    email: 'admin@ssb.gov.in',
    name: 'Anil Sharma',
    role: 'ADMIN',
    employeeId: 'ADM-2024-001',
    department: 'Security Review Division',
    username: 'anil.sharma',
    accountStatus: 'ACTIVE',
    lastLogin: '2026-09-07T18:30:00Z',
    createdAt: '2023-11-01T09:00:00Z',
    updatedAt: '2026-09-07T18:30:00Z',
  },
];

const STORAGE_KEY = 'idverify_static_user';

/** Static Mock Login — Instant client-side authentication */
export async function apiLogin(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
  // Find matching mock user by email
  const found = mockUsers.find(
    (u) => u.email.toLowerCase() === credentials.email.toLowerCase().trim()
  );

  const user: User = found || {
    id: 'custom-user-1',
    email: credentials.email,
    name: credentials.email.includes('admin') ? 'Supervisory Admin' : 'Border Officer',
    role: credentials.email.includes('admin') ? 'ADMIN' : 'OFFICER',
    employeeId: credentials.email.includes('admin') ? 'ADM-2024-999' : 'OFC-2024-999',
    department: 'Border Security Terminal',
    username: credentials.email.split('@')[0],
    accountStatus: 'ACTIVE',
    lastLogin: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  return { user, token: 'mock-jwt-token-static' };
}

/** Static Session Restore */
export async function apiGetCurrentUser(): Promise<User | null> {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
  }
  // Default to Officer for static exploration
  return mockUsers[0];
}

/** Static Logout */
export async function apiLogout(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
