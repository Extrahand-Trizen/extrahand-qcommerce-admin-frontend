'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { InfoCard } from '@/components/shared/info-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { DataTableCard } from '@/components/shared/data-table-card';
import { SearchInput } from '@/components/shared/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableEmptyRow, TableLoadingRows } from '@/components/shared/table-states';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StoreLocationMapDialog } from '@/components/sellers/store-location-map-dialog';
import { cn } from '@/lib/utils';
import { ArrowLeft, MapPin, FileText, Clock, ShieldCheck, CreditCard, Eye, EyeOff, ExternalLink, AlertTriangle } from 'lucide-react';
import { getCategoryLabel, maskAccountNumber, maskAadhaar } from '@/lib/seller-onboarding';

type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

type StoreProduct = {
  id: string;
  masterProductId: string;
  name: string;
  brand?: string;
  categoryId: string;
  categoryName: string;
  variant: string;
  imageUrl: string;
  sellingPriceRupees: number;
  compareAtPriceRupees?: number;
  availability: 'available' | 'limited' | 'out_of_stock';
  enabled: boolean;
  isCustomProduct?: boolean;
  reviewStatus?: 'approved' | 'pending_review' | null;
};

function formatAvailability(value: StoreProduct['availability']) {
  if (value === 'available') return 'Available';
  if (value === 'limited') return 'Limited';
  return 'Out of stock';
}

export default function SellerStoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [showFullAadhaar, setShowFullAadhaar] = useState(false);
  const [showFullBankAcc, setShowFullBankAcc] = useState(false);

  const { data: storeDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['seller-detail', id],
    queryFn: async () => {
      const res = await api<{
        seller: Record<string, unknown>;
        onboarding: Record<string, unknown> | null;
        documents?: Array<Record<string, unknown>>;
      }>(`${endpoints.sellers}/${id}`);
      return res.data!;
    },
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['seller-store-categories', id],
    queryFn: async () => {
      const res = await api<StoreCategory[]>(endpoints.sellerStoreCategories(id));
      return res.data || [];
    },
  });

  useEffect(() => {
    if (!categories.length) {
      setSelectedCategoryId(null);
      return;
    }
    setSelectedCategoryId((current) => {
      if (current && categories.some((category) => category.id === current)) return current;
      return categories[0].id;
    });
  }, [categories]);

  const { data: productsPage, isLoading: productsLoading, isFetching: productsFetching } = useQuery({
    queryKey: ['seller-store-products', id, selectedCategoryId, search],
    enabled: Boolean(selectedCategoryId),
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
      if (search.trim()) params.set('search', search.trim());
      const res = await api<{ items: StoreProduct[]; total: number }>(
        `${endpoints.sellerStoreProducts(id)}?${params}`,
      );
      return res.data || { items: [], total: 0 };
    },
  });

  const products = productsPage?.items || [];
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) || null,
    [categories, selectedCategoryId],
  );

  if (detailLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!storeDetail?.onboarding) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">Store not found</p>
        <Link href="/sellers/stores" className="mt-2 text-sm text-amber-600 hover:underline">
          Back to stores
        </Link>
      </div>
    );
  }

  const seller = storeDetail.seller;
  const onboarding = storeDetail.onboarding;
  const documents = (storeDetail.documents || []) as Array<Record<string, unknown>>;
  const aadhaarDoc = documents.find((d) =>
    ['AADHAAR_CARD', 'AADHAAR', 'AADHAR_CARD', 'AADHAR', 'AADHAAR_DOCUMENT', 'KYC_DOCUMENT'].includes(
      String(d.documentType || '').toUpperCase().replace(/[- ]/g, '_'),
    ),
  );
  const aadhaarFileUrl =
    (aadhaarDoc?.fileUrl as string) ||
    (onboarding.aadhaarCardUrl as string) ||
    (onboarding.aadhaarDocumentUri && !String(onboarding.aadhaarDocumentUri).startsWith('file://')
      ? String(onboarding.aadhaarDocumentUri)
      : null);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/sellers/stores"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to stores
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{String(onboarding.shopName)}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {String(onboarding.city || '—')}
              {onboarding.state ? `, ${String(onboarding.state)}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5 border-amber-300 bg-amber-50/60 font-medium text-amber-900 hover:bg-amber-100">
              <Link href={`/sellers/approvals/${id}`}>
                <FileText className="h-4 w-4 text-amber-600" />
                View Onboarding & Documents
              </Link>
            </Button>
            <StatusBadge status={String(seller.status)} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard
          title="Store Details"
          items={[
            ['Shop Name', onboarding.shopName],
            ['Category', getCategoryLabel(String(onboarding.category || onboarding.shopType || ''))],
            [
              'Subcategories',
              Array.isArray(onboarding.subcategories) && onboarding.subcategories.length
                ? (onboarding.subcategories as string[]).join(', ')
                : (onboarding.subcategory as string) || '—',
            ],
            ['Description', onboarding.shopDescription],
            ['Shop Mobile', onboarding.shopMobileNumber],
            ['Shop Email', onboarding.shopEmail],
            [
              'Operating Timings',
              onboarding.openingHours
                ? typeof onboarding.openingHours === 'string'
                  ? onboarding.openingHours
                  : `${(onboarding.openingHours as any).open || ''} - ${(onboarding.openingHours as any).close || ''} (${((onboarding.openingHours as any).days || []).join(', ')})`
                : '—',
            ],
          ]}
        />
        {(() => {
          const rawLat = onboarding.latitude;
          const rawLng = onboarding.longitude;
          const lat = typeof rawLat === 'number' ? rawLat : (rawLat ? parseFloat(String(rawLat)) : null);
          const lng = typeof rawLng === 'number' ? rawLng : (rawLng ? parseFloat(String(rawLng)) : null);
          const hasCoordinates = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

          return (
            <>
              <InfoCard
                title="Owner & Location"
                items={[
                  ['Owner', onboarding.fullName],
                  ['Mobile', onboarding.mobileNumber],
                  ['Email', onboarding.email],
                  ['Address', onboarding.address],
                  ['Street / Road', onboarding.streetRoad || '—'],
                  ['Area / Landmark', onboarding.area || '—'],
                  ['City', onboarding.city],
                  ['State', onboarding.state],
                  ['Pincode', onboarding.pincode],
                  ...(hasCoordinates ? ([['Coordinates', `${lat.toFixed(6)}, ${lng.toFixed(6)}`]] as Array<[string, unknown]>) : []),
                ]}
                action={
                  hasCoordinates ? (
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
                  ) : null
                }
              />
              {hasCoordinates ? (
                <StoreLocationMapDialog
                  open={mapOpen}
                  onOpenChange={setMapOpen}
                  shopName={String(onboarding.shopName || '')}
                  ownerName={String(onboarding.fullName || '')}
                  address={String(onboarding.address || '')}
                  area={String(onboarding.area || '')}
                  city={String(onboarding.city || '')}
                  state={String(onboarding.state || '')}
                  pincode={String(onboarding.pincode || '')}
                  latitude={lat}
                  longitude={lng}
                />
              ) : null}
            </>
          );
        })()}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard
          title="KYC & Identity Verification"
          items={[
            [
              'Aadhaar Number *',
              <div className="flex items-center gap-2" key="aadhaar-val">
                <span className="font-mono text-sm">
                  {onboarding.aadhaarNumber
                    ? (showFullAadhaar ? String(onboarding.aadhaarNumber) : maskAadhaar(String(onboarding.aadhaarNumber)))
                    : '—'}
                </span>
                {onboarding.aadhaarNumber ? (
                  <button
                    type="button"
                    onClick={() => setShowFullAadhaar(!showFullAadhaar)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    title={showFullAadhaar ? 'Hide Aadhaar' : 'Show Aadhaar'}
                  >
                    {showFullAadhaar ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                ) : null}
              </div>,
            ],
            [
              'Aadhaar Status',
              onboarding.aadhaarVerificationStatus ? (
                <StatusBadge status={String(onboarding.aadhaarVerificationStatus)} />
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                  PENDING
                </span>
              ),
            ],
            [
              'Aadhaar Document',
              aadhaarFileUrl ? (
                <a
                  key="aadhaar-doc-link"
                  href={aadhaarFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Uploaded Card ({String(aadhaarDoc?.verificationStatus || 'PENDING')})
                </a>
              ) : (
                <span className="text-xs text-muted-foreground italic">No document image attached</span>
              ),
            ],
            ['PAN Number', (onboarding.pan as string) || (onboarding.panNumber as string) || '—'],
            ['PAN Status', onboarding.panVerificationStatus ? <StatusBadge status={String(onboarding.panVerificationStatus)} /> : '—'],
            ['PAN Holder Name', (onboarding.panVerifiedName as string) || (onboarding.panHolderName as string) || '—'],
            ['GSTIN', (onboarding.gstin as string) || (onboarding.gstinNumber as string) || '—'],
            ['GST Legal Name', (onboarding.gstinVerifiedLegalName as string) || (onboarding.gstLegalName as string) || '—'],
          ]}
          action={
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-amber-700 hover:text-amber-800">
              <Link href={`/sellers/approvals/${id}`}>
                View Licences & Documents &rarr;
              </Link>
            </Button>
          }
        />
        {(() => {
          const rawBank = onboarding.bankAccount as Record<string, unknown> | undefined;
          const storeBank = (seller as any)?.storeSettings?.bankAccount as Record<string, unknown> | undefined;
          const bank = rawBank?.accountNumber ? rawBank : (storeBank?.accountNumber ? storeBank : rawBank || storeBank);
          const hasBank = !!(bank?.accountNumber || bank?.ifscCode);
          const passbookUrl = (bank?.passbookProofUrl || bank?.bankStatementUrl || bank?.cancelledChequeUrl) as string | undefined;

          return (
            <InfoCard
              title="Bank & Settlement Account"
              items={
                hasBank
                  ? [
                      ['Account Holder', bank?.accountHolderName || onboarding.fullName || '—'],
                      ['Bank Name', bank?.bankName || '—'],
                      [
                        'Account Number',
                        <div className="flex items-center gap-2" key="acc-num">
                          <span className="font-mono text-sm">
                            {bank?.accountNumber
                              ? (showFullBankAcc ? String(bank.accountNumber) : maskAccountNumber(String(bank.accountNumber)))
                              : '—'}
                          </span>
                          {bank?.accountNumber ? (
                            <button
                              type="button"
                              onClick={() => setShowFullBankAcc(!showFullBankAcc)}
                              className="text-muted-foreground transition-colors hover:text-foreground"
                              title={showFullBankAcc ? 'Hide Account' : 'Show Account'}
                            >
                              {showFullBankAcc ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          ) : null}
                        </div>,
                      ],
                      ['IFSC Code', bank?.ifscCode ? <span className="font-mono font-medium">{String(bank.ifscCode).toUpperCase()}</span> : '—'],
                      ['Verification Status', bank?.verificationStatus ? <StatusBadge status={String(bank.verificationStatus)} /> : <StatusBadge status="verified" />],
                      ...(passbookUrl
                        ? ([
                            [
                              'Passbook / Cheque',
                              <a
                                key="passbook-link"
                                href={passbookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View Document Proof
                              </a>,
                            ],
                          ] as Array<[string, unknown]>)
                        : []),
                    ]
                  : [
                      [
                        'Settlement Account',
                        <div key="bank-empty" className="flex items-center gap-2 text-xs text-amber-800">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>No bank account recorded for this store yet.</span>
                        </div>,
                      ],
                    ]
              }
            />
          );
        })()}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Store Catalogue</CardTitle>
          <p className="text-sm text-muted-foreground">
            Categories available in this store. Select a category to view its products.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {categoriesLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-24 rounded-full" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">This store has no listed products yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const active = category.id === selectedCategoryId;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'border-amber-300 bg-amber-50 font-medium text-amber-900'
                        : 'border-border bg-white text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {category.name}
                    <span className="ml-1.5 text-xs opacity-70">({category.productCount})</span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCategory ? (
        <DataTableCard
          toolbar={
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{selectedCategory.name}</p>
                <p className="text-xs text-muted-foreground">
                  {productsPage?.total ?? 0} product{(productsPage?.total ?? 0) === 1 ? '' : 's'} in this category
                </p>
              </div>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search products in this category..."
                className="sm:max-w-xs"
              />
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[72px]">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead className="w-[130px]">Listing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsLoading || productsFetching ? (
                <TableLoadingRows cols={6} />
              ) : !products.length ? (
                <TableEmptyRow cols={6} message="No products in this category" />
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-12 w-12 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted text-xs text-muted-foreground">
                          —
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.brand ? (
                          <p className="text-xs text-muted-foreground">{product.brand}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.variant || '—'}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">₹{product.sellingPriceRupees.toFixed(2)}</p>
                        {product.compareAtPriceRupees ? (
                          <p className="text-xs text-muted-foreground line-through">
                            ₹{product.compareAtPriceRupees.toFixed(2)}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{formatAvailability(product.availability)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={product.enabled ? 'ACTIVE' : 'INACTIVE'} />
                        {product.isCustomProduct && product.reviewStatus ? (
                          <StatusBadge
                            status={product.reviewStatus === 'approved' ? 'APPROVED' : 'PENDING_REVIEW'}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataTableCard>
      ) : null}
    </div>
  );
}
