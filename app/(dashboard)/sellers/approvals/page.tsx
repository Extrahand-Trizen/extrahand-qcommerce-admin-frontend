'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getCategoryLabel } from '@/lib/seller-onboarding';
import {
  Search,
  MapPin,
  Calendar,
  Filter,
  ShieldCheck,
  X,
} from 'lucide-react';

interface ApprovalItem {
  _id: string;
  sellerId: { _id?: string; fullName?: string; mobileNumber?: string } | string;
  fullName?: string;
  shopName?: string;
  category?: string;
  shopType?: string;
  city?: string;
  submittedAt?: string;
  createdAt?: string;
  status: string;
}

interface ApprovalsResponse {
  items: ApprovalItem[];
  total: number;
  page: number;
  totalPages: number;
  availableCities?: string[];
}

export default function SellerApprovalsPage() {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<ApprovalsResponse>({
    queryKey: ['seller-approvals', search, cityFilter, dateFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (search.trim()) params.set('search', search.trim());
      if (cityFilter && cityFilter !== 'all') params.set('city', cityFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      if (dateFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.set('startDate', today);
        params.set('endDate', today);
      } else if (dateFilter === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.set('startDate', d.toISOString().split('T')[0]);
      } else if (dateFilter === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.set('startDate', d.toISOString().split('T')[0]);
      }

      const res = await api<ApprovalsResponse>(`${endpoints.sellerApprovals}?${params}`);
      return res.data || { items: [], total: 0, page: 1, totalPages: 1, availableCities: [] };
    },
  });

  const approvals = data?.items || [];
  const total = data?.total ?? approvals.length;
  const totalPages = data?.totalPages || 1;

  // Extract cities strictly based on the applications in this screen
  const applicationCities = useMemo(() => {
    if (data?.availableCities && data.availableCities.length > 0) {
      return data.availableCities;
    }
    const set = new Set<string>();
    approvals.forEach((it) => {
      if (it.city && it.city.trim()) {
        set.add(it.city.trim());
      }
    });
    return Array.from(set).sort();
  }, [data?.availableCities, approvals]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api(`${endpoints.sellers}/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Seller deleted successfully');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['seller-approvals'] });
      qc.invalidateQueries({ queryKey: ['seller-stores'] });
      qc.invalidateQueries({ queryKey: ['sellers'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete seller'),
  });

  const handleResetFilters = () => {
    setSearch('');
    setCityFilter('all');
    setDateFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search.trim() || cityFilter !== 'all' || dateFilter !== 'all' || statusFilter !== 'all'
  );

  return (
    <div className="w-full space-y-4 pb-12">
      {/* Header Container */}
      <div className="rounded-xl border border-border bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Verification &amp; Documents
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Review KYC submissions, shop licenses, certificates and bank documents.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-xs font-semibold text-amber-900 shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              <span>{total} {total === 1 ? 'Application' : 'Applications'}</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by shop name, seller name, mobile number or city..."
              className="w-full rounded-lg border border-gray-300 pl-9 pr-10 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* City Dropdown (Populated strictly from application cities) */}
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500 shrink-0" />
              <select
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 focus:border-amber-500 focus:outline-none"
              >
                <option value="all">All Cities</option>
                {applicationCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Date-Based Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 focus:border-amber-500 focus:outline-none"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 focus:border-amber-500 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="CHANGES_REQUIRED">Changes Required</option>
              </select>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-slate-50/70">
              <TableHead className="font-semibold text-slate-800">Seller Name</TableHead>
              <TableHead className="font-semibold text-slate-800">Shop Name</TableHead>
              <TableHead className="font-semibold text-slate-800">Category</TableHead>
              <TableHead className="font-semibold text-slate-800">City</TableHead>
              <TableHead className="font-semibold text-slate-800">Submitted</TableHead>
              <TableHead className="font-semibold text-slate-800">Status</TableHead>
              <TableHead className="w-[140px] text-right font-semibold text-slate-800">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRows cols={7} />
            ) : !approvals.length ? (
              <TableEmptyRow cols={7} message="No pending approvals match your filter" />
            ) : (
              approvals.map((item) => {
                const seller = item.sellerId as { _id?: string; fullName?: string; mobileNumber?: string } | string;
                const sellerId = typeof seller === 'object' ? seller._id : seller;
                const categoryStr = (item.category || item.shopType) as string | undefined;
                return (
                  <TableRow key={String(item._id)} className="hover:bg-slate-50/60 transition-colors">
                    <TableCell className="font-medium text-slate-900">{String(item.fullName || '—')}</TableCell>
                    <TableCell className="font-medium text-slate-800">{String(item.shopName || '—')}</TableCell>
                    <TableCell className="text-muted-foreground">{categoryStr ? getCategoryLabel(categoryStr) : '—'}</TableCell>
                    <TableCell className="text-slate-700">{String(item.city || '—')}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.submittedAt
                        ? format(new Date(String(item.submittedAt)), 'MMM d, yyyy')
                        : item.createdAt
                          ? format(new Date(String(item.createdAt)), 'MMM d, yyyy')
                          : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={String(item.status)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/sellers/approvals/${sellerId}`}>
                          <Button variant="outline" size="sm" className="hover:bg-slate-100">
                            Review
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() =>
                            setDeleteTarget({
                              id: String(sellerId),
                              name: String(item.shopName || item.fullName || 'Seller'),
                            })
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete seller account?"
        itemName={deleteTarget?.name}
        description={
          deleteTarget
            ? `This will permanently delete the seller account for "${deleteTarget.name}", including onboarding data, store details, and listings. This cannot be undone.`
            : undefined
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
