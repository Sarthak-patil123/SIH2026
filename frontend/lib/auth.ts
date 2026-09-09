import { User, LoginCredentials } from '@/types';
import { apiFetch } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types returned by the backend auth endpoints
// ---------------------------------------------------------------------------
interface ApiAuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'OFFICER' | 'ADMIN';
  };
  token: string;
}

interface ApiMeResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'OFFICER' | 'ADMIN';
  };
}

// ---------------------------------------------------------------------------
// Map backend user → frontend User shape
// ---------------------------------------------------------------------------
function toFrontendUser(apiUser: ApiAuthResponse['user']): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.name,
    role: apiUser.role,
    // These fields are not returned by the backend but are optional in the type
    employeeId: undefined,
    department: undefined,
    username: undefined,
    accountStatus: 'ACTIVE',
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// API auth functions — used by AuthContext
// ---------------------------------------------------------------------------

/** POST /api/auth/login */
export async function apiLogin(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
  const data = await apiFetch<ApiAuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
  });

  // Persist token for Authorization header fallback
  if (typeof window !== 'undefined') {
    localStorage.setItem('idverify_token', data.token);
  }

  return { user: toFrontendUser(data.user), token: data.token };
}

/** GET /api/auth/me — restore session from cookie */
export async function apiGetCurrentUser(): Promise<User | null> {
  try {
    const data = await apiFetch<ApiMeResponse>('/auth/me');
    return toFrontendUser(data.user);
  } catch {
    return null;
  }
}

/** POST /api/auth/logout */
export async function apiLogout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Ignore errors — we clear local state regardless
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('idverify_token');
  }
}

// ---------------------------------------------------------------------------
// Legacy mock exports — kept for any code that still imports them
// Remove once fully migrated.
// ---------------------------------------------------------------------------
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
