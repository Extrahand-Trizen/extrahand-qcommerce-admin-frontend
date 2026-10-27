'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Clock,
  Timer,
  Trash2,
  ChevronRight,
  Search,
  Download,
  Plus,
  Phone,
  Info,
  MoreVertical,
  Store,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Power,
  ShieldAlert,
  Calendar,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export type SellerRow = {
  _id: string;
  userId?: string;
  fullName: string;
  mobileNumber: string;
  email?: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REJECTED' | 'DELETED' | string;
  onboardingStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'CHANGES_REQUIRED' | 'APPROVED' | 'REJECTED' | string;
  createdAt?: string;
  deletedAt?: string;
  lastLoginAt?: string;
  onboarding?: {
    _id?: string;
    shopName?: string;
    shopType?: string;
    category?: string;
    city?: string;
    state?: string;
    status?: string;
    mobileNumber?: string;
    shopMobileNumber?: string;
  } | null;
};

export type SellerSummary = {
  total: number;
  active: number;
  pendingApproval: number;
  inactive: number;
  suspended: number;
  deleted?: number;
  inactiveSuspended: number;
  inProgress: number;
  approved: number;
};

type FilterTab = 'current' | 'pending_approval' | 'in_progress' | 'deleted';

// Helper to extract clean initials for avatar (e.g. KV, SR)
function getInitials(name?: string): string {
  if (!name) return 'SR';
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

// Helper to format Seller ID (e.g. S-1024)
function getSellerIdDisplay(seller: SellerRow): string {
  if (seller.userId && /^S-\d+/i.test(seller.userId)) {
    return seller.userId.toUpperCase();
  }
  if (seller.userId && seller.userId.length <= 8) {
    return `S-${seller.userId}`;
  }
  return `S-${seller._id.slice(-4).toUpperCase()}`;
}

// Helper to format Shop ID (e.g. SH-7732)
function getShopIdDisplay(seller: SellerRow): string {
  if (seller.onboarding?._id) {
    return `SH-${seller.onboarding._id.slice(-4).toUpperCase()}`;
  }
  return `SH-${seller._id.slice(-4).toUpperCase()}`;
}

// Helper to resolve clean display phone without dummy zeros
function getDisplayPhone(seller: SellerRow): string {
  const p = seller.mobileNumber;
  if (p && !/^0+$/.test(p) && p !== '0000000000') {
    return p;
  }
  const onbPhone = seller.onboarding?.mobileNumber || (seller.onboarding as any)?.shopMobileNumber;
  if (onbPhone && !/^0+$/.test(onbPhone) && onbPhone !== '0000000000') {
    return onbPhone;
  }
  return '—';
}

export default function SellerUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State initialized from URL query params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [tab, setTab] = useState<FilterTab>((searchParams.get('tab') as FilterTab) || 'current');
  const [accountStatus, setAccountStatus] = useState<string>(searchParams.get('accountStatus') || 'all');
  const [onboardingFilter, setOnboardingFilter] = useState<string>(searchParams.get('onboarding') || 'all');
  const [shopType, setShopType] = useState<string>(searchParams.get('shopType') || 'all');
  const [dateRange, setDateRange] = useState<string>(searchParams.get('dateRange') || 'all');
  const [page, setPage] = useState(Number(searchParams.get('page') || '1'));
  const [limit, setLimit] = useState(Number(searchParams.get('limit') || '25'));

  // Modals state
  const [deleteTarget, setDeleteTarget] = useState<SellerRow | null>(null);
  const [isAddSellerOpen, setIsAddSellerOpen] = useState(false);
  const [newSellerData, setNewSellerData] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    shopName: '',
    category: 'grocery',
  });

  const qc = useQueryClient();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (tab !== 'current') params.set('tab', tab);
    if (accountStatus !== 'all') params.set('accountStatus', accountStatus);
    if (onboardingFilter !== 'all') params.set('onboarding', onboardingFilter);
    if (shopType !== 'all') params.set('shopType', shopType);
    if (dateRange !== 'all') params.set('dateRange', dateRange);
    if (page > 1) params.set('page', String(page));
    if (limit !== 25) params.set('limit', String(limit));
    const qs = params.toString();
    const target = qs ? `/sellers/users?${qs}` : '/sellers/users';
    router.replace(target, { scroll: false });
  }, [debouncedSearch, tab, accountStatus, onboardingFilter, shopType, dateRange, page, limit, router]);

  // Main Query
  const { data, isLoading } = useQuery({
    queryKey: ['sellers', debouncedSearch, tab, accountStatus, onboardingFilter, shopType, dateRange, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      params.set('tab', tab);
      if (tab === 'deleted') {
        params.set('sortBy', 'deletedAt');
        params.set('sortOrder', 'desc');
      }
      if (accountStatus !== 'all') params.set('status', accountStatus);
      if (onboardingFilter !== 'all') params.set('onboardingStatus', onboardingFilter);
      if (shopType !== 'all') params.set('shopType', shopType);
      if (dateRange !== 'all') params.set('dateRange', dateRange);

      const res = await api<{
        items: SellerRow[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        summary?: SellerSummary;
      }>(`${endpoints.sellers}?${params}`);

      return res.data || { items: [], total: 0, page: 1, limit: 25, totalPages: 1 };
    },
  });

  const sellers = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const summary = data?.summary;

  // Status Mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api(`${endpoints.sellers}/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (_, vars) => {
      toast.success(`Seller status updated to ${vars.status}`);
      qc.invalidateQueries({ queryKey: ['sellers'] });
      qc.invalidateQueries({ queryKey: ['seller-stores'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update status'),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api(`${endpoints.sellers}/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Seller deleted successfully');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['sellers'] });
      qc.invalidateQueries({ queryKey: ['seller-stores'] });
      qc.invalidateQueries({ queryKey: ['seller-approvals'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete seller'),
  });

  // Create Seller Mutation
  const createSellerMutation = useMutation({
    mutationFn: async (payload: typeof newSellerData) => {
      return api('/sellers/admin/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success('Seller account created successfully');
      setIsAddSellerOpen(false);
      setNewSellerData({
        fullName: '',
        mobileNumber: '',
        email: '',
        shopName: '',
        category: 'grocery',
      });
      qc.invalidateQueries({ queryKey: ['sellers'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create seller'),
  });

  // Export CSV
  const exportToCSV = (targetRows: SellerRow[]) => {
    if (!targetRows.length) {
      toast.error('No seller records to export');
      return;
    }
    const headers = [
      'Seller ID',
      'Shop ID',
      'Full Name',
      'Shop Name',
      'Mobile Number',
      'Email',
      'Account Status',
      'Onboarding Status',
      'Created Date',
      'Deleted Date',
    ];

    const csvRows = targetRows.map((s) => [
      `"${getSellerIdDisplay(s)}"`,
      `"${getShopIdDisplay(s)}"`,
      `"${s.fullName || ''}"`,
      `"${s.onboarding?.shopName || ''}"`,
      `"${getDisplayPhone(s)}"`,
      `"${s.email || ''}"`,
      `"${s.status || ''}"`,
      `"${s.onboardingStatus || ''}"`,
      `"${s.createdAt ? format(new Date(s.createdAt), 'MMM d, yyyy') : ''}"`,
      `"${s.deletedAt ? format(new Date(s.deletedAt), 'MMM d, yyyy') : ''}"`,
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sellers-management-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${targetRows.length} sellers to CSV`);
  };

  // Helper Labels for Select Boxes
  const accountStatusLabels: Record<string, string> = {
    all: 'All',
    ACTIVE: 'Active',
    PENDING: 'Pending',
    INACTIVE: 'Inactive',
    SUSPENDED: 'Suspended',
  };

  const onboardingLabels: Record<string, string> = {
    all: 'All',
    APPROVED: 'Approved',
    PENDING_APPROVAL: 'Review Required',
    IN_PROGRESS: 'In Progress',
    CHANGES_REQUIRED: 'Changes Required',
    REJECTED: 'Rejected',
  };

  const shopTypeLabels: Record<string, string> = {
    all: 'All',
    grocery: 'Grocery',
    supermarket: 'Supermarket',
    fresh_produce: 'Fresh Produce',
    dairy: 'Dairy & Bakery',
    meat: 'Meat & Seafood',
    pharmacy: 'Pharmacy',
  };

  const currentMonthLabel = `This Month (${format(new Date(), 'MMM yyyy')})`;
  const dateRangeLabels: Record<string, string> = {
    all: 'All Time',
    this_month: currentMonthLabel,
    today: 'Today',
    last_7_days: 'Last 7 Days',
    last_30_days: 'Last 30 Days',
  };

  // Dynamic KPI counts matching the 4 cards and 4 tabs in the screenshot
  const currentCount = summary?.total ?? total;
  const pendingCount = summary?.pendingApproval ?? 0;
  const inProgressCount = summary?.inProgress ?? 0;
  const deletedCount = summary?.deleted ?? summary?.inactiveSuspended ?? ((summary?.inactive ?? 0) + (summary?.suspended ?? 0));

  return (
    <div className="w-full space-y-5 pb-14 text-slate-800">
      {/* 1. Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900">
            Seller Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage seller accounts, shops, onboarding and account history.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCSV(sellers)}
            disabled={!sellers.length}
            className="h-9.5 px-3.5 gap-2 border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-2xs rounded-lg"
          >
            <Download className="h-4 w-4 text-slate-600" />
            Export CSV
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddSellerOpen(true)}
            className="h-9.5 px-4 gap-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-semibold text-xs sm:text-sm shadow-2xs rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Add Seller
          </Button>
        </div>
      </div>

      {/* 2. Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Current Sellers */}
        <div
          onClick={() => {
            setTab('current');
            setPage(1);
          }}
          className={`flex items-center justify-between rounded-xl border bg-white p-4 shadow-2xs transition-all cursor-pointer ${
            tab === 'current'
              ? 'border-amber-400 ring-2 ring-amber-400/20'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Current Sellers</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                {currentCount}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        </div>

        {/* Card 2: Pending Approval */}
        <div
          onClick={() => {
            setTab('pending_approval');
            setPage(1);
          }}
          className={`flex items-center justify-between rounded-xl border bg-white p-4 shadow-2xs transition-all cursor-pointer ${
            tab === 'pending_approval'
              ? 'border-amber-400 ring-2 ring-amber-400/20'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Pending Approval</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                {pendingCount}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        </div>

        {/* Card 3: Registration in Progress */}
        <div
          onClick={() => {
            setTab('in_progress');
            setPage(1);
          }}
          className={`flex items-center justify-between rounded-xl border bg-white p-4 shadow-2xs transition-all cursor-pointer ${
            tab === 'in_progress'
              ? 'border-amber-400 ring-2 ring-amber-400/20'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-600 shrink-0">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Registration in Progress</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                {inProgressCount}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        </div>

        {/* Card 4: Deleted / Archived */}
        <div
          onClick={() => {
            setTab('deleted');
            setPage(1);
          }}
          className={`flex items-center justify-between rounded-xl border bg-white p-4 shadow-2xs transition-all cursor-pointer ${
            tab === 'deleted'
              ? 'border-amber-400 ring-2 ring-amber-400/20'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500 shrink-0">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Deleted / Archived</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                {deletedCount}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        </div>
      </div>

      {/* 3. Search and Filters Toolbar (ONE SINGLE HORIZONTAL ROW MATCHING REFERENCE IMAGE) */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2.5 sm:gap-3 w-full">
        {/* Search Input Bar (Expands horizontally) */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search seller, shop, phone, Seller ID or Shop ID..."
            className="h-10.5 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns Row container to guarantee horizontal alignment */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Dropdown 1: Account Status */}
          <div className="w-[145px] shrink-0">
            <Select
              value={accountStatus}
              onValueChange={(val) => {
                setAccountStatus(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10.5 w-full bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center justify-between shadow-2xs hover:border-slate-300">
                <div className="flex flex-col text-left mr-1">
                  <span className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">
                    Account Status
                  </span>
                  <span className="text-xs font-semibold text-slate-800 leading-tight truncate">
                    {accountStatusLabels[accountStatus] || 'All'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dropdown 2: Onboarding */}
          <div className="w-[135px] shrink-0">
            <Select
              value={onboardingFilter}
              onValueChange={(val) => {
                setOnboardingFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10.5 w-full bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center justify-between shadow-2xs hover:border-slate-300">
                <div className="flex flex-col text-left mr-1">
                  <span className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">
                    Onboarding
                  </span>
                  <span className="text-xs font-semibold text-slate-800 leading-tight truncate">
                    {onboardingLabels[onboardingFilter] || 'All'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Review Required</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="CHANGES_REQUIRED">Changes Required</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dropdown 3: Shop Type */}
          <div className="w-[125px] shrink-0">
            <Select
              value={shopType}
              onValueChange={(val) => {
                setShopType(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10.5 w-full bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center justify-between shadow-2xs hover:border-slate-300">
                <div className="flex flex-col text-left mr-1">
                  <span className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">
                    Shop Type
                  </span>
                  <span className="text-xs font-semibold text-slate-800 leading-tight truncate">
                    {shopTypeLabels[shopType] || 'All'}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="grocery">Grocery</SelectItem>
                <SelectItem value="supermarket">Supermarket</SelectItem>
                <SelectItem value="fresh_produce">Fresh Produce</SelectItem>
                <SelectItem value="dairy">Dairy & Bakery</SelectItem>
                <SelectItem value="meat">Meat & Seafood</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dropdown 4: Date Range */}
          <div className="w-[225px] shrink-0">
            <Select
              value={dateRange}
              onValueChange={(val) => {
                setDateRange(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10.5 w-full bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center justify-between shadow-2xs hover:border-slate-300">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="flex flex-col text-left mr-1 truncate">
                    <span className="text-[10px] text-slate-400 font-medium leading-none mb-0.5">
                      Date Range
                    </span>
                    <span className="text-xs font-semibold text-slate-800 leading-tight truncate">
                      {dateRangeLabels[dateRange] || 'All Time'}
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
        </div>
      </div>

      {/* 4. Tab Pills Bar (EXACTLY THE 4 PILLS FROM REFERENCE IMAGE) */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100/70 p-1 w-fit">
        <button
          type="button"
          onClick={() => {
            setTab('current');
            setPage(1);
          }}
          className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
            tab === 'current'
              ? 'bg-[#f59e0b] text-slate-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          Current Sellers ({currentCount})
        </button>

        <button
          type="button"
          onClick={() => {
            setTab('pending_approval');
            setPage(1);
          }}
          className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
            tab === 'pending_approval'
              ? 'bg-[#f59e0b] text-slate-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          Pending ({pendingCount})
        </button>

        <button
          type="button"
          onClick={() => {
            setTab('in_progress');
            setPage(1);
          }}
          className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
            tab === 'in_progress'
              ? 'bg-[#f59e0b] text-slate-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          Registration in Progress ({inProgressCount})
        </button>

        <button
          type="button"
          onClick={() => {
            setTab('deleted');
            setPage(1);
          }}
          className={`rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
            tab === 'deleted'
              ? 'bg-[#f59e0b] text-slate-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          Deleted / Archived ({deletedCount})
        </button>
      </div>

      {/* 5. Info Alert Banner */}
      <div className="flex items-center gap-2.5 rounded-lg border border-amber-200/70 bg-[#fffbeb] px-4 py-3 text-xs sm:text-sm text-slate-700 shadow-2xs">
        <Info className="h-4 w-4 text-amber-600 shrink-0" />
        <span>
          Deleted shops are hidden from Current Sellers. View historical records in Deleted / Archived.
        </span>
      </div>

      {/* 6. Clean Data Table Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 bg-slate-50/50 hover:bg-transparent">
                <TableHead className="min-w-[260px] py-3.5 pl-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  SELLER &amp; SHOP
                </TableHead>
                <TableHead className="min-w-[160px] py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  SELLER ID / SHOP ID
                </TableHead>
                <TableHead className="min-w-[160px] py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  CONTACT
                </TableHead>
                <TableHead className="min-w-[140px] py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  ACCOUNT STATUS
                </TableHead>
                <TableHead className="min-w-[140px] py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  ONBOARDING
                </TableHead>
                <TableHead className="min-w-[150px] py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {tab === 'deleted' ? 'DELETED / CREATED' : 'CREATED'}
                </TableHead>
                <TableHead className="w-[80px] py-3.5 pr-6 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton Rows
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse border-b border-slate-100">
                    <TableCell className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-32 rounded bg-slate-200" />
                          <div className="h-3 w-24 rounded bg-slate-100" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="h-3.5 w-16 rounded bg-slate-200" />
                        <div className="h-3 w-14 rounded bg-slate-100" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-3.5 w-24 rounded bg-slate-100" />
                    </TableCell>
                    <TableCell>
                      <div className="h-6 w-20 rounded-full bg-slate-100" />
                    </TableCell>
                    <TableCell>
                      <div className="h-6 w-24 rounded-full bg-slate-100" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3.5 w-20 rounded bg-slate-100" />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="ml-auto h-7 w-7 rounded bg-slate-100" />
                    </TableCell>
                  </TableRow>
                ))
              ) : sellers.length === 0 ? (
                // Empty State
                <TableRow>
                  <TableCell colSpan={7} className="py-14 text-center">
                    <Users className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-2.5 text-sm font-semibold text-slate-900">
                      No sellers match your criteria
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Try searching with another keyword or resetting the filters.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                // Table Rows
                sellers.map((s) => {
                  const onboarding = s.onboarding;
                  const sellerId = getSellerIdDisplay(s);
                  const shopId = getShopIdDisplay(s);
                  const initials = getInitials(s.fullName);
                  const isStoreApproved = s.onboardingStatus === 'APPROVED';
                  const isPendingApproval = s.onboardingStatus === 'PENDING_APPROVAL';

                  // Account Status badge configuration
                  const accountStatusNorm = String(s.status || 'PENDING').toUpperCase();
                  const isAccountActive = accountStatusNorm === 'ACTIVE';
                  const isAccountPending = accountStatusNorm === 'PENDING';
                  const isAccountInactive = accountStatusNorm === 'INACTIVE';

                  // Onboarding badge configuration
                  const onboardingNorm = String(s.onboardingStatus || 'DRAFT').toUpperCase();
                  const isOnboardingApproved = onboardingNorm === 'APPROVED';
                  const isOnboardingReviewReq = onboardingNorm === 'PENDING_APPROVAL' || onboardingNorm === 'CHANGES_REQUIRED';
                  const isOnboardingInProgress = onboardingNorm === 'DRAFT';
                  const isOnboardingRejected = onboardingNorm === 'REJECTED';

                  return (
                    <TableRow
                      key={s._id}
                      className="group border-b border-slate-100 transition-colors hover:bg-slate-50/70"
                    >
                      {/* 1. SELLER & SHOP */}
                      <TableCell className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          {/* Circular Avatar with Initials */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200/60 bg-[#fef3c7] text-xs font-semibold text-[#92400e]">
                            {initials}
                          </div>

                          <div className="space-y-0.5">
                            <Link
                              href={`/sellers/users/${s._id}`}
                              className="text-sm font-semibold text-slate-900 transition-colors hover:text-amber-700"
                            >
                              {s.fullName || 'Unnamed Seller'}
                            </Link>

                            <p className="text-xs text-slate-500 font-normal">
                              {onboarding?.shopName || 'Store not setup'}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. SELLER ID / SHOP ID */}
                      <TableCell className="py-4">
                        <div className="space-y-0.5">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 font-mono">
                            {sellerId}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">
                            {shopId}
                          </p>
                        </div>
                      </TableCell>

                      {/* 3. CONTACT */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 font-mono">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{getDisplayPhone(s)}</span>
                        </div>
                      </TableCell>

                      {/* 4. ACCOUNT STATUS */}
                      <TableCell className="py-4">
                        {isAccountActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : isAccountPending ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Pending
                          </span>
                        ) : isAccountInactive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/70 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            {accountStatusNorm.toLowerCase()}
                          </span>
                        )}
                      </TableCell>

                      {/* 5. ONBOARDING */}
                      <TableCell className="py-4">
                        {isOnboardingApproved ? (
                          <span className="inline-flex items-center justify-center rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                            Approved
                          </span>
                        ) : isOnboardingReviewReq ? (
                          <span className="inline-flex items-center justify-center rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                            Review Required
                          </span>
                        ) : isOnboardingInProgress ? (
                          <span className="inline-flex items-center justify-center rounded-full border border-sky-200/70 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                            In Progress
                          </span>
                        ) : isOnboardingRejected ? (
                          <span className="inline-flex items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                            Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                            {onboardingNorm.toLowerCase()}
                          </span>
                        )}
                      </TableCell>

                      {/* 6. CREATED / DELETED */}
                      <TableCell className="py-4 text-xs sm:text-sm font-normal text-slate-600">
                        {tab === 'deleted' ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                              <span className="text-[10px] uppercase font-bold text-rose-500">Deleted:</span>
                              <span>{s.deletedAt ? format(new Date(s.deletedAt), 'MMM d, yyyy') : s.createdAt ? format(new Date(s.createdAt), 'MMM d, yyyy') : '—'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                              <span className="text-[10px] uppercase font-medium">Created:</span>
                              <span>{s.createdAt ? format(new Date(s.createdAt), 'MMM d, yyyy') : '—'}</span>
                            </div>
                          </div>
                        ) : (
                          s.createdAt ? format(new Date(s.createdAt), 'MMM d, yyyy') : '—'
                        )}
                      </TableCell>

                      {/* 7. ACTIONS */}
                      <TableCell className="py-4 pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg ml-auto"
                              title="Actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 text-xs">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/sellers/users/${s._id}`}
                                className="flex items-center gap-2 cursor-pointer font-medium"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-500" />
                                View Seller Details
                              </Link>
                            </DropdownMenuItem>

                            {isStoreApproved && (
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/sellers/stores/${s._id}`}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Store className="h-3.5 w-3.5 text-slate-500" />
                                  View Store &amp; Products
                                </Link>
                              </DropdownMenuItem>
                            )}

                            {isPendingApproval && (
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/sellers/approvals/${s._id}`}
                                  className="flex items-center gap-2 cursor-pointer text-amber-700 font-medium"
                                >
                                  <ClipboardCheck className="h-3.5 w-3.5 text-amber-600" />
                                  Review Application
                                </Link>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {s.status === 'ACTIVE' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => statusMutation.mutate({ id: s._id, status: 'INACTIVE' })}
                                  className="flex items-center gap-2 cursor-pointer text-slate-700"
                                >
                                  <Power className="h-3.5 w-3.5 text-slate-500" />
                                  Deactivate Seller
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => statusMutation.mutate({ id: s._id, status: 'SUSPENDED' })}
                                  className="flex items-center gap-2 cursor-pointer text-rose-700"
                                >
                                  <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                                  Suspend Account
                                </DropdownMenuItem>
                              </>
                            )}

                            {s.status === 'INACTIVE' && (
                              <DropdownMenuItem
                                onClick={() => statusMutation.mutate({ id: s._id, status: 'ACTIVE' })}
                                className="flex items-center gap-2 cursor-pointer text-emerald-700 font-medium"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                Activate Seller
                              </DropdownMenuItem>
                            )}

                            {s.status === 'SUSPENDED' && (
                              <DropdownMenuItem
                                onClick={() => statusMutation.mutate({ id: s._id, status: 'ACTIVE' })}
                                className="flex items-center gap-2 cursor-pointer text-amber-900 font-medium"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                                Reactivate Seller
                              </DropdownMenuItem>
                            )}

                            {s.status === 'PENDING' && (
                              <DropdownMenuItem
                                onClick={() => statusMutation.mutate({ id: s._id, status: 'ACTIVE' })}
                                className="flex items-center gap-2 cursor-pointer text-amber-900 font-medium"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                                Activate Account
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(s)}
                              className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Profile
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t border-slate-100 gap-3">
          <div className="text-xs text-slate-500">
            {total > 0 ? (
              <>
                Showing <span className="font-semibold text-slate-900">{(page - 1) * limit + 1}</span>–
                <span className="font-semibold text-slate-900">{Math.min(page * limit, total)}</span> of{' '}
                <span className="font-semibold text-slate-900">{total.toLocaleString()}</span> sellers
              </>
            ) : (
              '0 sellers'
            )}
          </div>

          {totalPages > 1 && (
            <PaginationBar
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
              className="border-t-0 p-0"
            />
          )}
        </div>
      </div>

      {/* Add Seller Dialog */}
      <Dialog open={isAddSellerOpen} onOpenChange={setIsAddSellerOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Add New Seller</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Create a seller profile and initiate onboarding. They will receive access to the seller portal.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSellerData.fullName.trim() || !newSellerData.mobileNumber.trim()) {
                toast.error('Full Name and Mobile Number are required');
                return;
              }
              createSellerMutation.mutate(newSellerData);
            }}
            className="space-y-3.5 py-2"
          >
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newSellerData.fullName}
                onChange={(e) => setNewSellerData((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="e.g. Kota Venkatesh"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={newSellerData.mobileNumber}
                onChange={(e) => setNewSellerData((p) => ({ ...p, mobileNumber: e.target.value.replace(/\D/g, '') }))}
                placeholder="e.g. 7981580955"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={newSellerData.email}
                onChange={(e) => setNewSellerData((p) => ({ ...p, email: e.target.value }))}
                placeholder="seller@example.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  value={newSellerData.shopName}
                  onChange={(e) => setNewSellerData((p) => ({ ...p, shopName: e.target.value }))}
                  placeholder="e.g. Venkatesh Testing Prod"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Shop Type
                </label>
                <select
                  value={newSellerData.category}
                  onChange={(e) => setNewSellerData((p) => ({ ...p, category: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                >
                  <option value="grocery">Grocery</option>
                  <option value="supermarket">Supermarket</option>
                  <option value="fresh_produce">Fresh Produce</option>
                  <option value="dairy">Dairy & Bakery</option>
                  <option value="meat">Meat & Seafood</option>
                  <option value="pharmacy">Pharmacy</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddSellerOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createSellerMutation.isPending}
                className="bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-semibold text-xs"
              >
                {createSellerMutation.isPending ? 'Creating...' : 'Create Seller'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete seller account?"
        itemName={deleteTarget?.fullName}
        description={
          deleteTarget
            ? `This will permanently delete the seller account for "${deleteTarget.fullName}" (${deleteTarget.mobileNumber}), including onboarding data, documents, and product listings. This cannot be undone.`
            : undefined
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget._id);
        }}
      />
    </div>
  );
}
