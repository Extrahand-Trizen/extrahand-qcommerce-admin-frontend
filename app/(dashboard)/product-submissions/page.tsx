'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { SearchInput } from '@/components/shared/search-input';
import { DataTableCard } from '@/components/shared/data-table-card';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
import { ReviewActions } from '@/components/shared/review-actions';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ProductSubmissionsPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [comment, setComment] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      const res = await api<{ items: Record<string, unknown>[] }>(`${endpoints.productSubmissions}?${params}`);
      return res.data?.items || [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (action: string) => {
      return api(`${endpoints.productSubmissions}/${selected?._id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, adminComment: comment }),
      });
    },
    onSuccess: () => {
      toast.success('Submission reviewed');
      setSelected(null);
      setComment('');
      qc.invalidateQueries({ queryKey: ['submissions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <DataTableCard toolbar={<SearchInput value={search} onChange={setSearch} placeholder="Search submissions..." />}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product Name</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRows cols={5} />
            ) : !data?.length ? (
              <TableEmptyRow cols={5} message="No submissions" />
            ) : data.map((s) => (
              <TableRow key={String(s._id)}>
                <TableCell className="font-medium">{String(s.submittedProductName)}</TableCell>
                <TableCell className="text-muted-foreground">{(s.sellerId as { fullName?: string })?.fullName || '—'}</TableCell>
                <TableCell><StatusBadge status={String(s.status)} /></TableCell>
                <TableCell className="text-muted-foreground">{s.createdAt ? format(new Date(String(s.createdAt)), 'MMM d, yyyy') : '—'}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => setSelected(s)}>Review</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>

      <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setComment(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review Submission</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span className="font-medium">{String(selected.submittedProductName)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Brand</span><span className="font-medium">{String(selected.brand || '—')}</span></div>
                {selected.description ? (
                  <div><span className="text-muted-foreground">Description</span><p className="mt-1">{String(selected.description)}</p></div>
                ) : null}
              </div>
              <ReviewActions
                comment={comment}
                onCommentChange={setComment}
                onApprove={() => reviewMutation.mutate('APPROVE')}
                onRequestChanges={() => reviewMutation.mutate('CHANGES_REQUIRED')}
                onReject={() => reviewMutation.mutate('REJECT')}
                isPending={reviewMutation.isPending}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
