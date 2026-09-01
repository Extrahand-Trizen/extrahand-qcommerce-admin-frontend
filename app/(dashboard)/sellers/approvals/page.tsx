'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/status-badge';
import { SearchInput } from '@/components/shared/search-input';
import { DataTableCard } from '@/components/shared/data-table-card';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
import { format } from 'date-fns';

export default function SellerApprovalsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['seller-approvals', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      const res = await api<{ items: Array<Record<string, unknown>> }>(`${endpoints.sellerApprovals}?${params}`);
      return res.data?.items || [];
    },
  });

  return (
    <div className="space-y-4">
      <DataTableCard toolbar={<SearchInput value={search} onChange={setSearch} placeholder="Search approvals..." />}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Seller Name</TableHead>
              <TableHead>Shop Name</TableHead>
              <TableHead>Shop Type</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
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
              return (
                <TableRow key={String(item._id)}>
                  <TableCell className="font-medium">{String(item.fullName)}</TableCell>
                  <TableCell>{String(item.shopName)}</TableCell>
                  <TableCell className="text-muted-foreground">{String(item.shopType)}</TableCell>
                  <TableCell className="text-muted-foreground">{String(item.city)}</TableCell>
                  <TableCell className="text-muted-foreground">{item.submittedAt ? format(new Date(String(item.submittedAt)), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell><StatusBadge status={String(item.status)} /></TableCell>
                  <TableCell>
                    <Link href={`/sellers/approvals/${sellerId}`}>
                      <Button variant="outline" size="sm">Review</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}
