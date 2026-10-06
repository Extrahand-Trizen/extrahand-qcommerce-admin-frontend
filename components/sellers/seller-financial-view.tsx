'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/shared/status-badge';
import { format } from 'date-fns';
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Receipt,
  Building2,
  RefreshCw,
  Eye,
  FileText,
  IndianRupee,
} from 'lucide-react';

interface SellerFinancialViewProps {
  sellerId: string;
}

export function SellerFinancialView({ sellerId }: SellerFinancialViewProps) {
  const [activeTab, setActiveTab] = useState<'payouts' | 'settlements'>('payouts');
  const [payoutPage, setPayoutPage] = useState(1);
  const [settlementPage, setSettlementPage] = useState(1);

  // 1. Fetch Seller Financial Summary
  const { data: summaryData, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['seller-financial-summary', sellerId],
    queryFn: async () => {
      const res = await api<{
        seller: { id: string; shopName: string };
        summary: {
          availableBalance: number;
          pendingSettlement: number;
          processingPayouts: number;
          settledAmount: number;
          totalEarnings: number;
          payoutCount: number;
          failedPayoutCount: number;
        };
        bankAccount: {
          accountNumber?: string;
          ifscCode?: string;
          bankName?: string;
          accountHolderName?: string;
          verificationStatus?: string;
        } | null;
      }>(endpoints.sellerFinancialSummary(sellerId));
      return res.data;
    },
    enabled: Boolean(sellerId),
  });

  // 2. Fetch Seller Payout History
  const { data: payoutsData, isLoading: isPayoutsLoading } = useQuery({
    queryKey: ['seller-payouts-history', sellerId, payoutPage],
    queryFn: async () => {
      const res = await api<{
        payouts: Array<{
          id: string;
          payoutId: string;
          amount: number;
          netAmount: number;
          status: string;
          provider: string;
          providerReference?: string;
          failureReason?: string;
          createdAt: string;
          completedAt?: string;
        }>;
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>(`${endpoints.sellerPayoutsById(sellerId)}?page=${payoutPage}&limit=10`);
      return res.data;
    },
    enabled: Boolean(sellerId) && activeTab === 'payouts',
  });

  // 3. Fetch Seller Settlement Ledger History
  const { data: settlementsData, isLoading: isSettlementsLoading } = useQuery({
    queryKey: ['seller-settlements-history', sellerId, settlementPage],
    queryFn: async () => {
      const res = await api<{
        settlements: Array<{
          id: string;
          orderId?: string;
          type: string;
          amount: number;
          grossAmount: number;
          commissionFee: number;
          gstFee: number;
          netEarnings: number;
          status: string;
          settlementDueDate?: string;
          settledAt?: string;
          createdAt: string;
          description?: string;
        }>;
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>(`${endpoints.sellerSettlementsById(sellerId)}?page=${settlementPage}&limit=10`);
      return res.data;
    },
    enabled: Boolean(sellerId) && activeTab === 'settlements',
  });

  const summary = summaryData?.summary;
  const bank = summaryData?.bankAccount;

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              Financial & Payout Overview
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time balance, earnings, and payout status computed directly from order settlements.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchSummary()}
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          {isSummaryLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="rounded-lg border bg-emerald-50/40 p-3 space-y-1">
                <span className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider block">
                  Total Net Earnings
                </span>
                <p className="text-xl font-bold text-emerald-950 font-mono">
                  ₹{((summary?.totalEarnings || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-emerald-700">Lifetime completed net earnings</p>
              </div>

              <div className="rounded-lg border bg-blue-50/40 p-3 space-y-1">
                <span className="text-[11px] font-medium text-blue-800 uppercase tracking-wider block">
                  Available Balance
                </span>
                <p className="text-xl font-bold text-blue-950 font-mono">
                  ₹{((summary?.availableBalance || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-blue-700">Ready for payout initiation</p>
              </div>

              <div className="rounded-lg border bg-amber-50/40 p-3 space-y-1">
                <span className="text-[11px] font-medium text-amber-800 uppercase tracking-wider block">
                  Pending Settlement
                </span>
                <p className="text-xl font-bold text-amber-950 font-mono">
                  ₹{((summary?.pendingSettlement || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-amber-700">In settlement window (T+2)</p>
              </div>

              <div className="rounded-lg border bg-purple-50/40 p-3 space-y-1">
                <span className="text-[11px] font-medium text-purple-800 uppercase tracking-wider block">
                  Processing Payouts
                </span>
                <p className="text-xl font-bold text-purple-950 font-mono">
                  ₹{((summary?.processingPayouts || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-purple-700">Initiated bank transfers</p>
              </div>

              <div className="rounded-lg border bg-slate-50/80 p-3 space-y-1">
                <span className="text-[11px] font-medium text-slate-700 uppercase tracking-wider block">
                  Settled Payouts Total
                </span>
                <p className="text-xl font-bold text-slate-900 font-mono">
                  ₹{((summary?.settledAmount || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-slate-600">Successfully transferred</p>
              </div>
            </div>
          )}

          {/* Bank Summary Bar */}
          {bank && (
            <div className="mt-4 flex items-center justify-between rounded-lg border bg-muted/20 px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>
                  Payout Account: <strong className="text-foreground">{bank.bankName || 'Bank'}</strong> (
                  <span className="font-mono">{bank.accountNumber || '—'}</span>) • IFSC:{' '}
                  <span className="font-mono font-medium text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border">
                    {bank.ifscCode || '—'}
                  </span>
                </span>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {bank.verificationStatus || 'VERIFIED'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Activity Tabs */}
      <Card className="shadow-sm">
        <CardHeader className="pb-0 border-b">
          <div className="flex items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-600" />
              Financial Records
            </CardTitle>
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant={activeTab === 'payouts' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('payouts')}
                className="h-7 text-xs font-medium"
              >
                Payout History ({summary?.payoutCount || 0})
              </Button>
              <Button
                variant={activeTab === 'settlements' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('settlements')}
                className="h-7 text-xs font-medium"
              >
                Settlement Ledger
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {activeTab === 'payouts' ? (
            <div className="space-y-4">
              {isPayoutsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : !payoutsData?.payouts || payoutsData.payouts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No payout transactions recorded for this seller yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                      <tr>
                        <th className="py-2.5 px-3">Payout Ref ID</th>
                        <th className="py-2.5 px-3">Net Payout</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Provider / UTR</th>
                        <th className="py-2.5 px-3">Initiated Date</th>
                        <th className="py-2.5 px-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payoutsData.payouts.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/30">
                          <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                            {p.payoutId || p.id}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                            ₹{((p.netAmount || p.amount) / 100).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            {p.providerReference ? (
                              <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                UTR: {p.providerReference}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{p.provider || 'SYSTEM'}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {p.createdAt ? format(new Date(p.createdAt), 'MMM d, yyyy h:mm a') : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {p.failureReason ? (
                              <span className="text-red-600 text-[11px] font-medium" title={p.failureReason}>
                                Error: {p.failureReason}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">Clean</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Payout Pagination */}
              {payoutsData?.pagination && payoutsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="text-muted-foreground">
                    Page {payoutsData.pagination.page} of {payoutsData.pagination.totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={payoutPage <= 1}
                      onClick={() => setPayoutPage((p) => Math.max(1, p - 1))}
                      className="h-7 text-xs"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={payoutPage >= payoutsData.pagination.totalPages}
                      onClick={() => setPayoutPage((p) => p + 1)}
                      className="h-7 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {isSettlementsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : !settlementsData?.settlements || settlementsData.settlements.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No order settlement ledger entries found for this seller yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type / Ref</th>
                        <th className="py-2.5 px-3">Gross Customer Price</th>
                        <th className="py-2.5 px-3">Platform Fee (5%)</th>
                        <th className="py-2.5 px-3">GST (18%)</th>
                        <th className="py-2.5 px-3">Net Seller Earning</th>
                        <th className="py-2.5 px-3">Settlement Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {settlementsData.settlements.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/30">
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {s.createdAt ? format(new Date(s.createdAt), 'MMM d, h:mm a') : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-foreground">{s.type}</span>
                            {s.orderId && (
                              <span className="block text-[11px] font-mono text-muted-foreground">
                                Order: {s.orderId}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            ₹{((s.grossAmount || 0) / 100).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-red-700">
                            -₹{((s.commissionFee || 0) / 100).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-red-700">
                            -₹{((s.gstFee || 0) / 100).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">
                            ₹{((s.netEarnings || s.amount || 0) / 100).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={s.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Settlement Pagination */}
              {settlementsData?.pagination && settlementsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="text-muted-foreground">
                    Page {settlementsData.pagination.page} of {settlementsData.pagination.totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={settlementPage <= 1}
                      onClick={() => setSettlementPage((p) => Math.max(1, p - 1))}
                      className="h-7 text-xs"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={settlementPage >= settlementsData.pagination.totalPages}
                      onClick={() => setSettlementPage((p) => p + 1)}
                      className="h-7 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
