'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { format } from 'date-fns';
import {
  Trash2,
  Layers,
  Tag,
  Store,
  ExternalLink,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  Search,
  X,
  Package,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';

type CategoryOption = {
  _id: string;
  name: string;
};

type ShopOption = {
  sellerId: string;
  shopName: string;
};

type StatsData = {
  pending: number;
  approved: number;
  rejected: number;
  deleted: number;
  all: number;
};

type ProductSubmissionItem = {
  _id: string;
  submittedProductName?: string;
  brand?: string;
  genericName?: string;
  isMedicalProduct?: boolean;
  prescriptionRequired?: boolean;
  prescriptionCategory?: string;
  medicalCategory?: string;
  medicalSubcategory?: string;
  productType?: string;
  categoryId?: { _id?: string; name?: string } | string;
  subcategoryId?: { _id?: string; name?: string } | string;
  productTypeId?: { _id?: string; name?: string } | string;
  packOrSoldAs?: string;
  quantity?: number;
  lifespanValue?: number;
  lifespanUnit?: string;
  photoUrl?: string;
  frontImageUrl?: string;
  images?: string[];
  sellingPricePaise?: number;
  status?: string;
  createdAt?: string;
  sellerId?: {
    _id?: string;
    fullName?: string;
    shopName?: string;
    mobileNumber?: string;
  };
  mappedMasterProductId?: {
    _id?: string;
    status?: string;
    name?: string;
  };
};

export default function ProductSubmissionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [selectedShop, setSelectedShop] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'last_7_days' | 'last_30_days' | 'this_month'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Load shops for filter dropdown
  const { data: shops = [] } = useQuery({
    queryKey: ['filter-shops-submissions'],
    queryFn: async () => {
      const res = await api<{ items: ShopOption[] }>(`${endpoints.sellerStores}?limit=100`);
      return res.data?.items || [];
    },
  });

  // Load categories for filter dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['filter-categories-submissions'],
    queryFn: async () => {
      const res = await api<{ items: CategoryOption[] }>(`${endpoints.categories}?limit=100`);
      return res.data?.items || [];
    },
  });

  // Load high-level stats count
  const { data: stats } = useQuery<StatsData>({
    queryKey: ['submissions-stats', selectedShop],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedShop !== 'all') params.set('sellerId', selectedShop);
      const res = await api<StatsData>(`${endpoints.productSubmissions}/stats?${params}`);
      return (
        res.data || {
          pending: 0,
          approved: 0,
          rejected: 0,
          deleted: 0,
          all: 0,
        }
      );
    },
  });

  // Main Submissions Query with pagination & server filters
  const { data: paginatedData, isLoading } = useQuery({
    queryKey: ['submissions', activeTab, selectedShop, selectedCategory, dateFilter, search, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (activeTab !== 'ALL') params.set('status', activeTab);
      if (selectedShop !== 'all') params.set('sellerId', selectedShop);
      if (selectedCategory !== 'all') params.set('categoryId', selectedCategory);
      if (dateFilter !== 'all') params.set('dateRange', dateFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await api<{
        items: ProductSubmissionItem[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`${endpoints.productSubmissions}?${params}`);

      return res.data || { items: [], total: 0, page: 1, limit: pageSize, totalPages: 1 };
    },
  });

  const rawItems = paginatedData?.items || [];
  const total = paginatedData?.total || 0;
  const totalPages = paginatedData?.totalPages || 1;

  // Client-side sort fallback if needed
  const items = useMemo(() => {
    return [...rawItems].sort((a, b) => {
      const dateA = new Date(String(a.createdAt || 0)).getTime();
      const dateB = new Date(String(b.createdAt || 0)).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [rawItems, sortOrder]);

  const deleteMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      return api(`${endpoints.productSubmissions}/${submissionId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast.success('Product submission marked as DELETED');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['submissions'] });
      qc.invalidateQueries({ queryKey: ['submissions-stats'] });
      qc.invalidateQueries({ queryKey: ['seller-stores'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete submission'),
  });

  const handleResetFilters = () => {
    setSearch('');
    setSelectedShop('all');
    setSelectedCategory('all');
    setDateFilter('all');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      selectedShop !== 'all' ||
      selectedCategory !== 'all' ||
      dateFilter !== 'all' ||
      sortOrder !== 'desc' ||
      activeTab !== 'PENDING'
  );

  const currentMonthLabel = `This Month (${format(new Date(), 'MMM yyyy')})`;

  const counts = {
    pending: stats?.pending ?? (activeTab === 'PENDING' ? total : 0),
    approved: stats?.approved ?? (activeTab === 'APPROVED' ? total : 0),
    rejected: stats?.rejected ?? (activeTab === 'REJECTED' ? total : 0),
    all: stats?.all ?? (activeTab === 'ALL' ? total : 0),
  };

  return (
    <div className="space-y-6 pb-14 text-slate-800">
      {/* 1. Breadcrumb & Header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1.5">
          <Link href="/dashboard" className="hover:text-amber-800 transition-colors">
            Home
          </Link>
          <span>&rsaquo;</span>
          <span className="text-slate-800 font-semibold">Product Approvals</span>
        </nav>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Custom Product Submissions
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Review and approve new products submitted by sellers across all stores.
            </p>
          </div>

          {/* Sub-navigation switcher between Submissions and Price Reviews */}
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="bg-[#FACC15] hover:bg-amber-400 text-slate-950 font-semibold gap-1.5 shadow-2xs border border-amber-400/80"
            >
              <Link href="/product-submissions">
                <Layers className="h-4 w-4" />
                Custom Product Submissions
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            >
              <Link href="/price-reviews">
                <Tag className="h-4 w-4 text-purple-600" />
                Price &amp; Unit Reviews
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Top 4 Stat / Metric Summary Cards (Interactive Tab Switchers) */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Pending Review */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('PENDING');
            setPage(1);
          }}
          className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all cursor-pointer ${
            activeTab === 'PENDING'
              ? 'border-amber-400 bg-[#FEFCE8] shadow-xs ring-2 ring-amber-300/60'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Clock className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Pending Review</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.pending}</p>
          </div>
        </button>

        {/* Card 2: Approved */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('APPROVED');
            setPage(1);
          }}
          className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all cursor-pointer ${
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
            <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.approved}</p>
          </div>
        </button>

        {/* Card 3: Rejected */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('REJECTED');
            setPage(1);
          }}
          className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all cursor-pointer ${
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
            <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.rejected}</p>
          </div>
        </button>

        {/* Card 4: All Submissions */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('ALL');
            setPage(1);
          }}
          className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'border-amber-400 bg-[#FEFCE8] shadow-xs ring-2 ring-amber-300/60'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <LayoutGrid className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">All Submissions</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{counts.all}</p>
          </div>
        </button>
      </div>

      {/* 3. Filter Pills Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('PENDING');
            setPage(1);
          }}
          className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'PENDING'
              ? 'bg-[#FACC15] text-slate-950 shadow-xs ring-1 ring-amber-400'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Pending Review ({counts.pending})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('APPROVED');
            setPage(1);
          }}
          className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'APPROVED'
              ? 'bg-[#FACC15] text-slate-950 shadow-xs ring-1 ring-amber-400'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Approved ({counts.approved})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('REJECTED');
            setPage(1);
          }}
          className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'REJECTED'
              ? 'bg-[#FACC15] text-slate-950 shadow-xs ring-1 ring-amber-400'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Rejected ({counts.rejected})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('ALL');
            setPage(1);
          }}
          className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'ALL'
              ? 'bg-[#FACC15] text-slate-950 shadow-xs ring-1 ring-amber-400'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          All Submissions ({counts.all})
        </button>
      </div>

      {/* 4. Unified Search & Filters Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2.5 sm:gap-3">
          {/* Search Input Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by product name, brand or ID..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Filter by Shop */}
            <div className="w-[180px] shrink-0">
              <Select
                value={selectedShop}
                onValueChange={(val) => {
                  setSelectedShop(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center justify-between shadow-2xs hover:border-slate-300">
                  <div className="flex flex-col text-left mr-1 truncate">
                    <span className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">Shop</span>
                    <span className="text-xs font-semibold text-slate-800 leading-tight truncate">
                      {selectedShop === 'all'
                        ? 'All Seller Shops'
                        : shops.find((s) => s.sellerId === selectedShop)?.shopName || 'Shop'}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Seller Shops</SelectItem>
                  {shops.map((s) => (
                    <SelectItem key={s.sellerId} value={s.sellerId}>
                      {s.shopName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Category */}
            <div className="w-[170px] shrink-0">
              <Select
                value={selectedCategory}
                onValueChange={(val) => {
                  setSelectedCategory(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center justify-between shadow-2xs hover:border-slate-300">
                  <div className="flex flex-col text-left mr-1 truncate">
                    <span className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">Category</span>
                    <span className="text-xs font-semibold text-slate-800 leading-tight truncate">
                      {selectedCategory === 'all'
                        ? 'All Categories'
                        : categories.find((c) => c._id === selectedCategory)?.name || 'Category'}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter by Date Range */}
            <div className="w-[175px] shrink-0">
              <Select
                value={dateFilter}
                onValueChange={(val: any) => {
                  setDateFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center justify-between shadow-2xs hover:border-slate-300">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <div className="flex flex-col text-left mr-1 truncate">
                      <span className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">Date Range</span>
                      <span className="text-xs font-semibold text-slate-800 leading-tight truncate">
                        {dateFilter === 'all'
                          ? 'All Time'
                          : dateFilter === 'this_month'
                          ? currentMonthLabel
                          : dateFilter === 'today'
                          ? 'Today'
                          : dateFilter === 'last_7_days'
                          ? 'Last 7 Days'
                          : 'Last 30 Days'}
                      </span>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this_month">{currentMonthLabel}</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="w-[140px] shrink-0">
              <Select
                value={sortOrder}
                onValueChange={(val: 'desc' | 'asc') => {
                  setSortOrder(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center justify-between shadow-2xs hover:border-slate-300">
                  <div className="flex flex-col text-left mr-1 truncate">
                    <span className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">Sort</span>
                    <span className="text-xs font-semibold text-slate-800 leading-tight truncate">
                      {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 px-3 text-xs text-slate-500 hover:text-amber-800 hover:bg-amber-50 shrink-0 gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Enhanced Data Table Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b border-slate-200/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5">Product</TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5">Price &amp; Pack</TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5">Lifespan</TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5">Shop / Seller</TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5">Catalogue Mapping</TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5">Submitted</TableHead>
                <TableHead className="font-semibold text-slate-700 text-xs py-3.5 text-right w-[140px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8} className="py-4">
                      <div className="flex items-center gap-3 animate-pulse">
                        <div className="h-12 w-12 rounded-lg bg-slate-200 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-4 w-48 rounded bg-slate-200" />
                          <div className="h-3 w-32 rounded bg-slate-100" />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <Package className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      {hasActiveFilters ? 'No product submissions match your filters' : 'No product submissions found'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {hasActiveFilters
                        ? 'Try clearing your search query or choosing another tab.'
                        : 'New custom products requested by sellers will appear here.'}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        className="mt-4 gap-1.5 text-xs border-slate-200"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Clear Filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((s) => {
                  const mapped = s.mappedMasterProductId as { status?: string } | undefined;
                  const isMasterPublic = mapped?.status === 'ACTIVE';
                  const sellerObj = s.sellerId as
                    | { _id?: string; fullName?: string; shopName?: string; mobileNumber?: string }
                    | undefined;
                  const sellerId = String(sellerObj?._id || '');
                  const shortShopId = sellerId ? `SH-${sellerId.slice(-4).toUpperCase()}` : '';

                  const imageUrl =
                    (s.photoUrl as string) ||
                    (s.frontImageUrl as string) ||
                    (Array.isArray(s.images) && s.images[0] ? String(s.images[0]) : '');

                  const sellingPriceRupees =
                    s.sellingPricePaise != null
                      ? (Number(s.sellingPricePaise) / 100).toFixed(0)
                      : null;

                  return (
                    <TableRow
                      key={String(s._id)}
                      className="hover:bg-amber-50/30 transition-colors border-b border-slate-100"
                    >
                      {/* Product Thumbnail + Name + Category Path + Medical Tag */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          {/* Image Thumbnail Preview */}
                          <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center relative">
                            {imageUrl && imageUrl.startsWith('http') ? (
                              <Image
                                src={imageUrl}
                                alt={String(s.submittedProductName || 'Product')}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-slate-400" />
                            )}
                          </div>

                          {/* Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link
                                href={`/product-submissions/${String(s._id)}`}
                                className="font-bold text-slate-900 hover:text-amber-800 text-sm truncate transition-colors"
                              >
                                {String(s.submittedProductName || '—')}
                              </Link>
                              {Boolean(s.isMedicalProduct || s.genericName) && (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                  Medical
                                  {s.prescriptionRequired != null
                                    ? ` · ${s.prescriptionRequired ? 'Rx Required' : 'OTC'}`
                                    : s.prescriptionCategory
                                    ? ` · ${
                                        String(s.prescriptionCategory).includes('Rx') ||
                                        String(s.prescriptionCategory).includes('Schedule')
                                          ? 'Rx'
                                          : 'OTC'
                                      }`
                                    : ''}
                                </span>
                              )}
                            </div>

                            {Boolean(s.genericName) && (
                              <p className="text-xs text-blue-600 font-medium mt-0.5">
                                Generic: {String(s.genericName)}
                              </p>
                            )}

                            {Boolean(s.brand) && (
                              <p className="text-xs text-slate-500 font-medium">
                                Brand: <span className="text-slate-700">{String(s.brand)}</span>
                              </p>
                            )}

                            <p className="mt-0.5 text-[11px] text-slate-500 font-medium">
                              {[
                                (s.medicalCategory as string) ||
                                  (typeof s.categoryId === 'object' && (s.categoryId as any)?.name),
                                (s.medicalSubcategory as string) ||
                                  (typeof s.subcategoryId === 'object' && (s.subcategoryId as any)?.name),
                                (s.productType as string) ||
                                  (typeof s.productTypeId === 'object' && (s.productTypeId as any)?.name),
                              ]
                                .filter(Boolean)
                                .join(' › ')}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Price & Pack */}
                      <TableCell className="py-3">
                        <div className="space-y-0.5">
                          {sellingPriceRupees ? (
                            <span className="text-sm font-bold text-slate-900">
                              ₹{sellingPriceRupees}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                          <p className="text-xs text-slate-600">
                            {String(s.packOrSoldAs || s.quantity || 'Standard')}
                          </p>
                        </div>
                      </TableCell>

                      {/* Lifespan */}
                      <TableCell className="py-3 text-slate-700 font-medium text-xs">
                        {s.lifespanValue != null ? `${s.lifespanValue} ${s.lifespanUnit || 'Days'}` : '—'}
                      </TableCell>

                      {/* Shop / Seller */}
                      <TableCell className="py-3">
                        {sellerId ? (
                          <div className="space-y-0.5">
                            <Link
                              href={`/sellers/stores/${sellerId}?tab=custom`}
                              className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-amber-800 text-xs transition-colors"
                              title="Open shop custom products"
                            >
                              <Store className="h-3 w-3 text-amber-600 shrink-0" />
                              <span className="truncate max-w-[140px]">
                                {sellerObj?.shopName || sellerObj?.fullName || 'Shop'}
                              </span>
                            </Link>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <span className="font-mono text-slate-600">{shortShopId}</span>
                              {sellerObj?.fullName && sellerObj?.shopName && (
                                <>
                                  <span>&middot;</span>
                                  <span className="truncate max-w-[110px]">{sellerObj.fullName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {sellerObj?.shopName || sellerObj?.fullName || '—'}
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3">
                        <StatusBadge status={String(s.status || 'PENDING')} />
                      </TableCell>

                      {/* Catalogue Mapping */}
                      <TableCell className="py-3">
                        {mapped ? (
                          isMasterPublic ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                              Master Catalogue
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-400/30">
                              Seller Specific
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Unmapped</span>
                        )}
                      </TableCell>

                      {/* Submitted Date */}
                      <TableCell className="py-3 text-slate-600 text-xs whitespace-nowrap">
                        {s.createdAt ? format(new Date(String(s.createdAt)), 'MMM d, yyyy') : '—'}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            asChild
                            size="sm"
                            className="h-8 px-3 text-xs font-semibold bg-[#FACC15] hover:bg-amber-400 text-slate-950 shadow-2xs border border-amber-400/60"
                          >
                            <Link href={`/product-submissions/${String(s._id)}`}>
                              Review
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() =>
                              setDeleteTarget({
                                id: String(s._id),
                                name: String(s.submittedProductName || 'this product'),
                              })
                            }
                            title="Mark as deleted"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 px-4 py-3 gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16 bg-white text-xs border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="hidden sm:inline">
                Showing {Math.min((page - 1) * pageSize + 1, total)} to{' '}
                {Math.min(page * pageSize, total)} of {total} submissions
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-600 mr-2 sm:hidden">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs border-slate-200"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="text-xs font-semibold text-slate-800 px-2 hidden sm:inline">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs border-slate-200"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Product Submission"
        itemName={deleteTarget?.name}
        description={`Are you sure you want to mark "${deleteTarget?.name}" as DELETED? It will be removed from the store catalog.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
