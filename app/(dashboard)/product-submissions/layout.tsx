'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function ProductSubmissionsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperAdmin, isSellerOpsAdmin } = useAuth();
  const canAccessProductSubmissions = isSuperAdmin || isSellerOpsAdmin;
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !canAccessProductSubmissions)) {
      router.replace('/dashboard');
    }
  }, [user, loading, canAccessProductSubmissions, router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-r-transparent" />
      </div>
    );
  }

  if (!canAccessProductSubmissions) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Only Super Administrators and Seller Operations Administrators have access to Product Submissions. Redirecting to dashboard...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
