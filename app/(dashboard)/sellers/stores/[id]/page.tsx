'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { InfoCard } from '@/components/shared/info-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { DataTableCard } from '@/components/shared/data-table-card';
import { SearchInput } from '@/components/shared/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StoreLocationMapDialog } from '@/components/sellers/store-location-map-dialog';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  ShoppingBag,
  CreditCard,
  Tag,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
  Trash2,
  Check,
  X,
  Store,
  DollarSign,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { getCategoryLabel, maskAccountNumber, maskAadhaar } from '@/lib/seller-onboarding';
import { format } from 'date-fns';
import { toast } from 'sonner';

type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

type StoreProduct = {
  id: string;
  masterProductId: string;
  name: string;
  brand?: string;
  categoryId: string;
  categoryName: string;
  variant: string;
  imageUrl: string;
  sellingPriceRupees: number;
  compareAtPriceRupees?: number;
  availability: 'available' | 'limited' | 'out_of_stock';
  enabled: boolean;
  stock?: number;
  isCustomProduct?: boolean;
  reviewStatus?: 'approved' | 'pending_review' | 'under_review' | 'rejected' | null;
};

type ProductSubmissionItem = {
  _id: string;
  submittedProductName: string;
  brand?: string;
  description?: string;
  manufacturerName?: string;
  manufacturerAddress?: string;
  packOrSoldAs?: string;
  sellingPricePaise?: number;
  quantity?: number;
  lifespanValue?: number;
  lifespanUnit?: string;
  photoUrl?: string;
  frontImageUrl?: string;
  ingredientsImageUrl?: string;
  images?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED';
  adminComment?: string;
  createdAt: string;
  categoryId?: { _id?: string; name?: string };
  mappedMasterProductId?: { _id?: string; name?: string; status?: string };
};

type PriceReviewItem = {
  _id: string;
  logId?: string;
  masterProductId?: {
    _id?: string;
    name?: string;
    brand?: string;
    categoryName?: string;
    imageUrl?: string;
    sellingPricePaise?: number;
    packOrSoldAs?: string;
    variant?: string;
  };
  unit?: string | null;
  sellingPricePaise: number;
  pendingSellingPricePaise?: number | null;
  pendingUnit?: string | null;
  rejectionReason?: string | null;
  reviewStatus: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PENDING_REVIEW';
  reviewSubmittedAt?: string | null;
  createdAt: string;
};

type ShopOrderItem = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  fulfillmentStatus?: string;
  paymentStatus: string;
  amount: number;
  itemsCount: number;
  items: Array<{ name: string; quantity: number; unitPricePaise?: number; lineTotalPaise?: number; unit?: string }>;
  address?: { name?: string; phone?: string; line1?: string; city?: string };
};

type FinancialSummary = {
  walletBalancePaise?: number;
  walletBalanceRupees?: number;
  pendingPayoutsPaise?: number;
  pendingPayoutsRupees?: number;
  totalEarningsPaise?: number;
  totalEarningsRupees?: number;
  deliveredOrdersCount?: number;
};

function formatAvailability(value: StoreProduct['availability']) {
  if (value === 'available') return 'Available';
  if (value === 'limited') return 'Limited';
  return 'Out of stock';
}

export default function SellerStoreDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  // Active Tab synced with URL
  const activeTab = searchParams.get('tab') || 'overview';
  const handleTabChange = (val: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', val);
    router.replace(`/sellers/stores/${id}?${p.toString()}`, { scroll: false });
  };

  // State for Overview
  const [mapOpen, setMapOpen] = useState(false);
  const [showFullAadhaar, setShowFullAadhaar] = useState(false);
  const [showFullBankAcc, setShowFullBankAcc] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // State for Products Tab
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [deleteListingProduct, setDeleteListingProduct] = useState<StoreProduct | null>(null);

  // State for Custom Submissions Tab
  const [customStatusFilter, setCustomStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('ALL');
  const [customSearch, setCustomSearch] = useState('');
  const [deletingCustomSub, setDeletingCustomSub] = useState<ProductSubmissionItem | null>(null);

  // State for Price Changes Tab
  const [priceStatusFilter, setPriceStatusFilter] = useState<'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL'>('UNDER_REVIEW');
  const [priceSearch, setPriceSearch] = useState('');
  const [rejectPriceModalItem, setRejectPriceModalItem] = useState<PriceReviewItem | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [viewChangesItem, setViewChangesItem] = useState<PriceReviewItem | null>(null);

  // State for Orders Tab
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<ShopOrderItem | null>(null);

  /* ---------------- QUERIES ---------------- */

  // 1. Store Details (always enabled, powers overview and header)
  const { data: storeDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['seller-detail', id],
    queryFn: async () => {
      const res = await api<{
        seller: Record<string, unknown>;
        onboarding: Record<string, unknown> | null;
        documents?: Array<Record<string, unknown>>;
      }>(`${endpoints.sellers}/${id}`);
      return res.data!;
    },
    enabled: !!id,
    staleTime: 60_000,
  });

  // 2. Store Categories (for products tab pills)
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['seller-store-categories', id],
    queryFn: async () => {
      const res = await api<StoreCategory[]>(endpoints.sellerStoreCategories(id));
      return res.data || [];
    },
    enabled: !!id && activeTab === 'products',
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!categories.length) {
      setSelectedCategoryId(null);
      return;
    }
    setSelectedCategoryId((current) => {
      if (current && categories.some((c) => c.id === current)) return current;
      return null;
    });
  }, [categories]);

  // 3. Products in Store (heavy 100-item table, only when on products tab)
  const { data: productsPage, isLoading: productsLoading } = useQuery({
    queryKey: ['seller-store-products', id, selectedCategoryId, productSearch],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: '100' });
      if (selectedCategoryId) p.set('categoryId', selectedCategoryId);
      if (productSearch.trim()) p.set('search', productSearch.trim());
      const res = await api<{ items: StoreProduct[]; total: number }>(
        `${endpoints.sellerStoreProducts(id)}?${p}`,
      );
      return res.data || { items: [], total: 0 };
    },
    enabled: !!id && activeTab === 'products',
    staleTime: 30_000,
  });

  // 3a. Total Products in Store (fast limit=1 count query, always enabled for badge and overview metric)
  const { data: storeProductCountData } = useQuery({
    queryKey: ['seller-store-total-products-count', id],
    queryFn: async () => {
      const res = await api<{ items: StoreProduct[]; total: number }>(
        `${endpoints.sellerStoreProducts(id)}?limit=1`,
      );
      return res.data?.total ?? 0;
    },
    enabled: !!id,
    staleTime: 60_000,
  });

  // 4. Custom Product Submissions for this shop (powers custom requests tab, pending review tab, and overview pending badge)
  const { data: customSubmissions = [], isLoading: customLoading } = useQuery({
    queryKey: ['shop-custom-submissions', id, customStatusFilter, customSearch],
    queryFn: async () => {
      const p = new URLSearchParams({ sellerId: id, limit: '100' });
      if (customStatusFilter !== 'ALL') p.set('status', customStatusFilter);
      if (customSearch.trim()) p.set('search', customSearch.trim());
      const res = await api<{ items: ProductSubmissionItem[] }>(`${endpoints.productSubmissions}?${p}`);
      return res.data?.items || [];
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  // 5. Price & Unit Reviews for this shop (powers price changes tab, pending review tab, and overview pending badge)
  const { data: priceReviewsData, isLoading: priceReviewsLoading } = useQuery({
    queryKey: ['shop-price-reviews', id, priceStatusFilter],
    queryFn: async () => {
      const p = new URLSearchParams({ sellerId: id, limit: '50' });
      if (priceStatusFilter !== 'ALL') p.set('reviewStatus', priceStatusFilter);
      const res = await api<{ items: PriceReviewItem[]; total: number }>(
        `${endpoints.sellerListings}?${p}`,
      );
      return res.data || { items: [], total: 0 };
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  // 6. Shop Orders (powers orders tab and overview delivered orders metric)
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['shop-orders', id, orderStatusFilter, orderSearch],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: '50' });
      if (orderStatusFilter !== 'all') p.set('status', orderStatusFilter);
      if (orderSearch.trim()) p.set('search', orderSearch.trim());
      const res = await api<{ items: ShopOrderItem[]; total: number }>(
        `${endpoints.sellerStoreOrders(id)}?${p}`,
      );
      return res.data || { items: [], total: 0 };
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  // 7. Shop Financial Summary & Payouts (deferred to payouts tab to eliminate synchronous ledger reconciliation on initial mount)
  const { data: financialSummary, isLoading: financialLoading } = useQuery({
    queryKey: ['shop-financial-summary', id],
    queryFn: async () => {
      const res = await api<FinancialSummary>(endpoints.sellerFinancialSummary(id));
      return res.data || {};
    },
    enabled: !!id && activeTab === 'payouts',
    staleTime: 60_000,
  });

  const { data: payoutsList = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ['shop-payouts', id],
    queryFn: async () => {
      const res = await api<{ items: Array<Record<string, any>> }>(endpoints.sellerPayoutsById(id));
      return res.data?.items || [];
    },
    enabled: !!id && activeTab === 'payouts',
    staleTime: 60_000,
  });

  const { data: settlementsList = [], isLoading: settlementsLoading } = useQuery({
    queryKey: ['shop-settlements', id],
    queryFn: async () => {
      const res = await api<{ items: Array<Record<string, any>> }>(endpoints.sellerSettlementsById(id));
      return res.data?.items || [];
    },
    enabled: !!id && activeTab === 'payouts',
    staleTime: 60_000,
  });

  /* ---------------- MUTATIONS ---------------- */

  const deleteMutation = useMutation({
    mutationFn: async () => api(`${endpoints.sellers}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Seller store deleted successfully');
      qc.invalidateQueries({ queryKey: ['seller-stores'] });
      qc.invalidateQueries({ queryKey: ['seller-approvals'] });
      qc.invalidateQueries({ queryKey: ['sellers'] });
      router.push('/sellers/stores');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete store'),
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (listingId: string) => api(`${endpoints.sellerListings}/${listingId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Product removed from store successfully');
      setDeleteListingProduct(null);
      qc.invalidateQueries({ queryKey: ['seller-store-products', id] });
      qc.invalidateQueries({ queryKey: ['seller-store-categories', id] });
      qc.invalidateQueries({ queryKey: ['seller-store-total-products-count', id] });
      qc.invalidateQueries({ queryKey: ['seller-stores'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to remove product from store'),
  });

  const deleteCustomSubMutation = useMutation({
    mutationFn: async (subId: string) =>
      api(`${endpoints.productSubmissions}/${subId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Custom product deleted from store and catalogue');
      setDeletingCustomSub(null);
      qc.invalidateQueries({ queryKey: ['shop-custom-submissions', id] });
      qc.invalidateQueries({ queryKey: ['seller-store-products', id] });
      qc.invalidateQueries({ queryKey: ['seller-store-total-products-count', id] });
      qc.invalidateQueries({ queryKey: ['master-products'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete custom product'),
  });

  const approvePriceMutation = useMutation({
    mutationFn: async (listingId: string) => api(`${endpoints.sellerListings}/${listingId}/approve`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Price changes approved and published live!');
      setViewChangesItem(null);
      qc.invalidateQueries({ queryKey: ['shop-price-reviews', id] });
      qc.invalidateQueries({ queryKey: ['seller-store-products', id] });
      qc.invalidateQueries({ queryKey: ['seller-store-total-products-count', id] });
      qc.invalidateQueries({ queryKey: ['seller-stores'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to approve changes'),
  });

  const rejectPriceMutation = useMutation({
    mutationFn: async ({ listingId, reason }: { listingId: string; reason: string }) => {
      return api(`${endpoints.sellerListings}/${listingId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      toast.success('Request rejected and notification sent to seller!');
      setRejectPriceModalItem(null);
      setViewChangesItem(null);
      setRejectionReasonInput('');
      qc.invalidateQueries({ queryKey: ['shop-price-reviews', id] });
      qc.invalidateQueries({ queryKey: ['seller-stores'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to reject changes'),
  });

  /* ---------------- DERIVED STATE ---------------- */

  const seller = storeDetail?.seller || {};
  const onboarding = storeDetail?.onboarding || {};
  const documents = (storeDetail?.documents || []) as Array<Record<string, unknown>>;
  const isValidWebUrl = (url?: unknown): string | null => {
    if (!url || typeof url !== 'string') return null;
    const s = url.trim();
    if (!s) return null;
    if (
      s.startsWith('file://') ||
      s.startsWith('content://') ||
      s.startsWith('ph://') ||
      s.startsWith('/data/user/')
    ) {
      return null;
    }
    return s;
  };

  const aadhaarDoc = documents.find((d) =>
    ['AADHAAR_CARD', 'AADHAAR', 'AADHAR_CARD', 'AADHAR', 'AADHAAR_DOCUMENT', 'KYC_DOCUMENT'].includes(
      String(d.documentType || '').toUpperCase().replace(/[- ]/g, '_'),
    ),
  );
  const aadhaarFileUrl =
    isValidWebUrl(aadhaarDoc?.fileUrl) ||
    isValidWebUrl(onboarding.aadhaarCardUrl) ||
    isValidWebUrl(onboarding.aadhaarDocumentUri);

  const selfieDoc = documents.find((d) =>
    ['SELFIE', 'LIVE_SELFIE', 'SELLER_SELFIE', 'OWNER_SELFIE'].includes(
      String(d.documentType || '').toUpperCase().replace(/[- ]/g, '_'),
    ),
  );
  const selfieFileUrl =
    isValidWebUrl(selfieDoc?.fileUrl) ||
    isValidWebUrl(onboarding.kycSelfieUri) ||
    isValidWebUrl(onboarding.selfieUrl) ||
    isValidWebUrl((seller as any)?.photoURL) ||
    null;

  const products = productsPage?.items || [];
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId],
  );

  const categoriesTotal = useMemo(
    () => categories.reduce((sum, c) => sum + (c.productCount || 0), 0),
    [categories],
  );

  const totalStoreProducts =
    storeProductCountData ??
    (categories.length > 0 ? categoriesTotal : (selectedCategoryId === null ? productsPage?.total : 0) ?? 0);

  const priceReviewItems = priceReviewsData?.items || [];
  const pendingCustomCount = customSubmissions.filter((s) => s.status === 'PENDING').length;
  const pendingPriceCount = priceReviewItems.filter((i) => i.reviewStatus === 'UNDER_REVIEW' || i.reviewStatus === 'PENDING_REVIEW').length;
  const totalPendingForShop = pendingCustomCount + pendingPriceCount;

  if (detailLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!storeDetail?.onboarding) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <p className="text-lg font-medium text-slate-900">Store not found</p>
        <p className="text-sm text-muted-foreground">The requested store profile does not exist or has been deleted.</p>
        <Link href="/sellers/stores" className="text-sm font-medium text-amber-700 hover:underline">
          &larr; Back to all stores
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Shop Header */}
      <div className="space-y-3">
        <Link
          href="/sellers/stores"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-amber-800 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all stores
        </Link>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {String(onboarding.shopName || 'Store Profile')}
              </h1>
              <StatusBadge status={String(seller.status || 'ACTIVE')} />
              {totalPendingForShop > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-900 border border-slate-300">
                  <Clock className="h-3 w-3 text-slate-700" />
                  {totalPendingForShop} Pending Action{totalPendingForShop === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono bg-slate-100 border border-slate-200 text-slate-900 px-2 py-0.5 rounded font-medium">
                Shop ID: {id}
              </span>
              <span>&bull;</span>
              <span>{getCategoryLabel(String(onboarding.category || onboarding.shopType || ''))}</span>
              <span>&bull;</span>
              <span>
                {[onboarding.city, onboarding.state].filter(Boolean).join(', ') || 'Location unset'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-xs border border-amber-400/60">
              <Link href={`/sellers/approvals/${id}`}>
                <FileText className="h-4 w-4 text-slate-950" />
                KYC &amp; Documents
              </Link>
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
              className="gap-1.5 bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              <Trash2 className="h-4 w-4" />
              Delete Store
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-slate-100/80 p-1 border border-border">
          <TabsTrigger value="overview" className="gap-1.5 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <Store className="h-3.5 w-3.5" />
            Shop Overview
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <Package className="h-3.5 w-3.5" />
            Products
            {totalStoreProducts > 0 ? (
              <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-900 border border-slate-200 shadow-2xs">
                {totalStoreProducts}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <AlertCircle className="h-3.5 w-3.5" />
            Pending Review
            {totalPendingForShop > 0 ? (
              <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-900 border border-slate-200 shadow-2xs">
                {totalPendingForShop}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-1.5 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <Layers className="h-3.5 w-3.5" />
            Custom Product Requests
            {pendingCustomCount > 0 ? (
              <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-900 border border-slate-200 shadow-2xs">
                {pendingCustomCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="price-changes" className="gap-1.5 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <Tag className="h-3.5 w-3.5" />
            Price / Unit Changes
            {pendingPriceCount > 0 ? (
              <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-900 border border-slate-200 shadow-2xs">
                {pendingPriceCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <ShoppingBag className="h-3.5 w-3.5" />
            Orders
            {ordersData?.total ? (
              <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-900 border border-slate-200 shadow-2xs">
                {ordersData.total}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="payouts" className="gap-1.5 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <CreditCard className="h-3.5 w-3.5" />
            Payouts &amp; Finance
          </TabsTrigger>
        </TabsList>

        {/* =================================================================== */}
        {/* TAB 1: SHOP OVERVIEW */}
        {/* =================================================================== */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Metrics Summary */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Total Listed Products</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totalStoreProducts}</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Pending Custom Products</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{pendingCustomCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Pending Price Changes</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{pendingPriceCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Delivered Orders</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{financialSummary?.deliveredOrdersCount ?? ordersData?.total ?? 0}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <InfoCard
              title="Store Details"
              items={[
                ['Shop Name', onboarding.shopName],
                ['Category', getCategoryLabel(String(onboarding.category || onboarding.shopType || ''))],
                [
                  'Subcategories',
                  Array.isArray(onboarding.subcategories) && onboarding.subcategories.length
                    ? (onboarding.subcategories as string[]).join(', ')
                    : (onboarding.subcategory as string) || '—',
                ],
                ['Description', onboarding.shopDescription || '—'],
                ['Shop Mobile', onboarding.shopMobileNumber || '—'],
                ['Shop Email', onboarding.shopEmail || '—'],
                [
                  'Operating Timings',
                  onboarding.openingHours
                    ? typeof onboarding.openingHours === 'string'
                      ? onboarding.openingHours
                      : `${(onboarding.openingHours as any).open || ''} - ${(onboarding.openingHours as any).close || ''} (${((onboarding.openingHours as any).days || []).join(', ')})`
                    : '—',
                ],
              ]}
            />

            {(() => {
              const rawLat = onboarding.latitude;
              const rawLng = onboarding.longitude;
              const lat = typeof rawLat === 'number' ? rawLat : (rawLat ? parseFloat(String(rawLat)) : null);
              const lng = typeof rawLng === 'number' ? rawLng : (rawLng ? parseFloat(String(rawLng)) : null);
              const hasCoordinates = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

              return (
                <>
                  <InfoCard
                    title="Owner & Location"
                    items={[
                      ['Owner Name', onboarding.fullName],
                      ['Mobile Number', onboarding.mobileNumber],
                      ['Email', onboarding.email || '—'],
                      ['Address', onboarding.address || '—'],
                      ['Street / Road', onboarding.streetRoad || '—'],
                      ['Area / Landmark', onboarding.area || '—'],
                      ['City', onboarding.city || '—'],
                      ['State', onboarding.state || '—'],
                      ['Pincode', onboarding.pincode || '—'],
                      ...(hasCoordinates ? ([['Coordinates', `${lat.toFixed(6)}, ${lng.toFixed(6)}`]] as Array<[string, unknown]>) : []),
                    ]}
                    action={
                      hasCoordinates ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMapOpen(true)}
                          className="h-8 gap-1.5 border-amber-300 bg-amber-50/60 font-medium text-amber-900 hover:bg-amber-100 hover:text-amber-950"
                        >
                          <MapPin className="h-3.5 w-3.5 text-amber-600" />
                          View on Map
                        </Button>
                      ) : null
                    }
                  />
                  {hasCoordinates ? (
                    <StoreLocationMapDialog
                      open={mapOpen}
                      onOpenChange={setMapOpen}
                      shopName={String(onboarding.shopName || '')}
                      ownerName={String(onboarding.fullName || '')}
                      address={String(onboarding.address || '')}
                      area={String(onboarding.area || '')}
                      city={String(onboarding.city || '')}
                      state={String(onboarding.state || '')}
                      pincode={String(onboarding.pincode || '')}
                      latitude={lat}
                      longitude={lng}
                    />
                  ) : null}
                </>
              );
            })()}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <InfoCard
              title="KYC & Identity Verification"
              items={[
                [
                  'Aadhaar Number',
                  <div className="flex items-center gap-2" key="aadhaar-val">
                    <span className="font-mono text-sm">
                      {onboarding.aadhaarNumber
                        ? (showFullAadhaar ? String(onboarding.aadhaarNumber) : maskAadhaar(String(onboarding.aadhaarNumber)))
                        : onboarding.aadhaarVerificationStatus === 'VERIFIED'
                        ? 'Verified via Document Images'
                        : '—'}
                    </span>
                    {onboarding.aadhaarNumber ? (
                      <button
                        type="button"
                        onClick={() => setShowFullAadhaar(!showFullAadhaar)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        title={showFullAadhaar ? 'Hide Aadhaar' : 'Show Aadhaar'}
                      >
                        {showFullAadhaar ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    ) : null}
                  </div>,
                ],
                [
                  'Aadhaar Status',
                  onboarding.aadhaarVerificationStatus ? (
                    <StatusBadge status={String(onboarding.aadhaarVerificationStatus)} />
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                      PENDING
                    </span>
                  ),
                ],
                [
                  'Aadhaar Document',
                  aadhaarFileUrl ? (
                    <a
                      key="aadhaar-doc-link"
                      href={aadhaarFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View Uploaded Card ({String(aadhaarDoc?.verificationStatus || 'PENDING')})
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No document image attached</span>
                  ),
                ],
                ['PAN Number', (onboarding.pan as string) || (onboarding.panNumber as string) || '—'],
                ['PAN Status', onboarding.panVerificationStatus ? <StatusBadge status={String(onboarding.panVerificationStatus)} /> : '—'],
                ['PAN Holder Name', (onboarding.panVerifiedName as string) || (onboarding.panHolderName as string) || '—'],
                ['GSTIN', (onboarding.gstin as string) || (onboarding.gstinNumber as string) || '—'],
                ['GST Legal Name', (onboarding.gstinVerifiedLegalName as string) || (onboarding.gstLegalName as string) || '—'],
                [
                  'Live Selfie',
                  selfieFileUrl ? (
                    <div className="flex items-center gap-2" key="selfie-doc-preview">
                      <div className="relative h-8 w-8 shrink-0 rounded-full overflow-hidden border border-emerald-500 bg-slate-900">
                        <img
                          src={selfieFileUrl}
                          alt="Seller Selfie"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <a
                        href={selfieFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Live Selfie
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic" key="no-selfie">No selfie image attached</span>
                  ),
                ],
              ]}
              action={
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-amber-700 hover:text-amber-800">
                  <Link href={`/sellers/approvals/${id}`}>
                    View Licences &amp; Documents &rarr;
                  </Link>
                </Button>
              }
            />

            {(() => {
              const rawBank = onboarding.bankAccount as Record<string, unknown> | undefined;
              const storeBank = (seller as any)?.storeSettings?.bankAccount as Record<string, unknown> | undefined;
              const bank = rawBank?.accountNumber ? rawBank : (storeBank?.accountNumber ? storeBank : rawBank || storeBank);
              const hasBank = !!(bank?.accountNumber || bank?.ifscCode);
              const passbookUrl = (bank?.passbookImageUrl || bank?.passbookUri || bank?.passbookProofUrl || bank?.bankStatementUrl || bank?.cancelledChequeUrl) as string | undefined;

              return (
                <InfoCard
                  title="Bank & Settlement Account"
                  items={
                    hasBank
                      ? [
                          ['Account Holder', bank?.accountHolderName || onboarding.fullName || '—'],
                          ['Bank Name', bank?.bankName || '—'],
                          [
                            'Account Number',
                            <div className="flex items-center gap-2" key="acc-num">
                              <span className="font-mono text-sm">
                                {bank?.accountNumber
                                  ? (showFullBankAcc ? String(bank.accountNumber) : maskAccountNumber(String(bank.accountNumber)))
                                  : '—'}
                              </span>
                              {bank?.accountNumber ? (
                                <button
                                  type="button"
                                  onClick={() => setShowFullBankAcc(!showFullBankAcc)}
                                  className="text-muted-foreground transition-colors hover:text-foreground"
                                  title={showFullBankAcc ? 'Hide Account' : 'Show Account'}
                                >
                                  {showFullBankAcc ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              ) : null}
                            </div>,
                          ],
                          ['IFSC Code', bank?.ifscCode ? <span className="font-mono font-medium">{String(bank.ifscCode).toUpperCase()}</span> : '—'],
                          ['Verification Status', bank?.verificationStatus ? <StatusBadge status={String(bank.verificationStatus)} /> : <StatusBadge status="verified" />],
                          ...(passbookUrl
                            ? ([
                                [
                                  'Passbook / Cheque',
                                  <a
                                    key="passbook-link"
                                    href={passbookUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    View Document Proof
                                  </a>,
                                ],
                              ] as Array<[string, unknown]>)
                            : []),
                        ]
                      : [
                          [
                            'Settlement Account',
                            <div key="bank-empty" className="flex items-center gap-2 text-xs text-amber-800">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                              <span>No bank account recorded for this store yet.</span>
                            </div>,
                          ],
                        ]
                  }
                />
              );
            })()}
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 2: SHOP PRODUCTS */}
        {/* =================================================================== */}
        <TabsContent value="products" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Store Catalogue Categories</CardTitle>
              <p className="text-sm text-muted-foreground">
                Categories in this shop. Select a category to inspect its listed products.
              </p>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-24 rounded-full" />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">This store has no listed products yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(null)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      selectedCategoryId === null
                        ? 'border-amber-400 bg-amber-50 text-amber-900 ring-1 ring-amber-300'
                        : 'border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    All Products
                    <span className="ml-1.5 text-[11px] opacity-75">({totalStoreProducts})</span>
                  </button>
                  {categories.map((c) => {
                    const active = c.id === selectedCategoryId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(c.id)}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          active
                            ? 'border-amber-400 bg-amber-50 text-amber-900 ring-1 ring-amber-300'
                            : 'border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {c.name}
                        <span className="ml-1.5 text-[11px] opacity-75">({c.productCount})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <DataTableCard
            toolbar={
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedCategory?.name || 'All Store Products'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {productSearch.trim()
                      ? `${productsPage?.total ?? 0} result${(productsPage?.total ?? 0) === 1 ? '' : 's'} matching "${productSearch.trim()}" · ${totalStoreProducts} total in store`
                      : selectedCategory
                      ? `${productsPage?.total ?? 0} product${(productsPage?.total ?? 0) === 1 ? '' : 's'} in ${selectedCategory.name} · ${totalStoreProducts} total in store`
                      : `${totalStoreProducts} product${totalStoreProducts === 1 ? '' : 's'} listed in this store`}
                  </p>
                </div>
                <SearchInput
                  value={productSearch}
                  onChange={setProductSearch}
                  placeholder="Search products in this store..."
                  className="sm:max-w-xs"
                />
              </div>
            }
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[60px]">Image</TableHead>
                  <TableHead>Product Name &amp; IDs</TableHead>
                  <TableHead>Category / Variant</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Listing Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsLoading ? (
                  <TableLoadingRows cols={8} />
                ) : !products.length ? (
                  <TableEmptyRow cols={8} message="No products found in this store" />
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-11 w-11 rounded-md border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-muted text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-900 text-sm">{product.name}</p>
                          {product.brand ? (
                            <p className="text-xs text-muted-foreground">{product.brand}</p>
                          ) : null}
                          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                            <span>Listing: {product.id.slice(-6)}</span>
                            {product.masterProductId && (
                              <span>Master: {product.masterProductId.slice(-6)}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <p className="text-slate-800">{product.categoryName || '—'}</p>
                          <p className="text-muted-foreground">{product.variant || 'Standard'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold text-slate-900">₹{product.sellingPriceRupees.toFixed(2)}</p>
                          {product.compareAtPriceRupees ? (
                            <p className="text-xs text-muted-foreground line-through">
                              ₹{product.compareAtPriceRupees.toFixed(2)}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-slate-800">
                        {product.stock ?? '—'}
                      </TableCell>
                      <TableCell>{formatAvailability(product.availability)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={product.enabled ? 'ACTIVE' : 'INACTIVE'} />
                          {product.isCustomProduct && (
                            <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                              Custom Product
                            </span>
                          )}
                          {product.reviewStatus === 'pending_review' || product.reviewStatus === 'under_review' ? (
                            <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                              Pending Review
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Remove product from store"
                          onClick={() => setDeleteListingProduct(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DataTableCard>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 3: PENDING REVIEW TAB */}
        {/* =================================================================== */}
        <TabsContent value="pending" className="space-y-6">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-slate-900 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Shop Approval Queue ({totalPendingForShop} Pending)
                </h3>
                <p className="text-xs text-slate-700 mt-0.5">
                  Showing custom products and price/unit changes submitted by <strong className="text-slate-900 font-semibold">{String(onboarding.shopName)}</strong> awaiting review.
                </p>
              </div>
            </div>
          </div>

          {/* Pending Custom Products Section */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-900" />
              Pending Custom Product Requests ({pendingCustomCount})
            </h3>
            <DataTableCard>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[60px]">Photo</TableHead>
                    <TableHead>Submitted Product</TableHead>
                    <TableHead>Category / Brand</TableHead>
                    <TableHead>Pack / Net</TableHead>
                    <TableHead>Requested Price</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customLoading ? (
                    <TableLoadingRows cols={7} />
                  ) : !customSubmissions.filter((s) => s.status === 'PENDING').length ? (
                    <TableEmptyRow cols={7} message="No pending custom product requests for this shop" />
                  ) : (
                    customSubmissions
                      .filter((s) => s.status === 'PENDING')
                      .map((sub) => (
                        <TableRow key={sub._id}>
                          <TableCell>
                            {sub.photoUrl || sub.frontImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={sub.photoUrl || sub.frontImageUrl}
                                alt={sub.submittedProductName}
                                className="h-10 w-10 rounded border object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                —
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-slate-900 text-sm">{sub.submittedProductName}</p>
                            {sub.manufacturerName ? (
                              <p className="text-xs text-muted-foreground">{sub.manufacturerName}</p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5 text-xs">
                              <p className="font-medium">{sub.categoryId?.name || 'Category'}</p>
                              <p className="text-muted-foreground">{sub.brand || 'No brand'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-700">{sub.packOrSoldAs || '—'}</TableCell>
                          <TableCell className="font-bold text-slate-900 text-sm">
                            ₹{sub.sellingPricePaise != null ? (sub.sellingPricePaise / 100).toFixed(2) : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sub.createdAt ? format(new Date(sub.createdAt), 'MMM d, yyyy') : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700 text-white">
                              <Link href={`/product-submissions/${sub._id}`}>Review Request</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </DataTableCard>
          </div>

          {/* Pending Price & Unit Changes Section */}
          <div className="space-y-3 pt-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Tag className="h-4 w-4 text-slate-900" />
              Pending Price &amp; Unit Changes ({pendingPriceCount})
            </h3>
            <DataTableCard>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Product</TableHead>
                    <TableHead>Current Live Price / Unit</TableHead>
                    <TableHead>Requested Pending Changes</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceReviewsLoading ? (
                    <TableLoadingRows cols={5} />
                  ) : !priceReviewItems.filter((i) => i.reviewStatus === 'UNDER_REVIEW' || i.reviewStatus === 'PENDING_REVIEW').length ? (
                    <TableEmptyRow cols={5} message="No pending price / unit change requests for this shop" />
                  ) : (
                    priceReviewItems
                      .filter((i) => i.reviewStatus === 'UNDER_REVIEW' || i.reviewStatus === 'PENDING_REVIEW')
                      .map((item) => (
                        <TableRow key={item._id}>
                          <TableCell>
                            <p className="font-semibold text-slate-900 text-sm">
                              {item.masterProductId?.name || 'Product'}
                            </p>
                            <p className="text-xs text-muted-foreground">{item.masterProductId?.brand || ''}</p>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5 text-xs">
                              <p className="font-semibold text-slate-800">₹{(item.sellingPricePaise / 100).toFixed(2)}</p>
                              <p className="text-muted-foreground">Unit: {item.unit || item.masterProductId?.variant || 'Standard'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {item.pendingSellingPricePaise != null && item.pendingSellingPricePaise !== item.sellingPricePaise && (
                                <span className="rounded bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                                  Price
                                </span>
                              )}
                              {item.pendingUnit && item.pendingUnit.trim().toLowerCase() !== (item.unit || item.masterProductId?.variant || 'Standard').trim().toLowerCase() && (
                                <span className="rounded bg-blue-100 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                                  Unit
                                </span>
                              )}
                              {!(item.pendingSellingPricePaise != null && item.pendingSellingPricePaise !== item.sellingPricePaise) &&
                               !(item.pendingUnit && item.pendingUnit.trim().toLowerCase() !== (item.unit || item.masterProductId?.variant || 'Standard').trim().toLowerCase()) && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.reviewSubmittedAt || item.createdAt
                              ? format(new Date(item.reviewSubmittedAt || item.createdAt), 'MMM d, yyyy')
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
                                onClick={() => setViewChangesItem(item)}
                              >
                                Review Request
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => approvePriceMutation.mutate(item._id)}
                                disabled={approvePriceMutation.isPending}
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => setRejectPriceModalItem(item)}
                              >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </DataTableCard>
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 4: CUSTOM PRODUCT REQUESTS TAB */}
        {/* =================================================================== */}
        <TabsContent value="custom" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={customStatusFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCustomStatusFilter('ALL')}
              >
                All Submissions
              </Button>
              <Button
                variant={customStatusFilter === 'PENDING' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCustomStatusFilter('PENDING')}
              >
                Pending Review
              </Button>
              <Button
                variant={customStatusFilter === 'APPROVED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCustomStatusFilter('APPROVED')}
              >
                Approved
              </Button>
              <Button
                variant={customStatusFilter === 'REJECTED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCustomStatusFilter('REJECTED')}
              >
                Rejected
              </Button>
            </div>
            <SearchInput
              value={customSearch}
              onChange={setCustomSearch}
              placeholder="Search custom requests..."
              className="sm:max-w-xs"
            />
          </div>

          <DataTableCard>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[60px]">Photo</TableHead>
                  <TableHead>Custom Product Name</TableHead>
                  <TableHead>Category / Brand</TableHead>
                  <TableHead>Pack / Sold As</TableHead>
                  <TableHead>Lifespan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customLoading ? (
                  <TableLoadingRows cols={8} />
                ) : !customSubmissions.length ? (
                  <TableEmptyRow cols={8} message="No custom product requests found for this shop" />
                ) : (
                  customSubmissions.map((sub) => (
                    <TableRow key={sub._id}>
                      <TableCell>
                        {sub.photoUrl || sub.frontImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sub.photoUrl || sub.frontImageUrl}
                            alt={sub.submittedProductName}
                            className="h-10 w-10 rounded border object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-slate-900 text-sm">{sub.submittedProductName}</p>
                        {sub.manufacturerName ? (
                          <p className="text-xs text-muted-foreground">{sub.manufacturerName}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <p className="font-medium text-slate-800">{sub.categoryId?.name || 'Category'}</p>
                          <p className="text-muted-foreground">{sub.brand || 'No brand'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">{sub.packOrSoldAs || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-700 font-medium">
                        {sub.lifespanValue != null ? `${sub.lifespanValue} ${sub.lifespanUnit || 'Days'}` : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sub.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {sub.createdAt ? format(new Date(sub.createdAt), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/product-submissions/${sub._id}`}>Review</Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Delete custom product"
                            onClick={() => setDeletingCustomSub(sub)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DataTableCard>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 5: PRICE & UNIT CHANGES TAB */}
        {/* =================================================================== */}
        <TabsContent value="price-changes" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={priceStatusFilter === 'UNDER_REVIEW' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriceStatusFilter('UNDER_REVIEW')}
              >
                Under Review
              </Button>
              <Button
                variant={priceStatusFilter === 'APPROVED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriceStatusFilter('APPROVED')}
              >
                Approved Changes
              </Button>
              <Button
                variant={priceStatusFilter === 'REJECTED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriceStatusFilter('REJECTED')}
              >
                Rejected
              </Button>
              <Button
                variant={priceStatusFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriceStatusFilter('ALL')}
              >
                All Price Logs
              </Button>
            </div>
            <SearchInput
              value={priceSearch}
              onChange={setPriceSearch}
              placeholder="Search product price changes..."
              className="sm:max-w-xs"
            />
          </div>

          <DataTableCard>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Product Name</TableHead>
                  <TableHead>Current Live Price / Unit</TableHead>
                  <TableHead>Requested Pending Values</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceReviewsLoading ? (
                  <TableLoadingRows cols={6} />
                ) : !priceReviewItems.length ? (
                  <TableEmptyRow cols={6} message="No price or unit change records found for this shop" />
                ) : (
                  priceReviewItems.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell>
                        <p className="font-semibold text-slate-900 text-sm">
                          {item.masterProductId?.name || 'Product'}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.masterProductId?.brand || ''}</p>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <p className="font-semibold text-slate-800">₹{(item.sellingPricePaise / 100).toFixed(2)}</p>
                          <p className="text-muted-foreground">Unit: {item.unit || item.masterProductId?.variant || 'Standard'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.pendingSellingPricePaise != null && item.pendingSellingPricePaise !== item.sellingPricePaise && (
                            <span className="rounded bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                              Price
                            </span>
                          )}
                          {item.pendingUnit && item.pendingUnit.trim().toLowerCase() !== (item.unit || item.masterProductId?.variant || 'Standard').trim().toLowerCase() && (
                            <span className="rounded bg-blue-100 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                              Unit
                            </span>
                          )}
                          {!(item.pendingSellingPricePaise != null && item.pendingSellingPricePaise !== item.sellingPricePaise) &&
                           !(item.pendingUnit && item.pendingUnit.trim().toLowerCase() !== (item.unit || item.masterProductId?.variant || 'Standard').trim().toLowerCase()) && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.reviewStatus} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.reviewSubmittedAt || item.createdAt
                          ? format(new Date(item.reviewSubmittedAt || item.createdAt), 'MMM d, yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.reviewStatus === 'UNDER_REVIEW' || item.reviewStatus === 'PENDING_REVIEW' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs"
                              onClick={() => setViewChangesItem(item)}
                            >
                              Review Request
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => approvePriceMutation.mutate(item._id)}
                              disabled={approvePriceMutation.isPending}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => setRejectPriceModalItem(item)}
                            >
                              <X className="mr-1 h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => setViewChangesItem(item)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View Details
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DataTableCard>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 6: SHOP ORDERS TAB */}
        {/* =================================================================== */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={orderSearch}
              onChange={setOrderSearch}
              placeholder="Search by order #, customer name, phone..."
              className="sm:max-w-md"
            />
            <div className="flex items-center gap-2">
              <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Order Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="open">Open / In Progress</SelectItem>
                  <SelectItem value="completed">Completed / Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled / Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DataTableCard>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Order #</TableHead>
                  <TableHead>Date &amp; Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Fulfilment</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading ? (
                  <TableLoadingRows cols={8} />
                ) : !ordersData?.items?.length ? (
                  <TableEmptyRow cols={8} message="No orders recorded for this shop" />
                ) : (
                  ordersData.items.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-medium text-slate-900 text-xs">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {order.createdAt ? format(new Date(order.createdAt), 'MMM d, yyyy h:mm a') : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p className="font-semibold text-slate-900">{order.address?.name || 'Customer'}</p>
                          <p className="text-muted-foreground font-mono">{order.address?.phone || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {order.itemsCount} item{order.itemsCount === 1 ? '' : 's'}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 text-sm">
                        ₹{order.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.paymentStatus} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.fulfillmentStatus || order.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOrderDetails(order)}
                          className="h-8 text-xs"
                        >
                          View Order
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DataTableCard>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 7: PAYOUTS & FINANCE TAB */}
        {/* =================================================================== */}
        <TabsContent value="payouts" className="space-y-6">
          {/* Financial Metrics */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Wallet Balance</p>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              {financialLoading ? (
                <Skeleton className="mt-2 h-8 w-24" />
              ) : (
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  ₹{((financialSummary?.walletBalanceRupees ?? ((financialSummary?.walletBalancePaise ?? 0) / 100)) || 0).toFixed(2)}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Pending Payouts</p>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              {financialLoading ? (
                <Skeleton className="mt-2 h-8 w-24" />
              ) : (
                <p className="mt-2 text-2xl font-bold text-amber-700">
                  ₹{((financialSummary?.pendingPayoutsRupees ?? ((financialSummary?.pendingPayoutsPaise ?? 0) / 100)) || 0).toFixed(2)}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Total Lifetime Earnings</p>
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
              {financialLoading ? (
                <Skeleton className="mt-2 h-8 w-24" />
              ) : (
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  ₹{((financialSummary?.totalEarningsRupees ?? ((financialSummary?.totalEarningsPaise ?? 0) / 100)) || 0).toFixed(2)}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Delivered Orders</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              {financialLoading ? (
                <Skeleton className="mt-2 h-8 w-16" />
              ) : (
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {financialSummary?.deliveredOrdersCount ?? 0}
                </p>
              )}
            </div>
          </div>

          {/* Payout History for this shop */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-slate-700" />
              Shop Payout History
            </h3>
            <DataTableCard>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Payout Reference</TableHead>
                    <TableHead>Date Initiated</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Destination Bank</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutsLoading ? (
                    <TableLoadingRows cols={5} />
                  ) : !payoutsList.length ? (
                    <TableEmptyRow cols={5} message="No payout transfers recorded for this shop yet" />
                  ) : (
                    payoutsList.map((payout: any) => (
                      <TableRow key={payout._id || payout.id}>
                        <TableCell className="font-mono text-xs font-medium text-slate-900">
                          {payout.referenceId || payout._id?.slice(-8) || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {payout.createdAt ? format(new Date(payout.createdAt), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 text-sm">
                          ₹{((payout.amountPaise || 0) / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          {payout.bankAccount?.bankName || 'Registered Account'} (***{String(payout.bankAccount?.accountNumber || '').slice(-4)})
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={payout.status || 'PROCESSED'} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </DataTableCard>
          </div>

          {/* Settlements / Ledger */}
          <div className="space-y-3 pt-4">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-700" />
              Settlements &amp; Ledger
            </h3>
            <DataTableCard>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Closing Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlementsLoading ? (
                    <TableLoadingRows cols={5} />
                  ) : !settlementsList.length ? (
                    <TableEmptyRow cols={5} message="No settlements logged for this shop" />
                  ) : (
                    settlementsList.map((st: any) => (
                      <TableRow key={st._id || st.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {st.createdAt ? format(new Date(st.createdAt), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-800">
                          {st.type || 'ORDER_CREDIT'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {st.description || st.notes || '—'}
                        </TableCell>
                        <TableCell className={cn('text-sm font-bold', (st.amountPaise || 0) >= 0 ? 'text-emerald-700' : 'text-red-700')}>
                          {(st.amountPaise || 0) >= 0 ? '+' : ''}₹{((st.amountPaise || 0) / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-800">
                          ₹{((st.balancePaise || 0) / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </DataTableCard>
          </div>
        </TabsContent>
      </Tabs>

      {/* =================================================================== */}
      {/* MODALS & DIALOGS */}
      {/* =================================================================== */}

      {/* Reject Price Review Note Dialog */}
      {rejectPriceModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b pb-3 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <h3 className="text-lg font-bold text-slate-900">Reject Price Change</h3>
            </div>
            <p className="text-sm text-slate-600">
              Reject requested price changes for{' '}
              <strong>{rejectPriceModalItem.masterProductId?.name || 'this product'}</strong>?
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Reason for Rejection *</label>
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="Explain why the requested price or unit change was rejected..."
                className="w-full rounded-md border border-slate-300 p-2 text-sm focus:border-amber-500 focus:outline-none"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectPriceModalItem(null)}
                disabled={rejectPriceMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  rejectPriceMutation.mutate({
                    listingId: rejectPriceModalItem._id,
                    reason: rejectionReasonInput.trim() || 'Admin rejected price change',
                  })
                }
                disabled={rejectPriceMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {rejectPriceMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Price & Unit Change Modal */}
      {viewChangesItem && (() => {
        const isPending =
          viewChangesItem.reviewStatus === 'UNDER_REVIEW' ||
          viewChangesItem.reviewStatus === 'PENDING_REVIEW';
        const livePrice = (viewChangesItem.sellingPricePaise || 0) / 100;
        const pendingPrice =
          viewChangesItem.pendingSellingPricePaise != null
            ? viewChangesItem.pendingSellingPricePaise / 100
            : null;
        const priceDiff = pendingPrice != null ? pendingPrice - livePrice : 0;
        const pctDiff =
          livePrice > 0 && priceDiff !== 0
            ? ((priceDiff / livePrice) * 100).toFixed(1)
            : null;
        const liveUnit =
          (viewChangesItem.unit || viewChangesItem.masterProductId?.variant || 'Standard').trim();
        const pendingUnit = (viewChangesItem.pendingUnit || '').trim();
        const isUnitChanged = Boolean(pendingUnit && pendingUnit.toLowerCase() !== liveUnit.toLowerCase());

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-border space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between border-b pb-4 border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-purple-600" />
                    <h3 className="text-xl font-bold text-slate-900">
                      Review Price &amp; Unit Change
                    </h3>
                    <StatusBadge status={viewChangesItem.reviewStatus} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Store: <span className="font-semibold text-slate-800">{String(onboarding.shopName || 'Store Profile')}</span>
                    {viewChangesItem.reviewSubmittedAt || viewChangesItem.createdAt ? (
                      <> &bull; Submitted on {format(new Date(viewChangesItem.reviewSubmittedAt || viewChangesItem.createdAt), 'PPP p')}</>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewChangesItem(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Product Summary */}
              <div className="flex items-center gap-3.5 rounded-lg border border-border bg-slate-50 p-3.5">
                {viewChangesItem.masterProductId?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={viewChangesItem.masterProductId.imageUrl}
                    alt={viewChangesItem.masterProductId.name || 'Product'}
                    className="h-14 w-14 rounded-md border border-border object-cover bg-white shrink-0"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-md border border-border bg-white text-slate-400 shrink-0">
                    <Package className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h4 className="font-semibold text-slate-900 text-sm truncate">
                    {viewChangesItem.masterProductId?.name || 'Product'}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {viewChangesItem.masterProductId?.brand ? (
                      <span>Brand: <strong className="text-slate-700">{viewChangesItem.masterProductId.brand}</strong></span>
                    ) : null}
                    {viewChangesItem.masterProductId?.categoryName ? (
                      <>
                        <span>&bull;</span>
                        <span>Category: <strong className="text-slate-700">{viewChangesItem.masterProductId.categoryName}</strong></span>
                      </>
                    ) : null}
                    {viewChangesItem.masterProductId?._id ? (
                      <>
                        <span>&bull;</span>
                        <span className="font-mono text-[11px]">ID: {viewChangesItem.masterProductId._id.slice(-6)}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Comparison Grid */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-amber-600" /> Comparison (Current Live vs Requested)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Current Live Values */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2 shadow-2xs">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Current Live Values
                    </span>
                    <div className="space-y-1.5 pt-1">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Selling Price</span>
                        <span className="text-xl font-bold text-slate-900">₹{livePrice.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Selling Unit</span>
                        <span className="text-xs font-semibold text-slate-700">{liveUnit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Requested Pending Values */}
                  <div className="rounded-lg border border-slate-300 bg-slate-50 p-4 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Requested by Seller
                      </span>
                      {priceDiff !== 0 && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            priceDiff > 0
                              ? 'bg-amber-100 text-slate-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          {priceDiff > 0 ? `+₹${priceDiff.toFixed(2)}` : `-₹${Math.abs(priceDiff).toFixed(2)}`}
                          {pctDiff ? ` (${priceDiff > 0 ? '+' : ''}${pctDiff}%)` : ''}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <div>
                        <span className="text-[11px] text-slate-600 block">Requested Price</span>
                        {pendingPrice != null ? (
                          <span className="text-xl font-bold text-slate-900">₹{pendingPrice.toFixed(2)}</span>
                        ) : (
                          <span className="text-sm font-medium text-slate-600 italic">
                            Price unchanged (₹{livePrice.toFixed(2)})
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-600 block">Requested Unit</span>
                        {isUnitChanged ? (
                          <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                            {pendingUnit} (Changed)
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-600">
                            {liveUnit} (Unchanged)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rejection Note if already rejected */}
              {viewChangesItem.rejectionReason && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1 text-xs">
                  <span className="font-bold text-red-900">Rejection Note:</span>
                  <p className="text-red-800">{viewChangesItem.rejectionReason}</p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewChangesItem(null)}
                >
                  Close
                </Button>

                {isPending && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50 gap-1.5"
                      onClick={() => {
                        const target = viewChangesItem;
                        setViewChangesItem(null);
                        setRejectPriceModalItem(target);
                      }}
                      disabled={approvePriceMutation.isPending || rejectPriceMutation.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject Changes
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium shadow-xs"
                      onClick={() => approvePriceMutation.mutate(viewChangesItem._id)}
                      disabled={approvePriceMutation.isPending || rejectPriceMutation.isPending}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {approvePriceMutation.isPending ? 'Approving...' : 'Approve & Publish Live'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Order Details Sheet/Modal */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Order #{selectedOrderDetails.orderNumber}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Placed on {selectedOrderDetails.createdAt ? format(new Date(selectedOrderDetails.createdAt), 'PPP p') : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded bg-slate-50 p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Order Status</p>
                  <StatusBadge status={selectedOrderDetails.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <StatusBadge status={selectedOrderDetails.paymentStatus} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-base font-bold text-slate-900">₹{selectedOrderDetails.amount.toFixed(2)}</p>
                </div>
              </div>

              {selectedOrderDetails.address && (
                <div className="rounded border border-border p-3 space-y-1 text-xs">
                  <p className="font-semibold text-slate-800">Delivery Address</p>
                  <p className="text-slate-900 font-medium">{selectedOrderDetails.address.name} ({selectedOrderDetails.address.phone})</p>
                  <p className="text-slate-600">{selectedOrderDetails.address.line1}, {selectedOrderDetails.address.city}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-800">Order Items ({selectedOrderDetails.items?.length || 0})</p>
                <div className="divide-y divide-border rounded border border-border">
                  {selectedOrderDetails.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-muted-foreground">Qty: {item.quantity} {item.unit ? `(${item.unit})` : ''}</p>
                      </div>
                      <p className="font-semibold text-slate-800">
                        ₹{item.lineTotalPaise != null ? (item.lineTotalPaise / 100).toFixed(2) : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t">
              <Button size="sm" variant="outline" onClick={() => setSelectedOrderDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Listing Confirmation Modal */}
      {deleteListingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 border-b pb-3">
              <Trash2 className="h-6 w-6 shrink-0 text-red-600" />
              <h3 className="text-lg font-bold text-slate-900">Remove Product from Store</h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to remove <strong className="text-slate-900">{deleteListingProduct.name}</strong> from this store?
            </p>
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
              This will remove the product listing from this shop inventory. The seller will see it as removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteListingProduct(null)}
                disabled={deleteListingMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                onClick={() => deleteListingMutation.mutate(deleteListingProduct.id)}
                disabled={deleteListingMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                {deleteListingMutation.isPending ? 'Removing...' : 'Remove Product'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Custom Product Request Confirmation Modal */}
      {deletingCustomSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 border-b pb-3">
              <Trash2 className="h-6 w-6 shrink-0 text-red-600" />
              <h3 className="text-lg font-bold text-slate-900">Delete Custom Product</h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">{deletingCustomSub.submittedProductName}</strong>?
            </p>
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
              This will permanently delete the custom product from this store inventory and remove it from the catalogue.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingCustomSub(null)}
                disabled={deleteCustomSubMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                onClick={() => deleteCustomSubMutation.mutate(deletingCustomSub._id)}
                disabled={deleteCustomSubMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                {deleteCustomSubMutation.isPending ? 'Deleting...' : 'Delete Product'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Store Account Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 border-b pb-3">
              <Trash2 className="h-6 w-6 shrink-0 text-red-600" />
              <h3 className="text-lg font-bold text-slate-900">Delete Store Account</h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete store <strong className="text-slate-900">{String(onboarding.shopName || onboarding.fullName || 'this store')}</strong>?
            </p>
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
              This action will permanently delete the store configuration, seller account, product listings, and live inventory. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                {deleteMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
