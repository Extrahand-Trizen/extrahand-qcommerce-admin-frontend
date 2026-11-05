'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function SellersLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isCatalogueAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Catalogue Admin is permitted to access Shops & Stores (/sellers/stores and its subroutes),
  // but restricted from seller operations like approvals, users, payouts, and offers.
  const isStoresPath = pathname?.startsWith('/sellers/stores');
  const isBlockedForCatalogueAdmin = isCatalogueAdmin && !isStoresPath;

  useEffect(() => {
    if (!loading && (!user || isBlockedForCatalogueAdmin)) {
      router.replace('/dashboard');
    }
  }, [user, loading, isBlockedForCatalogueAdmin, router]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-r-transparent" />
      </div>
    );
  }

  if (isBlockedForCatalogueAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Catalogue Administrators do not have access to this Seller Operations module. Redirecting to dashboard...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
