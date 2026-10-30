'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PaginationBar } from '@/components/shared/pagination-bar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
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
  Calendar,
  FileText,
  AlertTriangle,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { format } from 'date-fns';
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
  deletedAt?: string;
  deletionReason?: string;
  deletedBy?: string;
};

type FilterTab = 'all' | 'pending_shops' | 'under_review' | 'deleted';

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
  const [deletionReason, setDeletionReason] = useState('');
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
      if (activeTab === 'pending_shops') params.set('tab', 'pending_shops');
      if (activeTab === 'under_review') params.set('underReview', 'true');
      if (activeTab === 'deleted') params.set('tab', 'deleted');

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
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return api(`${endpoints.sellers}/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      toast.success('Seller store deleted successfully');
      setDeleteTarget(null);
      setDeletionReason('');
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

  const [isExporting, setIsExporting] = useState(false);

  const exportToExcel = async () => {
    if (total === 0) {
      toast.error('No store records to export');
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '100',
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (activeTab === 'pending_shops') params.set('tab', 'pending_shops');
      if (activeTab === 'under_review') params.set('underReview', 'true');
      if (activeTab === 'deleted') params.set('tab', 'deleted');

      let allStores: StoreRow[] = [];
      let currentPage = 1;
      let totalPagesToFetch = 1;

      do {
        params.set('page', String(currentPage));
        const res = await api<{ items: StoreRow[]; total: number; totalPages: number }>(
          `${endpoints.sellerStores}?${params}`
        );
        if (res.data?.items) {
          allStores = allStores.concat(res.data.items);
          totalPagesToFetch = res.data.totalPages || 1;
        } else {
          break;
        }
        currentPage++;
      } while (currentPage <= totalPagesToFetch);

      if (!allStores.length) {
        toast.error('No store records returned to export');
        return;
      }

      const headers = [
        'Shop ID',
        'Shop Name',
        'Owner Name',
        'Mobile Number',
        'Category',
        'Shop Type',
        'City',
        'State',
        'Store Status',
        'KYC Status',
        'Total Products',
        'Pending Products',
        'Price Reviews',
        'Custom Requests',
        'Deleted At',
        'Deletion Reason',
        'Deleted By',
      ];

      const escapeCsv = (val: unknown) => {
        if (val === undefined || val === null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const csvRows = allStores.map((s) => [
        escapeCsv(s.formattedShopId || s.shopId || (s.sellerId ? `SH-${s.sellerId.slice(-6).toUpperCase()}` : '')),
        escapeCsv(s.shopName),
        escapeCsv(s.ownerName),
        escapeCsv(s.mobileNumber),
        escapeCsv(s.shopCategory),
        escapeCsv(s.shopType),
        escapeCsv(s.city),
        escapeCsv(s.state),
        escapeCsv(s.sellerStatus),
        escapeCsv(s.onboardingStatus),
        s.productCount ?? 0,
        s.pendingProductRequests ?? 0,
        s.pendingPriceChanges ?? 0,
        s.pendingCustomProductRequests ?? 0,
        escapeCsv(s.deletedAt ? format(new Date(s.deletedAt), 'yyyy-MM-dd HH:mm') : ''),
        escapeCsv(s.deletionReason || ''),
        escapeCsv(s.deletedBy || ''),
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const tabLabel = activeTab === 'all' ? 'active-shops' : activeTab;
      link.setAttribute('download', `stores-${tabLabel}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${allStores.length} stores to Excel`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to export store data');
    } finally {
      setIsExporting(false);
    }
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Sellers / Shops
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Search by shop name, seller name, phone number or shop ID.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-xs font-semibold text-amber-900 shadow-2xs">
              <Store className="h-3.5 w-3.5 text-amber-600" />
              <span>{total} {total === 1 ? 'Shop' : 'Shops'} total</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={isExporting || total === 0}
              className="h-8.5 px-3 gap-1.5 border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-2xs rounded-lg transition-colors"
            >
              {isExporting ? (
                <RotateCcw className="h-3.5 w-3.5 animate-spin text-slate-600" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              )}
              <span>{isExporting ? 'Exporting...' : 'Export Excel'}</span>
            </Button>
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
            All shops (Active)
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('pending_shops')}
            className={`rounded-full px-3.5 py-1 text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'pending_shops'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs hover:bg-amber-400'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50/70 hover:border-amber-200 hover:text-amber-950'
            }`}
          >
            KYC / Pending
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
          <button
            type="button"
            onClick={() => handleTabChange('deleted')}
            className={`rounded-full px-3.5 py-1 text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'deleted'
                ? 'bg-rose-600 text-white font-semibold shadow-xs hover:bg-rose-500'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-rose-50/70 hover:border-rose-200 hover:text-rose-950'
            }`}
          >
            Deleted stores
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
                {activeTab === 'deleted'
                  ? 'No deleted stores found'
                  : activeTab === 'pending_shops'
                  ? 'No pending or KYC verification stores'
                  : hasActiveFilters
                  ? 'No shops match your criteria'
                  : 'No shops available'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeTab === 'deleted'
                  ? 'Stores deleted by admin will appear here with deletion timestamp and reason.'
                  : activeTab === 'pending_shops'
                  ? 'Stores awaiting document or KYC verification will appear here.'
                  : hasActiveFilters
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
              const isStoreDeleted =
                store.sellerStatus?.toLowerCase() === 'deleted' || activeTab === 'deleted';
              const isKycPending =
                !isStoreDeleted &&
                (store.onboardingStatus === 'PENDING_APPROVAL' ||
                  store.onboardingStatus === 'CHANGES_REQUIRED' ||
                  store.onboardingStatus === 'UNDER_REVIEW' ||
                  store.sellerStatus?.toLowerCase() === 'kyc pending');
              const isStoreActive =
                !isStoreDeleted && store.sellerStatus?.toLowerCase() === 'active';
              const isStoreSuspended =
                !isStoreDeleted && store.sellerStatus?.toLowerCase() === 'suspended';

              return (
                <div
                  key={store.sellerId}
                  className={`rounded-xl border p-3.5 sm:px-5 sm:py-3.5 shadow-2xs transition-all hover:shadow-xs ${
                    isStoreDeleted
                      ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    {/* Left: Shop Details */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      {/* Shop Name & Status Tag */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/sellers/stores/${store.sellerId}`}
                          className={`text-base sm:text-lg font-bold transition-colors truncate ${
                            isStoreDeleted
                              ? 'text-slate-800 hover:text-rose-900'
                              : 'text-slate-900 hover:text-amber-800'
                          }`}
                        >
                          {store.shopName}
                        </Link>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            isStoreDeleted
                              ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                              : isKycPending
                              ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-300'
                              : isStoreActive
                              ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-400/60'
                              : isStoreSuspended
                              ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isStoreDeleted
                            ? 'Deleted'
                            : isKycPending
                            ? 'KYC Pending'
                            : store.sellerStatus || 'Active'}
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
                        {!isStoreDeleted && (
                          <>
                            <span>&middot;</span>
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                              <Package className="h-3 w-3 text-slate-400" />
                              {store.productCount ?? 0} {store.productCount === 1 ? 'product' : 'products'}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Deleted Store Metadata Banner */}
                      {isStoreDeleted && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-rose-50 border border-rose-200/80 px-2.5 py-1 text-xs text-rose-950">
                          {store.deletedAt && (
                            <span className="inline-flex items-center gap-1 font-medium text-rose-900">
                              <Calendar className="h-3 w-3 text-rose-600" />
                              <span>
                                Deleted:{' '}
                                {(() => {
                                  try {
                                    return format(new Date(store.deletedAt), 'MMM d, yyyy, h:mm a');
                                  } catch {
                                    return store.deletedAt;
                                  }
                                })()}
                              </span>
                            </span>
                          )}
                          {store.deletionReason && (
                            <span className="inline-flex items-center gap-1 text-rose-900">
                              <FileText className="h-3 w-3 text-rose-600" />
                              <span className="font-semibold">Reason:</span>
                              <span className="italic">{store.deletionReason}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Middle & Right: Under Review Panel + Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 sm:gap-3 shrink-0">
                      {/* Under Review Panel (Only for active / non-deleted stores) */}
                      {!isStoreDeleted && (
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <Link
                            href={`/sellers/stores/${store.sellerId}?tab=pending`}
                            className={`group flex flex-col justify-center rounded-lg border px-3.5 py-1.5 transition-colors min-w-[120px] sm:min-w-[135px] ${
                              (pendingCount + customCount) > 0
                                ? 'border-amber-300 bg-amber-50/70 hover:bg-amber-100/70 hover:border-amber-400 text-amber-950'
                                : 'border-slate-200/80 bg-slate-50/90 hover:bg-slate-100/80 hover:border-slate-300 text-slate-900'
                            }`}
                            title="View items under review"
                          >
                            <span
                              className={`text-base sm:text-lg font-bold tracking-tight leading-tight ${
                                (pendingCount + customCount) > 0
                                  ? 'text-amber-900 group-hover:text-amber-950'
                                  : 'text-slate-900 group-hover:text-amber-700'
                              }`}
                            >
                              {pendingCount + customCount}
                            </span>
                            <span
                              className={`text-[11px] font-medium leading-none mt-0.5 ${
                                (pendingCount + customCount) > 0 ? 'text-amber-800 font-semibold' : 'text-slate-600'
                              }`}
                            >
                              Under review
                            </span>
                          </Link>
                        </div>
                      )}

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
                        {!isStoreDeleted && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setDeleteTarget(store);
                              setDeletionReason('');
                            }}
                            title="Delete store"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
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

      {/* Delete Confirmation Dialog with Reason Input */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeletionReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Delete Seller Store
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs sm:text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900">{deleteTarget?.shopName}</strong> (Owner:{' '}
              {deleteTarget?.ownerName})? This unlinks the seller account, preserves customer/partner
              roles, and archives the store into the &quot;Deleted stores&quot; tab.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Reason for deletion <span className="text-rose-500">*</span>
              </label>
              <Textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Please enter the reason for deleting this store..."
                className="min-h-[85px] text-sm resize-none"
              />
            </div>

            <div>
              <p className="text-[11px] font-medium text-slate-500 mb-1.5">Quick presets:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Merchant requested closure',
                  'Duplicate / Test store',
                  'Policy violation',
                  'Inactive business',
                  'Failed document verification',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDeletionReason(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteTarget(null);
                setDeletionReason('');
              }}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteTarget && deletionReason.trim()) {
                  deleteMutation.mutate({
                    id: deleteTarget.sellerId,
                    reason: deletionReason.trim(),
                  });
                }
              }}
              disabled={!deletionReason.trim() || deleteMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm & Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

