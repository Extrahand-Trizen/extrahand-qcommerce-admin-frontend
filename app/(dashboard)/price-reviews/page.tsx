'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Search,
  Check,
  X,
  Package,
  Store,
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  MoreVertical,
  Calendar,
  Info,
  TrendingUp,
  ArrowRight,
  Trash2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { format, isToday, isWithinInterval, subDays } from 'date-fns';

interface SellerListing {
  _id: string;
  logId?: string;
  sellerId?: {
    _id?: string;
    shopName?: string;
    storeName?: string;
    fullName?: string;
    phone?: string;
    mobileNumber?: string;
  };
  masterProductId?: {
    _id?: string;
    name?: string;
    brand?: string;
    categoryName?: string;
    subcategoryName?: string;
    imageUrl?: string;
    sellingPricePaise?: number;
    packOrSoldAs?: string;
    variant?: string;
    vertical?: string;
    isMedicalProduct?: boolean;
    attributes?: Array<{ label?: string; attributeId?: string; value: any }>;
    description?: string;
    productInformation?: Record<string, any>;
    lifespanValue?: number;
    lifespanUnit?: string;
    countryOfOrigin?: string;
  };
  unit?: string | null;
  sellingPricePaise: number;
  customDescription?: string | null;
  customNotes?: string | null;
  customAttributes?: Array<{ attributeId?: string; label?: string; value: any }> | null;
  customProductInformation?: Record<string, any> | null;

  pendingSellingPricePaise?: number | null;
  pendingUnit?: string | null;
  pendingDescription?: string | null;
  pendingNotes?: string | null;
  pendingAttributes?: Array<{ attributeId?: string; label?: string; value: any }> | null;
  pendingProductInformation?: Record<string, any> | null;

  rejectionReason?: string | null;
  reviewStatus: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PENDING_REVIEW';
  reviewSubmittedAt?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StatsData {
  underReview: number;
  approved: number;
  rejected: number;
  all: number;
}

export default function PriceReviewsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL'>('UNDER_REVIEW');
  const [selectedProductType, setSelectedProductType] = useState<'ALL' | 'KIRANA' | 'MEDICAL'>('ALL');
  const [selectedShop, setSelectedShop] = useState('all');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer state for View Changes
  const [viewChangesItem, setViewChangesItem] = useState<SellerListing | null>(null);

  // Modal state for rejection note prompt
  const [rejectModalItem, setRejectModalItem] = useState<SellerListing | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Modal state for Delete Listing
  const [deleteModalItem, setDeleteModalItem] = useState<SellerListing | null>(null);

  // Load shops list for filtering
  const { data: shops = [] } = useQuery({
    queryKey: ['filter-shops-price-reviews'],
    queryFn: async () => {
      const res = await api<{ items: Array<{ sellerId: string; shopName: string }> }>(`${endpoints.sellerStores}?limit=100`);
      return res.data?.items || [];
    },
  });

  // Query high-level stats count
  const { data: stats } = useQuery<StatsData>({
    queryKey: ['price-reviews-stats', selectedShop],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedShop !== 'all') params.set('sellerId', selectedShop);
      const res = await api<StatsData>(`${endpoints.sellerListings}/stats?${params}`);
      return (
        res.data || {
          underReview: 0,
          approved: 0,
          rejected: 0,
          all: 0,
        }
      );
    },
  });

  // Query listings
  const { data, isLoading } = useQuery({
    queryKey: ['price-reviews', activeTab, search, selectedShop, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (activeTab !== 'ALL') {
        params.set('reviewStatus', activeTab);
      }
      if (selectedShop !== 'all') {
        params.set('sellerId', selectedShop);
      }
      const res = await api<{ items: SellerListing[]; totalPages: number; total: number }>(
        `${endpoints.sellerListings}?${params}`
      );
      return res.data || { items: [], totalPages: 1, total: 0 };
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return api(`${endpoints.sellerListings}/${id}/approve`, { method: 'POST' });
    },
    onSuccess: () => {
      toast.success('Product changes approved and published live!');
      setViewChangesItem(null);
      qc.invalidateQueries({ queryKey: ['price-reviews'] });
      qc.invalidateQueries({ queryKey: ['price-reviews-stats'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to approve changes'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return api(`${endpoints.sellerListings}/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      toast.success('Request rejected and rejection note sent to seller!');
      setRejectModalItem(null);
      setViewChangesItem(null);
      setRejectionReasonInput('');
      qc.invalidateQueries({ queryKey: ['price-reviews'] });
      qc.invalidateQueries({ queryKey: ['price-reviews-stats'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to reject changes'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api(`${endpoints.sellerListings}/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast.success('Product listing deleted successfully!');
      setDeleteModalItem(null);
      setViewChangesItem(null);
      qc.invalidateQueries({ queryKey: ['price-reviews'] });
      qc.invalidateQueries({ queryKey: ['price-reviews-stats'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete product listing'),
  });

  // Client-side filtering
  const rawItems = data?.items || [];
  const filteredItems = useMemo(() => {
    return rawItems.filter((item) => {
      // Product Type filter
      if (selectedProductType !== 'ALL') {
        const isMed = Boolean(item.masterProductId?.vertical === 'MEDICAL' || item.masterProductId?.isMedicalProduct);
        if (selectedProductType === 'MEDICAL' && !isMed) return false;
        if (selectedProductType === 'KIRANA' && isMed) return false;
      }

      // Date filter
      if (dateFilter !== 'ALL') {
        const itemDate = new Date(item.reviewSubmittedAt || item.createdAt);
        if (dateFilter === 'TODAY' && !isToday(itemDate)) return false;
        if (dateFilter === 'WEEK') {
          const sevenDaysAgo = subDays(new Date(), 7);
          if (!isWithinInterval(itemDate, { start: sevenDaysAgo, end: new Date() })) return false;
        }
        if (dateFilter === 'MONTH') {
          const thirtyDaysAgo = subDays(new Date(), 30);
          if (!isWithinInterval(itemDate, { start: thirtyDaysAgo, end: new Date() })) return false;
        }
      }

      // Search filter
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const productName = item.masterProductId?.name?.toLowerCase() || '';
      const brand = item.masterProductId?.brand?.toLowerCase() || '';
      const shopName = item.sellerId?.shopName?.toLowerCase() || item.sellerId?.storeName?.toLowerCase() || '';
      const sellerName = item.sellerId?.fullName?.toLowerCase() || '';
      const shopId = `sh-${String(item.sellerId?._id || '').slice(-4).toLowerCase()}`;
      return (
        productName.includes(q) ||
        brand.includes(q) ||
        shopName.includes(q) ||
        sellerName.includes(q) ||
        shopId.includes(q)
      );
    });
  }, [rawItems, search, selectedProductType, dateFilter]);

  // Compute attribute diffs for drawer & counts
  const getAttributeDiffs = (item: SellerListing) => {
    if (!item.pendingAttributes || item.pendingAttributes.length === 0) return [];
    const liveAttrs = item.customAttributes || item.masterProductId?.attributes || [];
    const liveMap = new Map<string, string>();
    liveAttrs.forEach((a) => {
      const labelKey = String(a.label || '').trim().toLowerCase();
      const idKey = String(a.attributeId || '').trim().toLowerCase();
      const val = String(a.value ?? '').trim();
      if (labelKey) liveMap.set(labelKey, val);
      if (idKey) liveMap.set(idKey, val);
    });

    const diffs: Array<{ key: string; liveVal: string; pendingVal: string; status: 'Added' | 'Modified' }> = [];

    item.pendingAttributes.forEach((a) => {
      const label = (a.label || a.attributeId || '').trim();
      if (!label) return;
      const keyLower = label.toLowerCase();
      const liveVal = liveMap.get(keyLower) ?? (a.attributeId ? liveMap.get(String(a.attributeId).toLowerCase()) : undefined);
      const pendingVal = String(a.value ?? '').trim();

      // Skip identical values (including boolean representations)
      if (liveVal !== undefined && (
        liveVal.toLowerCase() === pendingVal.toLowerCase() ||
        (liveVal.toLowerCase() === 'false' && pendingVal.toLowerCase() === 'no') ||
        (liveVal.toLowerCase() === 'true' && pendingVal.toLowerCase() === 'yes') ||
        (liveVal.toLowerCase() === 'no' && pendingVal.toLowerCase() === 'false') ||
        (liveVal.toLowerCase() === 'yes' && pendingVal.toLowerCase() === 'true')
      )) {
        return;
      }

      if (liveVal === undefined || liveVal === '') {
        diffs.push({ key: label, liveVal: '—', pendingVal, status: 'Added' });
      } else {
        diffs.push({ key: label, liveVal, pendingVal, status: 'Modified' });
      }
    });

    return diffs;
  };

  // Compute specifications diffs for drawer & counts
  const getSpecsDiffs = (item: SellerListing) => {
    const diffs: Array<{ key: string; label: string; liveVal: string; pendingVal: string; status: 'Added' | 'Modified' }> = [];
    const masterInfo = item.masterProductId?.productInformation || {};
    const customInfo = item.customProductInformation || {};
    const currentInfo: Record<string, any> = {
      ...masterInfo,
      ...customInfo,
    };

    if (item.masterProductId?.brand && !currentInfo.brand) currentInfo.brand = item.masterProductId.brand;
    if (item.masterProductId?.countryOfOrigin && !currentInfo.countryOfOrigin) currentInfo.countryOfOrigin = item.masterProductId.countryOfOrigin;
    if (item.masterProductId?.lifespanValue != null && currentInfo.lifespanValue == null) currentInfo.lifespanValue = item.masterProductId.lifespanValue;
    if (item.masterProductId?.lifespanUnit && !currentInfo.lifespanUnit) currentInfo.lifespanUnit = item.masterProductId.lifespanUnit;

    // Aliases
    if (currentInfo.ingredients && !currentInfo.keyIngredients) currentInfo.keyIngredients = currentInfo.ingredients;
    if (currentInfo.keyIngredients && !currentInfo.ingredients) currentInfo.ingredients = currentInfo.keyIngredients;
    if (currentInfo.usageInstructions && !currentInfo.directionsForUse) currentInfo.directionsForUse = currentInfo.usageInstructions;
    if (currentInfo.directionsForUse && !currentInfo.usageInstructions) currentInfo.usageInstructions = currentInfo.directionsForUse;
    if (currentInfo.healthBenefits && !currentInfo.keyBenefits) currentInfo.keyBenefits = currentInfo.healthBenefits;
    if (currentInfo.keyBenefits && !currentInfo.healthBenefits) currentInfo.healthBenefits = currentInfo.keyBenefits;
    if (currentInfo.storageInformation && !currentInfo.storageCondition) currentInfo.storageCondition = currentInfo.storageInformation;
    if (currentInfo.storageCondition && !currentInfo.storageInformation) currentInfo.storageInformation = currentInfo.storageCondition;
    if (currentInfo.allergens && !currentInfo.allergenInfo) currentInfo.allergenInfo = currentInfo.allergens;
    if (currentInfo.allergenInfo && !currentInfo.allergens) currentInfo.allergens = currentInfo.allergenInfo;

    const pendingInfo = item.pendingProductInformation || {};

    for (const [k, v] of Object.entries(pendingInfo)) {
      if (v === undefined || v === null || v === '') continue;
      // Skip inventory/internal keys and non-reviewed mrp
      if (['batchNumber', 'expiryDate', 'mfgDate', 'rackLocation', 'mrpPaise'].includes(k)) continue;
      const liveVal = currentInfo[k] != null ? String(currentInfo[k]).trim() : '';
      const pendingVal = String(v).trim();
      if (pendingVal !== '' && pendingVal.toLowerCase() !== liveVal.toLowerCase()) {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
        diffs.push({
          key: k,
          label,
          liveVal: liveVal || '—',
          pendingVal,
          status: liveVal ? 'Modified' : 'Added',
        });
      }
    }

    if (
      item.pendingDescription &&
      item.pendingDescription.trim() !== (item.customDescription || item.masterProductId?.description || '').trim()
    ) {
      const liveDesc = (item.customDescription || item.masterProductId?.description || '').trim();
      diffs.push({
        key: 'description',
        label: 'Description',
        liveVal: liveDesc ? `${liveDesc.slice(0, 32)}...` : '—',
        pendingVal: `${item.pendingDescription.trim().slice(0, 32)}...`,
        status: liveDesc ? 'Modified' : 'Added',
      });
    }

    return diffs;
  };

  // Compute total count of changes for row badge
  const getChangeCount = (item: SellerListing) => {
    const currentPricePaise = item.sellingPricePaise ?? 0;
    const isPriceChanged = item.pendingSellingPricePaise != null && item.pendingSellingPricePaise !== currentPricePaise;
    const currentUnit = (item.unit || item.masterProductId?.packOrSoldAs || item.masterProductId?.variant || 'Standard').trim();
    const isUnitChanged = Boolean(item.pendingUnit && item.pendingUnit.trim().toLowerCase() !== currentUnit.toLowerCase());
    const attrDiffs = getAttributeDiffs(item);
    const specsDiffs = getSpecsDiffs(item);
    const notesChanged = Boolean(item.pendingNotes && item.pendingNotes.trim() !== (item.customNotes || '').trim());

    let count = (isPriceChanged ? 1 : 0) + (isUnitChanged ? 1 : 0) + attrDiffs.length + specsDiffs.length + (notesChanged ? 1 : 0);
    return Math.max(1, count);
  };

  const handleConfirmReject = () => {
    if (!rejectModalItem) return;
    const reasonText = rejectionReasonInput.trim() || 'Request rejected by admin';
    rejectMutation.mutate({ id: rejectModalItem._id, reason: reasonText });
  };

  const counts = {
    underReview: stats?.underReview ?? (activeTab === 'UNDER_REVIEW' ? data?.total ?? 0 : 0),
    approved: stats?.approved ?? (activeTab === 'APPROVED' ? data?.total ?? 0 : 0),
    rejected: stats?.rejected ?? (activeTab === 'REJECTED' ? data?.total ?? 0 : 0),
    all: stats?.all ?? (activeTab === 'ALL' ? data?.total ?? 0 : 0),
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb & Header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1.5">
          <Link href="/dashboard" className="hover:text-amber-800 transition-colors">
            Home
          </Link>
          <span>&rsaquo;</span>
          <span className="text-slate-800 font-semibold">Product Approvals</span>
        </nav>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Product Approvals</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review seller-submitted changes to existing products.
        </p>
      </div>

      {/* Top 4 Stat / Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Under Review */}
        <button
          type="button"
          onClick={() => { setActiveTab('UNDER_REVIEW'); setPage(1); }}
          className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
            activeTab === 'UNDER_REVIEW'
              ? 'border-amber-400 bg-[#FEFCE8] shadow-xs ring-2 ring-amber-300/60'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Clock className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Under Review</p>
            <p className="text-2xl font-black text-slate-900">{counts.underReview}</p>
          </div>
        </button>

        {/* Card 2: Approved */}
        <button
          type="button"
          onClick={() => { setActiveTab('APPROVED'); setPage(1); }}
          className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
            activeTab === 'APPROVED'
              ? 'border-emerald-400 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-300/60'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Approved</p>
            <p className="text-2xl font-black text-slate-900">{counts.approved}</p>
          </div>
        </button>

        {/* Card 3: Rejected */}
        <button
          type="button"
          onClick={() => { setActiveTab('REJECTED'); setPage(1); }}
          className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
            activeTab === 'REJECTED'
              ? 'border-rose-400 bg-rose-50/70 shadow-xs ring-2 ring-rose-300/60'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <XCircle className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Rejected</p>
            <p className="text-2xl font-black text-slate-900">{counts.rejected}</p>
          </div>
        </button>

        {/* Card 4: All Listings */}
        <button
          type="button"
          onClick={() => { setActiveTab('ALL'); setPage(1); }}
          className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
            activeTab === 'ALL'
              ? 'border-amber-400 bg-[#FEFCE8] shadow-xs ring-2 ring-amber-300/60'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <LayoutGrid className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">All Listings</p>
            <p className="text-2xl font-black text-slate-900">{counts.all}</p>
          </div>
        </button>
      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => { setActiveTab('UNDER_REVIEW'); setPage(1); }}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === 'UNDER_REVIEW'
              ? 'bg-[#FACC15] text-slate-950 shadow-xs ring-1 ring-amber-400'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Under Review ({counts.underReview})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('APPROVED'); setPage(1); }}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === 'APPROVED'
              ? 'bg-[#FACC15] text-slate-950 shadow-xs ring-1 ring-amber-400'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Approved ({counts.approved})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('REJECTED'); setPage(1); }}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === 'REJECTED'
              ? 'bg-[#FACC15] text-slate-950 shadow-xs ring-1 ring-amber-400'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Rejected ({counts.rejected})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('ALL'); setPage(1); }}
          className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === 'ALL'
              ? 'bg-[#FACC15] text-slate-950 shadow-xs ring-1 ring-amber-400'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          All Listings ({counts.all})
        </button>
      </div>

      {/* Filter Toolbar: Search, Product Type, Seller/Shop, Submitted Date */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* 1. Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search product, brand, seller or shop ID..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* 2. Product Type Dropdown */}
        <div>
          <Select
            value={selectedProductType}
            onValueChange={(v: 'ALL' | 'KIRANA' | 'MEDICAL') => { setSelectedProductType(v); setPage(1); }}
          >
            <SelectTrigger className="h-9 w-full text-xs border-slate-200 bg-white">
              <SelectValue placeholder="Product Type: All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="KIRANA">Kirana</SelectItem>
              <SelectItem value="MEDICAL">Medical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 3. Seller / Shop Dropdown */}
        <div>
          <Select
            value={selectedShop}
            onValueChange={(v) => { setSelectedShop(v); setPage(1); }}
          >
            <SelectTrigger className="h-9 w-full text-xs border-slate-200 bg-white">
              <SelectValue placeholder="Seller / Shop: All Shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shops</SelectItem>
              {shops.map((s) => (
                <SelectItem key={s.sellerId} value={s.sellerId}>
                  {s.shopName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 4. Submitted Date Dropdown */}
        <div className="flex items-center gap-2">
          <Select
            value={dateFilter}
            onValueChange={(v: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH') => { setDateFilter(v); setPage(1); }}
          >
            <SelectTrigger className="h-9 w-full text-xs border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder="Submitted Date: Any Date" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any Date</SelectItem>
              <SelectItem value="TODAY">Today</SelectItem>
              <SelectItem value="WEEK">Last 7 Days</SelectItem>
              <SelectItem value="MONTH">This Month</SelectItem>
            </SelectContent>
          </Select>

          {(search.trim() || selectedShop !== 'all' || selectedProductType !== 'ALL' || dateFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedShop('all');
                setSelectedProductType('ALL');
                setDateFilter('ALL');
                setPage(1);
              }}
              title="Reset all filters"
              className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 flex items-center justify-center transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#F5E8C7] bg-[#FFFBEB] text-[11px] font-bold uppercase tracking-wider text-slate-700">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-4">Seller &amp; Shop</th>
                <th className="py-3 px-4">Price <span className="text-[10px] font-normal normal-case text-slate-500">(Current &rarr; Requested)</span></th>
                <th className="py-3 px-3">Changes</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4 animate-spin text-amber-600" />
                      Loading listings...
                    </div>
                  </td>
                </tr>
              ) : !filteredItems.length ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-800">No listings found</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing or adjusting your search filters.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const currentPrice = (item.sellingPricePaise ?? 0) / 100;
                  const pendingPrice =
                    item.pendingSellingPricePaise != null
                      ? item.pendingSellingPricePaise / 100
                      : currentPrice;
                  const currentUnit = (
                    item.unit ||
                    item.masterProductId?.packOrSoldAs ||
                    item.masterProductId?.variant ||
                    '1 unit'
                  ).trim();
                  const pendingUnit = item.pendingUnit?.trim() || currentUnit;

                  const isMedical = Boolean(
                    item.masterProductId?.vertical === 'MEDICAL' || item.masterProductId?.isMedicalProduct
                  );

                  const changeCount = getChangeCount(item);
                  const sellerName = item.sellerId?.fullName || 'Seller';
                  const shopName = item.sellerId?.shopName || item.sellerId?.storeName || 'Store';
                  const shopCode = `SH-${String(item.sellerId?._id || '7732').slice(-4).toUpperCase()}`;

                  const productName = item.masterProductId?.name || 'Kirana Product';
                  const brand = item.masterProductId?.brand || 'Not specified';
                  const imageUrl = item.masterProductId?.imageUrl;

                  const dateObj = new Date(item.reviewSubmittedAt || item.createdAt);
                  const isUnderReview = item.reviewStatus === 'UNDER_REVIEW';

                  return (
                    <tr
                      key={item.logId || item._id}
                      className="transition-colors hover:bg-amber-50/30 group"
                    >
                      {/* 1. Product Cell */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {imageUrl ? (
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                              <Image src={imageUrl} alt={productName} fill className="object-contain p-0.5" />
                            </div>
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-amber-50/60 text-amber-700">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 max-w-[200px]" title={productName}>
                              {productName}
                            </p>
                            <p className="text-[11px] text-slate-400">Brand: {brand}</p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Type Badge */}
                      <td className="py-3 px-3">
                        {isMedical ? (
                          <span className="inline-flex items-center rounded-md border border-[#BAE6FD] bg-[#E0F2FE] px-2 py-0.5 text-[11px] font-semibold text-[#0369A1]">
                            Medical
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md border border-[#FDE68A] bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-semibold text-[#92400E]">
                            Kirana
                          </span>
                        )}
                      </td>

                      {/* 3. Seller & Shop */}
                      <td className="py-3 px-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{sellerName}</p>
                          <p className="truncate text-[11px] text-slate-400">
                            {shopName} <span className="font-mono text-slate-400">({shopCode})</span>
                          </p>
                        </div>
                      </td>

                      {/* 4. Price (Current -> Requested) */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            ₹{currentPrice.toFixed(2)} &rarr; ₹{pendingPrice.toFixed(2)}
                          </span>
                          <span className="text-[11px] text-slate-400">({pendingUnit})</span>
                        </div>
                      </td>

                      {/* 5. Changes Badge */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center rounded-full border border-[#FDE68A] bg-[#FEF9C3] px-2.5 py-0.5 text-[11px] font-semibold text-[#92400E]">
                          {changeCount} {changeCount === 1 ? 'change' : 'changes'}
                        </span>
                      </td>

                      {/* 6. Submitted Date */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col text-[11px] leading-tight text-slate-600">
                          <span className="font-medium text-slate-700">{format(dateObj, 'MMM d, yyyy')}</span>
                          <span className="text-slate-400">{format(dateObj, 'h:mm a')}</span>
                        </div>
                      </td>

                      {/* 7. Status */}
                      <td className="py-3 px-3">
                        {item.reviewStatus === 'UNDER_REVIEW' && (
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                            Under Review
                          </span>
                        )}
                        {item.reviewStatus === 'APPROVED' && (
                          <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900">
                            Approved
                          </span>
                        )}
                        {item.reviewStatus === 'REJECTED' && (
                          <span className="inline-flex items-center rounded-full border border-rose-300 bg-rose-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-rose-900">
                            Rejected
                          </span>
                        )}
                        {item.reviewStatus === 'PENDING_REVIEW' && (
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                            Pending Review
                          </span>
                        )}
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewChangesItem(item)}
                            className="rounded-lg bg-[#FDE047] hover:bg-[#FACC15] px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition shadow-2xs"
                          >
                            View Changes
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              {item.sellerId?._id && (
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/sellers/stores/${item.sellerId._id}?tab=price-changes`}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                                    View Store Profile
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setDeleteModalItem(item)}
                                className="flex items-center gap-2 text-red-600 focus:text-red-700 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Listing
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Summary & Pagination */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <div>
            Showing {filteredItems.length ? (page - 1) * pageSize + 1 : 0}&ndash;
            {Math.min(page * pageSize, data?.total || filteredItems.length)} of {data?.total || filteredItems.length} products
          </div>

          <div className="flex items-center gap-4 self-end sm:self-auto">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
              >
                <SelectTrigger className="h-8 w-24 text-xs border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="h-8 min-w-[32px] rounded-md bg-[#FACC15] px-2 text-xs font-bold text-slate-950 flex items-center justify-center">
                {page}
              </span>

              <button
                type="button"
                onClick={() => setPage((p) => (data?.totalPages && p < data.totalPages ? p + 1 : p))}
                disabled={Boolean(data?.totalPages && page >= data.totalPages)}
                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 flex items-center justify-center transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT SLIDE-OVER DRAWER (VIEW CHANGES) ── */}
      {viewChangesItem && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setViewChangesItem(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">View Changes</h2>
                <button
                  type="button"
                  onClick={() => setViewChangesItem(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-800 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Top Product Summary Card */}
                {(() => {
                  const currentPrice = (viewChangesItem.sellingPricePaise ?? 0) / 100;
                  const pendingPrice =
                    viewChangesItem.pendingSellingPricePaise != null
                      ? viewChangesItem.pendingSellingPricePaise / 100
                      : currentPrice;
                  const currentUnit = (
                    viewChangesItem.unit ||
                    viewChangesItem.masterProductId?.packOrSoldAs ||
                    viewChangesItem.masterProductId?.variant ||
                    '1 unit'
                  ).trim();
                  const pendingUnit = viewChangesItem.pendingUnit?.trim() || currentUnit;

                  const productName = viewChangesItem.masterProductId?.name || 'Kirana Product';
                  const brand = viewChangesItem.masterProductId?.brand || 'Not specified';
                  const imageUrl = viewChangesItem.masterProductId?.imageUrl;
                  const sellerName = viewChangesItem.sellerId?.fullName || 'Seller';
                  const shopName = viewChangesItem.sellerId?.shopName || viewChangesItem.sellerId?.storeName || 'Store';
                  const shopCode = `SH-${String(viewChangesItem.sellerId?._id || '7732').slice(-4).toUpperCase()}`;

                  const priceDiff = pendingPrice - currentPrice;
                  const pctDiff = currentPrice > 0 ? ((priceDiff / currentPrice) * 100).toFixed(0) : 0;

                  const attrDiffs = getAttributeDiffs(viewChangesItem);
                  const specsDiffs = getSpecsDiffs(viewChangesItem);

                  return (
                    <>
                      {/* Product Header Card */}
                      <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                        {imageUrl ? (
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            <Image src={imageUrl} alt={productName} fill className="object-contain p-1" />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-amber-50 text-amber-700">
                            <Package className="h-7 w-7" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-bold text-slate-900 leading-snug">{productName}</h3>
                            <span className="shrink-0 rounded-full border border-amber-300 bg-amber-100/70 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
                              {viewChangesItem.reviewStatus === 'APPROVED' ? 'Approved' : 'Under Review'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">Brand: {brand}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Seller: <span className="font-medium text-slate-800">{sellerName}</span> &nbsp;|&nbsp; Shop:{' '}
                            <span className="font-medium text-slate-800">
                              {shopName} ({shopCode})
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* 2. Price & Packaging Section */}
                      <div className="space-y-2.5">
                        <h4 className="text-sm font-bold text-slate-900">Price &amp; Packaging</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Previously Approved Card */}
                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
                            <p className="text-xs font-medium text-slate-500">Previously Approved</p>
                            <p className="text-2xl font-black text-slate-900">₹{currentPrice.toFixed(2)}</p>
                            <p className="text-xs text-slate-500 font-medium">{currentUnit}</p>
                          </div>

                          {/* Seller Requested Card (Highlighted) */}
                          <div className="rounded-xl border border-amber-400 bg-[#FEFCE8] p-3.5 space-y-1 ring-1 ring-amber-300/40">
                            <p className="text-xs font-semibold text-amber-900">Seller Requested</p>
                            <p className="text-2xl font-black text-slate-900">₹{pendingPrice.toFixed(2)}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {priceDiff > 0 && (
                                <span className="text-xs font-bold text-emerald-700 flex items-center gap-0.5">
                                  &uarr; +₹{priceDiff.toFixed(2)} (+{pctDiff}%)
                                </span>
                              )}
                              {priceDiff < 0 && (
                                <span className="text-xs font-bold text-rose-700 flex items-center gap-0.5">
                                  &darr; -₹{Math.abs(priceDiff).toFixed(2)} ({pctDiff}%)
                                </span>
                              )}
                              {priceDiff === 0 && (
                                <span className="text-xs font-medium text-slate-500">Price unchanged</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-700 font-medium">{pendingUnit}</p>
                          </div>
                        </div>
                      </div>

                      {/* 3. Changed Attributes Section */}
                      {attrDiffs.length > 0 && (
                        <div className="space-y-2.5">
                          <h4 className="text-sm font-bold text-slate-900">Changed Attributes</h4>
                          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                            {attrDiffs.map((diff) => (
                              <div
                                key={diff.key}
                                className="flex items-center justify-between p-3 text-xs hover:bg-slate-50/50"
                              >
                                <span className="font-semibold text-slate-800">{diff.key}</span>
                                <div className="flex items-center gap-2.5">
                                  <span className="text-slate-600 font-mono">
                                    {diff.liveVal} &rarr; <span className="font-bold text-slate-900">{diff.pendingVal}</span>
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      diff.status === 'Added'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {diff.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 4. Specifications & Product Information */}
                      {specsDiffs.length > 0 && (
                        <div className="space-y-2.5">
                          <h4 className="text-sm font-bold text-slate-900">Specifications &amp; Product Information</h4>
                          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                            {specsDiffs.map((diff) => (
                              <div
                                key={diff.key}
                                className="flex items-center justify-between p-3 text-xs hover:bg-slate-50/50"
                              >
                                <span className="font-semibold text-slate-800">{diff.label}</span>
                                <div className="flex items-center gap-2.5">
                                  <span className="text-slate-600 font-mono">
                                    {diff.liveVal} &rarr; <span className="font-bold text-slate-900">{diff.pendingVal}</span>
                                  </span>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      diff.status === 'Added'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {diff.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 5. Additional Notes */}
                      <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3.5 flex items-start gap-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-xs font-bold mt-0.5">
                          i
                        </div>
                        <div className="text-xs space-y-0.5 min-w-0">
                          <p className="font-bold text-slate-900">Additional Notes</p>
                          <p className="text-slate-700 leading-relaxed">
                            {viewChangesItem.pendingNotes ||
                              viewChangesItem.customNotes ||
                              'Seller has updated product details as per new guidelines.'}
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Drawer Sticky Footer Actions */}
              <div className="border-t border-slate-200 p-4 bg-white flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalItem(viewChangesItem);
                    setRejectionReasonInput('');
                  }}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="flex-1 rounded-xl border border-red-300 bg-white hover:bg-red-50 py-3 text-xs font-bold text-red-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <X className="h-4 w-4 stroke-[2.5]" />
                  Reject
                </button>

                <button
                  type="button"
                  onClick={() => approveMutation.mutate(viewChangesItem._id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="flex-1 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] py-3 text-xs font-bold text-slate-950 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Check className="h-4 w-4 stroke-[3]" />
                  Approve Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REJECTION REASON PROMPT MODAL ── */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Reject Product Changes</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Explain to the seller why these requested changes cannot be approved.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label htmlFor="rejectionReason" className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Rejection *
              </label>
              <textarea
                id="rejectionReason"
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. Requested price exceeds MRP, or specifications need supporting documentation..."
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalItem(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmReject}
                disabled={rejectMutation.isPending}
                className="text-xs bg-red-600 hover:bg-red-700"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE LISTING CONFIRMATION MODAL ── */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Product Listing</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to remove &quot;{deleteModalItem.masterProductId?.name}&quot; from this seller&apos;s store? This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalItem(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(deleteModalItem._id)}
                disabled={deleteMutation.isPending}
                className="text-xs bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Listing'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
