'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials } from '@/types';
import { apiLogin, apiGetCurrentUser, apiLogout } from '@/lib/auth';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Session Restoration ────────────────────────────────────────────────────
  // On mount: call GET /api/auth/me to restore session from the HttpOnly cookie.
  // This is the only source of truth — no localStorage user object.
  useEffect(() => {
    (async () => {
      try {
        const currentUser = await apiGetCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const { user: loggedInUser } = await apiLogin(credentials);
      setUser(loggedInUser);
      return { success: true, user: loggedInUser };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      return { success: false, error: message };
    }
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
