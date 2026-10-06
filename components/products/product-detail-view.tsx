'use client';

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { InfoCard } from '@/components/shared/info-card';
import {
  hasProductInformation,
  productInformationDisplayItems,
} from '@/components/products/product-information-fields';
import { formatSpecificationRows } from '@/components/products/product-type-attribute-fields';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type NamedRef = { _id: string; name: string };

type AttrMapping = {
  attributeId: {
    _id: string;
    name: string;
    key?: string;
    type: string;
  };
  isRequired: boolean;
};

type ProductDetailData = {
  product: Record<string, unknown> & {
    attributes?: Array<{ attributeId: string | { _id: string; name?: string }; value: unknown }>;
  };
  images?: Array<{ imageUrl: string; isPrimary?: boolean; altText?: string }>;
};

function refName(value: unknown): string {
  if (value && typeof value === 'object' && 'name' in value) return String((value as NamedRef).name);
  return '—';
}

function refId(value: unknown): string {
  if (value && typeof value === 'object' && '_id' in value) return String((value as NamedRef)._id);
  return value != null ? String(value) : '';
}

function formatPaise(paise?: unknown): string {
  if (paise == null || paise === '') return '—';
  const n = Number(paise);
  if (Number.isNaN(n)) return '—';
  return `₹${(n / 100).toFixed(2)}`;
}

function formatAttrValue(value: unknown): string {
  if (value === true || value === 'true') return 'Yes';
  if (value === false || value === 'false') return 'No';
  if (Array.isArray(value)) return value.join(', ');
  if (value == null || value === '') return '—';
  return String(value);
}

interface ProductDetailViewProps {
  productId: string;
}

export function ProductDetailView({ productId }: ProductDetailViewProps) {
  const queryClient = useQueryClient();

  const publishMutation = useMutation({
    mutationFn: async () => {
      await api(`${endpoints.masterProducts}/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
    },
    onSuccess: () => {
      toast.success('Product published to Master Catalogue (Public to all sellers)!');
      queryClient.invalidateQueries({ queryKey: ['master-product', productId] });
      queryClient.invalidateQueries({ queryKey: ['master-products'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to publish product');
    },
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['master-product', productId],
    queryFn: async () => {
      const res = await api<ProductDetailData>(`${endpoints.masterProducts}/${productId}`);
      return res.data!;
    },
    enabled: !!productId,
  });

  const productTypeId = data ? refId(data.product.productTypeId) : '';

  const { data: typeAttributes } = useQuery({
    queryKey: ['pta', productTypeId],
    queryFn: async () =>
      productTypeId
        ? (await api<AttrMapping[]>(endpoints.productTypeAttributes(productTypeId))).data || []
        : [],
    enabled: !!productTypeId,
  });

  const attributeRows = useMemo(() => {
    if (!data?.product.attributes?.length) return [];
    const nameById = new Map(
      (typeAttributes || []).map((ta) => [ta.attributeId._id, ta.attributeId.name]),
    );
    const rows = data.product.attributes.map((attr) => {
      const id =
        typeof attr.attributeId === 'object' ? String(attr.attributeId._id) : String(attr.attributeId);
      const name =
        typeof attr.attributeId === 'object' && attr.attributeId.name
          ? String(attr.attributeId.name)
          : nameById.get(id) || 'Attribute';
      return [name, formatAttrValue(attr.value)] as [string, string];
    });
    return formatSpecificationRows(rows);
  }, [data, typeAttributes]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data?.product) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
        Product not found
      </div>
    );
  }

  const p = data.product;
  const images = data.images || [];
  const primaryImage = images.find((img) => img.isPrimary) || images[0];
  const requestedByStore = p.requestedByStore as { shopName?: string; sellerName?: string } | undefined;
  const isDraftPrivate = p.status === 'DRAFT';

  return (
    <div className="space-y-6">
      {isDraftPrivate || requestedByStore ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                {isDraftPrivate ? 'Private Store-Specific Custom Product' : 'Catalogue Product (Store Requested)'}
              </p>
              <h2 className="mt-0.5 text-base font-bold">
                Owned / Requested by Store: <span className="text-amber-950 underline underline-offset-2">{requestedByStore?.shopName || requestedByStore?.sellerName || 'Store'}</span>
              </h2>
              {isDraftPrivate ? (
                <p className="mt-1 text-xs text-amber-800">
                  This custom product is active ONLY for this store. Click <strong>Make Public Master Product</strong> to publish it to all sellers in the Master Catalogue.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  isDraftPrivate ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isDraftPrivate ? 'Store-Specific Only (Private)' : 'Master Catalogue (Public)'}
              </span>
              {isDraftPrivate ? (
                <Button
                  size="sm"
                  variant="default"
                  className="bg-amber-800 hover:bg-amber-900 text-white gap-1.5 shadow-sm"
                  disabled={publishMutation.isPending}
                  onClick={() => publishMutation.mutate()}
                >
                  <Globe className="h-3.5 w-3.5" />
                  {publishMutation.isPending ? 'Publishing...' : 'Make Public Master Product'}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-5 sm:flex-row sm:items-start">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
          {primaryImage?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryImage.imageUrl}
              alt={String(p.name)}
              className="h-full w-full object-cover"
            />
          ) : (
            <Package className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{String(p.name)}</h2>
            <StatusBadge status={String(p.status || 'ACTIVE')} />
          </div>
          {p.brand ? <p className="text-sm text-muted-foreground">Brand: {String(p.brand)}</p> : null}
          <p className="font-mono text-xs text-muted-foreground">SKU: {String(p.sku || '—')}</p>
          {p.description ? (
            <p className="text-sm leading-relaxed text-foreground/90">{String(p.description)}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard
          title="Catalogue placement"
          items={[
            ['Category', refName(p.categoryId)],
            ['Subcategory', refName(p.subcategoryId)],
            ['Product Type', refName(p.productTypeId)],
          ]}
        />
        <InfoCard
          title="Basic details & Ownership"
          items={[
            ['Owned By Store', requestedByStore?.shopName || requestedByStore?.sellerName || (isDraftPrivate ? 'Private Store' : 'Public Catalogue')],
            ['Catalogue Scope', isDraftPrivate ? 'Store-Specific (Private)' : 'Master Catalogue (Public)'],
            ['Brand', p.brand],
            ['Reference Price', formatPaise(p.sellingPricePaise)],
            ['SKU', p.sku],
            ['GTIN', p.gtin],
            ['Lifespan', p.lifespanValue != null ? `${p.lifespanValue} ${p.lifespanUnit || 'Days'}` : '—'],
            ['Status', p.status],
          ]}
        />
      </div>

      {attributeRows.length ? (
        <InfoCard title="Product type attributes" items={attributeRows} />
      ) : (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Product type attributes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No specifications recorded.</p>
          </CardContent>
        </Card>
      )}

      {hasProductInformation(p.productInformation) ? (
        <InfoCard title="Product Information" items={productInformationDisplayItems(p.productInformation)} />
      ) : (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No product information recorded.</p>
          </CardContent>
        </Card>
      )}

      {p.complianceInfo ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{String(p.complianceInfo)}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Images</CardTitle>
        </CardHeader>
        <CardContent>
          {images.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((img, index) => (
                <div
                  key={`${img.imageUrl}-${index}`}
                  className={cn(
                    'overflow-hidden rounded-lg border',
                    img.isPrimary ? 'border-amber-300 ring-2 ring-amber-200' : 'border-border',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.imageUrl}
                    alt={img.altText || `Product image ${index + 1}`}
                    className="aspect-square w-full object-cover"
                  />
                  {img.isPrimary ? (
                    <p className="bg-amber-50 px-2 py-1 text-center text-xs font-medium text-amber-800">
                      Primary
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No images uploaded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
