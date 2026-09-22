'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/status-badge';
import { SearchInput } from '@/components/shared/search-input';
import { DataTableCard } from '@/components/shared/data-table-card';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { toast } from 'sonner';
import { Check, X, Package, ArrowRight, Store, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface SellerListing {
  _id: string;
  logId?: string;
  sellerId?: {
    _id?: string;
    shopName?: string;
    storeName?: string;
    fullName?: string;
    phone?: string;
  };
  masterProductId?: {
    _id?: string;
    name?: string;
    brand?: string;
    categoryName?: string;
    subcategoryName?: string;
    imageUrl?: string;
    sellingPricePaise?: number;
    packOrSoldAs?: string;
    variant?: string;
  };
  unit?: string | null;
  sellingPricePaise: number;
  pendingSellingPricePaise?: number | null;
  pendingUnit?: string | null;
  rejectionReason?: string | null;
  reviewStatus: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PENDING_REVIEW';
  reviewSubmittedAt?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PriceReviewsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL'>('UNDER_REVIEW');
  const [page, setPage] = useState(1);

  // Modal state for rejection note prompt
  const [rejectModalItem, setRejectModalItem] = useState<SellerListing | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['price-reviews', activeTab, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (activeTab !== 'ALL') {
        params.set('reviewStatus', activeTab);
      }
      const res = await api<{ items: SellerListing[]; totalPages: number; total: number }>(
        `${endpoints.sellerListings}?${params}`
      );
      return res.data || { items: [], totalPages: 1, total: 0 };
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return api(`${endpoints.sellerListings}/${id}/approve`, { method: 'POST' });
    },
    onSuccess: () => {
      toast.success('Price & unit changes approved and published live!');
      qc.invalidateQueries({ queryKey: ['price-reviews'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to approve changes'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return api(`${endpoints.sellerListings}/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      toast.success('Request rejected and rejection note sent!');
      setRejectModalItem(null);
      setRejectionReasonInput('');
      qc.invalidateQueries({ queryKey: ['price-reviews'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to reject changes'),
  });

  const rawItems = data?.items || [];
  const filteredItems = rawItems.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const productName = item.masterProductId?.name?.toLowerCase() || '';
    const brand = item.masterProductId?.brand?.toLowerCase() || '';
    const shopName = item.sellerId?.shopName?.toLowerCase() || item.sellerId?.storeName?.toLowerCase() || '';
    const sellerName = item.sellerId?.fullName?.toLowerCase() || '';
    return productName.includes(q) || brand.includes(q) || shopName.includes(q) || sellerName.includes(q);
  });

  const pendingCount = activeTab === 'UNDER_REVIEW' ? data?.total : undefined;

  const handleConfirmReject = () => {
    if (!rejectModalItem) return;
    const reasonText = rejectionReasonInput.trim() || 'Request rejected by admin';
    rejectMutation.mutate({ id: rejectModalItem._id, reason: reasonText });
  };

  const showActionsColumn = activeTab === 'UNDER_REVIEW' || activeTab === 'ALL';
  const colsCount = showActionsColumn ? 7 : 6;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Price & Unit Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review seller price and unit updates (`UNDER_REVIEW`). Approve to publish live or reject with a note to seller. Past rejections remain saved in the Rejected tab.
        </p>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Button
          variant={activeTab === 'UNDER_REVIEW' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setActiveTab('UNDER_REVIEW'); setPage(1); }}
          className="gap-2"
        >
          <span>Under Review</span>
          {pendingCount !== undefined && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {pendingCount}
            </span>
          )}
        </Button>
        <Button
          variant={activeTab === 'APPROVED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setActiveTab('APPROVED'); setPage(1); }}
        >
          Approved
        </Button>
        <Button
          variant={activeTab === 'REJECTED' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setActiveTab('REJECTED'); setPage(1); }}
        >
          Rejected Log History
        </Button>
        <Button
          variant={activeTab === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setActiveTab('ALL'); setPage(1); }}
        >
          All Listings
        </Button>
      </div>

      {/* Main Table Card */}
      <DataTableCard toolbar={<SearchInput value={search} onChange={setSearch} placeholder="Search product, brand, or store..." />}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product</TableHead>
              <TableHead>Seller / Store</TableHead>
              <TableHead>Approved Live Details</TableHead>
              <TableHead>Requested / Rejected Changes</TableHead>
              <TableHead>Submitted Date</TableHead>
              <TableHead>Status</TableHead>
              {showActionsColumn && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRows cols={colsCount} />
            ) : !filteredItems.length ? (
              <TableEmptyRow
                cols={colsCount}
                message={
                  activeTab === 'UNDER_REVIEW'
                    ? 'No pending price or unit reviews found'
                    : activeTab === 'REJECTED'
                    ? 'No rejected history logs found'
                    : 'No listings match your search criteria'
                }
              />
            ) : (
              filteredItems.map((item) => {
                const currentPrice = item.sellingPricePaise ? item.sellingPricePaise / 100 : 0;
                const currentUnit = item.unit || item.masterProductId?.packOrSoldAs || item.masterProductId?.variant || 'Standard';

                const requestedPrice = item.pendingSellingPricePaise != null
                  ? item.pendingSellingPricePaise / 100
                  : null;
                const requestedUnit = item.pendingUnit || null;
                const isUnitChanged = requestedUnit != null && requestedUnit !== currentUnit;
                const priceDiff = requestedPrice != null ? requestedPrice - currentPrice : 0;
                const isUnderReview = item.reviewStatus === 'UNDER_REVIEW';

                const shopName = item.sellerId?.shopName || item.sellerId?.storeName || item.sellerId?.fullName || 'Seller';
                const productName = item.masterProductId?.name || 'Product';
                const brand = item.masterProductId?.brand;
                const imageUrl = item.masterProductId?.imageUrl;

                return (
                  <TableRow key={item.logId || item._id} className="group">
                    {/* Product Cell */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {imageUrl ? (
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                            <Image src={imageUrl} alt={productName} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{productName}</p>
                          {brand && <p className="text-xs text-muted-foreground">{brand}</p>}
                        </div>
                      </div>
                    </TableCell>

                    {/* Seller Cell */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{shopName}</span>
                      </div>
                    </TableCell>

                    {/* Approved Live Details (Price & Unit) */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">₹{currentPrice.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">Unit: {currentUnit}</span>
                      </div>
                    </TableCell>

                    {/* Requested Changes (Price & Unit & Rejection Note) */}
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {requestedPrice != null || isUnitChanged ? (
                          <div className="flex flex-col gap-1">
                            {requestedPrice != null && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Price:</span>
                                <span className="font-semibold text-amber-700">₹{requestedPrice.toFixed(2)}</span>
                                {priceDiff !== 0 && (
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                      priceDiff > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {priceDiff > 0 ? `+₹${priceDiff.toFixed(2)}` : `-₹${Math.abs(priceDiff).toFixed(2)}`}
                                  </span>
                                )}
                              </div>
                            )}
                            {isUnitChanged && (
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-muted-foreground">Unit:</span>
                                <span className="font-medium text-slate-500 line-through">{currentUnit}</span>
                                <ArrowRight className="h-3 w-3 text-amber-600" />
                                <span className="font-bold text-amber-900">{requestedUnit}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No pending changes</span>
                        )}

                        {!isUnderReview && item.rejectionReason && (
                          <div className="flex items-start gap-1 rounded border border-red-200 bg-red-50 p-1.5 text-xs text-red-800">
                            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-red-600 mt-0.5" />
                            <div>
                              <span className="font-bold">Rejection Note: </span>
                              <span>{item.rejectionReason}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Submitted Date */}
                    <TableCell className="text-xs text-muted-foreground">
                      {item.reviewSubmittedAt
                        ? format(new Date(item.reviewSubmittedAt), 'MMM d, yyyy h:mm a')
                        : item.createdAt
                          ? format(new Date(item.createdAt), 'MMM d, yyyy')
                          : '—'}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <StatusBadge status={item.reviewStatus} />
                    </TableCell>

                    {/* Actions Cell */}
                    {showActionsColumn && (
                      <TableCell className="text-right">
                        {isUnderReview ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => approveMutation.mutate(item._id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                              onClick={() => {
                                setRejectModalItem(item);
                                setRejectionReasonInput('');
                              }}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {data && data.totalPages > 1 && (
          <div className="border-t border-border p-4">
            <PaginationBar
              page={page}
              totalPages={data.totalPages}
              total={data.total}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </DataTableCard>

      {/* Rejection Note Modal Dialog */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-border space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3 border-border">
              <h3 className="text-lg font-bold text-slate-900">Reject Update Request</h3>
              <button
                onClick={() => setRejectModalItem(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">
                Product: <span className="font-bold text-slate-900">{rejectModalItem.masterProductId?.name}</span>
              </p>
              <p className="text-xs text-slate-500">
                Store: {rejectModalItem.sellerId?.shopName || rejectModalItem.sellerId?.storeName || 'Seller Store'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Rejection Note / Reason for Seller *
              </label>
              <textarea
                className="w-full rounded-md border border-slate-300 p-3 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                rows={3}
                placeholder="Enter rejection reason (e.g. Price too low compared to MRP / Invalid pack size format)..."
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalItem(null)}
                disabled={rejectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white gap-1"
                onClick={handleConfirmReject}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
