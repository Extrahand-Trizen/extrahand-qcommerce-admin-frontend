'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/status-badge';
import { SearchInput } from '@/components/shared/search-input';
import { DataTableCard } from '@/components/shared/data-table-card';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
import { format } from 'date-fns';

export default function ProductSubmissionsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      const res = await api<{ items: Record<string, unknown>[] }>(`${endpoints.productSubmissions}?${params}`);
      return res.data?.items || [];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Product Submissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review seller product requests, complete missing catalogue data, and approve or reject.
        </p>
      </div>

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
                <TableCell className="text-muted-foreground">
                  {(s.sellerId as { fullName?: string; shopName?: string })?.shopName ||
                    (s.sellerId as { fullName?: string })?.fullName ||
                    '—'}
                </TableCell>
                <TableCell><StatusBadge status={String(s.status)} /></TableCell>
                <TableCell className="text-muted-foreground">
                  {s.createdAt ? format(new Date(String(s.createdAt)), 'MMM d, yyyy') : '—'}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/product-submissions/${String(s._id)}`}>Review</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}
