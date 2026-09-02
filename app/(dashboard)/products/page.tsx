'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { DataTableCard } from '@/components/shared/data-table-card';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { ProductFormDialog } from '@/components/products/product-form-dialog';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import Link from 'next/link';
import { Pencil, Plus, Package, CheckCircle2, FileEdit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';

type NamedRef = { _id: string; name: string };

function refName(value: unknown): string {
  if (value && typeof value === 'object' && 'name' in value) return String((value as NamedRef).name);
  return '—';
}

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Record<string, unknown> | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const categoryId = new URLSearchParams(window.location.search).get('categoryId');
    if (categoryId) setCategoryFilter(categoryId);
  }, []);

  const { data: categories } = useQuery({
    queryKey: ['categories-all'],
    queryFn: async () =>
      (await api<{ items: Array<{ _id: string; name: string }> }>(`${endpoints.categories}?limit=100`)).data?.items ||
      [],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['master-products', search, page, statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter);
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
    };
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api(`${endpoints.masterProducts}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Product deleted');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['master-products'] });
      qc.invalidateQueries({ queryKey: ['product-brands'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button
            onClick={() => {
              setEditingId(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Package} label="Total Products" value={stats.total} />
        <StatCard icon={CheckCircle2} label="Active (this page)" value={stats.active} />
        <StatCard icon={FileEdit} label="Inactive (this page)" value={stats.inactive} />
      </div>

      <DataTableCard
        toolbar={
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder="Search by name, brand, or SKU..."
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={categoryFilter}
                onValueChange={(v) => {
                  setCategoryFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
        footer={
          data ? (
            <PaginationBar page={page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
          ) : null
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Subcategory</TableHead>
              <TableHead>Product Type</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRows cols={8} />
            ) : !data?.items.length ? (
              <TableEmptyRow cols={8} message="No products yet — click Add Product to create one" />
            ) : (
              data.items.map((p) => {
                const primary = p.primaryImage as { imageUrl?: string } | null | undefined;
                const thumb = primary?.imageUrl ? String(primary.imageUrl) : '';
                return (
                <TableRow key={String(p._id)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <p className="font-medium">
                        <Link href={`/products/${String(p._id)}`} className="hover:text-amber-700 hover:underline">
                          {String(p.name)}
                        </Link>
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{refName(p.categoryId)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{refName(p.subcategoryId)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{refName(p.productTypeId)}</TableCell>
                  <TableCell className="text-sm">{String(p.brand || '—')}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{String(p.sku)}</code>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={String(p.status)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/products/${String(p._id)}`} title="View details">
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(String(p._id));
                          setFormOpen(true);
                        }}
                        title="Edit product"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleting(p)}
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
      </DataTableCard>

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
        title="Delete product?"
        itemName={deleting ? String(deleting.name) : undefined}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(String(deleting._id))}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold leading-tight">{value}</p>
      </div>
    </div>
  );
}
