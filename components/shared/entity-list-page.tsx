'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/page-header';
import { SearchInput } from '@/components/shared/search-input';
import { DataTableCard } from '@/components/shared/data-table-card';
import { TableEmptyRow, TableErrorRow, TableLoadingRows } from '@/components/shared/table-states';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { FormField } from '@/components/shared/form-field';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface Field {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'select' | 'status' | 'category' | 'subcategory';
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  fullWidth?: boolean;
  dependsOn?: string;
  placeholder?: string;
  hint?: string;
}

interface EntityListPageProps {
  title: string;
  endpoint: string;
  queryKey: string;
  columns: Array<{ key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode }>;
  fields: Field[];
  extraFilters?: React.ReactNode;
  nameField?: string;
}

function refId(value: unknown): string {
  if (value && typeof value === 'object' && '_id' in value) {
    return String((value as { _id: string })._id);
  }
  return value != null && value !== '' ? String(value) : '';
}

function buildUrl(endpoint: string, page: number, search: string) {
  const [path, existing] = endpoint.split('?');
  const params = new URLSearchParams(existing || '');
  params.set('page', String(page));
  params.set('limit', '20');
  if (search.trim()) params.set('search', search.trim());
  else params.delete('search');
  return `${path}?${params.toString()}`;
}

export function EntityListPage({
  title,
  endpoint,
  queryKey,
  columns,
  fields,
  extraFilters,
  nameField = 'name',
}: EntityListPageProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [deleting, setDeleting] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  const colCount = columns.length + 1;

  const needsCategories = fields.some((f) => f.type === 'category' || f.type === 'subcategory');
  const categoryFieldName = fields.find((f) => f.type === 'category')?.name || 'categoryId';
  const selectedCategoryId = form[categoryFieldName] || '';

  const { data: categories } = useQuery({
    queryKey: ['categories-dropdown'],
    queryFn: async () =>
      (await api<{ items: Array<{ _id: string; name: string }> }>(`${endpoints.categories}?limit=100&status=ACTIVE`))
        .data?.items || [],
    enabled: needsCategories && dialogOpen,
  });

  const { data: subcategories } = useQuery({
    queryKey: ['subcategories-dropdown', selectedCategoryId],
    queryFn: async () =>
      selectedCategoryId
        ? (
            await api<{ items: Array<{ _id: string; name: string }> }>(
              `${endpoints.subcategories}?categoryId=${selectedCategoryId}&limit=100&status=ACTIVE`
            )
          ).data?.items || []
        : [],
    enabled: dialogOpen && fields.some((f) => f.type === 'subcategory') && !!selectedCategoryId,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [queryKey, search, page, endpoint],
    queryFn: async () => {
      const res = await api<{ items: Record<string, unknown>[]; total: number; totalPages: number }>(
        buildUrl(endpoint, page, search)
      );
      if (!res.data) throw new Error('No data returned from server');
      return res.data;
    },
    retry: 1,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const basePath = endpoint.split('?')[0];
      if (editing?._id) {
        return api(`${basePath}/${editing._id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      }
      return api(basePath, { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'Updated successfully' : 'Created successfully');
      setDialogOpen(false);
      setEditing(null);
      setForm({});
      qc.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const basePath = endpoint.split('?')[0];
      return api(`${basePath}/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Deleted successfully');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setForm({ status: 'ACTIVE' });
    setDialogOpen(true);
  }

  function openEdit(row: Record<string, unknown>) {
    setEditing(row);
    const f: Record<string, string> = {};
    fields.forEach((field) => {
      const val = row[field.name];
      if (field.type === 'category' || field.type === 'subcategory') {
        f[field.name] = refId(val);
      } else {
        f[field.name] = val != null ? String(val) : '';
      }
    });
    setForm(f);
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    fields.forEach((field) => {
      const val = form[field.name];
      if (field.type === 'number') payload[field.name] = Number(val);
      else if (val) payload[field.name] = val;
    });
    saveMutation.mutate(payload);
  }

  function setField(name: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === categoryFieldName) {
        fields.filter((f) => f.type === 'subcategory').forEach((f) => {
          next[f.name] = '';
        });
      }
      return next;
    });
  }

  const singular = title.endsWith('ies')
    ? `${title.slice(0, -3)}y`
    : title === 'Product Types'
      ? 'product type'
      : title.replace(/s$/, '');

  const deleteHints: Record<string, string> = {
    Categories: 'Delete only if no subcategories or products exist under it.',
    Subcategories: 'Delete only if no product types or products exist under it.',
    'Product Types': 'Delete only if no products use this product type.',
    Attributes: 'Delete only if this attribute is not linked to any product type.',
  };

  const shortFields = useMemo(
    () => fields.filter((f) => f.type !== 'textarea' && !f.fullWidth),
    [fields]
  );
  const wideFields = useMemo(
    () => fields.filter((f) => f.type === 'textarea' || f.fullWidth),
    [fields]
  );

  function renderField(field: Field) {
    const span = field.type === 'textarea' || field.fullWidth;

    return (
      <FormField
        key={field.name}
        label={field.label}
        required={field.required}
        hint={field.hint}
        className={cn(span && 'sm:col-span-2')}
      >
        {field.type === 'textarea' ? (
          <Textarea
            rows={3}
            placeholder={field.placeholder}
            value={form[field.name] || ''}
            onChange={(e) => setField(field.name, e.target.value)}
          />
        ) : field.type === 'category' ? (
          <Select value={form[field.name] || undefined} onValueChange={(v) => setField(field.name, v)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select a category'} />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === 'subcategory' ? (
          <Select
            value={form[field.name] || undefined}
            onValueChange={(v) => setField(field.name, v)}
            disabled={!selectedCategoryId}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  field.placeholder ||
                  (selectedCategoryId ? 'Select a subcategory' : 'Select a category first')
                }
              />
            </SelectTrigger>
            <SelectContent>
              {subcategories?.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === 'select' || field.type === 'status' ? (
          <Select value={form[field.name] || ''} onValueChange={(v) => setField(field.name, v)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {(
                field.options || [
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]
              ).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            type={field.type === 'number' ? 'number' : 'text'}
            placeholder={field.placeholder}
            value={form[field.name] || ''}
            onChange={(e) => setField(field.name, e.target.value)}
            required={field.required}
          />
        )}
      </FormField>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        }
      />

      <DataTableCard
        toolbar={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
            {extraFilters}
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
              {columns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRows cols={colCount} />
            ) : isError ? (
              <TableErrorRow cols={colCount} error={error as Error} onRetry={() => refetch()} />
            ) : !data?.items?.length ? (
              <TableEmptyRow cols={colCount} />
            ) : (
              data.items.map((row) => (
                <TableRow key={String(row._id)}>
                  {columns.map((c) => (
                    <TableCell key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? '')}</TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleting(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit' : 'Add'} {singular}
            </DialogTitle>
            <DialogDescription>
              Fill in the fields below. Required fields are marked with *.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-1">
            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              {shortFields.map(renderField)}
              {wideFields.map(renderField)}
            </div>
            <DialogFooter className="gap-2 border-t border-border pt-4 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${singular}?`}
        itemName={deleting ? String(deleting[nameField] || '') : undefined}
        description={deleteHints[title]}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(String(deleting._id))}
      />
    </div>
  );
}
