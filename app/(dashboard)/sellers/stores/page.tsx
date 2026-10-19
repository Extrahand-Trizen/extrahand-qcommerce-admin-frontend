'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import {
  Search,
  ExternalLink,
  Trash2,
  Store,
  CheckCircle2,
  AlertCircle,
  Package,
  Clock,
  Layers,
  Copy,
  RotateCcw,
  Building2,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';

export type StoreRow = {
  sellerId: string;
  shopId?: string;
  formattedShopId?: string;
  shopName: string;
  shopType?: string;
  shopCategory?: string;
  city?: string;
  state?: string;
  ownerName: string;
  mobileNumber: string;
  sellerStatus: string;
  onboardingStatus?: string;
  isUnderReview?: boolean;
  productCount: number;
  pendingProductRequests?: number;
  pendingCustomProductRequests?: number;
  pendingPriceChanges?: number;
  rejectedRequests?: number;
};

type FilterTab = 'all' | 'pending_products' | 'custom_requests' | 'under_review';

export default function SellerStoresPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [activeTab, setActiveTab] = useState<FilterTab>(
    (searchParams.get('tab') as FilterTab) || 'all'
  );
  const [page, setPage] = useState(Number(searchParams.get('page') || '1'));
  const [deleteTarget, setDeleteTarget] = useState<StoreRow | null>(null);
  const qc = useQueryClient();

  // Debounce search query to prevent spamming backend
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 280);
    return () => clearTimeout(handler);
  }, [search]);

  // Sync state to URL params for persistent navigation
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (activeTab !== 'all') params.set('tab', activeTab);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    const target = qs ? `/sellers/stores?${qs}` : '/sellers/stores';
    router.replace(target, { scroll: false });
  }, [debouncedSearch, activeTab, page, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['seller-stores', debouncedSearch, activeTab, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (activeTab === 'pending_products') params.set('hasPendingProducts', 'true');
      if (activeTab === 'custom_requests') params.set('hasPendingCustomProducts', 'true');
      if (activeTab === 'under_review') params.set('underReview', 'true');

      const res = await api<{ items: StoreRow[]; total: number; page: number; totalPages: number }>(
        `${endpoints.sellerStores}?${params}`
      );
      return res.data || { items: [], total: 0, page: 1, totalPages: 1 };
    },
  });

  const stores = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api(`${endpoints.sellers}/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Seller store deleted successfully');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['seller-stores'] });
      qc.invalidateQueries({ queryKey: ['seller-approvals'] });
      qc.invalidateQueries({ queryKey: ['sellers'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete seller store'),
  });

  const copyShopId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    toast.success('Shop ID copied to clipboard');
  };

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setActiveTab('all');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search.trim() || activeTab !== 'all');

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Outer Card Frame Matching Layout Reference */}
      <div className="rounded-xl border border-border bg-white p-4 sm:p-6 shadow-sm">
        {/* Header Title & Subtitle */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Sellers / Shops
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Search by shop name, seller name, phone number or shop ID.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-xs font-semibold text-amber-900 shadow-2xs">
            <Store className="h-3.5 w-3.5 text-amber-600" />
            <span>{total} {total === 1 ? 'Shop' : 'Shops'} total</span>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shop, owner or shop ID..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-12 text-sm text-slate-900 placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-amber-800"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pill Tabs Immediately Below Search */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            className={`rounded-full px-3.5 py-1 text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs hover:bg-amber-400'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50/70 hover:border-amber-200 hover:text-amber-950'
            }`}
          >
            All shops
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('pending_products')}
            className={`rounded-full px-3.5 py-1 text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'pending_products'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs hover:bg-amber-400'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50/70 hover:border-amber-200 hover:text-amber-950'
            }`}
          >
            Pending products
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('custom_requests')}
            className={`rounded-full px-3.5 py-1 text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'custom_requests'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs hover:bg-amber-400'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50/70 hover:border-amber-200 hover:text-amber-950'
            }`}
          >
            Custom requests
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('under_review')}
            className={`rounded-full px-3.5 py-1 text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'under_review'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs hover:bg-amber-400'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50/70 hover:border-amber-200 hover:text-amber-950'
            }`}
          >
            Under review
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-800 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        {/* Individual Shop Cards Displayed Vertically as Compact Rows */}
        <div className="mt-4 space-y-2.5">
          {isLoading ? (
            // Sleek Horizontal Skeleton Loading State
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-slate-200 bg-white p-3.5 sm:px-5 sm:py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="h-5 w-48 rounded bg-slate-200" />
                  <div className="h-3.5 w-64 rounded bg-slate-100" />
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-12 w-32 rounded-lg bg-slate-100" />
                  <div className="h-12 w-32 rounded-lg bg-slate-100" />
                  <div className="h-8 w-24 rounded-lg bg-slate-200" />
                </div>
              </div>
            ))
          ) : stores.length === 0 ? (
            // Empty State
            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
              <Store className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-900">
                {hasActiveFilters ? 'No shops match your criteria' : 'No shops available'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasActiveFilters
                  ? 'Try clearing your search term or selecting another filter tab.'
                  : 'Approved seller stores will appear here.'}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="mt-4 gap-1.5 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            // Render Live Compact Shop Cards
            stores.map((store) => {
              const shortId =
                store.formattedShopId || `SH-${store.sellerId.slice(-4).toUpperCase()}`;
              const pendingCount = store.pendingProductRequests ?? 0;
              const customCount = store.pendingCustomProductRequests ?? 0;
              const isUnderReview =
                store.isUnderReview ||
                store.sellerStatus?.toLowerCase().includes('review') ||
                store.onboardingStatus === 'PENDING_APPROVAL';

              return (
                <div
                  key={store.sellerId}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 sm:px-5 sm:py-3.5 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    {/* Left: Shop Details */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      {/* Shop Name & Status Tag */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/sellers/stores/${store.sellerId}`}
                          className="text-base sm:text-lg font-bold text-slate-900 hover:text-amber-800 transition-colors truncate"
                        >
                          {store.shopName}
                        </Link>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isUnderReview
                              ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-300'
                              : store.sellerStatus?.toLowerCase() === 'active'
                              ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-400/60'
                              : store.sellerStatus?.toLowerCase() === 'suspended'
                              ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isUnderReview ? 'Under review' : store.sellerStatus || 'Active'}
                        </span>
                      </div>

                      {/* Owner · Shop ID · Contact · Category */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                        <span className="font-medium text-slate-800">{store.ownerName}</span>
                        <span>&middot;</span>
                        <button
                          type="button"
                          onClick={(e) => copyShopId(store.sellerId, e)}
                          title="Click to copy full Shop ID"
                          className="inline-flex items-center gap-1 font-mono text-slate-600 hover:text-slate-900 hover:underline"
                        >
                          <span>{shortId}</span>
                          <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                        </button>
                        {store.mobileNumber && store.mobileNumber !== '—' && (
                          <>
                            <span className="hidden sm:inline">&middot;</span>
                            <span className="hidden sm:inline-flex items-center gap-1 text-slate-500 font-mono text-xs">
                              <Phone className="h-3 w-3" />
                              {store.mobileNumber}
                            </span>
                          </>
                        )}
                        <span>&middot;</span>
                        <span className="text-slate-500">
                          {store.shopCategory || store.shopType || 'General'}
                        </span>
                        {store.city && (
                          <>
                            <span className="hidden sm:inline">&middot;</span>
                            <span className="hidden sm:inline text-slate-500">{store.city}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Middle & Right: Two Panels + View Shop Button */}
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 sm:gap-3 shrink-0">
                      {/* Two Panels Side-by-Side */}
                      <div className="flex items-center gap-2 sm:gap-2.5">
                        {/* Panel 1: Pending products */}
                        <Link
                          href={`/sellers/stores/${store.sellerId}?tab=pending`}
                          className={`group flex flex-col justify-center rounded-lg border px-3.5 py-1.5 transition-colors min-w-[120px] sm:min-w-[135px] ${
                            pendingCount > 0
                              ? 'border-amber-300 bg-amber-50/70 hover:bg-amber-100/70 hover:border-amber-400 text-amber-950'
                              : 'border-slate-200/80 bg-slate-50/90 hover:bg-slate-100/80 hover:border-slate-300 text-slate-900'
                          }`}
                          title="View pending product requests"
                        >
                          <span className={`text-base sm:text-lg font-bold tracking-tight leading-tight ${
                            pendingCount > 0 ? 'text-amber-900 group-hover:text-amber-950' : 'text-slate-900 group-hover:text-amber-700'
                          }`}>
                            {pendingCount}
                          </span>
                          <span className={`text-[11px] font-medium leading-none mt-0.5 ${
                            pendingCount > 0 ? 'text-amber-800 font-semibold' : 'text-slate-600'
                          }`}>
                            Pending products
                          </span>
                        </Link>

                        {/* Panel 2: Custom requests */}
                        <Link
                          href={`/sellers/stores/${store.sellerId}?tab=custom`}
                          className={`group flex flex-col justify-center rounded-lg border px-3.5 py-1.5 transition-colors min-w-[120px] sm:min-w-[135px] ${
                            customCount > 0
                              ? 'border-amber-300 bg-amber-50/70 hover:bg-amber-100/70 hover:border-amber-400 text-amber-950'
                              : 'border-slate-200/80 bg-slate-50/90 hover:bg-slate-100/80 hover:border-slate-300 text-slate-900'
                          }`}
                          title="View custom product requests"
                        >
                          <span className={`text-base sm:text-lg font-bold tracking-tight leading-tight ${
                            customCount > 0 ? 'text-amber-900 group-hover:text-amber-950' : 'text-slate-900 group-hover:text-amber-700'
                          }`}>
                            {customCount}
                          </span>
                          <span className={`text-[11px] font-medium leading-none mt-0.5 ${
                            customCount > 0 ? 'text-amber-800 font-semibold' : 'text-slate-600'
                          }`}>
                            Custom requests
                          </span>
                        </Link>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          asChild
                          size="sm"
                          className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-1.5 text-xs sm:text-sm shadow-xs border border-amber-400/60"
                        >
                          <Link href={`/sellers/stores/${store.sellerId}`}>
                            View shop
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteTarget(store)}
                          title="Delete store"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Server-Side Pagination Bar */}
        {totalPages > 1 && (
          <div className="mt-5 border-t border-slate-100 pt-3.5">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete seller store?"
        itemName={deleteTarget?.shopName}
        description={
          deleteTarget
            ? `This will permanently delete the store "${deleteTarget.shopName}" (${deleteTarget.ownerName}), including inventory listings and onboarding records. This cannot be undone.`
            : undefined
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.sellerId);
        }}
      />
    </div>
  );
}

