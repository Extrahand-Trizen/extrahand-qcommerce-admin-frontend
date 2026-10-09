'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/status-badge';
import { SearchInput } from '@/components/shared/search-input';
import { DataTableCard } from '@/components/shared/data-table-card';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getCategoryLabel } from '@/lib/seller-onboarding';

export default function SellerApprovalsPage() {
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['seller-approvals', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      const res = await api<{ items: Array<Record<string, unknown>> }>(`${endpoints.sellerApprovals}?${params}`);
      return res.data?.items || [];
    },
  });

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

  return (
    <div className="space-y-4">
      <DataTableCard toolbar={<SearchInput value={search} onChange={setSearch} placeholder="Search approvals..." />}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Seller Name</TableHead>
              <TableHead>Shop Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRows cols={7} />
            ) : !data?.length ? (
              <TableEmptyRow cols={7} message="No pending approvals" />
            ) : data.map((item) => {
              const seller = item.sellerId as { _id?: string; fullName?: string; mobileNumber?: string } | string;
              const sellerId = typeof seller === 'object' ? seller._id : seller;
              const categoryStr = (item.category || item.shopType) as string | undefined;
              return (
                <TableRow key={String(item._id)}>
                  <TableCell className="font-medium">{String(item.fullName)}</TableCell>
                  <TableCell>{String(item.shopName)}</TableCell>
                  <TableCell className="text-muted-foreground">{categoryStr ? getCategoryLabel(categoryStr) : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{String(item.city)}</TableCell>
                  <TableCell className="text-muted-foreground">{item.submittedAt ? format(new Date(String(item.submittedAt)), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell><StatusBadge status={String(item.status)} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/sellers/approvals/${sellerId}`}>
                        <Button variant="outline" size="sm">Review</Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => setDeleteTarget({ id: String(sellerId), name: String(item.shopName || item.fullName || 'Seller') })}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableCard>

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
