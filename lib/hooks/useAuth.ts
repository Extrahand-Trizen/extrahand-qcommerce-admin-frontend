'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';

export interface User {
  id: string;
  userId?: string;
  email: string;
  name: string;
  role: string;
  status?: string;
  isSuperAdmin?: boolean;
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isCatalogueAdmin: boolean;
  isSellerOpsAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    setToken(savedToken);
    setIsInitialized(true);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        setToken(e.newValue);
        if (!e.newValue) {
          queryClient.setQueryData(AUTH_QUERY_KEY, null);
        } else {
          queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient]);

  const {
    data: user = null,
    isLoading: isQueryLoading,
    refetch,
  } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async (): Promise<User | null> => {
      const currentToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!currentToken) return null;

      try {
        const res = await api<User>(endpoints.auth.me);
        if (res.success && res.data) {
          return res.data;
        }
        throw new Error(res.error || 'Failed to authenticate');
      } catch (err) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
        }
        setToken(null);
        throw err;
      }
    },
    enabled: isInitialized && !!token,
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
  });

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
    setToken(null);
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
    queryClient.removeQueries({ queryKey: AUTH_QUERY_KEY });
    queryClient.clear();
    router.replace('/login');
  }, [queryClient, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ accessToken: string; user: User }>(endpoints.auth.login, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.success && res.data) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', res.data.accessToken);
        }
        setToken(res.data.accessToken);
        queryClient.setQueryData(AUTH_QUERY_KEY, res.data.user);
        router.push('/dashboard');
      }
    },
    [queryClient, router]
  );

  const refetchUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const loading = !isInitialized || (!!token && isQueryLoading);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || Boolean(user?.isSuperAdmin);
  const isCatalogueAdmin = user?.role === 'CATALOGUE_ADMIN';
  const isSellerOpsAdmin = user?.role === 'SELLER_OPERATIONS_ADMIN';

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      isSuperAdmin,
      isCatalogueAdmin,
      isSellerOpsAdmin,
      login,
      logout,
      refetchUser,
    }),
    [user, loading, isSuperAdmin, isCatalogueAdmin, isSellerOpsAdmin, login, logout, refetchUser]
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider (check that Providers wraps the component tree)');
  }
  return context;
}

