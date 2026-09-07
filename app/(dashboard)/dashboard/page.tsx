'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Users,
  UserCheck,
  Clock,
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
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    subcategoryCount: number;
    productCount: number;
    activeProductCount: number;
  }>;
  activity: {
    recentSellers: Array<{ fullName: string; createdAt: string; status: string }>;
    recentApprovedSellers: Array<{ fullName: string; updatedAt: string }>;
    recentProducts: Array<{ name: string; createdAt: string; status: string }>;
    recentSubmissions: Array<{ submittedProductName: string; createdAt: string; status: string }>;
    pendingApprovals: Array<{ shopName: string; fullName: string; submittedAt?: string; status: string }>;
  };
}

type ActionStat = {
  key: keyof DashboardData['stats'];
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  tone: 'amber' | 'orange' | 'emerald' | 'cyan';
};

const actionStats: ActionStat[] = [
  {
    key: 'pendingSellerApprovals',
    label: 'Pending seller approvals',
    description: 'Shops waiting for review',
    icon: Clock,
    href: '/sellers/approvals',
    tone: 'amber',
  },
  {
    key: 'pendingProductSubmissions',
    label: 'Pending product submissions',
    description: 'Seller requests to review',
    icon: FileText,
    href: '/product-submissions',
    tone: 'orange',
  },
  {
    key: 'activeSellers',
    label: 'Active sellers',
    description: 'Approved and live on platform',
    icon: UserCheck,
    href: '/sellers/users',
    tone: 'emerald',
  },
  {
    key: 'activeProducts',
    label: 'Active products',
    description: 'Live in master catalogue',
    icon: ShoppingBag,
    href: '/products',
    tone: 'cyan',
  },
];

const toneStyles = {
  amber: 'border-amber-200 bg-amber-50/70',
  orange: 'border-orange-200 bg-orange-50/70',
  emerald: 'border-emerald-200 bg-emerald-50/70',
  cyan: 'border-cyan-200 bg-cyan-50/70',
};

const toneIconStyles = {
  amber: 'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  cyan: 'bg-cyan-100 text-cyan-700',
};

export default function DashboardPage() {
  const { isSellerOpsAdmin, isCatalogueAdmin } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api<DashboardData>(endpoints.dashboard);
      return res.data!;
    },
  });

  const visibleActionStats = actionStats.filter((stat) => {
    if (isSellerOpsAdmin) return stat.href.startsWith('/sellers');
    if (isCatalogueAdmin) return !stat.href.startsWith('/sellers');
    return true;
  });

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSellerOpsAdmin
            ? 'Seller operations overview, applications, and activity below.'
            : isCatalogueAdmin
              ? 'Catalogue overview, product taxonomy, and submissions below.'
              : 'Catalogue overview on the left, seller metrics on the right, activity below.'}
        </p>
      </div>

      <div className="grid shrink-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch">
        <div className="flex min-h-0 flex-col gap-3">
          <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-white p-4 sm:p-5">
            <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Catalogue categories</h2>
                <p className="text-xs text-muted-foreground">
                  {data?.stats.totalCategories ?? 9} top-level categories
                </p>
              </div>
              {!isSellerOpsAdmin && (
                <Link
                  href="/catalogue/categories"
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline"
                >
                  Manage
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            <div className="min-h-0 flex-1">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {isLoading
                  ? Array.from({ length: 9 }).map((_, i) => (
                      <Skeleton key={i} className="h-32 rounded-xl" />
                    ))
                  : data?.categories.map((category) => {
                      const CardInner = (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                              {category.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={category.imageUrl}
                                  alt={category.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-200 text-sm font-semibold text-slate-500">
                                  {category.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                                {category.name}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {category.subcategoryCount} sub · {category.productCount} products
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-2 text-[11px] text-muted-foreground">
                            <span>{category.activeProductCount} active</span>
                            {!isSellerOpsAdmin && (
                              <span className="font-medium text-amber-700 opacity-0 transition-opacity group-hover:opacity-100">
                                View products
                              </span>
                            )}
                          </div>
                        </>
                      );

                      if (isSellerOpsAdmin) {
                        return (
                          <div
                            key={category.id}
                            className="rounded-xl border border-border p-3 bg-white"
                          >
                            {CardInner}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={category.id}
                          href={`/products?categoryId=${category.id}`}
                          className="group rounded-xl border border-border p-3 transition-all hover:border-amber-200 hover:shadow-sm"
                        >
                          {CardInner}
                        </Link>
                      );
                    })}
              </div>
            </div>
          </section>

          {!isLoading && data ? (
            <CatalogueTags stats={data.stats} isSellerOpsAdmin={isSellerOpsAdmin} />
          ) : (
            <Skeleton className="h-6 w-full max-w-xl rounded-md" />
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-xl border border-border bg-white p-4">
            <h2 className="mb-3 text-base font-semibold">Needs attention</h2>
            <div className="space-y-3">
              {visibleActionStats.map(({ key, label, description, icon: Icon, href, tone }) => (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors hover:brightness-[0.98]',
                    toneStyles[tone],
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      toneIconStyles[tone],
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-8" />
                  ) : (
                    <p className="text-2xl font-semibold tabular-nums">{data?.stats[key] ?? 0}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>

          {!isCatalogueAdmin && (
            <section className="rounded-xl border border-border bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">Seller overview</h2>
                <Link href="/sellers/users" className="text-xs font-medium text-amber-700 hover:underline">
                  View all
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SummaryTile
                  label="Total sellers"
                  value={data?.stats.totalSellers}
                  isLoading={isLoading}
                  icon={Users}
                />
                <SummaryTile
                  label="Approved sellers"
                  value={data?.stats.activeSellers}
                  isLoading={isLoading}
                  icon={UserCheck}
                />
              </div>
            </section>
          )}
        </aside>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 md:grid-cols-2">
        {isSellerOpsAdmin ? (
          <>
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
              className="flex min-h-[260px] flex-col"
            />

            <ActivityCard
              title="Recent sellers"
              href="/sellers/users"
              isLoading={isLoading}
              items={data?.activity.recentSellers.map((s) => ({
                primary: s.fullName,
                secondary: format(new Date(s.createdAt), 'MMM d, yyyy'),
                status: s.status,
              }))}
              empty="No recent sellers"
              className="flex min-h-[260px] flex-col"
            />
          </>
        ) : isCatalogueAdmin ? (
          <>
            <ActivityCard
              title="Recent products"
              href="/products"
              isLoading={isLoading}
              items={data?.activity.recentProducts.map((p) => ({
                primary: p.name,
                secondary: format(new Date(p.createdAt), 'MMM d, yyyy'),
                status: p.status,
              }))}
              empty="No recent products"
              className="flex min-h-[260px] flex-col"
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
              className="flex min-h-[260px] flex-col"
            />
          </>
        ) : (
          <>
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
              className="flex min-h-[260px] flex-col"
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
              className="flex min-h-[260px] flex-col"
            />
          </>
        )}
      </div>
    </div>
  );
}

function CatalogueTags({
  stats,
  isSellerOpsAdmin,
}: {
  stats: DashboardData['stats'];
  isSellerOpsAdmin?: boolean;
}) {
  const tags = [
    { label: 'Subcategories', value: stats.totalSubcategories, href: '/catalogue/subcategories' },
    { label: 'Product types', value: stats.totalProductTypes, href: '/catalogue/product-types' },
    { label: 'All products', value: stats.totalMasterProducts, href: '/products' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-sm text-muted-foreground">
      {tags.map((tag, index) => (
        <span key={tag.label} className="inline-flex items-center gap-2">
          {index > 0 ? <span aria-hidden className="text-border">·</span> : null}
          {isSellerOpsAdmin ? (
            <span>
              <span className="font-semibold tabular-nums text-foreground">{tag.value}</span>{' '}
              {tag.label}
            </span>
          ) : (
            <Link href={tag.href} className="transition-colors hover:text-foreground">
              <span className="font-semibold tabular-nums text-foreground">{tag.value}</span>{' '}
              {tag.label}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  isLoading,
  icon: Icon,
}: {
  label: string;
  value?: number;
  isLoading?: boolean;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-border bg-slate-50 px-3 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      {isLoading ? (
        <Skeleton className="mt-2 h-7 w-10" />
      ) : (
        <p className="mt-1 text-xl font-semibold tabular-nums">{value ?? 0}</p>
      )}
    </div>
  );
}

function ActivityCard({
  title,
  href,
  items,
  isLoading,
  empty,
  className,
}: {
  title: string;
  href: string;
  items?: Array<{ primary: string; secondary?: string; status?: string }>;
  isLoading?: boolean;
  empty: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-white', className)}>
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Link href={href} className="text-xs font-medium text-amber-700 hover:underline">
          View all
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-2">
        {isLoading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : !items?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.slice(0, 6).map((item, i) => (
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
