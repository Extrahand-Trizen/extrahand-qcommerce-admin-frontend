'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import {
  Users,
  UserCheck,
  Clock,
  FolderTree,
  Layers,
  Tags,
  Package,
  ShoppingBag,
  FileText,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardData {
  stats: {
    totalSellers: number;
    activeSellers: number;
    pendingSellerApprovals: number;
    totalCategories: number;
    totalSubcategories: number;
    totalProductTypes: number;
    totalMasterProducts: number;
    activeProducts: number;
    pendingProductSubmissions: number;
  };
  activity: {
    recentSellers: Array<{ fullName: string; createdAt: string; status: string }>;
    recentApprovedSellers: Array<{ fullName: string; updatedAt: string }>;
    recentProducts: Array<{ name: string; createdAt: string; status: string }>;
    recentSubmissions: Array<{ submittedProductName: string; createdAt: string; status: string }>;
    pendingApprovals: Array<{ shopName: string; fullName: string; submittedAt?: string; status: string }>;
  };
}

type StatItem = {
  key: keyof DashboardData['stats'];
  label: string;
  icon: LucideIcon;
  href: string;
  accent: string;
};

const catalogueStats: StatItem[] = [
  { key: 'totalCategories', label: 'Categories', icon: FolderTree, href: '/catalogue/categories', accent: 'bg-violet-50 text-violet-700' },
  { key: 'totalSubcategories', label: 'Subcategories', icon: Layers, href: '/catalogue/subcategories', accent: 'bg-indigo-50 text-indigo-700' },
  { key: 'totalProductTypes', label: 'Product Types', icon: Tags, href: '/catalogue/product-types', accent: 'bg-pink-50 text-pink-700' },
];

const productStats: StatItem[] = [
  { key: 'totalMasterProducts', label: 'Products', icon: Package, href: '/products', accent: 'bg-cyan-50 text-cyan-700' },
  { key: 'activeProducts', label: 'Active Products', icon: ShoppingBag, href: '/products', accent: 'bg-emerald-50 text-emerald-700' },
  { key: 'pendingProductSubmissions', label: 'Pending Submissions', icon: FileText, href: '/product-submissions', accent: 'bg-orange-50 text-orange-700' },
];

const sellerStats: StatItem[] = [
  { key: 'totalSellers', label: 'Total Sellers', icon: Users, href: '/sellers/users', accent: 'bg-blue-50 text-blue-700' },
  { key: 'activeSellers', label: 'Active Sellers', icon: UserCheck, href: '/sellers/users', accent: 'bg-teal-50 text-teal-700' },
  { key: 'pendingSellerApprovals', label: 'Pending Approvals', icon: Clock, href: '/sellers/approvals', accent: 'bg-amber-50 text-amber-700' },
];

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api<DashboardData>(endpoints.dashboard);
      return res.data!;
    },
  });

  return (
    <div className="space-y-8">
      <StatGroup title="Catalogue" stats={catalogueStats} data={data} isLoading={isLoading} />
      <StatGroup title="Products" stats={productStats} data={data} isLoading={isLoading} />
      <StatGroup title="Sellers" stats={sellerStats} data={data} isLoading={isLoading} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recent activity</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ActivityCard
            title="Pending seller approvals"
            href="/sellers/approvals"
            isLoading={isLoading}
            items={data?.activity.pendingApprovals.map((s) => ({
              primary: s.shopName,
              secondary: s.fullName,
              status: s.status,
            }))}
            empty="No pending approvals"
          />
          <ActivityCard
            title="Recent product submissions"
            href="/product-submissions"
            isLoading={isLoading}
            items={data?.activity.recentSubmissions.map((s) => ({
              primary: s.submittedProductName,
              secondary: format(new Date(s.createdAt), 'MMM d, yyyy'),
              status: s.status,
            }))}
            empty="No recent submissions"
          />
          <ActivityCard
            title="Newly registered sellers"
            href="/sellers/users"
            isLoading={isLoading}
            items={data?.activity.recentSellers.map((s) => ({
              primary: s.fullName,
              secondary: format(new Date(s.createdAt), 'MMM d, yyyy'),
              status: s.status,
            }))}
            empty="No recent sellers"
          />
          <ActivityCard
            title="Recently created products"
            href="/products"
            isLoading={isLoading}
            items={data?.activity.recentProducts.map((p) => ({
              primary: p.name,
              secondary: format(new Date(p.createdAt), 'MMM d, yyyy'),
              status: p.status,
            }))}
            empty="No recent products"
          />
        </div>
      </div>
    </div>
  );
}

function StatGroup({
  title,
  stats,
  data,
  isLoading,
}: {
  title: string;
  stats: StatItem[];
  data?: DashboardData;
  isLoading: boolean;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(({ key, label, icon: Icon, href, accent }) => (
          <Link
            key={key}
            href={href}
            className="group flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3.5 transition-colors hover:border-amber-200 hover:bg-amber-50/40"
          >
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', accent)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{label}</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-6 w-12" />
              ) : (
                <p className="text-xl font-semibold tracking-tight tabular-nums">
                  {data?.stats[key] ?? 0}
                </p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function ActivityCard({
  title,
  href,
  items,
  isLoading,
  empty,
}: {
  title: string;
  href: string;
  items?: Array<{ primary: string; secondary?: string; status?: string }>;
  isLoading?: boolean;
  empty: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Link href={href} className="text-xs font-medium text-amber-700 hover:underline">
          View all
        </Link>
      </div>
      <div className="px-4 py-2">
        {isLoading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : !items?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.slice(0, 5).map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.primary}</p>
                  {item.secondary ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.secondary}</p>
                  ) : null}
                </div>
                {item.status ? <StatusBadge status={item.status} /> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
