'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, endpoints } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }
    try {
      const res = await api<User>(endpoints.auth.me);
      if (res.success && res.data) setUser(res.data);
    } catch {
      localStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await api<{ accessToken: string; user: User }>(endpoints.auth.login, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.data) {
      localStorage.setItem('accessToken', res.data.accessToken);
      setUser(res.data.user);
      router.push('/dashboard');
    }
  }

  function logout() {
    localStorage.removeItem('accessToken');
    setUser(null);
    router.replace('/login');
  }

  return { user, loading, isAuthenticated: !!user, login, logout };
}
