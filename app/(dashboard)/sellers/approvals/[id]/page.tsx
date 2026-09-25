'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { InfoCard } from '@/components/shared/info-card';
import { ReviewActions } from '@/components/shared/review-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StoreLocationMapDialog } from '@/components/sellers/store-location-map-dialog';
import {
  DocumentPreviewDialog,
  type DocumentPreviewData,
} from '@/components/sellers/document-preview-dialog';
import {
  getCategoryLabel,
  getApplicableRequirements,
  getDocumentLabel,
  maskAccountNumber,
  maskAadhaar,
  SHOP_CATEGORY_OPTIONS,
  type CategoryDocumentRequirement,
} from '@/lib/seller-onboarding';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowLeft,
  MapPin,
  Clock,
  FileText,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building,
  Store,
  CreditCard,
  ShieldCheck,
  User,
  History,
  Phone,
  Mail,
  ExternalLink,
  Info,
} from 'lucide-react';

const COMMON_SHOP_TYPES = [
  'General Store / Kirana',
  'Supermarket / Grocery',
  'Medical / Pharmacy',
  'Restaurant / Food',
  'Bakery / Sweets & Snacks',
  'Fruits & Vegetables',
  'Dairy / Milk',
  'Meat / Poultry',
  'Clothing / Fashion',
  'Electronics / Mobiles',
  'Hardware / Electrical',
  'Other',
];

export default function SellerApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [comment, setComment] = useState('');
  const [selectedShopType, setSelectedShopType] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [showFullAadhaar, setShowFullAadhaar] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentPreviewData | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['seller-detail', id],
    queryFn: async () => {
      const res = await api<{
        seller: Record<string, unknown>;
        onboarding: Record<string, unknown>;
        storeSettings?: Record<string, unknown> | null;
        documents: Array<Record<string, unknown>>;
        history: Array<Record<string, unknown>>;
      }>(`${endpoints.sellers}/${id}`);
      return res.data!;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (action: 'approve' | 'reject' | 'request-changes') => {
      const existingShopType = data?.onboarding?.shopType
        ? String(data.onboarding.shopType)
        : '';
      const fallbackFromCategory = data?.onboarding?.category
        ? getCategoryLabel(String(data.onboarding.category))
        : '';
      const finalShopType =
        selectedShopType.trim() || existingShopType || fallbackFromCategory || 'Other';

      return api(`${endpoints.sellers}/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({
          comment,
          ...(action === 'approve' ? { shopType: finalShopType } : {}),
        }),
      });
    },
    onSuccess: () => {
      toast.success('Action completed successfully');
      qc.invalidateQueries({ queryKey: ['seller-approvals'] });
      qc.invalidateQueries({ queryKey: ['seller-detail', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.onboarding) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">Seller onboarding record not found</p>
        <Link href="/sellers/approvals" className="text-sm text-amber-600 hover:underline mt-2">
          Back to approvals
        </Link>
      </div>
    );
  }

  const o = data.onboarding;
  const seller = data.seller || {};
  const documents = data.documents || [];
  const history = data.history || [];
  const rawBank = (o.bankAccount as Record<string, unknown>) || null;
  const storeBank = (data.storeSettings?.bankAccount as Record<string, unknown>) || null;
  const bankAccount =
    rawBank && (rawBank.accountNumber || rawBank.ifscCode)
      ? rawBank
      : storeBank && (storeBank.accountNumber || storeBank.ifscCode)
      ? storeBank
      : rawBank || storeBank;
  const pharmacist = (o.pharmacistDetails as Record<string, unknown>) || null;

  // Subcategories array
  const subcategories: string[] = Array.isArray(o.subcategories) && o.subcategories.length > 0
    ? (o.subcategories as string[])
    : o.subcategory
      ? String(o.subcategory).split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  // Category & dynamic document requirements
  const categoryKey = o.category ? String(o.category) : undefined;
  const categoryLabel = getCategoryLabel(categoryKey, o.shopType ? String(o.shopType) : 'Other');
  const applicableRequirements = getApplicableRequirements(categoryKey, subcategories);

  // Coordinates
  const rawLat = o.latitude;
  const rawLng = o.longitude;
  const lat = typeof rawLat === 'number' ? rawLat : rawLat ? parseFloat(String(rawLat)) : null;
  const lng = typeof rawLng === 'number' ? rawLng : rawLng ? parseFloat(String(rawLng)) : null;
  const hasCoordinates = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

  // Helper to find uploaded document by backend type with alias support
  const DOCUMENT_TYPE_ALIASES: Record<string, string[]> = {
    PAN_CARD: ['PAN_CARD', 'PAN', 'PAN_DOCUMENT'],
    AADHAAR_CARD: ['AADHAAR_CARD', 'AADHAAR', 'AADHAR_CARD', 'AADHAR', 'AADHAAR_DOCUMENT', 'KYC_DOCUMENT'],
    BANK_PASSBOOK: ['BANK_PASSBOOK', 'PASSBOOK', 'BANK_DOCUMENT', 'CANCELLED_CHEQUE', 'CHEQUE', 'PASSBOOK_IMAGE'],
    SHOP_IMAGE: ['SHOP_IMAGE', 'STORE_FRONT', 'SHOP_FRONT', 'STORE_IMAGE'],
    FSSAI: ['FSSAI', 'FSSAI_CERTIFICATE', 'FSSAI_LICENSE', 'FSSAI_REGISTRATION'],
    DRUG_LICENSE: ['DRUG_LICENSE', 'DRUG_LICENCE', 'DRUG_SALE_LICENSE'],
    TRADE_LICENSE: ['TRADE_LICENSE', 'TRADE_LICENCE', 'TRADE_CERTIFICATE'],
    PHARMACIST_REGISTRATION: ['PHARMACIST_REGISTRATION', 'PHARMACIST_CERTIFICATE', 'PHARMACY_COUNCIL_REGISTRATION'],
  };

  const findDocument = (type: string) => {
    const norm = type.toUpperCase().replace(/[- ]/g, '_');
    const aliases = DOCUMENT_TYPE_ALIASES[norm] || [norm];
    return documents.find((d) => {
      const docType = String(d.documentType || '').toUpperCase().replace(/[- ]/g, '_');
      return aliases.includes(docType) || docType === norm;
    });
  };

  const panDoc = findDocument('PAN_CARD');
  const aadhaarDoc = findDocument('AADHAAR_CARD');
  const aadhaarFileUrl =
    (aadhaarDoc?.fileUrl as string) ||
    (o.aadhaarCardUrl as string) ||
    (o.aadhaarDocumentUri && !String(o.aadhaarDocumentUri).startsWith('file://') ? String(o.aadhaarDocumentUri) : null);
  const shopImageDoc = findDocument('SHOP_IMAGE');
  const shopImageUrl = (o.shopImageUrl as string) || (shopImageDoc?.fileUrl as string);

  const bankPassbookDoc = findDocument('BANK_PASSBOOK');
  const passbookUrl =
    (bankPassbookDoc?.fileUrl as string) ||
    (bankAccount?.passbookImageUrl as string) ||
    (bankAccount?.passbookUri && !String(bankAccount.passbookUri).startsWith('file://')
      ? String(bankAccount.passbookUri)
      : null);

  const panNumber = String(o.pan || o.panNumber || '');
  const gstinNumber = String(o.gstin || o.gstinNumber || '');
  const aadhaarNumber = String(o.aadhaarNumber || o.aadhaar || '');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Navigation */}
      <div className="space-y-3">
        <Link
          href="/sellers/approvals"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to approvals
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{String(o.shopName || 'Shop Name')}</h1>
              <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                {categoryLabel}
              </span>
              <StatusBadge status={String(o.status || 'PENDING_APPROVAL')} />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-3 flex-wrap">
              <span>Submitted: {o.submittedAt ? format(new Date(String(o.submittedAt)), 'MMM d, yyyy h:mm a') : '—'}</span>
              <span>•</span>
              <span>City: {String(o.city || '—')}, {String(o.state || '—')}</span>
              {o.reviewedAt ? (
                <>
                  <span>•</span>
                  <span>Reviewed: {format(new Date(String(o.reviewedAt)), 'MMM d, yyyy')}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {/* Correction Note Banner if Changes Requested */}
      {(o.status === 'CHANGES_REQUIRED' || o.lastCorrectionNote) ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-4 text-amber-900 shadow-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-950">
              {o.status === 'CHANGES_REQUIRED' ? 'Changes Currently Requested by Admin' : 'Previous Correction Note'}
            </h4>
            <p className="text-sm text-amber-900">
              {String(o.lastCorrectionNote || o.adminComment || 'Corrections requested on submitted documents.')}
            </p>
          </div>
        </div>
      ) : null}

      {/* Main Grid: Shop Details & Location */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step 1 – Shop Details */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Store className="h-4 w-4 text-amber-600" />
              Shop / Business Details
            </CardTitle>
            {categoryLabel ? (
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {categoryLabel}
              </span>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3.5 text-sm">
            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-muted-foreground shrink-0">Shop Name</span>
              <span className="font-semibold text-right">{String(o.shopName || '—')}</span>
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-muted-foreground shrink-0">Primary Category</span>
              <span className="font-medium text-right text-amber-900 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200">
                {categoryLabel}
              </span>
            </div>

            {subcategories.length > 0 ? (
              <div className="flex flex-col gap-1.5 border-b border-border/60 pb-3">
                <span className="text-muted-foreground text-xs font-medium">Selected Subcategories ({subcategories.length})</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {subcategories.map((sub, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-foreground/80 font-normal border border-border"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-muted-foreground shrink-0">Shop Contact Phone</span>
              <span className="font-medium text-right flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {String(o.shopMobileNumber || o.mobileNumber || '—')}
              </span>
            </div>

            {o.shopEmail ? (
              <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                <span className="text-muted-foreground shrink-0">Shop Email</span>
                <span className="font-medium text-right flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {String(o.shopEmail)}
                </span>
              </div>
            ) : null}

            {o.openingHours ? (
              <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                <span className="text-muted-foreground shrink-0">Operating Hours</span>
                <span className="font-medium text-right flex items-center gap-1.5 text-foreground/90">
                  <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  {String(o.openingHours)}
                </span>
              </div>
            ) : null}

            {o.shopDescription ? (
              <div className="flex flex-col gap-1 border-b border-border/60 pb-3">
                <span className="text-muted-foreground text-xs font-medium">Shop Description</span>
                <p className="text-xs text-foreground/80 leading-relaxed bg-muted/30 p-2.5 rounded border">
                  {String(o.shopDescription)}
                </p>
              </div>
            ) : null}

            {shopImageUrl ? (
              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-muted-foreground">Shop Photo</span>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewDoc({
                      documentType: 'SHOP_IMAGE',
                      fileUrl: shopImageUrl,
                      fileName: 'Shop Photo',
                    })
                  }
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  <img
                    src={shopImageUrl}
                    alt="Shop Front"
                    className="h-10 w-14 rounded object-cover border group-hover:opacity-85 transition-opacity"
                  />
                  <span className="text-xs text-amber-700 hover:underline">Preview Photo</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>Shop Photo</span>
                <span className="italic">No shop image uploaded</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2 – Shop Location */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-600" />
              Shop Location & Address
            </CardTitle>
            {hasCoordinates ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMapOpen(true)}
                className="h-8 gap-1.5 border-amber-300 bg-amber-50/60 font-medium text-amber-900 hover:bg-amber-100 hover:text-amber-950"
              >
                <MapPin className="h-3.5 w-3.5 text-amber-600" />
                View on Map
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3.5 text-sm">
            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-muted-foreground shrink-0">Address Line</span>
              <span className="font-semibold text-right max-w-[65%]">{String(o.address || '—')}</span>
            </div>

            {o.streetRoad ? (
              <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                <span className="text-muted-foreground shrink-0">Street / Road</span>
                <span className="font-medium text-right">{String(o.streetRoad)}</span>
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-muted-foreground shrink-0">Area / Locality</span>
              <span className="font-medium text-right">{String(o.area || o.locality || '—')}</span>
            </div>

            {o.landmark ? (
              <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                <span className="text-muted-foreground shrink-0">Landmark</span>
                <span className="font-medium text-right">{String(o.landmark)}</span>
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-muted-foreground shrink-0">City & District</span>
              <span className="font-medium text-right">
                {String(o.city || '—')}
                {o.district ? `, ${String(o.district)}` : ''}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-muted-foreground shrink-0">State & Pincode</span>
              <span className="font-medium text-right">
                {String(o.state || '—')} – <span className="font-mono">{String(o.pincode || '—')}</span>
              </span>
            </div>

            {o.formattedAddress ? (
              <div className="flex flex-col gap-1 border-b border-border/60 pb-3">
                <span className="text-muted-foreground text-xs">Full Formatted Address (Map)</span>
                <span className="text-xs text-foreground/80 bg-muted/30 p-2 rounded border">
                  {String(o.formattedAddress)}
                </span>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-4 pt-1">
              <span className="text-muted-foreground shrink-0">GPS Coordinates</span>
              {hasCoordinates ? (
                <span className="font-mono text-xs bg-muted px-2.5 py-1 rounded border text-foreground font-semibold">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground italic">No GPS coordinates pinned</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Dialog Component */}
      {hasCoordinates ? (
        <StoreLocationMapDialog
          open={mapOpen}
          onOpenChange={setMapOpen}
          shopName={String(o.shopName || '')}
          ownerName={String(o.fullName || '')}
          address={String(o.address || '')}
          area={String(o.area || '')}
          city={String(o.city || '')}
          state={String(o.state || '')}
          pincode={String(o.pincode || '')}
          latitude={lat}
          longitude={lng}
        />
      ) : null}

      {/* Step 3 – Owner & KYC Details */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Owner & KYC Verification Details
          </CardTitle>
          <CardDescription className="text-xs">
            Identity verification details submitted by the business owner.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Owner Profile */}
            <div className="space-y-3 rounded-lg border p-4 bg-muted/10">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Owner Profile
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Full Legal Name</span>
                  <span className="font-semibold text-foreground">{String(o.fullName || '—')}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Mobile Number</span>
                  <span className="font-medium text-foreground">{String(o.mobileNumber || '—')}</span>
                </div>
                {o.email ? (
                  <div>
                    <span className="text-xs text-muted-foreground block">Email</span>
                    <span className="font-medium text-foreground">{String(o.email)}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* 2. Aadhaar Verification (Mandatory) */}
            <div className="space-y-3 rounded-lg border p-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Aadhaar Card
                  </h4>
                  <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                    Mandatory
                  </span>
                </div>
                <StatusBadge
                  status={String(
                    aadhaarDoc?.verificationStatus ||
                      o.aadhaarVerificationStatus ||
                      (aadhaarNumber ? 'VERIFIED' : 'NOT_VERIFIED')
                  )}
                />
              </div>

              <div className="space-y-2.5 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Aadhaar Number</span>
                  {aadhaarNumber ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground tracking-wide text-base">
                        {showFullAadhaar ? aadhaarNumber : maskAadhaar(aadhaarNumber)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowFullAadhaar(!showFullAadhaar)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                        title={showFullAadhaar ? 'Hide Aadhaar' : 'Show Aadhaar'}
                      >
                        {showFullAadhaar ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-red-600 font-semibold block">Missing (Mandatory)</span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block">Applicant Name</span>
                  <span className="font-medium text-foreground text-xs truncate block">
                    {String(o.fullName || '—')}
                  </span>
                </div>

                {o.aadhaarVerifiedAt ? (
                  <div className="text-[11px] text-muted-foreground">
                    Submitted on {format(new Date(String(o.aadhaarVerifiedAt)), 'MMM d, yyyy h:mm a')}
                  </div>
                ) : null}

                {/* Uploaded Card Document & Status */}
                <div className="pt-2 border-t border-border/60">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                    Uploaded Document Proof
                  </span>
                  {aadhaarFileUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 bg-background p-2 rounded border">
                        {Boolean(/\.(jpg|jpeg|png|webp)$/i.test(aadhaarFileUrl) || String(aadhaarDoc?.mimeType || '').startsWith('image/')) ? (
                          <img
                            src={aadhaarFileUrl}
                            alt="Aadhaar Card"
                            className="h-10 w-14 rounded object-cover border shrink-0 bg-muted"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted/60 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 text-xs">
                          <p className="font-medium truncate text-foreground">
                            {String(aadhaarDoc?.fileName || 'Aadhaar Card')}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Card Status: <span className="font-semibold">{String(aadhaarDoc?.verificationStatus || 'PENDING')}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 border-amber-300 text-amber-900 hover:bg-amber-50 flex-1"
                          onClick={() =>
                            setPreviewDoc({
                              documentType: 'AADHAAR_CARD',
                              documentNumber: maskAadhaar(aadhaarNumber),
                              fileUrl: aadhaarFileUrl,
                              fileName: aadhaarDoc?.fileName ? String(aadhaarDoc.fileName) : 'Aadhaar Card',
                              mimeType: aadhaarDoc?.mimeType ? String(aadhaarDoc.mimeType) : undefined,
                              verificationStatus: String(aadhaarDoc?.verificationStatus || o.aadhaarVerificationStatus || 'VERIFIED'),
                              uploadedAt: aadhaarDoc?.uploadedAt as any,
                            })
                          }
                        >
                          <Eye className="h-3 w-3 text-amber-600" />
                          Preview Document
                        </Button>
                        <a
                          href={aadhaarFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 w-7 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="Open full document in new tab"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50/70 p-2 rounded border border-amber-200">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span>No document photo uploaded</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. PAN Verification (Mandatory) */}
            <div className="space-y-3 rounded-lg border p-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    PAN
                  </h4>
                  <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                    Mandatory
                  </span>
                </div>
                <StatusBadge status={String(o.panVerificationStatus || 'NOT_VERIFIED')} />
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">PAN Number</span>
                  <span className="font-mono font-bold text-foreground tracking-wide text-base">
                    {panNumber || '—'}
                  </span>
                </div>
                {o.panVerifiedName ? (
                  <div>
                    <span className="text-xs text-muted-foreground block">Name on IT Portal</span>
                    <span className="font-semibold text-emerald-800 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block truncate">
                      {String(o.panVerifiedName)}
                    </span>
                  </div>
                ) : null}
                {o.panVerifiedAt ? (
                  <div className="text-[11px] text-muted-foreground">
                    Verified on {format(new Date(String(o.panVerifiedAt)), 'MMM d, yyyy h:mm a')}
                  </div>
                ) : null}
                {panDoc?.fileUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 border-amber-300 text-amber-900 hover:bg-amber-50 mt-1"
                    onClick={() =>
                      setPreviewDoc({
                        documentType: 'PAN_CARD',
                        documentNumber: panNumber,
                        fileUrl: String(panDoc.fileUrl),
                        fileName: panDoc.fileName ? String(panDoc.fileName) : 'PAN Card',
                        mimeType: panDoc.mimeType ? String(panDoc.mimeType) : undefined,
                        verificationStatus: String(o.panVerificationStatus || panDoc.verificationStatus || 'VERIFIED'),
                        uploadedAt: panDoc.uploadedAt as any,
                      })
                    }
                  >
                    <Eye className="h-3 w-3 text-amber-600" />
                    Preview PAN Card
                  </Button>
                ) : null}
              </div>
            </div>

            {/* 4. GSTIN (Optional) */}
            <div className="space-y-3 rounded-lg border p-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  GSTIN
                </h4>
                {gstinNumber ? (
                  <StatusBadge status={String(o.gstinVerificationStatus || 'NOT_VERIFIED')} />
                ) : (
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Optional</span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">GSTIN Number</span>
                  <span className="font-mono font-semibold text-foreground text-xs">
                    {gstinNumber || 'Not Provided (Exempt)'}
                  </span>
                </div>
                {o.gstinVerifiedLegalName ? (
                  <div>
                    <span className="text-xs text-muted-foreground block">Legal Business Name</span>
                    <span className="font-medium text-foreground text-xs truncate block">{String(o.gstinVerifiedLegalName)}</span>
                  </div>
                ) : null}
                {o.gstinVerifiedTradeName ? (
                  <div>
                    <span className="text-xs text-muted-foreground block">Trade Name</span>
                    <span className="font-medium text-foreground text-xs truncate block">{String(o.gstinVerifiedTradeName)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 4 – Dynamic Category-Based Documents & Licences */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-600" />
                Category-Specific Documents & Licences
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Dynamic compliance requirements tailored for <strong className="text-foreground">{categoryLabel}</strong>
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-normal text-xs">
              {applicableRequirements.length} Applicable Requirement{applicableRequirements.length === 1 ? '' : 's'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applicableRequirements.map((req) => {
              const matchingDoc = findDocument(req.backendType);
              const fileUrl = matchingDoc?.fileUrl ? String(matchingDoc.fileUrl) : null;
              const docNumber =
                matchingDoc?.documentNumber ||
                (req.kind === 'fssai_certificate' ? o.fssaiNumber : null) ||
                null;
              const hasUploaded = Boolean(fileUrl || docNumber);

              return (
                <div
                  key={req.kind}
                  className={`rounded-lg border p-4 space-y-3 transition-colors ${
                    hasUploaded ? 'border-border bg-card' : req.required ? 'border-amber-300/80 bg-amber-50/20' : 'border-dashed bg-muted/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-foreground">{req.label}</h4>
                        {req.required ? (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Optional
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{req.helper}</p>
                    </div>
                    {matchingDoc?.verificationStatus ? (
                      <StatusBadge status={String(matchingDoc.verificationStatus)} />
                    ) : hasUploaded ? (
                      <StatusBadge status="PENDING" />
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">Not provided</span>
                    )}
                  </div>

                  {/* Document Number if available */}
                  {docNumber ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Licence/Reg No:</span>
                      <span className="font-mono font-medium text-foreground bg-muted px-2 py-0.5 rounded border border-border">
                        {String(docNumber)}
                      </span>
                    </div>
                  ) : null}

                  {/* Document Action / Preview */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    {fileUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPreviewDoc({
                            documentType: req.backendType,
                            documentNumber: String(docNumber || ''),
                            fileUrl,
                            fileName: matchingDoc?.fileName ? String(matchingDoc.fileName) : req.label,
                            mimeType: matchingDoc?.mimeType ? String(matchingDoc.mimeType) : undefined,
                            verificationStatus: matchingDoc?.verificationStatus ? String(matchingDoc.verificationStatus) : 'PENDING',
                            uploadedAt: matchingDoc?.uploadedAt as any,
                          })
                        }
                        className="h-8 gap-1.5 text-xs text-amber-700 hover:text-amber-900 border-amber-300 hover:bg-amber-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview Certificate
                      </Button>
                    ) : docNumber ? (
                      <span className="text-muted-foreground italic text-xs">
                        Number provided — no certificate file uploaded
                      </span>
                    ) : (
                      <span className="text-amber-800 text-xs flex items-center gap-1 font-medium">
                        {req.required ? (
                          <>
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            Document missing
                          </>
                        ) : (
                          'Not applicable for this seller'
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pharmacist Specific Information Section if available */}
          {pharmacist && (pharmacist.name || pharmacist.registrationNumber) ? (
            <div className="mt-5 rounded-lg border border-border/80 bg-muted/20 p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                Qualified Pharmacist Record (Medical / Pharmacy)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="text-muted-foreground block">Pharmacist Name</span>
                  <span className="font-semibold text-foreground text-sm">{String(pharmacist.name || '—')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Registration Number</span>
                  <span className="font-mono font-medium text-foreground">{String(pharmacist.registrationNumber || '—')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">State Pharmacy Council</span>
                  <span className="font-medium text-foreground">{String(pharmacist.registrationState || '—')}</span>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Step 5 – Bank & Payout Details */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-600" />
                Bank Account & Payout Information
              </CardTitle>
              <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                Mandatory
              </span>
            </div>
            {bankAccount?.verificationStatus ? (
              <StatusBadge status={String(bankAccount.verificationStatus)} />
            ) : null}
          </div>
          <CardDescription className="text-xs">
            Bank account for automated order settlements and payouts.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {bankAccount && (bankAccount.accountNumber || bankAccount.ifscCode) ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                  <span className="text-muted-foreground shrink-0">Account Holder Name</span>
                  <span className="font-semibold text-right">
                    {String(bankAccount.accountHolderName || o.fullName || '—')}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                  <span className="text-muted-foreground shrink-0">Bank Name</span>
                  <span className="font-medium text-right">
                    {String(bankAccount.bankName || 'Bank details provided')}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                  <span className="text-muted-foreground shrink-0">Account Number</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">
                      {showFullAccount
                        ? String(bankAccount.accountNumber)
                        : maskAccountNumber(String(bankAccount.accountNumber))}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFullAccount(!showFullAccount)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      title={showFullAccount ? 'Hide account number' : 'Show account number'}
                    >
                      {showFullAccount ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                  <span className="text-muted-foreground shrink-0">IFSC Code</span>
                  <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {String(bankAccount.ifscCode || '—')}
                  </span>
                </div>
              </div>

              {/* Passbook / Cancelled Cheque preview */}
              <div className="flex flex-col justify-between rounded-lg border p-4 bg-muted/10 space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Passbook / Cancelled Cheque
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Bank proof submitted for account ownership verification.
                  </p>
                </div>
                {passbookUrl ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={passbookUrl}
                      alt="Bank Passbook"
                      className="h-16 w-24 rounded border object-cover bg-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPreviewDoc({
                          documentType: 'BANK_PASSBOOK',
                          documentNumber: String(bankAccount.accountNumber || ''),
                          fileUrl: passbookUrl,
                          fileName: 'Bank Passbook / Cheque',
                          verificationStatus: String(bankAccount.verificationStatus || 'VERIFIED'),
                        })
                      }
                      className="h-8 gap-1.5 text-xs text-amber-700 hover:text-amber-900 border-amber-300 hover:bg-amber-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Document
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No passbook / cheque image uploaded
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-300/80 bg-amber-50/50 p-6 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                <CreditCard className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-amber-950">Bank Account Details Missing</h4>
              <p className="text-xs text-amber-800 max-w-md mx-auto">
                No bank account details or passbook proof recorded for this seller. A verified bank account is required for payout settlements.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Uploaded Documents Gallery */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              All Uploaded Documents & Media ({documents.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {!documents.length ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No documents uploaded by seller</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {documents.map((doc) => {
                const docType = String(doc.documentType);
                const fileUrl = doc.fileUrl ? String(doc.fileUrl) : '';
                const isImage =
                  Boolean(fileUrl && /\.(jpg|jpeg|png|webp)$/i.test(fileUrl)) ||
                  String(doc.mimeType || '').startsWith('image/');

                return (
                  <div
                    key={String(doc._id)}
                    className="flex flex-col justify-between rounded-lg border border-border p-3.5 bg-card space-y-3 hover:border-amber-300 transition-colors shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate text-foreground">
                            {getDocumentLabel(docType)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {String(doc.fileName || 'document')}
                          </p>
                        </div>
                        <StatusBadge status={String(doc.verificationStatus || 'PENDING')} />
                      </div>

                      {doc.documentNumber ? (
                        <p className="text-xs font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border inline-block">
                          {String(doc.documentNumber)}
                        </p>
                      ) : null}

                      {fileUrl && isImage ? (
                        <div
                          className="relative h-32 w-full rounded border overflow-hidden bg-muted/20 cursor-pointer group"
                          onClick={() =>
                            setPreviewDoc({
                              documentType: docType,
                              documentNumber: doc.documentNumber ? String(doc.documentNumber) : undefined,
                              fileUrl,
                              fileName: String(doc.fileName || ''),
                              mimeType: String(doc.mimeType || ''),
                              verificationStatus: String(doc.verificationStatus || 'PENDING'),
                              uploadedAt: doc.uploadedAt as any,
                            })
                          }
                        >
                          <img
                            src={fileUrl}
                            alt={docType}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs gap-1 font-medium">
                            <Eye className="h-4 w-4" /> Click to view
                          </div>
                        </div>
                      ) : fileUrl ? (
                        <div className="h-32 w-full rounded border bg-muted/10 flex flex-col items-center justify-center text-muted-foreground text-xs p-2 text-center">
                          <FileText className="h-8 w-8 mb-1 text-muted-foreground/60" />
                          <span className="truncate max-w-full font-medium">{String(doc.fileName || 'Document')}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                      {fileUrl ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPreviewDoc({
                              documentType: docType,
                              documentNumber: doc.documentNumber ? String(doc.documentNumber) : undefined,
                              fileUrl,
                              fileName: String(doc.fileName || ''),
                              mimeType: String(doc.mimeType || ''),
                              verificationStatus: String(doc.verificationStatus || 'PENDING'),
                              uploadedAt: doc.uploadedAt as any,
                            })
                          }
                          className="h-7 text-xs text-amber-700 hover:text-amber-900 p-0 font-medium"
                        >
                          Preview & Details
                        </Button>
                      ) : (
                        <span className="text-muted-foreground italic">No file attached</span>
                      )}
                      {doc.uploadedAt ? (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(String(doc.uploadedAt)), 'MMM d')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submission & Review History Timeline */}
      {history.length > 0 ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-amber-600" />
              Submission & Review History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {history.map((item, idx) => (
                <div key={String(item._id || idx)} className="flex items-start gap-3 text-xs border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <div className="mt-0.5">
                    <StatusBadge status={String(item.action || 'SUBMITTED')} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {String(item.action).replace(/_/g, ' ')}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {item.performedAt ? format(new Date(String(item.performedAt)), 'MMM d, yyyy h:mm a') : '—'}
                      </span>
                    </div>
                    {item.comment ? (
                      <p className="text-foreground/80 bg-muted/40 p-2 rounded border border-border/60 mt-1">
                        &quot;{String(item.comment)}&quot;
                      </p>
                    ) : null}
                    <div className="text-[11px] text-muted-foreground">
                      Status transitioned: {String(item.previousStatus || '—')} → {String(item.newStatus || '—')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Review Actions Card */}
      <Card className="shadow-sm border-amber-200 bg-amber-50/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            Review & Compliance Decision
          </CardTitle>
          <CardDescription className="text-xs">
            Confirm the business category/type and approve or request corrections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-lg border border-border/70 bg-white p-3.5 shadow-2xs">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="shop-type-select" className="text-sm font-medium">
                Business / Shop Type Confirmation
              </Label>
              <p className="text-xs text-muted-foreground">
                Current selected: <strong className="text-foreground">{categoryLabel}</strong>
                {o.shopType && o.shopType !== categoryLabel ? ` (${String(o.shopType)})` : ''}.
              </p>
            </div>
            <select
              id="shop-type-select"
              value={selectedShopType || (o.shopType ? String(o.shopType) : categoryLabel)}
              onChange={(e) => setSelectedShopType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select shop type</option>
              {COMMON_SHOP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <ReviewActions
            comment={comment}
            onCommentChange={setComment}
            onApprove={() => reviewMutation.mutate('approve')}
            onRequestChanges={() => reviewMutation.mutate('request-changes')}
            onReject={() => reviewMutation.mutate('reject')}
            isPending={reviewMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Document Preview Modal */}
      <DocumentPreviewDialog
        document={previewDoc}
        open={Boolean(previewDoc)}
        onOpenChange={(open) => {
          if (!open) setPreviewDoc(null);
        }}
      />
    </div>
  );
}
