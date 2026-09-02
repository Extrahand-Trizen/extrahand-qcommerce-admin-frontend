'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { SearchInput } from '@/components/shared/search-input';
import { DataTableCard } from '@/components/shared/data-table-card';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

type SellerRow = {
  _id: string;
  fullName: string;
  mobileNumber: string;
  status: string;
  onboardingStatus: string;
  createdAt?: string;
  onboarding?: { shopName?: string; shopType?: string } | null;
};

export default function SellerUsersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<SellerRow | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sellers', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      const res = await api<{ items: SellerRow[] }>(`${endpoints.sellers}?${params}`);
      return res.data?.items || [];
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api(`${endpoints.sellers}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    },
    onSuccess: () => {
      toast.success('Seller status updated');
      qc.invalidateQueries({ queryKey: ['sellers'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api(`${endpoints.sellers}/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Seller profile deleted');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['sellers'] });
      qc.invalidateQueries({ queryKey: ['seller-approvals'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <DataTableCard
        toolbar={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search sellers..." />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Seller</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRows cols={7} />
            ) : !data?.length ? (
              <TableEmptyRow cols={7} message="No sellers found" />
            ) : data.map((s) => {
              const onboarding = s.onboarding;
              return (
                <TableRow key={String(s._id)}>
                  <TableCell className="font-medium">{String(s.fullName)}</TableCell>
                  <TableCell className="text-muted-foreground">{onboarding?.shopName || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{String(s.mobileNumber)}</TableCell>
                  <TableCell><StatusBadge status={String(s.status)} /></TableCell>
                  <TableCell><StatusBadge status={String(s.onboardingStatus)} /></TableCell>
                  <TableCell className="text-muted-foreground">{s.createdAt ? format(new Date(String(s.createdAt)), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.onboardingStatus === 'APPROVED' ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/sellers/stores/${String(s._id)}`}>View store</Link>
                        </Button>
                      ) : null}
                      {s.status !== 'ACTIVE' && (
                        <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: String(s._id), status: 'ACTIVE' })}>Activate</Button>
                      )}
                      {s.status === 'ACTIVE' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: String(s._id), status: 'INACTIVE' })}>Deactivate</Button>
                          <Button size="sm" variant="destructive" onClick={() => statusMutation.mutate({ id: String(s._id), status: 'SUSPENDED' })}>Suspend</Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeleteTarget(s)}
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
        title="Delete seller profile?"
        itemName={deleteTarget?.fullName}
        description={
          deleteTarget
            ? `This will permanently delete the seller profile for "${deleteTarget.fullName}" (${deleteTarget.mobileNumber}), including onboarding data, documents, and listings. Customer and helper app users are not affected. This cannot be undone.`
            : undefined
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(String(deleteTarget._id));
        }}
      />
    </div>
  );
}
