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
    id: 'officer-2',
    email: 'officer2@ssb.gov.in',
    name: 'Priya Sharma',
    role: 'OFFICER',
    employeeId: 'OFC-2024-002',
    department: 'Border Security Force',
    username: 'priya.sharma',
    accountStatus: 'ACTIVE',
    lastLogin: '2026-09-07T17:30:00Z',
    createdAt: '2024-02-10T09:00:00Z',
    updatedAt: '2026-09-07T17:30:00Z',
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

// Demo credentials
const CREDENTIALS: Record<string, { password: string; userId: string }> = {
  'officer@ssb.gov.in': { password: 'password123', userId: 'officer-1' },
  'officer2@ssb.gov.in': { password: 'password123', userId: 'officer-2' },
  'admin@ssb.gov.in': { password: 'password123', userId: 'admin-1' },
};

interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
}

export function mockLogin(credentials: LoginCredentials): LoginResult {
  const entry = CREDENTIALS[credentials.email.toLowerCase()];
  if (!entry) {
    return { success: false, error: 'Invalid email or password.' };
  }
  if (entry.password !== credentials.password) {
    return { success: false, error: 'Invalid email or password.' };
  }
  const user = mockUsers.find((u) => u.id === entry.userId);
  if (!user) {
    return { success: false, error: 'User account not found.' };
  }
  return { success: true, user };
}
