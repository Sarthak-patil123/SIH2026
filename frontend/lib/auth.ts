import { User, LoginCredentials } from '@/types';
import { mockUsers } from './mock-data';

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
