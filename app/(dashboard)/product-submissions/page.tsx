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
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', activeTab, search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (activeTab !== 'ALL') params.set('status', activeTab);
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

      {/* Segmented Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Button
          variant={activeTab === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('PENDING')}
        >
          Pending Review
        </Button>
        <Button
          variant={activeTab === 'APPROVED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('APPROVED')}
        >
          Approved
        </Button>
        <Button
          variant={activeTab === 'REJECTED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('REJECTED')}
        >
          Rejected
        </Button>
        <Button
          variant={activeTab === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('ALL')}
        >
          All Submissions
        </Button>
      </div>

      <DataTableCard toolbar={<SearchInput value={search} onChange={setSearch} placeholder="Search submissions..." />}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product Name</TableHead>
              <TableHead>Pack / Net</TableHead>
              <TableHead>Lifespan</TableHead>
              <TableHead>Seller</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRows cols={7} />
            ) : !data?.length ? (
              <TableEmptyRow cols={7} message={activeTab === 'PENDING' ? 'No pending product submissions' : 'No submissions found'} />
            ) : data.map((s) => (
              <TableRow key={String(s._id)}>
                <TableCell className="font-medium">{String(s.submittedProductName)}</TableCell>
                <TableCell className="text-slate-700">{String(s.packOrSoldAs || '—')}</TableCell>
                <TableCell className="text-slate-700 font-medium">
                  {s.lifespanValue != null
                    ? `${s.lifespanValue} ${s.lifespanUnit || 'Days'}`
                    : '—'}
                </TableCell>
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
