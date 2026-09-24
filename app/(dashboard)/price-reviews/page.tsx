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
import { Check, X, Package, ArrowRight, Store, MessageSquare, Eye, Tag, Info, Layers, Clock } from 'lucide-react';
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

  // Helper to compute attribute diffs
  const getAttributeDiffs = (item: SellerListing) => {
    const liveAttrs = item.customAttributes || item.masterProductId?.attributes || [];
    const pendingAttrs = item.pendingAttributes || [];

    const liveMap = new Map<string, string>();
    liveAttrs.forEach((a) => {
      const key = (a.label || a.attributeId || '').trim();
      if (key) liveMap.set(key, String(a.value ?? '').trim());
    });

    const pendingMap = new Map<string, string>();
    pendingAttrs.forEach((a) => {
      const key = (a.label || a.attributeId || '').trim();
      if (key) pendingMap.set(key, String(a.value ?? '').trim());
    });

    const allKeys = Array.from(new Set([...Array.from(liveMap.keys()), ...Array.from(pendingMap.keys())]));
    return allKeys.map((key) => {
      const liveVal = liveMap.get(key);
      const pendingVal = pendingMap.get(key);
      let status: 'Added' | 'Changed' | 'Removed' | 'Unchanged' = 'Unchanged';
      if (liveVal === undefined && pendingVal !== undefined) status = 'Added';
      else if (liveVal !== undefined && pendingVal === undefined) status = 'Removed';
      else if (liveVal !== pendingVal) status = 'Changed';

      return { key, liveVal: liveVal ?? '—', pendingVal: pendingVal ?? '—', status };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Product Catalogue & Price Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review seller updates to attributes, description, notes, price, and units (`UNDER_REVIEW`). Click <span className="font-semibold text-slate-800">View Changes</span> to compare before vs after and approve or reject.
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
                const currentPrice = item.sellingPricePaise ? item.sellingPricePaise / 100 : 0;
                const currentUnit = item.unit || item.masterProductId?.packOrSoldAs || item.masterProductId?.variant || 'Standard';

                const requestedPrice = item.pendingSellingPricePaise != null
                  ? item.pendingSellingPricePaise / 100
                  : null;
                const requestedUnit = item.pendingUnit || null;
                const isUnitChanged = requestedUnit != null && requestedUnit !== currentUnit;
                const priceDiff = requestedPrice != null ? requestedPrice - currentPrice : 0;
                const isUnderReview = item.reviewStatus === 'UNDER_REVIEW';

                const hasPendingAttributes = Boolean(item.pendingAttributes && item.pendingAttributes.length > 0);
                const hasPendingDesc = Boolean(item.pendingDescription);
                const hasPendingNotes = Boolean(item.pendingNotes);
                const hasPendingInfo = Boolean(item.pendingProductInformation && Object.keys(item.pendingProductInformation).length > 0);
                const hasAnyPending = requestedPrice != null || isUnitChanged || hasPendingAttributes || hasPendingDesc || hasPendingNotes || hasPendingInfo;

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

                    {/* Requested Changes (Price, Unit, Attributes, Description, Notes) */}
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {hasAnyPending ? (
                          <div className="flex flex-wrap gap-1">
                            {requestedPrice != null && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-900">
                                Price: ₹{requestedPrice.toFixed(2)}
                              </span>
                            )}
                            {isUnitChanged && (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-bold text-blue-900">
                                Unit: {requestedUnit}
                              </span>
                            )}
                            {hasPendingAttributes && (
                              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[11px] font-bold text-purple-900 flex items-center gap-1">
                                <Tag className="h-3 w-3" /> Attributes Changed
                              </span>
                            )}
                            {hasPendingDesc && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                                <Info className="h-3 w-3" /> Description Changed
                              </span>
                            )}
                            {hasPendingNotes && (
                              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" /> Notes Changed
                              </span>
                            )}
                            {hasPendingInfo && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-900 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Specs Changed
                              </span>
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
                            </>
                          )}
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

            {/* Price & Unit Diff */}
            {(viewChangesItem.pendingSellingPricePaise != null || (viewChangesItem.pendingUnit && viewChangesItem.pendingUnit !== viewChangesItem.unit)) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-amber-700" /> Price & Pack Unit Change
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">Existing Approved</span>
                    <span className="font-semibold text-slate-900">
                      ₹{viewChangesItem.sellingPricePaise ? (viewChangesItem.sellingPricePaise / 100).toFixed(2) : '0.00'}
                    </span>
                    <span className="text-xs text-slate-500 ml-2">({viewChangesItem.unit || 'Standard'})</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Seller Changed To</span>
                    <span className="font-bold text-amber-800">
                      ₹{viewChangesItem.pendingSellingPricePaise != null ? (viewChangesItem.pendingSellingPricePaise / 100).toFixed(2) : (viewChangesItem.sellingPricePaise / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-amber-800 font-bold ml-2">({viewChangesItem.pendingUnit || viewChangesItem.unit || 'Standard'})</span>
                  </div>
                </div>
              </div>
            )}

            {/* Attribute Comparison View */}
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
                    {getAttributeDiffs(viewChangesItem).length > 0 ? (
                      getAttributeDiffs(viewChangesItem).map((diff, idx) => (
                        <tr key={diff.key + idx} className={diff.status !== 'Unchanged' ? 'bg-amber-50/40 font-medium' : ''}>
                          <td className="p-2.5 font-bold text-slate-800">{diff.key}</td>
                          <td className="p-2.5 text-slate-600 line-through">{diff.liveVal}</td>
                          <td className="p-2.5 font-bold text-slate-900">{diff.pendingVal}</td>
                          <td className="p-2.5 text-right">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                diff.status === 'Changed'
                                  ? 'bg-amber-100 text-amber-800'
                                  : diff.status === 'Added'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : diff.status === 'Removed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {diff.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-slate-400 italic">
                          No product attributes defined.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Product Description Diff */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-emerald-600" /> Product Description Comparison
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Previous Description</span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">
                    {viewChangesItem.customDescription || viewChangesItem.masterProductId?.description || 'No description provided'}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <span className="text-xs font-bold text-amber-900 uppercase block mb-1">Seller Changed To</span>
                  <p className="text-xs text-amber-950 font-medium whitespace-pre-wrap">
                    {viewChangesItem.pendingDescription ?? (viewChangesItem.customDescription || viewChangesItem.masterProductId?.description || 'No change')}
                  </p>
                </div>
              </div>
            </div>

            {/* Seller Notes Diff */}
            {(viewChangesItem.pendingNotes || viewChangesItem.customNotes) && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-indigo-600" /> Seller Notes Comparison
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Previous Notes</span>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">
                      {viewChangesItem.customNotes || 'None'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
                    <span className="text-xs font-bold text-indigo-900 uppercase block mb-1">Seller Changed To</span>
                    <p className="text-xs text-indigo-950 font-medium whitespace-pre-wrap">
                      {viewChangesItem.pendingNotes ?? viewChangesItem.customNotes ?? 'No change'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Specifications & Product Information */}
            {viewChangesItem.pendingProductInformation && Object.keys(viewChangesItem.pendingProductInformation).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-600" /> Specifications & Product Information
                </h4>
                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-xs space-y-1.5">
                  {Object.entries(viewChangesItem.pendingProductInformation).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-amber-100 pb-1">
                      <span className="font-semibold text-slate-700 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-bold text-slate-900">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
    </div>
  );
}
