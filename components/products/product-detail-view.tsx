'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { InfoCard } from '@/components/shared/info-card';
import {
  hasProductInformation,
  productInformationDisplayItems,
} from '@/components/products/product-information-fields';
import { formatSpecificationRows } from '@/components/products/product-type-attribute-fields';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  return (
    <div className="space-y-6">
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
          title="Basic details"
          items={[
            ['Brand', p.brand],
            ['Reference Price', formatPaise(p.sellingPricePaise)],
            ['SKU', p.sku],
            ['GTIN', p.gtin],
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
