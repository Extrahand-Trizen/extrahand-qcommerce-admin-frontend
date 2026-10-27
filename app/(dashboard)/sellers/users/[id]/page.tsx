'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DeleteConfirmDialog } from '@/components/shared/delete-confirm-dialog';
import {
  ArrowLeft,
  User,
  Store,
  FileText,
  ShoppingBag,
  CreditCard,
  History,
  Copy,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Power,
  ShieldAlert,
  ClipboardCheck,
  Building2,
  DollarSign,
  Package,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getCategoryLabel, maskAccountNumber, maskAadhaar } from '@/lib/seller-onboarding';

export default function SellerUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Sync tab with URL
  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', val);
    router.replace(`/sellers/users/${id}?${p.toString()}`, { scroll: false });
  };

  // 1. Fetch Seller Full Record (seller, onboarding, storeSettings, documents, history)
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['seller-user-detail', id],
    queryFn: async () => {
      const res = await api<{
        seller: Record<string, any>;
        onboarding: Record<string, any> | null;
        storeSettings?: Record<string, any> | null;
        documents: Array<Record<string, any>>;
        history: Array<Record<string, any>>;
      }>(`${endpoints.sellers}/${id}`);
      return res.data;
    },
  });

  // 2. Fetch Financial Summary
  const { data: financeData } = useQuery({
    queryKey: ['seller-user-finance', id],
    queryFn: async () => {
      const res = await api<{
        walletBalanceRupees?: number;
        pendingPayoutsRupees?: number;
        totalEarningsRupees?: number;
        deliveredOrdersCount?: number;
      }>(endpoints.sellerFinancialSummary(id));
      return res.data;
    },
    enabled: Boolean(id),
  });

  // 3. Fetch Recent Orders for this Seller
  const { data: ordersData } = useQuery({
    queryKey: ['seller-user-orders', id],
    queryFn: async () => {
      const res = await api<{ items: Array<Record<string, any>>; total: number }>(
        `${endpoints.sellerStoreOrders(id)}?limit=10`
      );
      return res.data || { items: [], total: 0 };
    },
    enabled: Boolean(id),
  });

  // Status Mutation
  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      return api(`${endpoints.sellers}/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (_, status) => {
      toast.success(`Account status changed to ${status}`);
      qc.invalidateQueries({ queryKey: ['seller-user-detail', id] });
      qc.invalidateQueries({ queryKey: ['sellers'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Status update failed'),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return api(`${endpoints.sellers}/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Seller deleted successfully');
      router.push('/sellers/users');
      qc.invalidateQueries({ queryKey: ['sellers'] });
      qc.invalidateQueries({ queryKey: ['seller-stores'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Deletion failed'),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (detailLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const seller = detailData?.seller;
  const onboarding = detailData?.onboarding;
  const storeSettings = detailData?.storeSettings;
  const documents = detailData?.documents || [];
  const history = detailData?.history || [];
  const orders = ordersData?.items || [];

  if (!seller && !onboarding) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <p className="text-lg font-semibold text-slate-900">Seller Not Found</p>
        <p className="text-sm text-muted-foreground">The requested seller account does not exist or was deleted.</p>
        <Link href="/sellers/users" className="text-sm font-medium text-amber-700 hover:underline">
          &larr; Back to all sellers
        </Link>
      </div>
    );
  }

  const isStoreApproved = onboarding?.status === 'APPROVED' || seller?.onboardingStatus === 'APPROVED';
  const shortId = `SH-${id.slice(-4).toUpperCase()}`;

  return (
    <div className="w-full space-y-5 pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="space-y-3">
        <Link
          href="/sellers/users"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-amber-800 transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Seller Users
        </Link>

        {/* Profile Header Card */}
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Seller & Store Identity */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {seller?.fullName || onboarding?.fullName || 'Seller User'}
                </h1>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">Account:</span>
                  <StatusBadge status={String(seller?.status || 'PENDING')} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500">Registration:</span>
                  <StatusBadge status={String(onboarding?.status || seller?.onboardingStatus || 'DRAFT')} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {onboarding?.shopName ? (
                  <span className="font-medium text-slate-800 flex items-center gap-1">
                    <Store className="h-3.5 w-3.5 text-amber-600" />
                    {onboarding.shopName}
                  </span>
                ) : (
                  <span className="italic text-slate-400">No store registered</span>
                )}
                <span>&middot;</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(id, 'Seller ID')}
                  className="font-mono bg-amber-50 border border-amber-200/80 text-amber-900 px-2 py-0.5 rounded hover:bg-amber-100 inline-flex items-center gap-1"
                  title="Copy full Seller ID"
                >
                  <span>{shortId}</span>
                  <Copy className="h-2.5 w-2.5 text-amber-700" />
                </button>
                <span>&middot;</span>
                <span className="font-mono flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {(() => {
                    const p = seller?.mobileNumber;
                    if (p && !/^0+$/.test(p) && p !== '0000000000') return p;
                    const onbP = onboarding?.mobileNumber || onboarding?.shopMobileNumber;
                    if (onbP && !/^0+$/.test(onbP) && onbP !== '0000000000') return onbP;
                    return '—';
                  })()}
                </span>
                {seller?.email && (
                  <>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {seller.email}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isStoreApproved && (
                <Button asChild size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-xs border border-amber-400/60">
                  <Link href={`/sellers/stores/${id}`}>
                    <Store className="h-3.5 w-3.5 text-slate-950" />
                    View Store &amp; Products
                  </Link>
                </Button>
              )}

              {onboarding && (
                <Button asChild variant="outline" size="sm" className="gap-1.5 border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100 font-medium">
                  <Link href={`/sellers/approvals/${id}`}>
                    <ClipboardCheck className="h-3.5 w-3.5 text-amber-600" />
                    KYC &amp; Documents
                  </Link>
                </Button>
              )}

              {seller?.status === 'ACTIVE' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => statusMutation.mutate('INACTIVE')}
                  className="gap-1.5 text-slate-700 hover:bg-slate-100"
                  disabled={statusMutation.isPending}
                >
                  <Power className="h-3.5 w-3.5" />
                  Deactivate
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => statusMutation.mutate('ACTIVE')}
                  className="gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-xs border border-amber-400/60"
                  disabled={statusMutation.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-950" />
                  Activate Account
                </Button>
              )}

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteModalOpen(true)}
                className="gap-1.5 bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Requirement F) */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-slate-100 p-1 border border-border">
          <TabsTrigger value="profile" className="gap-1.5 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <User className="h-3.5 w-3.5" />
            Seller &amp; Shop Info
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="gap-1.5 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Onboarding &amp; KYC
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <FileText className="h-3.5 w-3.5" />
            Submitted Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <ShoppingBag className="h-3.5 w-3.5" />
            Orders ({ordersData?.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-1.5 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <CreditCard className="h-3.5 w-3.5" />
            Payouts &amp; Finance
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs font-medium data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-semibold data-[state=active]:shadow-xs">
            <History className="h-3.5 w-3.5" />
            Activity History ({history.length})
          </TabsTrigger>
        </TabsList>

        {/* =================================================================== */}
        {/* TAB 1: SELLER & SHOP INFORMATION */}
        {/* =================================================================== */}
        <TabsContent value="profile" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Seller Account Details */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <User className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Personal Identity</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Full Name:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{seller?.fullName || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">User ID (Auth UID):</span>
                  <p className="font-mono text-slate-700 mt-0.5 break-all">{seller?.userId || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Mobile Phone:</span>
                  <p className="font-mono font-medium text-slate-900 mt-0.5">{seller?.mobileNumber || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="text-slate-800 mt-0.5">{seller?.email || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Account Status:</span>
                  <div className="mt-1"><StatusBadge status={String(seller?.status || 'PENDING')} /></div>
                </div>
                <div>
                  <span className="text-muted-foreground">Member Since:</span>
                  <p className="text-slate-800 mt-0.5">
                    {seller?.createdAt ? format(new Date(seller.createdAt), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Shop Details */}
            <div className="rounded-xl border border-border bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Store className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Physical Store Profile</h3>
              </div>

              {onboarding ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Shop Name:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{onboarding.shopName || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      {getCategoryLabel(String(onboarding.category || onboarding.shopType || ''))}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Address:</span>
                    <p className="text-slate-800 mt-0.5">
                      {[onboarding.address, onboarding.city, onboarding.state, onboarding.pincode]
                        .filter(Boolean)
                        .join(', ') || 'Address unset'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Coordinates:</span>
                    <p className="font-mono text-slate-700 mt-0.5">
                      {onboarding.latitude && onboarding.longitude
                        ? `${Number(onboarding.latitude).toFixed(4)}, ${Number(onboarding.longitude).toFixed(4)}`
                        : 'Unset'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Operating Status:</span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      {storeSettings?.storeStatus ? String(storeSettings.storeStatus) : 'Not configured'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No store onboarding record has been registered for this seller user.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 2: ONBOARDING & KYC */}
        {/* =================================================================== */}
        <TabsContent value="onboarding" className="space-y-4">
          <div className="rounded-xl border border-border bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Registration &amp; Verification Checks</h3>
              </div>
              <StatusBadge status={String(onboarding?.status || 'DRAFT')} />
            </div>

            {onboarding ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="text-muted-foreground">Aadhaar Status:</span>
                  <p className="font-semibold text-slate-900 mt-1">
                    {onboarding.aadhaarVerificationStatus || 'NOT_VERIFIED'}
                  </p>
                  {onboarding.aadhaarNumber && (
                    <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                      {maskAadhaar(onboarding.aadhaarNumber)}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">PAN Status:</span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-1.5 py-0.2 rounded">Optional</span>
                  </div>
                  <p className="font-semibold text-slate-900 mt-1">
                    {onboarding.panVerificationStatus || (onboarding.pan ? 'VERIFIED' : 'NOT_VERIFIED')}
                  </p>
                  {onboarding.pan && (
                    <p className="font-mono text-[11px] text-slate-500 mt-0.5">{onboarding.pan}</p>
                  )}
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className="text-muted-foreground">GSTIN Status:</span>
                  <p className="font-semibold text-slate-900 mt-1">
                    {onboarding.gstinVerificationStatus || (onboarding.gstin ? 'ENTERED' : 'NOT_APPLICABLE')}
                  </p>
                  {onboarding.gstin && (
                    <p className="font-mono text-[11px] text-slate-500 mt-0.5">{onboarding.gstin}</p>
                  )}
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bank Account:</span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-1.5 py-0.2 rounded">Optional</span>
                  </div>
                  <p className="font-semibold text-slate-900 mt-1">
                    {onboarding.bankAccount?.bankName || (onboarding.bankAccount?.accountNumber ? 'Bank Provided' : 'Not Provided')}
                  </p>
                  {onboarding.bankAccount?.accountNumber && (
                    <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                      {maskAccountNumber(onboarding.bankAccount.accountNumber)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">No onboarding data submitted.</p>
            )}
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 3: SUBMITTED DOCUMENTS */}
        {/* =================================================================== */}
        <TabsContent value="documents" className="space-y-4">
          <div className="rounded-xl border border-border bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Uploaded KYC &amp; Verification Documents</h3>
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No document uploads recorded.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-2 text-xs">
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-slate-900">{doc.documentType || 'DOCUMENT'}</span>
                      <StatusBadge status={String(doc.verificationStatus || 'PENDING')} />
                    </div>
                    {doc.fileUrl && (
                      <Button asChild size="sm" variant="outline" className="w-full text-xs h-7 gap-1 mt-2">
                        <a href={String(doc.fileUrl)} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-3 w-3" />
                          View Document
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 4: ORDERS */}
        {/* =================================================================== */}
        <TabsContent value="orders" className="space-y-4">
          <div className="rounded-xl border border-border bg-white shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Recent Customer Orders</h3>
              <span className="text-xs text-muted-foreground">{ordersData?.total ?? 0} orders total</span>
            </div>
            {orders.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No customer orders placed yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-border">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-medium">Order #</th>
                      <th className="py-2.5 px-4 text-left font-medium">Customer</th>
                      <th className="py-2.5 px-4 text-left font-medium">Date</th>
                      <th className="py-2.5 px-4 text-left font-medium">Status</th>
                      <th className="py-2.5 px-4 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-900">{o.orderNumber}</td>
                        <td className="py-2.5 px-4 text-slate-700">{o.address?.name || 'Customer'}</td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono">
                          {o.createdAt ? format(new Date(o.createdAt), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="py-2.5 px-4"><StatusBadge status={String(o.status)} /></td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{Number(o.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 5: PAYOUTS & FINANCE */}
        {/* =================================================================== */}
        <TabsContent value="finance" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-white p-4 shadow-2xs">
              <span className="text-xs font-medium text-muted-foreground">Current Wallet Balance</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                ₹{Number(financeData?.walletBalanceRupees || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-white p-4 shadow-2xs">
              <span className="text-xs font-medium text-muted-foreground">Pending Payouts</span>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                ₹{Number(financeData?.pendingPayoutsRupees || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-white p-4 shadow-2xs">
              <span className="text-xs font-medium text-muted-foreground">Total Platform Earnings</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                ₹{Number(financeData?.totalEarningsRupees || 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-white p-4 shadow-2xs">
              <span className="text-xs font-medium text-muted-foreground">Delivered Orders</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {financeData?.deliveredOrdersCount ?? 0}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* =================================================================== */}
        {/* TAB 6: AUDIT & ACTIVITY HISTORY */}
        {/* =================================================================== */}
        <TabsContent value="audit" className="space-y-4">
          <div className="rounded-xl border border-border bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Administrative History &amp; Status Logs</h3>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No audit entries recorded.</p>
            ) : (
              <div className="divide-y divide-border">
                {history.map((h, i) => (
                  <div key={i} className="py-3 flex items-start justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-900">{h.action || 'REVIEW_ACTION'}</span>
                      {h.comment && <p className="text-slate-600 italic">"{h.comment}"</p>}
                      <p className="text-[11px] text-muted-foreground">
                        Admin: {h.performedBy || 'System'}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {h.performedAt ? format(new Date(h.performedAt), 'MMM d, yyyy HH:mm') : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete seller account?"
        itemName={seller?.fullName || onboarding?.shopName}
        description={`This will permanently delete "${seller?.fullName}" (${seller?.mobileNumber}), including all documents and store listings. This cannot be undone.`}
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
