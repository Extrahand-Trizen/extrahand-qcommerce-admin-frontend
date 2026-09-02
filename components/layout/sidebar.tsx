'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderTree, Package, Users, ChevronDown, ChevronRight, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const nav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Catalogue',
    icon: FolderTree,
    children: [
      { name: 'Categories', href: '/catalogue/categories' },
      { name: 'Subcategories', href: '/catalogue/subcategories' },
      { name: 'Product Types', href: '/catalogue/product-types' },
      { name: 'Attributes', href: '/catalogue/attributes' },
    ],
  },
  {
    name: 'Products',
    icon: Package,
    children: [
      { name: 'Products', href: '/products' },
      { name: 'Submissions', href: '/product-submissions' },
    ],
  },
  {
    name: 'Sellers',
    icon: Users,
    children: [
      { name: 'Users', href: '/sellers/users' },
      { name: 'Stores', href: '/sellers/stores' },
      { name: 'Approvals', href: '/sellers/approvals' },
    ],
  },
];

export function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Catalogue: true,
    Products: true,
    Sellers: true,
  });

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-white transition-transform duration-200 lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" onClick={onClose}>
            <Image
              src="/logo.png"
              alt="ExtraHand"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-md object-contain"
              priority
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-foreground">ExtraHand</p>
              <p className="truncate text-[11px] text-muted-foreground">Quick Commerce</p>
            </div>
          </Link>
          <button className="rounded p-1 hover:bg-muted lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {nav.map((item) => {
            if ('children' in item && item.children) {
              const isOpen = expanded[item.name];
              const isActive = item.children.some((c) => pathname === c.href || pathname?.startsWith(c.href + '/'));
              return (
                <div key={item.name}>
                  <button
                    onClick={() => setExpanded((e) => ({ ...e, [item.name]: !e[item.name] }))}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium',
                      isActive ? 'text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.name}</span>
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  {isOpen && (
                    <div className="mb-1 ml-3 space-y-0.5 border-l border-border pl-2">
                      {item.children.map((child) => {
                        const childActive = pathname === child.href || pathname?.startsWith(child.href + '/');
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            className={cn(
                              'block rounded-md px-2.5 py-1.5 text-[13px]',
                              childActive
                                ? 'bg-amber-50 font-medium text-amber-900'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            const linkActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href!}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium',
                  linkActive ? 'bg-amber-50 text-amber-900' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
