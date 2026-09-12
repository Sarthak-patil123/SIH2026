'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials } from '@/types';
import { apiLogin, apiGetCurrentUser, apiLogout, mockUsers } from '@/lib/auth';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  switchRole: (role: 'OFFICER' | 'ADMIN') => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize with static mock officer user by default so all pages render immediately
  const [user, setUser] = useState<User | null>(mockUsers[0]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const currentUser = await apiGetCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch {
        setUser(mockUsers[0]);
      }
    })();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const { user: loggedInUser } = await apiLogin(credentials);
      setUser(loggedInUser);
      return { success: true, user: loggedInUser };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const switchRole = useCallback((role: 'OFFICER' | 'ADMIN') => {
    const target = mockUsers.find((u) => u.role === role) || mockUsers[0];
    setUser(target);
    if (typeof window !== 'undefined') {
      localStorage.setItem('idverify_static_user', JSON.stringify(target));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchRole,
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
