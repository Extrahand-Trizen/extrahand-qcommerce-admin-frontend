'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, endpoints } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Search,
  Filter,
  RefreshCw,
  Tag,
  TrendingDown,
  Calendar,
  Percent,
  IndianRupee,
  Store,
  User,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

export interface AdminPromotionProductDTO {
  masterProductId: string;
  name: string;
  slug: string;
  originalPricePaise?: number;
  discountedPricePaise?: number;
  discountAmountPaise?: number;
  discountPercent?: number;
}

export interface AdminPromotionDTO {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerMobile?: string;
  sellerEmail?: string;
  storeName: string;
  storeCity?: string;
  offerType: 'COUPON' | 'PRICE_DROP';
  trigger: 'CODE' | 'AUTOMATIC';
  code?: string;
  description?: string;
  appliesTo: 'ORDER' | 'PRODUCTS';
  discountType: 'PERCENT' | 'FLAT';
  discountValue: number;
  formattedDiscount: string;
  minOrderPaise?: number;
  maxDiscountPaise?: number;
  usageLimit?: number;
  perCustomerLimit?: number;
  usedCount: number;
  totalDiscountGivenPaise: number;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  status: 'active' | 'scheduled' | 'expired' | 'paused' | 'exhausted';
  products: AdminPromotionProductDTO[];
}

export interface ApiResponse {
  success: boolean;
  data: {
    promotions: AdminPromotionDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: {
      totalOffers: number;
      activeOffers: number;
      couponsCount: number;
      priceDropsCount: number;
    };
  };
}

export default function SellerOffersPage() {
  const [promotions, setPromotions] = useState<AdminPromotionDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [offerType, setOfferType] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [sellerId, setSellerId] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Stats
  const [summary, setSummary] = useState({
    totalOffers: 0,
    activeOffers: 0,
    couponsCount: 0,
    priceDropsCount: 0,
  });

  // Selected Detail Modal
  const [selectedOffer, setSelectedOffer] = useState<AdminPromotionDTO | null>(null);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (offerType !== 'ALL') params.set('offerType', offerType);
      if (status !== 'ALL') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      if (sellerId.trim()) params.set('sellerId', sellerId.trim());

      const res = await api<any>(`${endpoints.sellerPromotions}?${params.toString()}`);
      if (res.data) {
        const rawPromos = res.data.promotions || res.data.items || [];
        setPromotions(rawPromos);
        setTotalPages(res.data.totalPages || res.data.pagination?.totalPages || 1);
        setTotalItems(res.data.total ?? res.data.pagination?.total ?? rawPromos.length);
        if (res.data.summary) {
          setSummary({
            totalOffers: res.data.summary.totalOffers || 0,
            activeOffers: res.data.summary.activeOffers ?? res.data.summary.activeCount ?? 0,
            couponsCount: res.data.summary.couponsCount ?? res.data.summary.couponCount ?? 0,
            priceDropsCount: res.data.summary.priceDropsCount ?? res.data.summary.priceDropCount ?? 0,
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load seller offers');
    } finally {
      setLoading(false);
    }
  }, [page, offerType, status, search, sellerId]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const formatRupees = (paise?: number) => {
    if (paise === undefined || paise === null) return 'N/A';
    return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (st: AdminPromotionDTO['status']) => {
    switch (st) {
      case 'active':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium">Active</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-medium">Scheduled</Badge>;
      case 'expired':
        return <Badge variant="secondary" className="bg-slate-200 text-slate-700 font-medium">Expired</Badge>;
      case 'paused':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium">Paused</Badge>;
      case 'exhausted':
        return <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-medium">Limit Reached</Badge>;
      default:
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  const renderOfferTypeBadge = (type: 'COUPON' | 'PRICE_DROP') => {
    if (type === 'COUPON') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Tag className="w-3.5 h-3.5" /> Coupon
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
        <TrendingDown className="w-3.5 h-3.5" /> Instant Price Drop
      </span>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Seller Offers & Coupons</h2>
          <p className="text-sm text-slate-500">
            Monitor and inspect all seller-funded discount coupons and instant price drops across stores.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPromotions}
          disabled={loading}
          className="self-start sm:self-auto gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Offers</CardTitle>
            <Tag className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{summary.totalOffers}</div>
            <p className="text-xs text-slate-500 mt-1">All historical & active seller promotions</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Currently Active</CardTitle>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{summary.activeOffers}</div>
            <p className="text-xs text-slate-500 mt-1">Live offers available to customers now</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Coupons</CardTitle>
            <Percent className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{summary.couponsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Promo code based discounts</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Instant Price Drops</CardTitle>
            <TrendingDown className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.priceDropsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Direct product price drops</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by promo code, seller, store name, or description..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-slate-50 border-slate-200"
              />
            </div>

            {/* Offer Type Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full md:w-auto">
              <button
                type="button"
                onClick={() => { setOfferType('ALL'); setPage(1); }}
                className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  offerType === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Types
              </button>
              <button
                type="button"
                onClick={() => { setOfferType('COUPON'); setPage(1); }}
                className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  offerType === 'COUPON' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Coupons
              </button>
              <button
                type="button"
                onClick={() => { setOfferType('PRICE_DROP'); setPage(1); }}
                className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  offerType === 'PRICE_DROP' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Price Drops
              </button>
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="w-full md:w-40 h-9 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md px-3 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="ALL">All Statuses</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Expired</option>
                <option value="paused">Paused</option>
                <option value="exhausted">Limit Reached</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Data Table */}
      <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[140px] text-xs font-semibold text-slate-700">Type</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Seller / Store</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Offer Details</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Discount</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Validity Period</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Usage / Redemptions</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-700">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                      <span>Loading seller offers...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-rose-600">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Info className="w-6 h-6 text-rose-500" />
                      <span>{error}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : promotions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShoppingBag className="w-8 h-8 text-slate-300" />
                      <span className="font-medium text-slate-700">No seller offers found</span>
                      <span className="text-xs text-slate-400">Try adjusting your filters or search terms.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                promotions.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Offer Type */}
                    <TableCell className="align-middle">
                      {renderOfferTypeBadge(item.offerType)}
                    </TableCell>

                    {/* Seller / Store */}
                    <TableCell className="align-middle">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {item.storeName}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          {item.sellerName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 mt-0.5">
                          ID: {item.sellerId.substring(0, 10)}...
                        </span>
                      </div>
                    </TableCell>

                    {/* Offer Details */}
                    <TableCell className="align-middle">
                      {item.offerType === 'COUPON' ? (
                        <div className="flex flex-col">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                              {item.code}
                            </span>
                          </div>
                          {item.description && (
                            <span className="text-xs text-slate-600 mt-1 line-clamp-1">{item.description}</span>
                          )}
                          <span className="text-[11px] text-slate-400 mt-0.5">
                            Applies to: {item.appliesTo === 'ORDER' ? 'Entire Order' : `${item.products.length} Products`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-medium text-xs text-slate-800">
                            {item.products.length > 0 ? item.products[0].name : 'Instant Price Drop Product'}
                          </span>
                          {item.products.length > 1 && (
                            <span className="text-[11px] text-orange-600 font-medium">
                              +{item.products.length - 1} more products
                            </span>
                          )}
                          {item.products.length > 0 && (
                            <div className="flex items-center gap-2 text-xs mt-1">
                              <span className="line-through text-slate-400">{formatRupees(item.products[0].originalPricePaise)}</span>
                              <span className="font-semibold text-emerald-600">{formatRupees(item.products[0].discountedPricePaise)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Discount Value */}
                    <TableCell className="align-middle">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-slate-900">{item.formattedDiscount}</span>
                        {item.minOrderPaise && item.minOrderPaise > 0 ? (
                          <span className="text-[11px] text-slate-500">Min Order: {formatRupees(item.minOrderPaise)}</span>
                        ) : null}
                        {item.maxDiscountPaise && item.maxDiscountPaise > 0 ? (
                          <span className="text-[11px] text-slate-500">Cap: {formatRupees(item.maxDiscountPaise)}</span>
                        ) : null}
                      </div>
                    </TableCell>

                    {/* Validity */}
                    <TableCell className="align-middle">
                      <div className="flex flex-col text-xs text-slate-600">
                        <span>From: {formatDate(item.startsAt)}</span>
                        <span className="text-slate-400">To: {formatDate(item.endsAt)}</span>
                      </div>
                    </TableCell>

                    {/* Usage */}
                    <TableCell className="align-middle">
                      <div className="flex flex-col text-xs">
                        <span className="font-semibold text-slate-900">
                          {item.usedCount} redemptions
                        </span>
                        {item.usageLimit ? (
                          <span className="text-[11px] text-slate-500">Limit: {item.usageLimit} max</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Unlimited</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="align-middle">
                      {renderStatusBadge(item.status)}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right align-middle">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOffer(item)}
                        className="text-xs hover:bg-slate-100 font-medium"
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{promotions.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalItems}</span> offers
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </Button>
            <span className="text-slate-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 text-xs gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Offer Detail Modal / Drawer */}
      <Dialog open={!!selectedOffer} onOpenChange={(open) => !open && setSelectedOffer(null)}>
        {selectedOffer && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center gap-2">
                {renderOfferTypeBadge(selectedOffer.offerType)}
                {renderStatusBadge(selectedOffer.status)}
              </div>
              <DialogTitle className="text-xl font-bold mt-2">
                {selectedOffer.offerType === 'COUPON'
                  ? `Coupon Code: ${selectedOffer.code}`
                  : `Instant Price Drop: ${selectedOffer.storeName}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Created on {formatDate(selectedOffer.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-2 text-sm text-slate-800">
              {/* Store & Seller Info */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Store & Location
                  </span>
                  <div className="font-semibold text-slate-900 mt-1">{selectedOffer.storeName}</div>
                  <div className="text-xs text-slate-500">{selectedOffer.storeCity || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Seller Account
                  </span>
                  <div className="font-semibold text-slate-900 mt-1">{selectedOffer.sellerName}</div>
                  <div className="text-xs text-slate-500">
                    {selectedOffer.sellerMobile || selectedOffer.sellerEmail || 'N/A'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    Seller ID: {selectedOffer.sellerId}
                  </div>
                </div>
              </div>

              {/* Discount Rules */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm border-b pb-1">Discount & Application Rules</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block">Discount Type</span>
                    <span className="font-semibold text-slate-900 capitalize">{selectedOffer.discountType}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block">Discount Value</span>
                    <span className="font-semibold text-slate-900">{selectedOffer.formattedDiscount}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block">Applies To</span>
                    <span className="font-semibold text-slate-900 capitalize">
                      {selectedOffer.appliesTo === 'ORDER' ? 'Entire Cart / Order' : 'Specific Products'}
                    </span>
                  </div>
                  {selectedOffer.minOrderPaise !== undefined && selectedOffer.minOrderPaise > 0 && (
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 block">Min Order Amount</span>
                      <span className="font-semibold text-slate-900">{formatRupees(selectedOffer.minOrderPaise)}</span>
                    </div>
                  )}
                  {selectedOffer.maxDiscountPaise !== undefined && selectedOffer.maxDiscountPaise > 0 && (
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 block">Max Discount Cap</span>
                      <span className="font-semibold text-slate-900">{formatRupees(selectedOffer.maxDiscountPaise)}</span>
                    </div>
                  )}
                  {selectedOffer.usageLimit !== undefined && (
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 block">Overall Usage Limit</span>
                      <span className="font-semibold text-slate-900">{selectedOffer.usageLimit || 'Unlimited'}</span>
                    </div>
                  )}
                  {selectedOffer.perCustomerLimit !== undefined && (
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="text-slate-500 block">Per Customer Limit</span>
                      <span className="font-semibold text-slate-900">{selectedOffer.perCustomerLimit} times</span>
                    </div>
                  )}
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-slate-500 block">Total Used Count</span>
                    <span className="font-semibold text-purple-700">{selectedOffer.usedCount} times</span>
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm border-b pb-1">Schedule & Validity</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Start Date & Time</span>
                    <span className="font-semibold text-slate-900">{formatDate(selectedOffer.startsAt)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">End Date & Time</span>
                    <span className="font-semibold text-slate-900">{formatDate(selectedOffer.endsAt)}</span>
                  </div>
                </div>
              </div>

              {/* Associated Products (If Instant Price Drop or Specific Products Coupon) */}
              {selectedOffer.products && selectedOffer.products.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm border-b pb-1">
                    Applicable Products ({selectedOffer.products.length})
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {selectedOffer.products.map((p, idx) => (
                      <div
                        key={p.masterProductId || idx}
                        className="flex items-center justify-between bg-slate-50 p-3 rounded-md border border-slate-200 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-slate-400 font-mono text-[11px]">ID: {p.masterProductId}</div>
                        </div>
                        <div className="text-right">
                          {p.originalPricePaise && p.discountedPricePaise ? (
                            <div className="flex flex-col items-end">
                              <span className="line-through text-slate-400 text-[11px]">
                                {formatRupees(p.originalPricePaise)}
                              </span>
                              <span className="font-bold text-emerald-600">
                                {formatRupees(p.discountedPricePaise)}
                              </span>
                              {p.discountPercent && (
                                <span className="text-[10px] text-orange-600 font-semibold">
                                  {p.discountPercent}% OFF
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">Default Catalog Price</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
