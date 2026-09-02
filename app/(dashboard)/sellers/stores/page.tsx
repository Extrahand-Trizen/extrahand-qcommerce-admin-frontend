'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { SearchInput } from '@/components/shared/search-input';
import { DataTableCard } from '@/components/shared/data-table-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink } from 'lucide-react';

type StoreRow = {
  sellerId: string;
  shopName: string;
  shopType?: string;
  city?: string;
  state?: string;
  ownerName: string;
  mobileNumber: string;
  sellerStatus: string;
  productCount: number;
};

export default function SellerStoresPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['seller-stores', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await api<{ items: StoreRow[] }>(`${endpoints.sellerStores}?${params}`);
      return res.data?.items || [];
    },
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Browse approved seller stores and inspect the products listed in each store.
      </p>

      <DataTableCard
        toolbar={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search stores..." />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Store</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRows cols={6} />
            ) : !data?.length ? (
              <TableEmptyRow cols={6} message="No stores found" />
            ) : (
              data.map((store) => (
                <TableRow key={store.sellerId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{store.shopName}</p>
                      {store.shopType ? (
                        <p className="text-xs text-muted-foreground">{store.shopType}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{store.ownerName}</p>
                      <p className="text-xs text-muted-foreground">{store.mobileNumber}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[store.city, store.state].filter(Boolean).join(', ') || '—'}
                  </TableCell>
                  <TableCell>{store.productCount}</TableCell>
                  <TableCell>
                    <StatusBadge status={store.sellerStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/sellers/stores/${store.sellerId}`}>
                        View store
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableCard>
    </div>
  );
}
