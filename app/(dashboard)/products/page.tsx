'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { ProductFormDialog } from '@/components/products/product-form-dialog';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import Link from 'next/link';
import {
  Pencil,
  Plus,
  Package,
  CheckCircle2,
  FileEdit,
  Trash2,
  Eye,
  Store,
  Search,
  Building2,
  FolderTree,
  RotateCcw,
  ExternalLink,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type NamedRef = { _id: string; name: string };

function refName(value: unknown): string {
  if (value && typeof value === 'object' && 'name' in value) return String((value as NamedRef).name);
  return '—';
}

type ShopOption = {
  sellerId: string;
  shopName: string;
};

export default function ProductsPage() {
  const [catalogueTab, setCatalogueTab] = useState<'master' | 'private'>('master');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [verticalFilter, setVerticalFilter] = useState('all');
  const [selectedShop, setSelectedShop] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Record<string, unknown> | null>(null);
  const qc = useQueryClient();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const categoryId = new URLSearchParams(window.location.search).get('categoryId');
    if (categoryId) setCategoryFilter(categoryId);
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-all'],
    queryFn: async () =>
      (await api<{ items: Array<{ _id: string; name: string }> }>(`${endpoints.categories}?limit=100`)).data?.items ||
      [],
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['seller-stores-all'],
    queryFn: async () => {
      const res = await api<{ items: ShopOption[] }>(`${endpoints.sellerStores}?limit=100`);
      return res.data?.items || [];
    },
  });

  const { data: masterCount = 0 } = useQuery({
    queryKey: ['master-count-badge'],
    queryFn: async () => {
      const res = await api<{ total: number }>(`${endpoints.masterProducts}?limit=1&catalogueType=master`);
      return res.data?.total ?? 0;
    },
  });

  const { data: privateCount = 0 } = useQuery({
    queryKey: ['private-count-badge'],
    queryFn: async () => {
      const res = await api<{ total: number }>(`${endpoints.masterProducts}?limit=1&catalogueType=private`);
      return res.data?.total ?? 0;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['master-products', catalogueTab, debouncedSearch, page, statusFilter, categoryFilter, verticalFilter, selectedShop],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        catalogueType: catalogueTab,
      });
      if (catalogueTab === 'private' && selectedShop !== 'all') {
        params.set('sellerId', selectedShop);
      }
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter);
      if (verticalFilter !== 'all') params.set('vertical', verticalFilter);
      const res = await api<{ items: Record<string, unknown>[]; total: number; totalPages: number }>(
        `${endpoints.masterProducts}?${params}`
      );
      return res.data!;
    },
  });

  const stats = useMemo(() => {
    const items = data?.items || [];
    return {
      total: data?.total ?? 0,
      active: items.filter((p) => p.status === 'ACTIVE').length,
      inactive: items.filter((p) => p.status === 'INACTIVE').length,
      draft: items.filter((p) => p.status === 'DRAFT').length,
    };
  }, [data]);

  const isPrivateDeleting = deleting?.status === 'DRAFT' || Boolean((deleting as any)?.requestedByStore);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api(`${endpoints.masterProducts}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(isPrivateDeleting ? 'Private product deleted from catalogue and seller store' : 'Product deleted');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['master-products'] });
      qc.invalidateQueries({ queryKey: ['master-count-badge'] });
      qc.invalidateQueries({ queryKey: ['private-count-badge'] });
      qc.invalidateQueries({ queryKey: ['product-brands'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasActiveFilters = Boolean(
    search.trim() ||
    categoryFilter !== 'all' ||
    verticalFilter !== 'all' ||
    statusFilter !== 'all' ||
    (catalogueTab === 'private' && selectedShop !== 'all')
  );

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategoryFilter('all');
    setVerticalFilter('all');
    setStatusFilter('all');
    setSelectedShop('all');
    setPage(1);
  };

  return (
    <div className="w-full space-y-4 pb-12">
      {/* 1. Header Outer Card Frame */}
      <div className="rounded-xl border border-border bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Master &amp; Private Catalogue
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              {catalogueTab === 'master'
                ? 'Search, manage and configure global master products available across all stores.'
                : 'Browse and manage store-specific custom products requested by individual sellers.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {catalogueTab === 'master' ? (
              <Button
                onClick={() => {
                  setEditingId(null);
                  setFormOpen(true);
                }}
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-xs border border-amber-400/80 gap-1.5"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                Add Master Product
              </Button>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-3 py-1 text-xs font-semibold text-amber-900 shadow-2xs">
                <Store className="h-3.5 w-3.5 text-amber-600" />
                <span>Private Store Catalogue</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Theme-Aligned Pill Tabs (Matching ExtraHand Yellow/Amber Theme) */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              setCatalogueTab('master');
              setPage(1);
              setSearch('');
              setStatusFilter('all');
            }}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer',
              catalogueTab === 'master'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs hover:bg-amber-400'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50/70 hover:border-amber-200 hover:text-amber-950'
            )}
          >
            <Package className="h-4 w-4 shrink-0 text-slate-900" />
            <span>Master Products (Global)</span>
            <span
              className={cn(
                'ml-1 rounded-full px-2 py-0.2 text-[11px] font-bold shadow-2xs',
                catalogueTab === 'master'
                  ? 'bg-white text-slate-950 border border-amber-400/60'
                  : 'bg-slate-100 text-slate-700'
              )}
            >
              {masterCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCatalogueTab('private');
              setPage(1);
              setSearch('');
              setStatusFilter('all');
              setSelectedShop('all');
            }}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer',
              catalogueTab === 'private'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs hover:bg-amber-400'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-amber-50/70 hover:border-amber-200 hover:text-amber-950'
            )}
          >
            <Store className="h-4 w-4 shrink-0 text-slate-900" />
            <span>Private Products (Store-Specific)</span>
            <span
              className={cn(
                'ml-1 rounded-full px-2 py-0.2 text-[11px] font-bold shadow-2xs',
                catalogueTab === 'private'
                  ? 'bg-white text-slate-950 border border-amber-400/60'
                  : 'bg-slate-100 text-slate-700'
              )}
            >
              {privateCount}
            </span>
          </button>
        </div>
      </div>

      {/* 3. Stat Cards */}
      {catalogueTab === 'master' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Products</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{masterCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active (This Page)</p>
              <p className="text-2xl font-bold text-emerald-700 mt-0.5">{stats.active}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <FileEdit className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inactive Products</p>
              <p className="text-2xl font-bold text-slate-700 mt-0.5">{stats.inactive}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Categories</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{categories.length}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Private Items</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{privateCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Registered Stores</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{shops.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filtered Results</p>
              <p className="text-2xl font-bold text-emerald-700 mt-0.5">{data?.total ?? 0}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Shop</p>
              <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
                {selectedShop === 'all'
                  ? 'All Shops'
                  : shops.find((s) => s.sellerId === selectedShop)?.shopName || 'Selected Shop'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Table Card with Filter Toolbar */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  catalogueTab === 'private'
                    ? 'Search private products by name, brand, or SKU...'
                    : 'Search master catalogue by name, brand, or SKU...'
                }
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs transition-colors"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-amber-800"
                >
                  Clear
                </button>
              ) : null}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Shop Filter (Only for Private Products) */}
              {catalogueTab === 'private' ? (
                <Select
                  value={selectedShop}
                  onValueChange={(v) => {
                    setSelectedShop(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-56 rounded-lg border-amber-300 bg-amber-50/50 text-amber-950 font-medium hover:bg-amber-50">
                    <Store className="h-3.5 w-3.5 text-amber-600 mr-1.5 shrink-0" />
                    <SelectValue placeholder="All Shops" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all" className="font-semibold">
                      All Shops ({shops.length})
                    </SelectItem>
                    {shops.map((s) => (
                      <SelectItem key={s.sellerId} value={s.sellerId}>
                        {s.shopName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}

              {/* Category Filter */}
              <Select
                value={categoryFilter}
                onValueChange={(v) => {
                  setCategoryFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-44 rounded-lg border-slate-200 bg-white hover:border-amber-300">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Vertical Filter */}
              <Select
                value={verticalFilter}
                onValueChange={(v) => {
                  setVerticalFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-36 rounded-lg border-slate-200 bg-white hover:border-amber-300">
                  <SelectValue placeholder="Vertical" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verticals</SelectItem>
                  <SelectItem value="KIRANA">🛒 Kirana</SelectItem>
                  <SelectItem value="MEDICAL">💊 Medical</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter (Only for Master Products) */}
              {catalogueTab === 'master' ? (
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-36 rounded-lg border-slate-200 bg-white hover:border-amber-300">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}

              {/* Reset Filters */}
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="gap-1.5 text-xs text-slate-600 hover:text-amber-900 hover:bg-amber-50 rounded-lg"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="w-[300px] font-semibold text-slate-800">Product</TableHead>
                {catalogueTab === 'private' ? (
                  <TableHead className="font-semibold text-slate-800">Assigned Store</TableHead>
                ) : null}
                <TableHead className="font-semibold text-slate-800">Category</TableHead>
                <TableHead className="font-semibold text-slate-800">Subcategory</TableHead>
                <TableHead className="font-semibold text-slate-800">
                  {catalogueTab === 'private' ? 'Brand' : 'Product Type'}
                </TableHead>
                {catalogueTab === 'master' ? <TableHead className="font-semibold text-slate-800">Brand</TableHead> : null}
                <TableHead className="font-semibold text-slate-800">SKU</TableHead>
                <TableHead className="font-semibold text-slate-800">Status</TableHead>
                <TableHead className="w-[120px] text-right font-semibold text-slate-800">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingRows cols={catalogueTab === 'private' ? 8 : 8} />
              ) : !data?.items.length ? (
                <TableEmptyRow
                  cols={8}
                  message={
                    catalogueTab === 'private'
                      ? selectedShop !== 'all'
                        ? 'No private products found for this shop'
                        : 'No store-specific private products found'
                      : 'No master products found — click Add Master Product to create one'
                  }
                />
              ) : (
                data.items.map((p) => {
                  const primary = p.primaryImage as { imageUrl?: string } | null | undefined;
                  const thumb = primary?.imageUrl ? String(primary.imageUrl) : '';
                  const storeInfo = (p as Record<string, any>).requestedByStore;
                  const storeName = storeInfo?.shopName || storeInfo?.sellerName;

                  return (
                    <TableRow key={String(p._id)} className="hover:bg-amber-50/30 transition-colors">
                      {/* Product Column */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-900 text-sm hover:text-amber-800">
                              <Link href={`/products/${String(p._id)}`}>{String(p.name)}</Link>
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {p.vertical === 'MEDICAL' || (p as any).isMedicalProduct ? (
                                <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                  💊 Medical
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                                  🛒 Kirana
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Store Column (Only on Private Products tab) */}
                      {catalogueTab === 'private' ? (
                        <TableCell>
                          {storeName ? (
                            <div className="inline-flex flex-col gap-0.5 rounded-md bg-amber-50/80 border border-amber-200 px-2.5 py-1 text-xs">
                              <div className="flex items-center gap-1 font-semibold text-amber-950">
                                <Store className="h-3 w-3 text-amber-600 shrink-0" />
                                <span>{storeName}</span>
                              </div>
                              {storeInfo?.sellerId ? (
                                <Link
                                  href={`/sellers/stores/${String(storeInfo.sellerId)}`}
                                  className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 hover:text-amber-900 hover:underline"
                                >
                                  <span>View Store</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      ) : null}

                      <TableCell className="text-sm text-muted-foreground">{refName(p.categoryId)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{refName(p.subcategoryId)}</TableCell>
                      {catalogueTab === 'master' ? (
                        <TableCell className="text-sm text-muted-foreground">{refName(p.productTypeId)}</TableCell>
                      ) : null}
                      <TableCell className="text-sm font-medium text-slate-800">{String(p.brand || '—')}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{String(p.sku)}</code>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={String(p.status)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:bg-amber-100/60 hover:text-amber-900 rounded-lg"
                            asChild
                          >
                            <Link href={`/products/${String(p._id)}`} title="View details">
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:bg-amber-100/60 hover:text-amber-900 rounded-lg"
                            onClick={() => {
                              setEditingId(String(p._id));
                              setFormOpen(true);
                            }}
                            title="Edit product"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
                            onClick={() => setDeleting(p)}
                            title="Delete product"
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
        </div>

        {/* Footer with Pagination */}
        {data ? (
          <div className="border-t border-slate-100 p-3 bg-slate-50/50">
            <PaginationBar page={page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
          </div>
        ) : null}
      </div>

      <ProductFormDialog
        open={formOpen}
        productId={editingId}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
        }}
      />

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={isPrivateDeleting ? 'Delete private product?' : 'Delete product?'}
        description={
          isPrivateDeleting
            ? `Are you sure you want to delete "${deleting?.name}"? This is a store-specific private product and will be completely removed from the catalogue and the seller's store inventory.`
            : undefined
        }
        itemName={deleting ? String(deleting.name) : undefined}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(String(deleting._id))}
      />
    </div>
  );
}
