'use client';

import { Menu, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/useAuth';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/catalogue/categories': 'Categories',
  '/catalogue/subcategories': 'Subcategories',
  '/catalogue/product-types': 'Product Types',
  '/catalogue/attributes': 'Attributes',
  '/catalogue/master-products': 'Products',
  '/products': 'Products',
  '/product-submissions': 'Product Submissions',
  '/sellers/users': 'Seller Users',
  '/sellers/stores': 'Seller Stores',
  '/sellers/approvals': 'Seller Approvals',
};

function getPageTitle(pathname: string | null): string {
  if (!pathname) return 'Dashboard';
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/sellers/approvals/')) return 'Seller Approval';
  if (pathname.startsWith('/sellers/stores/')) return 'Store Details';
  if (pathname.startsWith('/products/')) return 'Product Details';
  if (pathname.startsWith('/product-submissions/')) return 'Submission Review';
  const match = Object.keys(PAGE_TITLES).find((k) => pathname.startsWith(k + '/'));
  return match ? PAGE_TITLES[match] : 'Admin';
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-white px-4 lg:px-6">
      <button
        className="rounded-md p-2 hover:bg-muted lg:hidden"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="text-base font-semibold tracking-tight text-foreground truncate">{title}</h1>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline truncate max-w-[220px]">
          {user?.email}
        </span>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
