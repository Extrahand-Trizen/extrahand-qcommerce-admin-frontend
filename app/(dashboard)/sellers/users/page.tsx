'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
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
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  RotateCcw,
  MoreHorizontal,
  ExternalLink,
  Store,
  Phone,
  Mail,
  Copy,
  Download,
  ShieldAlert,
  Power,
  ClipboardCheck,
  Eye,
  Trash2,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getCategoryLabel } from '@/lib/seller-onboarding';

export type SellerRow = {
  _id: string;
  userId?: string;
  fullName: string;
  mobileNumber: string;
  email?: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'REJECTED' | 'DELETED' | string;
  onboardingStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'CHANGES_REQUIRED' | 'APPROVED' | 'REJECTED' | string;
  createdAt?: string;
  lastLoginAt?: string;
  onboarding?: {
    _id?: string;
    shopName?: string;
    shopType?: string;
    category?: string;
    city?: string;
    state?: string;
    status?: string;
  } | null;
};

export type SellerSummary = {
  total: number;
  active: number;
  pendingApproval: number;
  inactive: number;
  suspended: number;
  inactiveSuspended: number;
  inProgress: number;
  approved: number;
};

type FilterTab = 'all' | 'active' | 'pending_approval' | 'in_progress' | 'inactive' | 'suspended' | 'inactive_suspended';

export default function SellerUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State initialized from URL query params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [tab, setTab] = useState<FilterTab>((searchParams.get('tab') as FilterTab) || 'all');
  const [page, setPage] = useState(Number(searchParams.get('page') || '1'));
  const [limit, setLimit] = useState(Number(searchParams.get('limit') || '25'));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<SellerRow | null>(null);

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
    if (tab !== 'all') params.set('tab', tab);
    if (page > 1) params.set('page', String(page));
    if (limit !== 25) params.set('limit', String(limit));
    const qs = params.toString();
    const target = qs ? `/sellers/users?${qs}` : '/sellers/users';
    router.replace(target, { scroll: false });
  }, [debouncedSearch, tab, page, limit, router]);

  // Main Query
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sellers', debouncedSearch, tab, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (tab !== 'all') params.set('tab', tab);

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

  // Bulk Status Mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      return Promise.all(
        ids.map((id) =>
          api(`${endpoints.sellers}/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
          })
        )
      );
    },
    onSuccess: (_, vars) => {
      toast.success(`${vars.ids.length} sellers updated to ${vars.status}`);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ['sellers'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Bulk status update failed'),
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

  // Clipboard copy
  const copyText = (text: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Row Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === sellers.length && sellers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sellers.map((s) => s._id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setTab('all');
    setPage(1);
    setSelectedIds(new Set());
  };

  const hasActiveFilters = Boolean(search.trim() || tab !== 'all');

  // Export CSV
  const exportToCSV = (targetRows: SellerRow[]) => {
    if (!targetRows.length) {
      toast.error('No seller records to export');
      return;
    }
    const headers = [
      'Seller ID',
      'Full Name',
      'Mobile Number',
      'Email',
      'Shop Name',
      'Shop Category',
      'Account Status',
      'Registration Status',
      'Created Date',
    ];

    const csvRows = targetRows.map((s) => [
      `"${s._id}"`,
      `"${s.fullName || ''}"`,
      `"${s.mobileNumber || ''}"`,
      `"${s.email || ''}"`,
      `"${s.onboarding?.shopName || ''}"`,
      `"${s.onboarding?.category || s.onboarding?.shopType || ''}"`,
      `"${s.status || ''}"`,
      `"${s.onboardingStatus || ''}"`,
      `"${s.createdAt ? format(new Date(s.createdAt), 'yyyy-MM-dd') : ''}"`,
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sellers-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${targetRows.length} sellers to CSV`);
  };

  // Formatter for Onboarding / Registration Status
  const formatRegistrationStatus = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Completed';
      case 'PENDING_APPROVAL':
        return 'Pending Approval';
      case 'CHANGES_REQUIRED':
        return 'Changes Required';
      case 'DRAFT':
        return 'In Progress';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  };

  return (
    <div className="w-full space-y-5 pb-12">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Seller Users
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage identity profiles, account standing, and onboarding status across 1,000+ sellers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCSV(sellers)}
            disabled={!sellers.length}
            className="gap-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export Page CSV
          </Button>
        </div>
      </div>

      {/* A. Dashboard Summary Cards (Clickable Filter Shortcuts) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Sellers */}
        <button
          type="button"
          onClick={() => {
            setTab('all');
            setPage(1);
          }}
          className={`flex items-start justify-between rounded-xl border p-4 text-left transition-all ${
            tab === 'all'
              ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400'
              : 'border-slate-200 bg-white text-slate-900 hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="space-y-1">
            <p className={`text-xs font-semibold ${tab === 'all' ? 'text-amber-950' : 'text-muted-foreground'}`}>
              Total Sellers
            </p>
            <p className="text-2xl font-bold tracking-tight">
              {summary?.total ?? total}
            </p>
            <p className={`text-[11px] ${tab === 'all' ? 'text-amber-950/80 font-medium' : 'text-slate-500'}`}>
              All registered accounts
            </p>
          </div>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              tab === 'all' ? 'bg-slate-950 text-amber-300 shadow-2xs' : 'bg-amber-50 text-amber-800 border border-amber-200/50'
            }`}
          >
            <Users className="h-4.5 w-4.5" />
          </div>
        </button>

        {/* Card 2: Pending Approvals */}
        <button
          type="button"
          onClick={() => {
            setTab('pending_approval');
            setPage(1);
          }}
          className={`flex items-start justify-between rounded-xl border p-4 text-left transition-all ${
            tab === 'pending_approval'
              ? 'border-amber-600 bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400'
              : 'border-slate-200 bg-white text-slate-900 hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="space-y-1">
            <p className={`text-xs font-semibold ${tab === 'pending_approval' ? 'text-amber-950' : 'text-muted-foreground'}`}>
              Pending Approvals
            </p>
            <p className="text-2xl font-bold tracking-tight">
              {summary?.pendingApproval ?? 0}
            </p>
            <p className={`text-[11px] ${tab === 'pending_approval' ? 'text-amber-950/80 font-medium' : 'text-amber-700'}`}>
              KYC awaiting review
            </p>
          </div>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              tab === 'pending_approval' ? 'bg-slate-950 text-amber-300 shadow-2xs' : 'bg-amber-50 text-amber-700 border border-amber-200/50'
            }`}
          >
            <Clock className="h-4.5 w-4.5" />
          </div>
        </button>

        {/* Card 3: Active Sellers */}
        <button
          type="button"
          onClick={() => {
            setTab('active');
            setPage(1);
          }}
          className={`flex items-start justify-between rounded-xl border p-4 text-left transition-all ${
            tab === 'active'
              ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400'
              : 'border-slate-200 bg-white text-slate-900 hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="space-y-1">
            <p className={`text-xs font-semibold ${tab === 'active' ? 'text-amber-950' : 'text-muted-foreground'}`}>
              Active Sellers
            </p>
            <p className="text-2xl font-bold tracking-tight">
              {summary?.active ?? 0}
            </p>
            <p className={`text-[11px] ${tab === 'active' ? 'text-amber-950/80 font-medium' : 'text-amber-700'}`}>
              Operational accounts
            </p>
          </div>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              tab === 'active' ? 'bg-slate-950 text-amber-300 shadow-2xs' : 'bg-amber-50 text-amber-800 border border-amber-200/50'
            }`}
          >
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>
        </button>

        {/* Card 4: Inactive / Suspended Sellers */}
        <button
          type="button"
          onClick={() => {
            setTab('inactive_suspended');
            setPage(1);
          }}
          className={`flex items-start justify-between rounded-xl border p-4 text-left transition-all ${
            tab === 'inactive_suspended' || tab === 'inactive' || tab === 'suspended'
              ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400'
              : 'border-slate-200 bg-white text-slate-900 hover:border-amber-300 hover:shadow-xs'
          }`}
        >
          <div className="space-y-1">
            <p className={`text-xs font-semibold ${tab === 'inactive_suspended' || tab === 'inactive' || tab === 'suspended' ? 'text-amber-950' : 'text-muted-foreground'}`}>
              Inactive / Suspended
            </p>
            <p className="text-2xl font-bold tracking-tight">
              {summary?.inactiveSuspended ?? 0}
            </p>
            <p className={`text-[11px] ${tab === 'inactive_suspended' || tab === 'inactive' || tab === 'suspended' ? 'text-amber-950/80 font-medium' : 'text-slate-500'}`}>
              {summary?.inactive ?? 0} inactive &middot; {summary?.suspended ?? 0} suspended
            </p>
          </div>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              tab === 'inactive_suspended' || tab === 'inactive' || tab === 'suspended'
                ? 'bg-slate-950 text-amber-300 shadow-2xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200/50'
            }`}
          >
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
        </button>
      </div>

      {/* Main Container Card */}
      <div className="rounded-xl border border-border bg-white shadow-sm">
        {/* B. Search and Filters Toolbar */}
        <div className="p-4 sm:p-5 border-b border-border space-y-3.5">
          {/* Search Input Bar */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by seller name, shop name, phone, or seller ID..."
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

            {/* Page Size Selector & Reset */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Rows:</span>
                <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8.5 w-18 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8.5 text-xs text-muted-foreground hover:text-amber-800 gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Filter Tabs Immediately Below Search */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => { setTab('all'); setPage(1); }}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                tab === 'all'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs hover:bg-amber-400'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50/70 hover:border-amber-200 hover:text-amber-950'
              }`}
            >
              All Sellers ({summary?.total ?? total})
            </button>
            <button
              type="button"
              onClick={() => { setTab('active'); setPage(1); }}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                tab === 'active'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs hover:bg-amber-400'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50/70 hover:border-amber-200 hover:text-amber-950'
              }`}
            >
              Active ({summary?.active ?? 0})
            </button>
            <button
              type="button"
              onClick={() => { setTab('pending_approval'); setPage(1); }}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                tab === 'pending_approval'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs hover:bg-amber-400'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50/70 hover:border-amber-200 hover:text-amber-950'
              }`}
            >
              Pending Approval ({summary?.pendingApproval ?? 0})
            </button>
            <button
              type="button"
              onClick={() => { setTab('in_progress'); setPage(1); }}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                tab === 'in_progress'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs hover:bg-amber-400'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50/70 hover:border-amber-200 hover:text-amber-950'
              }`}
            >
              Registration in Progress ({summary?.inProgress ?? 0})
            </button>
            <button
              type="button"
              onClick={() => { setTab('inactive'); setPage(1); }}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                tab === 'inactive'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs hover:bg-amber-400'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50/70 hover:border-amber-200 hover:text-amber-950'
              }`}
            >
              Inactive ({summary?.inactive ?? 0})
            </button>
            <button
              type="button"
              onClick={() => { setTab('suspended'); setPage(1); }}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all ${
                tab === 'suspended'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs hover:bg-amber-400'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50/70 hover:border-amber-200 hover:text-amber-950'
              }`}
            >
              Suspended ({summary?.suspended ?? 0})
            </button>
          </div>

          {/* H. Bulk Actions Toolbar (Appears when rows selected) */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-amber-900">
                  {selectedIds.size} {selectedIds.size === 1 ? 'seller' : 'sellers'} selected
                </span>
                <span className="text-amber-700">&middot;</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-amber-800 hover:underline font-medium"
                >
                  Deselect all
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold border border-amber-400/60 shadow-2xs"
                  onClick={() =>
                    bulkStatusMutation.mutate({
                      ids: Array.from(selectedIds),
                      status: 'ACTIVE',
                    })
                  }
                  disabled={bulkStatusMutation.isPending}
                >
                  Activate Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-300 bg-white text-slate-700 hover:bg-slate-100"
                  onClick={() =>
                    bulkStatusMutation.mutate({
                      ids: Array.from(selectedIds),
                      status: 'INACTIVE',
                    })
                  }
                  disabled={bulkStatusMutation.isPending}
                >
                  Deactivate Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-amber-300 bg-white text-slate-800 hover:bg-slate-100"
                  onClick={() => {
                    const selectedRows = sellers.filter((s) => selectedIds.has(s._id));
                    exportToCSV(selectedRows);
                  }}
                >
                  <Download className="mr-1 h-3 w-3" />
                  Export Selected
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* C. Compact Seller Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/70 border-b border-border">
                <TableHead className="w-[42px] px-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === sellers.length && sellers.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 accent-amber-500 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    title="Select all on this page"
                  />
                </TableHead>
                <TableHead className="min-w-[240px]">Seller &amp; Shop</TableHead>
                <TableHead className="min-w-[160px]">Contact</TableHead>
                <TableHead className="min-w-[130px]">Account Status</TableHead>
                <TableHead className="min-w-[150px]">Registration Status</TableHead>
                <TableHead className="min-w-[120px]">Member Since</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Compact Skeleton Loading Rows
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="px-3"><div className="h-4 w-4 rounded bg-slate-200" /></TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="h-4 w-36 rounded bg-slate-200" />
                        <div className="h-3 w-28 rounded bg-slate-100" />
                      </div>
                    </TableCell>
                    <TableCell><div className="h-3.5 w-24 rounded bg-slate-100" /></TableCell>
                    <TableCell><div className="h-5 w-20 rounded-full bg-slate-100" /></TableCell>
                    <TableCell><div className="h-5 w-24 rounded-full bg-slate-100" /></TableCell>
                    <TableCell><div className="h-3.5 w-20 rounded bg-slate-100" /></TableCell>
                    <TableCell className="text-right"><div className="ml-auto h-8 w-8 rounded-lg bg-slate-100" /></TableCell>
                  </TableRow>
                ))
              ) : sellers.length === 0 ? (
                // Empty State
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <Users className="mx-auto h-9 w-9 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {hasActiveFilters ? 'No sellers match your filters' : 'No sellers registered yet'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {hasActiveFilters
                        ? 'Try searching by another keyword or resetting the filter tabs.'
                        : 'New seller signups will appear here.'}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        className="mt-3.5 text-xs gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Clear Filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                // Live Compact Seller Rows
                sellers.map((s) => {
                  const isSelected = selectedIds.has(s._id);
                  const onboarding = s.onboarding;
                  const shortId = `SH-${s._id.slice(-4).toUpperCase()}`;
                  const isStoreApproved = s.onboardingStatus === 'APPROVED';
                  const isPendingApproval = s.onboardingStatus === 'PENDING_APPROVAL';

                  return (
                    <TableRow
                      key={s._id}
                      className={`group transition-colors hover:bg-slate-50/80 ${
                        isSelected ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Checkbox Column */}
                      <TableCell className="px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(s._id)}
                          className="h-4 w-4 rounded border-slate-300 accent-amber-500 text-amber-500 focus:ring-amber-500 cursor-pointer"
                        />
                      </TableCell>

                      {/* 1. Seller & Shop Column */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <Link
                            href={`/sellers/users/${s._id}`}
                            className="font-semibold text-slate-900 hover:text-amber-700 hover:underline transition-colors flex items-center gap-1.5 text-sm"
                          >
                            <span>{s.fullName || 'Unnamed Seller'}</span>
                          </Link>

                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            {onboarding?.shopName ? (
                              <span className="font-medium text-slate-700 flex items-center gap-1">
                                <Store className="h-3 w-3 text-slate-400" />
                                {onboarding.shopName}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Store not setup</span>
                            )}
                            <span>&middot;</span>
                            <button
                              type="button"
                              onClick={(e) => copyText(s._id, 'Seller ID', e)}
                              title="Click to copy full Seller ID"
                              className="font-mono text-[11px] text-slate-500 hover:text-slate-900 inline-flex items-center gap-0.5"
                            >
                              <span>{shortId}</span>
                              <Copy className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Contact Column */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <div className="font-mono text-slate-800 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{s.mobileNumber || '—'}</span>
                          </div>
                          {s.email && (
                            <div className="text-muted-foreground flex items-center gap-1 truncate max-w-[180px]">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span className="truncate">{s.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* 3. Account Status Column (SEPARATE) */}
                      <TableCell>
                        <StatusBadge status={String(s.status || 'PENDING')} />
                      </TableCell>

                      {/* 4. Registration Status Column (SEPARATE) */}
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={String(s.onboardingStatus || 'DRAFT')} />
                          {onboarding?.category && (
                            <span className="text-[10px] text-slate-500">
                              {getCategoryLabel(String(onboarding.category))}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* 5. Created Date Column */}
                      <TableCell className="text-xs text-slate-600 font-mono">
                        {s.createdAt ? format(new Date(s.createdAt), 'MMM d, yyyy') : '—'}
                      </TableCell>

                      {/* 6. Contextual Row Actions (E) */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Primary Shortcut Button */}
                          {isPendingApproval ? (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100 font-medium"
                            >
                              <Link href={`/sellers/approvals/${s._id}`}>
                                Review
                              </Link>
                            </Button>
                          ) : isStoreApproved ? (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-slate-200 text-slate-800 hover:bg-slate-50 font-medium"
                            >
                              <Link href={`/sellers/stores/${s._id}`}>
                                Store
                              </Link>
                            </Button>
                          ) : null}

                          {/* Three-Dot Action Dropdown Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7.5 w-7.5 text-slate-500 hover:text-slate-900"
                                title="Actions"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              {/* Always: View Details */}
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/sellers/users/${s._id}`}
                                  className="flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                                  View Seller Details
                                </Link>
                              </DropdownMenuItem>

                              {/* If store approved: View Store */}
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

                              {/* If pending approval: Review Application */}
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

                              {/* If registration in progress: View Onboarding Progress */}
                              {(s.onboardingStatus === 'DRAFT' || s.onboardingStatus === 'CHANGES_REQUIRED') && (
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/sellers/approvals/${s._id}`}
                                    className="flex items-center gap-2 cursor-pointer text-slate-700"
                                  >
                                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                                    View Onboarding Progress
                                  </Link>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {/* Account Status Transitions */}
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
                                  className="flex items-center gap-2 cursor-pointer text-amber-900 hover:text-amber-950 font-medium"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                                  Reactivate Seller
                                </DropdownMenuItem>
                              )}

                              {s.status === 'PENDING' && (
                                <DropdownMenuItem
                                  onClick={() => statusMutation.mutate({ id: s._id, status: 'ACTIVE' })}
                                  className="flex items-center gap-2 cursor-pointer text-amber-900 hover:text-amber-950 font-medium"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                                  Activate Account
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {/* Hard Delete Option */}
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(s)}
                                className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Profile
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* D. Server-Side Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3.5 border-t border-border gap-3">
          <div className="text-xs text-muted-foreground">
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
