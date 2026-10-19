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
import { PaginationBar } from '@/components/shared/pagination-bar';
import {
  ShoppingBag,
  Store,
  ExternalLink,
  X,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';

type OrderRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  fulfillmentStatus?: string;
  paymentStatus: string;
  amount: number;
  itemsCount: number;
  items: Array<{ name: string; quantity: number; unitPricePaise?: number; lineTotalPaise?: number; unit?: string }>;
  address?: { name?: string; phone?: string; line1?: string; city?: string };
  shopName?: string;
  sellerId?: string;
};

type StoreOption = {
  sellerId: string;
  shopName: string;
};

export default function GlobalOrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);

  // Fetch approved shops for dropdown filter
  const { data: shops = [] } = useQuery({
    queryKey: ['order-shops-filter'],
    queryFn: async () => {
      const res = await api<{ items: StoreOption[] }>(`${endpoints.sellerStores}?limit=100`);
      return res.data?.items || [];
    },
  });

  // Fetch orders from adminOrders endpoint
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', search, statusFilter, shopFilter, sortOrder, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        sortOrder,
      });
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (shopFilter !== 'all') params.set('sellerId', shopFilter);

      const res = await api<{ items: OrderRow[]; total: number; totalPages: number }>(
        `${endpoints.adminOrders}?${params}`,
      );
      return res.data || { items: [], total: 0, totalPages: 1 };
    },
  });

  const orders = data?.items || [];

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setShopFilter('all');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search.trim() || statusFilter !== 'all' || shopFilter !== 'all' || sortOrder !== 'desc');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide customer orders across all seller shops. Filter by store, fulfillment progress, or payment state.
        </p>
      </div>

      {/* Main Table Card */}
      <DataTableCard
        toolbar={
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
              <SearchInput
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                placeholder="Search by order #, shop, customer, phone..."
                className="w-full sm:max-w-md"
              />
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Order Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open / Paid</SelectItem>
                  <SelectItem value="assigned">Assigned / In Prep</SelectItem>
                  <SelectItem value="completed">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled / Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={shopFilter}
                onValueChange={(val) => {
                  setShopFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Filter by Shop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores &amp; Shops</SelectItem>
                  {shops.map((s) => (
                    <SelectItem key={s.sellerId} value={s.sellerId}>
                      {s.shopName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sortOrder}
                onValueChange={(val: 'desc' | 'asc') => {
                  setSortOrder(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder="Sort Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        }
        footer={
          data && data.totalPages > 1 ? (
            <PaginationBar
              page={page}
              totalPages={data.totalPages}
              total={data.total}
              onPageChange={setPage}
            />
          ) : null
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[140px]">Order #</TableHead>
              <TableHead>Shop / Store</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Fulfilment</TableHead>
              <TableHead>Placed Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRows cols={9} />
            ) : !orders.length ? (
              <TableEmptyRow
                cols={9}
                message={hasActiveFilters ? 'No orders matched your filters' : 'No customer orders placed yet'}
              />
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="transition-colors hover:bg-slate-50/70">
                  <TableCell className="font-mono text-xs font-semibold text-slate-900">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    {order.sellerId ? (
                      <Link
                        href={`/sellers/stores/${order.sellerId}?tab=orders`}
                        className="inline-flex items-center gap-1 font-medium text-slate-900 hover:text-amber-700 hover:underline text-xs"
                      >
                        <Store className="h-3 w-3 text-amber-600" />
                        {order.shopName || 'Shop Store'}
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-700">{order.shopName || '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-0.5">
                      <p className="font-medium text-slate-900">{order.address?.name || 'Customer'}</p>
                      <p className="text-muted-foreground font-mono">{order.address?.phone || ''}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700 font-medium">
                    {order.itemsCount} item{order.itemsCount === 1 ? '' : 's'}
                  </TableCell>
                  <TableCell className="font-bold text-slate-900 text-sm">
                    ₹{order.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.paymentStatus} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.fulfillmentStatus || order.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {order.createdAt ? format(new Date(order.createdAt), 'MMM d, h:mm a') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrder(order)}
                      className="h-8 text-xs font-medium"
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableCard>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Order #{selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Placed on {selectedOrder.createdAt ? format(new Date(selectedOrder.createdAt), 'PPP p') : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 rounded bg-slate-50 p-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Order Status</p>
                  <div className="mt-1">
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <div className="mt-1">
                    <StatusBadge status={selectedOrder.paymentStatus} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-base font-bold text-slate-900 mt-1">₹{selectedOrder.amount.toFixed(2)}</p>
                </div>
              </div>

              {selectedOrder.shopName && (
                <div className="rounded border border-border p-3 text-xs flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground">Fulfilling Store</p>
                    <p className="font-semibold text-slate-900">{selectedOrder.shopName}</p>
                  </div>
                  {selectedOrder.sellerId && (
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link href={`/sellers/stores/${selectedOrder.sellerId}?tab=orders`}>
                        Go to Shop
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              {selectedOrder.address && (
                <div className="rounded border border-border p-3 space-y-1 text-xs">
                  <p className="font-semibold text-slate-800">Customer Delivery Address</p>
                  <p className="text-slate-900 font-medium">
                    {selectedOrder.address.name} ({selectedOrder.address.phone})
                  </p>
                  <p className="text-slate-600">{selectedOrder.address.line1}, {selectedOrder.address.city}</p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-800">
                  Order Items ({selectedOrder.items?.length || 0})
                </p>
                <div className="divide-y divide-border rounded border border-border">
                  {selectedOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                      <div>
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-muted-foreground">Qty: {item.quantity} {item.unit ? `(${item.unit})` : ''}</p>
                      </div>
                      <p className="font-semibold text-slate-800">
                        ₹{item.lineTotalPaise != null ? (item.lineTotalPaise / 100).toFixed(2) : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t">
              <Button size="sm" variant="outline" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
