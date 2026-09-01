'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BrandSelect } from '@/components/products/brand-select';
import { ProductImagesField, ProductImageDraft } from '@/components/products/product-images-field';
import {
  EMPTY_PRODUCT_INFORMATION,
  ProductInformationFields,
  productInformationToPayload,
  type ProductInformationFormState,
} from '@/components/products/product-information-fields';
import { FormSection } from '@/components/shared/form-section';
import { FormField } from '@/components/shared/form-field';
import { InfoCard } from '@/components/shared/info-card';
import { ReviewActions } from '@/components/shared/review-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ProductTypeAttributeFields,
  getMissingRequiredAttributeNames,
  getVisibleAttributes,
  type AttrMapping,
} from '@/components/products/product-type-attribute-fields';
import { toast } from 'sonner';

type NamedRef = { _id: string; name: string };

export type SubmissionReviewPayload = {
  action: 'APPROVE' | 'REJECT' | 'CHANGES_REQUIRED';
  adminComment?: string;
  masterProductId?: string;
  subcategoryId?: string;
  productTypeId?: string;
  name?: string;
  brand?: string;
  description?: string;
  sku?: string;
  gtin?: string;
  complianceInfo?: string;
  attributes?: Array<{ attributeId: string; value: string | number | boolean }>;
  images?: ProductImageDraft[];
  productInformation?: ReturnType<typeof productInformationToPayload>;
  sellingPricePaise?: number;
  createSellerListing?: boolean;
};

interface SubmissionReviewFormProps {
  submission: Record<string, unknown>;
  onSubmit: (payload: SubmissionReviewPayload) => void;
  isPending?: boolean;
  readOnly?: boolean;
}

function refName(value: unknown): string {
  if (value && typeof value === 'object' && 'name' in value) return String((value as NamedRef).name);
  return '—';
}

function refId(value: unknown): string {
  if (value && typeof value === 'object' && '_id' in value) return String((value as NamedRef)._id);
  return value != null ? String(value) : '';
}

function parseAttrValue(mapping: AttrMapping | undefined, value: string): string | boolean | number {
  if (mapping?.attributeId.type === 'BOOLEAN') {
    return value === 'true' || value === 'Yes';
  }
  if (mapping?.attributeId.type === 'NUMBER') {
    return Number(value);
  }
  return value;
}

function formatPaise(paise?: number): string {
  if (paise == null) return '—';
  return `₹${(paise / 100).toFixed(2)}`;
}

function parsePriceToPaise(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const rupees = Number(trimmed);
  if (Number.isNaN(rupees) || rupees < 0) return undefined;
  return Math.round(rupees * 100);
}

export function SubmissionReviewForm({
  submission,
  onSubmit,
  isPending,
  readOnly,
}: SubmissionReviewFormProps) {
  const [comment, setComment] = useState(String(submission.adminComment || ''));
  const [approvalMode, setApprovalMode] = useState<'create' | 'map'>('create');
  const [masterProductId, setMasterProductId] = useState('');
  const [masterSearch, setMasterSearch] = useState('');

  const categoryId = refId(submission.categoryId);
  const [subcategoryId, setSubcategoryId] = useState(refId(submission.subcategoryId));
  const [productTypeId, setProductTypeId] = useState(refId(submission.productTypeId));

  const [form, setForm] = useState({
    name: String(submission.submittedProductName || ''),
    brand: String(submission.brand || ''),
    description: String(submission.description || ''),
    sku: '',
    gtin: '',
    complianceInfo: '',
    sellingPrice: submission.sellingPricePaise != null ? String(Number(submission.sellingPricePaise) / 100) : '',
  });
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [productInformation, setProductInformation] = useState<ProductInformationFormState>(
    EMPTY_PRODUCT_INFORMATION,
  );
  const [images, setImages] = useState<ProductImageDraft[]>([]);
  const [createSellerListing, setCreateSellerListing] = useState(true);

  const { data: brands = [] } = useQuery({
    queryKey: ['product-brands'],
    queryFn: async () => (await api<string[]>(endpoints.productBrands)).data || [],
  });

  const { data: subcategories } = useQuery({
    queryKey: ['subcategories', categoryId],
    queryFn: async () =>
      categoryId
        ? (
            await api<{ items: Array<{ _id: string; name: string }> }>(
              `${endpoints.subcategories}?categoryId=${categoryId}&status=ACTIVE&limit=100`
            )
          ).data?.items || []
        : [],
    enabled: !!categoryId && !readOnly,
  });

  const { data: productTypes } = useQuery({
    queryKey: ['product-types', subcategoryId],
    queryFn: async () =>
      subcategoryId
        ? (
            await api<{ items: Array<{ _id: string; name: string }> }>(
              `${endpoints.productTypes}?subcategoryId=${subcategoryId}&status=ACTIVE&limit=100`
            )
          ).data?.items || []
        : [],
    enabled: !!subcategoryId && !readOnly,
  });

  const { data: typeAttributes } = useQuery({
    queryKey: ['pta', productTypeId],
    queryFn: async () =>
      productTypeId
        ? (await api<AttrMapping[]>(endpoints.productTypeAttributes(productTypeId))).data || []
        : [],
    enabled: !!productTypeId && !readOnly,
  });

  const { data: masterProducts } = useQuery({
    queryKey: ['master-products-search', masterSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20', status: 'ACTIVE' });
      if (masterSearch.trim()) params.set('search', masterSearch.trim());
      const res = await api<{ items: Array<{ _id: string; name: string; brand?: string; sku?: string }> }>(
        `${endpoints.masterProducts}?${params}`
      );
      return res.data?.items || [];
    },
    enabled: approvalMode === 'map' && !readOnly,
  });

  const visibleAttributes = useMemo(
    () => getVisibleAttributes(typeAttributes),
    [typeAttributes],
  );

  useEffect(() => {
    const photoUrl = submission.photoUrl ? String(submission.photoUrl) : '';
    const extraImages = Array.isArray(submission.images)
      ? submission.images.map(String).filter(Boolean)
      : [];
    const urls = [photoUrl, ...extraImages].filter(Boolean);
    setImages(urls.map((url, i) => ({ imageUrl: url, isPrimary: i === 0 })));
  }, [submission]);

  const missingRequiredAttrs = useMemo(() => {
    if (approvalMode !== 'create' || !productTypeId) return [];
    return getMissingRequiredAttributeNames(visibleAttributes, attributes);
  }, [approvalMode, productTypeId, visibleAttributes, attributes]);

  const canApproveCreate =
    approvalMode === 'create' &&
    form.name.trim() &&
    subcategoryId &&
    productTypeId &&
    missingRequiredAttrs.length === 0;

  const canApproveMap = approvalMode === 'map' && !!masterProductId;

  function buildPayload(action: SubmissionReviewPayload['action']): SubmissionReviewPayload {
    const attrValues = Object.entries(attributes)
      .filter(([, value]) => value !== '')
      .map(([attributeId, value]) => {
        const mapping = typeAttributes?.find((t) => t.attributeId._id === attributeId);
        return { attributeId, value: parseAttrValue(mapping, value) };
      });

    const cleanedImages = images
      .map((img) => ({ imageUrl: img.imageUrl.trim(), isPrimary: img.isPrimary }))
      .filter((img) => img.imageUrl);

    if (cleanedImages.length && !cleanedImages.some((img) => img.isPrimary)) {
      cleanedImages[0].isPrimary = true;
    }

    const sellingPricePaise = parsePriceToPaise(form.sellingPrice);

    if (action === 'APPROVE' && approvalMode === 'map') {
      return {
        action,
        adminComment: comment || undefined,
        masterProductId,
        sellingPricePaise,
        createSellerListing,
      };
    }

    return {
      action,
      adminComment: comment || undefined,
      subcategoryId,
      productTypeId,
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      description: form.description.trim() || undefined,
      sku: form.sku.trim() || undefined,
      gtin: form.gtin.trim() || undefined,
      complianceInfo: form.complianceInfo.trim() || undefined,
      attributes: attrValues,
      images: cleanedImages,
      productInformation: productInformationToPayload(productInformation),
      sellingPricePaise,
      createSellerListing,
    };
  }

  function handleApprove() {
    if (approvalMode === 'create' && !canApproveCreate) {
      if (missingRequiredAttrs.length) {
        toast.error(`Fill required attributes: ${missingRequiredAttrs.join(', ')}`);
      } else if (!subcategoryId || !productTypeId) {
        toast.error('Select subcategory and product type before approving');
      } else {
        toast.error('Enter a product name before approving');
      }
      return;
    }
    if (approvalMode === 'map' && !canApproveMap) {
      toast.error('Select an existing master product to map this request to');
      return;
    }
    onSubmit(buildPayload('APPROVE'));
  }

  const seller = submission.sellerId as { fullName?: string; shopName?: string } | undefined;
  const mappedProduct = submission.mappedMasterProductId as { _id?: string; name?: string } | undefined;

  if (readOnly) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <InfoCard
            title="Seller Submission"
            items={[
              ['Product Name', submission.submittedProductName],
              ['Category', refName(submission.categoryId)],
              ['Brand', submission.brand],
              ['Pack / Sold As', submission.packOrSoldAs],
              ['Selling Price', formatPaise(submission.sellingPricePaise as number | undefined)],
              ['Description', submission.description],
            ]}
          />
          <InfoCard
            title="Review Outcome"
            items={[
              ['Status', submission.status],
              ['Admin Comment', submission.adminComment],
              ['Master Product', mappedProduct?.name || '—'],
            ]}
          />
        </div>
        {submission.photoUrl ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Seller Photo</CardTitle></CardHeader>
            <CardContent>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={String(submission.photoUrl)}
                alt="Seller submission"
                className="max-h-48 rounded-lg border object-cover"
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard
          title="What the seller submitted"
          items={[
            ['Seller', seller?.shopName || seller?.fullName],
            ['Product Name', submission.submittedProductName],
            ['Category', refName(submission.categoryId)],
            ['Brand', submission.brand || '—'],
            ['Pack / Sold As', submission.packOrSoldAs || '—'],
            ['Selling Price', formatPaise(submission.sellingPricePaise as number | undefined)],
            ['Description', submission.description || '—'],
          ]}
        />
        {submission.photoUrl ? (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Seller photo</CardTitle>
            </CardHeader>
            <CardContent>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={String(submission.photoUrl)}
                alt="Seller submission"
                className="max-h-40 rounded-lg border object-cover"
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <FormSection
        title="How to approve"
        description="Create a new master product with the missing details, or map this request to an existing catalogue product."
      >
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="approvalMode"
              checked={approvalMode === 'create'}
              onChange={() => setApprovalMode('create')}
            />
            Create new master product
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="approvalMode"
              checked={approvalMode === 'map'}
              onChange={() => setApprovalMode('map')}
            />
            Map to existing product
          </label>
        </div>
      </FormSection>

      {approvalMode === 'map' ? (
        <FormSection
          title="Map to existing master product"
          description="Use this when the seller's product already exists in the master catalogue."
        >
          <div className="space-y-4">
            <FormField label="Search catalogue" hint="Search by product name, brand, or SKU.">
              <Input
                placeholder="Search master products..."
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
              />
            </FormField>
            <FormField label="Master product" required>
              <Select value={masterProductId || undefined} onValueChange={setMasterProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a master product" />
                </SelectTrigger>
                <SelectContent>
                  {masterProducts?.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}{p.brand ? ` · ${p.brand}` : ''}{p.sku ? ` (${p.sku})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Selling price (₹)" hint="Price for the seller's store listing.">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 45"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
              />
            </FormField>
          </div>
        </FormSection>
      ) : (
        <>
          <FormSection
            title="1. Catalogue placement"
            description="Assign subcategory and product type — the seller only picked the top-level category."
          >
            <div className="grid gap-5 sm:grid-cols-3">
              <FormField label="Category">
                <Input value={refName(submission.categoryId)} disabled />
              </FormField>
              <FormField label="Subcategory" required hint="Choose the correct subcategory.">
                <Select
                  value={subcategoryId || undefined}
                  onValueChange={(v) => {
                    setSubcategoryId(v);
                    setProductTypeId('');
                    setAttributes({});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories?.map((s) => (
                      <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Product Type" required hint="Determines which attributes are required.">
                <Select
                  value={productTypeId || undefined}
                  onValueChange={(v) => {
                    setProductTypeId(v);
                    setAttributes({});
                  }}
                  disabled={!subcategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={subcategoryId ? 'Select product type' : 'Select subcategory first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes?.map((pt) => (
                      <SelectItem key={pt._id} value={pt._id}>{pt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </FormSection>

          <FormSection
            title="2. Basic details"
            description="Complete the master product record. Pre-filled from the seller where available."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Product Name" required className="sm:col-span-2">
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </FormField>
              <BrandSelect
                value={form.brand}
                onChange={(brand) => setForm({ ...form, brand })}
                brands={brands}
              />
              <FormField label="Selling price (₹)" hint="Used when adding this product to the seller's store.">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 45"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                />
              </FormField>
              <FormField label="SKU" hint="Leave blank to auto-generate.">
                <Input
                  placeholder="Auto-generated if empty"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </FormField>
              <FormField label="GTIN" hint="Optional barcode (8–14 digits).">
                <Input
                  placeholder="e.g. 8901234567890"
                  value={form.gtin}
                  onChange={(e) => setForm({ ...form, gtin: e.target.value })}
                />
              </FormField>
              <FormField label="Description" className="sm:col-span-2">
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </FormField>
              <FormField label="Compliance info" className="sm:col-span-2" hint="Optional regulatory or compliance notes.">
                <Textarea
                  rows={2}
                  value={form.complianceInfo}
                  onChange={(e) => setForm({ ...form, complianceInfo: e.target.value })}
                />
              </FormField>
            </div>
          </FormSection>

          {productTypeId ? (
            <FormSection
              title="3. Product type attributes"
              description={
                visibleAttributes.length
                  ? 'Fill required catalogue attributes before approving. Net content = amount + unit (e.g. 500 g).'
                  : 'No extra specifications for this product type.'
              }
            >
              {missingRequiredAttrs.length ? (
                <p className="mb-4 text-sm text-amber-700">
                  Required before approve: {missingRequiredAttrs.join(', ')}
                </p>
              ) : null}
              <ProductTypeAttributeFields
                visibleAttributes={visibleAttributes}
                attributes={attributes}
                onChange={setAttributes}
              />
            </FormSection>
          ) : null}

          <ProductInformationFields
            value={productInformation}
            onChange={setProductInformation}
            stepLabel="4"
          />

          <FormSection
            title="5. Images"
            description="Add or upload product images. The seller photo is pre-loaded if provided."
          >
            <ProductImagesField
              images={images}
              onChange={setImages}
              uploadPath={endpoints.masterProductUpload}
            />
          </FormSection>
        </>
      )}

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-start gap-3">
            <input
              id="createSellerListing"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border"
              checked={createSellerListing}
              onChange={(e) => setCreateSellerListing(e.target.checked)}
            />
            <div className="space-y-1">
              <label htmlFor="createSellerListing" className="text-sm font-medium">
                Add product to seller&apos;s store on approval
              </label>
              <p className="text-xs text-muted-foreground">
                Creates a seller listing using the selling price above so the product appears in their catalogue immediately.
              </p>
            </div>
          </div>

          <ReviewActions
            comment={comment}
            onCommentChange={setComment}
            onApprove={handleApprove}
            onRequestChanges={() => onSubmit(buildPayload('CHANGES_REQUIRED'))}
            onReject={() => onSubmit(buildPayload('REJECT'))}
            isPending={isPending}
            approveDisabled={
              approvalMode === 'create' ? !canApproveCreate : !canApproveMap
            }
            commentPlaceholder="Tell the seller what was changed, or what they need to fix..."
          />

          {approvalMode === 'create' && !canApproveCreate ? (
            <p className="mt-3 text-xs text-muted-foreground">
              To approve: select subcategory and product type, fill all required attributes, and enter a product name.
            </p>
          ) : null}
          {approvalMode === 'map' && !canApproveMap ? (
            <p className="mt-3 text-xs text-muted-foreground">
              To approve: select an existing master product to map this request to.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
