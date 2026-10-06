'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, endpoints } from '@/lib/api';
import {
  IndianRupee,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  X,
  CreditCard,
  ArrowUpRight,
} from 'lucide-react';

interface PayoutItem {
  id: string;
  payoutId: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string;
  storeName: string;
  amountPaise: number;
  amountRupees: number;
  status: string;
  bankAccount: {
    accountHolderName: string;
    accountNumberMasked: string;
    ifscCode: string;
    bankName?: string;
  };
  referenceNumber: string | null;
  gatewayPayoutId: string | null;
  failureReason: string | null;
  requestedAt: string;
  processedAt: string | null;
  settledAt: string | null;
}

interface PayoutDetailResponse {
  payout: PayoutItem & {
    includedTransactions?: Array<{
      id: string;
      orderId: string;
      orderNumber: string;
      transactionType: string;
      grossAmountPaise: number;
      commissionAmountPaise: number;
      taxOnCommissionPaise: number;
      netAmountPaise: number;
      status: string;
      completedAt: string;
      settlementEligibleAt: string;
    }>;
  };
}

export default function SellerPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  // Detail Modal
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [detailPayout, setDetailPayout] = useState<PayoutDetailResponse['payout'] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');

      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (search.trim()) {
        params.set('search', search.trim());
      }

      if (dateRange === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.set('startDate', today);
        params.set('endDate', today);
      } else if (dateRange === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.set('startDate', d.toISOString().split('T')[0]);
      } else if (dateRange === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.set('startDate', d.toISOString().split('T')[0]);
      }

      const res = await api<{
        items: PayoutItem[];
        total: number;
        page: number;
        totalPages: number;
      }>(`${endpoints.sellerPayouts}?${params.toString()}`);

      if (res.data) {
        setPayouts(res.data.items || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch seller payouts');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, dateRange]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const openDetailModal = async (payoutId: string) => {
    setSelectedPayoutId(payoutId);
    setLoadingDetail(true);
    setDetailPayout(null);
    try {
      const res = await api<PayoutDetailResponse>(endpoints.sellerPayoutDetails(payoutId));
      if (res.data) {
        setDetailPayout(res.data.payout);
      }
    } catch (err: any) {
      console.error('Failed to fetch payout detail', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Math.round(paise / 100));
  };

  const getStatusBadge = (status: string) => {
    const st = (status || '').toUpperCase();
    switch (st) {
      case 'SETTLED':
      case 'PAID':
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /> SETTLED
          </span>
        );
      case 'PROCESSING':
      case 'REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <Clock className="h-3.5 w-3.5" /> PROCESSING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">
            <XCircle className="h-3.5 w-3.5" /> FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 border border-gray-200">
            {st}
          </span>
        );
    }
  };

  // Aggregated Stat Cards
  const totalDisbursedPaise = payouts
    .filter((p) => ['SETTLED', 'PAID', 'SUCCESS'].includes(p.status.toUpperCase()))
    .reduce((sum, p) => sum + p.amountPaise, 0);

  const processingPaise = payouts
    .filter((p) => ['PROCESSING', 'REQUESTED'].includes(p.status.toUpperCase()))
    .reduce((sum, p) => sum + p.amountPaise, 0);

  const failedCount = payouts.filter((p) => p.status.toUpperCase() === 'FAILED').length;

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Seller Payouts</h1>
          <p className="text-sm text-gray-500">
            Track and audit bank disbursements, payout statuses, and seller settlements.
          </p>
        </div>
        <button
          onClick={fetchPayouts}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Payouts</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-gray-900">{total}</p>
          <p className="mt-1 text-xs text-gray-500">Across all platform sellers</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Disbursed (Page)</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-600">{formatCurrency(totalDisbursedPaise)}</p>
          <p className="mt-1 text-xs text-gray-500">Successfully settled payouts</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Processing (Page)</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-amber-600">{formatCurrency(processingPaise)}</p>
          <p className="mt-1 text-xs text-gray-500">Bank transfers in progress</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Failed (Page)</span>
            <div className="rounded-lg bg-red-50 p-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-red-600">{failedCount}</p>
          <p className="mt-1 text-xs text-gray-500">Required bank review</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Payout ID, Ref, Order ID, Store Name..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="SETTLED">Settled / Success</option>
              <option value="PROCESSING">Processing</option>
              <option value="REQUESTED">Requested</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Payouts Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Seller / Store</th>
                <th className="px-6 py-3.5 font-semibold">Payout ID</th>
                <th className="px-6 py-3.5 font-semibold">Amount</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                <th className="px-6 py-3.5 font-semibold">Bank Account</th>
                <th className="px-6 py-3.5 font-semibold">Requested At</th>
                <th className="px-6 py-3.5 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-500" />
                    <span className="mt-2 block text-xs">Loading seller payouts...</span>
                  </td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No seller payout records found matching your filters.
                  </td>
                </tr>
              ) : (
                payouts.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{item.storeName}</div>
                      <div className="text-xs text-gray-500">{item.sellerName}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-700">
                      {item.payoutId}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {formatCurrency(item.amountPaise)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4 text-xs text-gray-600">
                      <div className="font-medium text-gray-800">{item.bankAccount.bankName || 'Bank'}</div>
                      <div className="text-gray-500">{item.bankAccount.accountNumberMasked}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(item.requestedAt).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openDetailModal(item.payoutId)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 text-gray-500" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3.5">
          <span className="text-xs text-gray-500">
            Showing Page <span className="font-bold text-gray-800">{page}</span> of{' '}
            <span className="font-bold text-gray-800">{totalPages}</span> ({total} total payouts)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Payout Detail Drawer/Modal */}
      {selectedPayoutId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Payout Details</h3>
                <p className="text-xs text-gray-500">ID: {selectedPayoutId}</p>
              </div>
              <button
                onClick={() => setSelectedPayoutId(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetail || !detailPayout ? (
              <div className="py-12 text-center text-gray-400">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                <span className="mt-2 block text-xs">Loading detail record...</span>
              </div>
            ) : (
              <div className="space-y-6 text-sm">
                {/* Status & Amount Card */}
                <div className="rounded-xl bg-gray-50 p-4 flex items-center justify-between border border-gray-200">
                  <div>
                    <span className="text-xs font-medium text-gray-500">Disbursement Amount</span>
                    <div className="text-2xl font-extrabold text-gray-900">
                      {formatCurrency(detailPayout.amountPaise)}
                    </div>
                  </div>
                  <div>{getStatusBadge(detailPayout.status)}</div>
                </div>

                {/* Seller & Bank Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-100 p-4 space-y-1 bg-gray-50/50">
                    <span className="text-xs font-semibold text-gray-400 uppercase">Seller / Store</span>
                    <div className="font-bold text-gray-900">{detailPayout.storeName}</div>
                    <div className="text-xs text-gray-600">{detailPayout.sellerName}</div>
                    <div className="text-xs text-gray-500">{detailPayout.sellerPhone}</div>
                  </div>

                  <div className="rounded-xl border border-gray-100 p-4 space-y-1 bg-gray-50/50">
                    <span className="text-xs font-semibold text-gray-400 uppercase">Bank Account (Masked)</span>
                    <div className="font-bold text-gray-900">
                      {detailPayout.bankAccount.bankName || 'Bank Account'}
                    </div>
                    <div className="text-xs text-gray-700 font-mono">
                      Acc: {detailPayout.bankAccount.accountNumberMasked}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      IFSC: {detailPayout.bankAccount.ifscCode}
                    </div>
                  </div>
                </div>

                {/* Technical References */}
                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment References</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Gateway Payout ID:</span>{' '}
                      <span className="font-mono font-semibold text-gray-800">
                        {detailPayout.gatewayPayoutId || 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">UTR / Ref Number:</span>{' '}
                      <span className="font-mono font-semibold text-gray-800">
                        {detailPayout.referenceNumber || 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Requested:</span>{' '}
                      <span className="text-gray-800">
                        {new Date(detailPayout.requestedAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Settled At:</span>{' '}
                      <span className="text-gray-800">
                        {detailPayout.settledAt ? new Date(detailPayout.settledAt).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  {detailPayout.failureReason && (
                    <div className="mt-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                      <span className="font-bold">Failure Reason:</span> {detailPayout.failureReason}
                    </div>
                  )}
                </div>

                {/* Included Order Earnings Breakdown */}
                {detailPayout.includedTransactions && detailPayout.includedTransactions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Included Order Earnings ({detailPayout.includedTransactions.length})
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-gray-200 text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                          <tr>
                            <th className="p-2.5">Order Number</th>
                            <th className="p-2.5">Gross Sales</th>
                            <th className="p-2.5">Fee (5%)</th>
                            <th className="p-2.5">GST (18%)</th>
                            <th className="p-2.5 font-bold">Net Earnings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {detailPayout.includedTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-gray-50">
                              <td className="p-2.5 font-mono text-gray-800">#{tx.orderNumber || tx.orderId.slice(-6)}</td>
                              <td className="p-2.5">{formatCurrency(tx.grossAmountPaise)}</td>
                              <td className="p-2.5 text-red-600">-{formatCurrency(tx.commissionAmountPaise)}</td>
                              <td className="p-2.5 text-red-600">-{formatCurrency(tx.taxOnCommissionPaise)}</td>
                              <td className="p-2.5 font-bold text-emerald-700">{formatCurrency(tx.netAmountPaise)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
