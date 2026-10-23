'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { SearchInput } from '@/components/shared/search-input';
import { DataTableCard } from '@/components/shared/data-table-card';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
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
  AlertCircle,
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

export default function ProductSubmissionsPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED' | 'ALL'>('PENDING');
  const [selectedShop, setSelectedShop] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const qc = useQueryClient();

  // Load shops for filter dropdown
  const { data: shops = [] } = useQuery({
    queryKey: ['filter-shops'],
    queryFn: async () => {
      const res = await api<{ items: ShopOption[] }>(`${endpoints.sellerStores}?limit=100`);
      return res.data?.items || [];
    },
  });

  // Load categories for filter dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['filter-categories'],
    queryFn: async () => {
      const res = await api<{ items: CategoryOption[] }>(`${endpoints.categories}?limit=100`);
      return res.data?.items || [];
    },
  });

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ['submissions', activeTab, selectedShop, selectedCategory, search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (activeTab !== 'ALL') params.set('status', activeTab);
      if (selectedShop !== 'all') params.set('sellerId', selectedShop);
      if (selectedCategory !== 'all') params.set('categoryId', selectedCategory);
      if (search.trim()) params.set('search', search.trim());
      const res = await api<{ items: Record<string, unknown>[] }>(`${endpoints.productSubmissions}?${params}`);
      return res.data?.items || [];
    },
  });

  // Client-side sort by submission date
  const data = useMemo(() => {
    return [...rawData].sort((a, b) => {
      const dateA = new Date(String(a.createdAt || 0)).getTime();
      const dateB = new Date(String(b.createdAt || 0)).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [rawData, sortOrder]);

  const deleteMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      return api(`${endpoints.productSubmissions}/${submissionId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast.success('Product submission marked as DELETED');
      qc.invalidateQueries({ queryKey: ['submissions'] });
      qc.invalidateQueries({ queryKey: ['seller-stores'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDeleteRow = (submissionId: string, productName: string) => {
    if (window.confirm(`Are you sure you want to mark "${productName}" as DELETED and remove it from seller store?`)) {
      deleteMutation.mutate(submissionId);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedShop('all');
    setSelectedCategory('all');
    setSortOrder('desc');
  };

  const hasActiveFilters = Boolean(search.trim() || selectedShop !== 'all' || selectedCategory !== 'all' || sortOrder !== 'desc');

  return (
    <div className="space-y-6">
      {/* Page Title & Sub-navigation tabs between Custom Submissions and Price Reviews */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Product Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review custom products and price change requests across all seller shops or filter shop-wise.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="default" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5">
            <Link href="/product-submissions">
              <Layers className="h-4 w-4" />
              Custom Product Submissions
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 border-border hover:bg-slate-50">
            <Link href="/price-reviews">
              <Tag className="h-4 w-4 text-purple-600" />
              Price &amp; Unit Reviews
            </Link>
          </Button>
        </div>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Button
          variant={activeTab === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('PENDING')}
          className="gap-1.5"
        >
          <Clock className="h-3.5 w-3.5" />
          Pending Review
        </Button>
        <Button
          variant={activeTab === 'APPROVED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('APPROVED')}
          className="gap-1.5"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Approved
        </Button>
        <Button
          variant={activeTab === 'REJECTED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('REJECTED')}
          className="gap-1.5"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Rejected
        </Button>
        <Button
          variant={activeTab === 'DELETED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('DELETED')}
        >
          Deleted
        </Button>
        <Button
          variant={activeTab === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('ALL')}
        >
          All Submissions
        </Button>
      </div>

      {/* Search & Filter Toolbar */}
      <DataTableCard
        toolbar={
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by product name, brand, or ID..."
                className="w-full sm:max-w-xs"
              />
              <Select value={selectedShop} onValueChange={setSelectedShop}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by Shop" />
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
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Category" />
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
              <Select value={sortOrder} onValueChange={(v: 'desc' | 'asc') => setSortOrder(v)}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Sort Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset Filters
              </Button>
            )}
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product Name</TableHead>
              <TableHead>Pack / Net</TableHead>
              <TableHead>Lifespan</TableHead>
              <TableHead>Shop / Seller</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Catalogue Mapping</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRows cols={8} />
            ) : !data?.length ? (
              <TableEmptyRow
                cols={8}
                message={
                  activeTab === 'PENDING'
                    ? 'No pending product submissions requiring review'
                    : 'No product submissions found'
                }
              />
            ) : (
              data.map((s) => {
                const mapped = s.mappedMasterProductId as { status?: string } | undefined;
                const isMasterPublic = mapped?.status === 'ACTIVE';
                const sellerObj = s.sellerId as { _id?: string; fullName?: string; shopName?: string } | undefined;
                const sellerId = String(sellerObj?._id || '');

                return (
                  <TableRow key={String(s._id)}>
                    <TableCell className="font-medium text-slate-900">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p>{String(s.submittedProductName)}</p>
                          {Boolean(s.isMedicalProduct || s.genericName) ? (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                              Medical{s.prescriptionRequired != null ? ` · ${s.prescriptionRequired ? 'Rx Required' : 'OTC'}` : s.prescriptionCategory ? ` · ${String(s.prescriptionCategory).includes('Rx') || String(s.prescriptionCategory).includes('Schedule') ? 'Rx' : 'OTC'}` : ''}
                            </span>
                          ) : null}
                        </div>
                        {s.genericName ? (
                          <p className="text-xs text-blue-600 font-medium">Generic: {String(s.genericName)}</p>
                        ) : null}
                        {s.brand ? <p className="text-xs text-muted-foreground">{String(s.brand)}</p> : null}
                        <p className="mt-0.5 text-[11px] text-slate-500 font-medium">
                          {[
                            (s.medicalCategory as string) || (typeof s.categoryId === 'object' && (s.categoryId as any)?.name),
                            (s.medicalSubcategory as string) || (typeof s.subcategoryId === 'object' && (s.subcategoryId as any)?.name),
                            (s.productType as string) || (typeof s.productTypeId === 'object' && (s.productTypeId as any)?.name),
                          ].filter(Boolean).join(' › ')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700">{String(s.packOrSoldAs || '—')}</TableCell>
                    <TableCell className="text-slate-700 font-medium text-xs">
                      {s.lifespanValue != null ? `${s.lifespanValue} ${s.lifespanUnit || 'Days'}` : '—'}
                    </TableCell>
                    <TableCell>
                      {sellerId ? (
                        <Link
                          href={`/sellers/stores/${sellerId}?tab=custom`}
                          className="inline-flex items-center gap-1 font-medium text-slate-900 hover:text-amber-700 hover:underline text-xs"
                          title="Open shop custom products"
                        >
                          <Store className="h-3 w-3 text-amber-600" />
                          {sellerObj?.shopName || sellerObj?.fullName || 'Shop'}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {sellerObj?.shopName || sellerObj?.fullName || '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={String(s.status)} />
                    </TableCell>
                    <TableCell>
                      {mapped ? (
                        isMasterPublic ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            Master Catalogue
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
                            Seller Specific
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {s.createdAt ? format(new Date(String(s.createdAt)), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/product-submissions/${String(s._id)}`}>Review</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteRow(String(s._id), String(s.submittedProductName))}
                          title="Mark as deleted"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}
