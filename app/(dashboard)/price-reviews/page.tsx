'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { SearchInput } from '@/components/shared/search-input';
import { DataTableCard } from '@/components/shared/data-table-card';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { toast } from 'sonner';
import { Check, X, Package, ArrowRight, Store, MessageSquare, Eye, Tag, Info, Layers, Clock, Trash2, RotateCcw } from 'lucide-react';
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
    attributes?: Array<{ label?: string; attributeId?: string; value: any }>;
    description?: string;
    productInformation?: Record<string, any>;
    lifespanValue?: number;
    lifespanUnit?: string;
  };
  unit?: string | null;
  sellingPricePaise: number;
  customDescription?: string | null;
  customNotes?: string | null;
  customAttributes?: Array<{ attributeId?: string; label?: string; value: any }> | null;
  customProductInformation?: Record<string, any> | null;

  pendingSellingPricePaise?: number | null;
  pendingUnit?: string | null;
  pendingDescription?: string | null;
  pendingNotes?: string | null;
  pendingAttributes?: Array<{ attributeId?: string; label?: string; value: any }> | null;
  pendingProductInformation?: Record<string, any> | null;

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

  // Modal state for View Changes Diff
  const [viewChangesItem, setViewChangesItem] = useState<SellerListing | null>(null);

  // Modal state for Delete Listing
  const [deleteModalItem, setDeleteModalItem] = useState<SellerListing | null>(null);

  const [selectedShop, setSelectedShop] = useState('all');

  // Load shops list for filtering
  const { data: shops = [] } = useQuery({
    queryKey: ['filter-shops-price-reviews'],
    queryFn: async () => {
      const res = await api<{ items: Array<{ sellerId: string; shopName: string }> }>(`${endpoints.sellerStores}?limit=100`);
      return res.data?.items || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['price-reviews', activeTab, search, selectedShop, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (activeTab !== 'ALL') {
        params.set('reviewStatus', activeTab);
      }
      if (selectedShop !== 'all') {
        params.set('sellerId', selectedShop);
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
      toast.success('Product changes approved and published live!');
      setViewChangesItem(null);
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
      setViewChangesItem(null);
      setRejectionReasonInput('');
      qc.invalidateQueries({ queryKey: ['price-reviews'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to reject changes'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api(`${endpoints.sellerListings}/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast.success('Product listing deleted successfully!');
      setDeleteModalItem(null);
      qc.invalidateQueries({ queryKey: ['price-reviews'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete product listing'),
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

  const showActionsColumn = true;
  const colsCount = 7;

  // Helper to compute attribute diffs
  const getAttributeDiffs = (item: SellerListing) => {
    if (!item.pendingAttributes || item.pendingAttributes.length === 0) return [];
    const liveAttrs = item.customAttributes || item.masterProductId?.attributes || [];
    const pendingAttrs = item.pendingAttributes;

    const liveMap = new Map<string, string>();
    liveAttrs.forEach((a) => {
      const key = (a.label || a.attributeId || '').trim();
      if (key) liveMap.set(key.toLowerCase(), String(a.value ?? '').trim());
    });

    const diffs: Array<{ key: string; liveVal: string; pendingVal: string; status: 'Added' | 'Changed' }> = [];

    pendingAttrs.forEach((a) => {
      const label = (a.label || a.attributeId || '').trim();
      if (!label) return;
      const keyLower = label.toLowerCase();
      const liveVal = liveMap.get(keyLower);
      const pendingVal = String(a.value ?? '').trim();

      if (liveVal === undefined) {
        diffs.push({ key: label, liveVal: '—', pendingVal, status: 'Added' });
      } else if (liveVal !== pendingVal) {
        diffs.push({ key: label, liveVal, pendingVal, status: 'Changed' });
      }
    });

    return diffs;
  };

  // Helper to compute specifications diffs
  const getSpecsDiffs = (item: SellerListing) => {
    if (!item.pendingProductInformation || Object.keys(item.pendingProductInformation).length === 0) return [];
    const currentInfo = item.customProductInformation || item.masterProductId?.productInformation || {};
    const diffs: Array<{ key: string; label: string; liveVal: string; pendingVal: string }> = [];

    for (const [k, v] of Object.entries(item.pendingProductInformation)) {
      if (v === undefined || v === null) continue;
      const liveVal = currentInfo[k] != null ? String(currentInfo[k]).trim() : '';
      const pendingVal = String(v).trim();
      if (pendingVal !== '' && pendingVal !== liveVal) {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
        diffs.push({ key: k, label, liveVal: liveVal || '—', pendingVal });
      }
    }
    return diffs;
  };

  return (
    <div className="space-y-6">
      {/* Header with Sub-navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Product Approvals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review seller updates to prices, units, and attributes. Compare live vs requested changes and approve or reject.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5 border-border hover:bg-slate-50">
            <Link href="/product-submissions">
              <Layers className="h-4 w-4 text-amber-600" />
              Custom Product Submissions
            </Link>
          </Button>
          <Button asChild variant="default" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5">
            <Link href="/price-reviews">
              <Tag className="h-4 w-4" />
              Price &amp; Unit Reviews
            </Link>
          </Button>
        </div>
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
      <DataTableCard
        toolbar={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
              <SearchInput
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search product, brand, or store..."
                className="w-full sm:max-w-xs"
              />
              <Select
                value={selectedShop}
                onValueChange={(v) => { setSelectedShop(v); setPage(1); }}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Filter by Shop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Seller Shops</SelectItem>
                  {shops.map((s) => (
                    <SelectItem key={s.sellerId} value={s.sellerId}>
                      {s.shopName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(search.trim() || selectedShop !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setSelectedShop('all'); setPage(1); }}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset Filters
              </Button>
            )}
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product</TableHead>
              <TableHead>Seller / Store</TableHead>
              <TableHead>Approved Live Details</TableHead>
              <TableHead>Requested / Pending Changes</TableHead>
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
                    ? 'No pending product content or price reviews found'
                    : activeTab === 'REJECTED'
                    ? 'No rejected history logs found'
                    : 'No listings match your search criteria'
                }
              />
            ) : (
              filteredItems.map((item) => {
                const currentPricePaise = item.sellingPricePaise ?? 0;
                const currentPrice = currentPricePaise / 100;
                const currentUnit = (item.unit || item.masterProductId?.packOrSoldAs || item.masterProductId?.variant || 'Standard').trim();

                const isPriceChanged = item.pendingSellingPricePaise != null && item.pendingSellingPricePaise !== currentPricePaise;
                const isUnitChanged = Boolean(item.pendingUnit && item.pendingUnit.trim() !== currentUnit);

                const currentDesc = (item.customDescription || item.masterProductId?.description || '').trim();
                const pendingDesc = (item.pendingDescription || '').trim();
                const isDescChanged = Boolean(pendingDesc && pendingDesc !== currentDesc);

                const currentNotes = (item.customNotes || '').trim();
                const pendingNotes = (item.pendingNotes || '').trim();
                const isNotesChanged = Boolean(pendingNotes && pendingNotes !== currentNotes);

                const attrDiffs = getAttributeDiffs(item);
                const isAttributesChanged = attrDiffs.length > 0;

                const specsDiffs = getSpecsDiffs(item);
                const isSpecsChanged = specsDiffs.length > 0;

                const hasAnyPending = isPriceChanged || isUnitChanged || isAttributesChanged || isDescChanged || isNotesChanged || isSpecsChanged;
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
                      {item.sellerId?._id ? (
                        <Link
                          href={`/sellers/stores/${item.sellerId._id}?tab=price-changes`}
                          className="flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:text-amber-700 hover:underline"
                        >
                          <Store className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <span className="truncate">{shopName}</span>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{shopName}</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Approved Live Details (Price & Unit) */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">₹{currentPrice.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">Unit: {currentUnit}</span>
                      </div>
                    </TableCell>

                    {/* Requested Changes (Field Names Only - No Values) */}
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {hasAnyPending ? (
                          <div className="flex flex-wrap gap-1">
                            {isPriceChanged && (
                              <span className="rounded bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                                Price
                              </span>
                            )}
                            {isUnitChanged && (
                              <span className="rounded bg-blue-100 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                                Unit
                              </span>
                            )}
                            {isAttributesChanged && (
                              <span className="rounded bg-purple-100 border border-purple-200 px-2 py-0.5 text-[11px] font-semibold text-purple-900">
                                Attributes
                              </span>
                            )}
                            {isDescChanged && (
                              <span className="rounded bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                                Description
                              </span>
                            )}
                            {isNotesChanged && (
                              <span className="rounded bg-indigo-100 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-900">
                                Notes
                              </span>
                            )}
                            {isSpecsChanged && (
                              <span className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-900">
                                Specifications
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800"
                            onClick={() => setViewChangesItem(item)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Changes
                          </Button>

                          {isUnderReview && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => approveMutation.mutate(item._id)}
                                disabled={approveMutation.isPending || rejectMutation.isPending || deleteMutation.isPending}
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
                                disabled={approveMutation.isPending || rejectMutation.isPending || deleteMutation.isPending}
                              >
                                <X className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                            onClick={() => setDeleteModalItem(item)}
                            disabled={approveMutation.isPending || rejectMutation.isPending || deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
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

      {/* VIEW CHANGES COMPARISON MODAL */}
      {viewChangesItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl border border-border space-y-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-4 border-border">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">{viewChangesItem.masterProductId?.name}</h3>
                  <StatusBadge status={viewChangesItem.reviewStatus} />
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Store: <span className="font-semibold text-slate-800">{viewChangesItem.sellerId?.shopName || viewChangesItem.sellerId?.storeName || 'Seller Store'}</span> · Submitted: {viewChangesItem.reviewSubmittedAt ? format(new Date(viewChangesItem.reviewSubmittedAt), 'MMM d, yyyy h:mm a') : '—'}
                </p>
              </div>
              <button
                onClick={() => setViewChangesItem(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Price & Unit Diff - Only show if actually changed */}
            {(() => {
              const livePricePaise = viewChangesItem.sellingPricePaise ?? 0;
              const hasPriceDiff = viewChangesItem.pendingSellingPricePaise != null && viewChangesItem.pendingSellingPricePaise !== livePricePaise;
              const liveUnit = (viewChangesItem.unit || viewChangesItem.masterProductId?.packOrSoldAs || viewChangesItem.masterProductId?.variant || 'Standard').trim();
              const hasUnitDiff = Boolean(viewChangesItem.pendingUnit && viewChangesItem.pendingUnit.trim() !== liveUnit);

              if (!hasPriceDiff && !hasUnitDiff) return null;

              return (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-amber-700" /> Price &amp; Pack Unit Change
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 block">Existing Approved</span>
                      <span className="font-semibold text-slate-900">
                        ₹{(livePricePaise / 100).toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">({liveUnit})</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Seller Changed To</span>
                      <span className={`font-bold ${hasPriceDiff ? 'text-amber-900' : 'text-slate-900'}`}>
                        ₹{hasPriceDiff ? (viewChangesItem.pendingSellingPricePaise! / 100).toFixed(2) : (livePricePaise / 100).toFixed(2)}
                      </span>
                      <span className={`text-xs ml-2 ${hasUnitDiff ? 'font-bold text-amber-900' : 'text-slate-500'}`}>
                        ({hasUnitDiff ? viewChangesItem.pendingUnit : liveUnit})
                      </span>
                      {hasPriceDiff && (
                        <span className="ml-2 text-xs font-semibold text-amber-800">
                          ({viewChangesItem.pendingSellingPricePaise! > livePricePaise ? '+' : ''}
                          ₹{((viewChangesItem.pendingSellingPricePaise! - livePricePaise) / 100).toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Attribute Comparison View - Only show if actually changed */}
            {(() => {
              const diffs = getAttributeDiffs(viewChangesItem);
              if (diffs.length === 0) return null;
              return (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-purple-600" /> Product Attributes Comparison
                  </h4>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-border text-slate-600 uppercase font-bold">
                        <tr>
                          <th className="p-2.5">Attribute Name</th>
                          <th className="p-2.5">Previous Approved Value</th>
                          <th className="p-2.5">Seller Changed To</th>
                          <th className="p-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {diffs.map((diff, idx) => (
                          <tr key={diff.key + idx} className="bg-purple-50/30 font-medium">
                            <td className="p-2.5 font-bold text-slate-800">{diff.key}</td>
                            <td className="p-2.5 text-slate-600 line-through">{diff.liveVal}</td>
                            <td className="p-2.5 font-bold text-slate-900">{diff.pendingVal}</td>
                            <td className="p-2.5 text-right">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  diff.status === 'Changed'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {diff.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Product Description Diff - Only show if actually changed */}
            {(() => {
              const liveDesc = (viewChangesItem.customDescription || viewChangesItem.masterProductId?.description || '').trim();
              const pendDesc = (viewChangesItem.pendingDescription || '').trim();
              if (!pendDesc || pendDesc === liveDesc) return null;
              return (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-emerald-600" /> Product Description Comparison
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Previous Description</span>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">
                        {liveDesc || 'No description provided'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-300 bg-emerald-50/40 p-3">
                      <span className="text-xs font-bold text-emerald-900 uppercase block mb-1">Seller Changed To</span>
                      <p className="text-xs text-slate-900 font-medium whitespace-pre-wrap">
                        {pendDesc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Seller Notes Diff - Only show if actually changed */}
            {(() => {
              const liveNotes = (viewChangesItem.customNotes || '').trim();
              const pendNotes = (viewChangesItem.pendingNotes || '').trim();
              if (!pendNotes || pendNotes === liveNotes) return null;
              return (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-indigo-600" /> Seller Notes Comparison
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Previous Notes</span>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">
                        {liveNotes || 'None'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
                      <span className="text-xs font-bold text-indigo-900 uppercase block mb-1">Seller Changed To</span>
                      <p className="text-xs text-indigo-950 font-medium whitespace-pre-wrap">
                        {pendNotes}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Specifications & Product Information - Only show if actually changed */}
            {(() => {
              const specs = getSpecsDiffs(viewChangesItem);
              if (specs.length === 0) return null;
              return (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-600" /> Specifications &amp; Product Information Comparison
                  </h4>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-border text-slate-600 uppercase font-bold">
                        <tr>
                          <th className="p-2.5">Specification</th>
                          <th className="p-2.5">Previous Approved Value</th>
                          <th className="p-2.5">Seller Changed To</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {specs.map((spec) => (
                          <tr key={spec.key} className="bg-amber-50/30 font-medium">
                            <td className="p-2.5 font-bold text-slate-800">{spec.label}</td>
                            <td className="p-2.5 text-slate-600 line-through">{spec.liveVal}</td>
                            <td className="p-2.5 font-bold text-slate-900">{spec.pendingVal}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewChangesItem(null)}
              >
                Close
              </Button>

              {viewChangesItem.reviewStatus === 'UNDER_REVIEW' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 gap-1"
                    onClick={() => {
                      setRejectModalItem(viewChangesItem);
                      setRejectionReasonInput('');
                    }}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                    Reject Changes
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    onClick={() => approveMutation.mutate(viewChangesItem._id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                    {approveMutation.isPending ? 'Approving...' : 'Approve & Publish Live'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
                placeholder="Enter rejection reason (e.g. Invalid attribute values / Description violates store policies)..."
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

      {/* Delete Confirmation Modal */}
      {deleteModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 border-b pb-3">
              <Trash2 className="h-6 w-6 shrink-0 text-red-600" />
              <h3 className="text-lg font-bold text-slate-900">Delete Product Listing</h3>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteModalItem.masterProductId?.name || 'this product'}</span> from store <span className="font-semibold text-slate-900">{deleteModalItem.sellerId?.shopName || deleteModalItem.sellerId?.storeName || deleteModalItem.sellerId?.fullName || 'Seller'}</span>?
            </p>
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
              This action will remove the live product listing and shop inventory for this seller.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalItem(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white gap-1"
                onClick={() => deleteMutation.mutate(deleteModalItem._id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Listing'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
