'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BrandSelect } from '@/components/products/brand-select';
import { ProductImagesField } from '@/components/products/product-images-field';
import {
  EMPTY_PRODUCT_INFORMATION,
  ProductInformationFields,
  productInformationFromApi,
  productInformationToPayload,
  type ProductInformationFormState,
} from '@/components/products/product-information-fields';
import { FormSection } from '@/components/shared/form-section';
import { FormField } from '@/components/shared/form-field';
import {
  ProductTypeAttributeFields,
  NetContentAttributeFields,
  getMissingRequiredAttributeNames,
  getVisibleAttributes,
  type AttrMapping,
} from '@/components/products/product-type-attribute-fields';
import { toast } from 'sonner';

type NamedRef = { _id: string; name: string };

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

function formatAttrValue(value: unknown): string {
  if (value === true || value === 'true') return 'true';
  if (value === false || value === 'false') return 'false';
  return value == null ? '' : String(value);
}

function parsePriceToPaise(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const rupees = Number(trimmed);
  if (Number.isNaN(rupees) || rupees < 0) return undefined;
  return Math.round(rupees * 100);
}

interface ProductFormDialogProps {
  open: boolean;
  productId?: string | null;
  onClose: () => void;
}

export function ProductFormDialog({ open, productId, onClose }: ProductFormDialogProps) {
  const isEdit = !!productId;
  const qc = useQueryClient();

  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [productTypeId, setProductTypeId] = useState('');
  const [form, setForm] = useState({
    name: '',
    brand: '',
    description: '',
    sku: '',
    gtin: '',
    complianceInfo: '',
    sellingPrice: '',
    status: 'ACTIVE',
  });
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [productInformation, setProductInformation] = useState<ProductInformationFormState>(
    EMPTY_PRODUCT_INFORMATION,
  );
  const [images, setImages] = useState<Array<{ imageUrl: string; isPrimary: boolean }>>([]);

  const { data: brands = [] } = useQuery({
    queryKey: ['product-brands'],
    queryFn: async () => (await api<string[]>(endpoints.productBrands)).data || [],
    enabled: open,
  });

  const { data: productData, isLoading: loadingProduct } = useQuery({
    queryKey: ['master-product', productId],
    queryFn: async () => {
      const res = await api<{
        product: Record<string, unknown> & {
          attributes?: Array<{ attributeId: string | { _id: string }; value: unknown }>;
        };
        images?: Array<{ imageUrl: string; isPrimary?: boolean }>;
      }>(`${endpoints.masterProducts}/${productId}`);
      return res.data!;
    },
    enabled: open && isEdit,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-active'],
    queryFn: async () =>
      (await api<{ items: Array<{ _id: string; name: string }> }>(`${endpoints.categories}?status=ACTIVE&limit=100`))
        .data?.items || [],
    enabled: open,
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
    enabled: open && !!categoryId,
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
    enabled: open && !!subcategoryId,
  });

  const { data: typeAttributes } = useQuery({
    queryKey: ['pta', productTypeId],
    queryFn: async () =>
      productTypeId
        ? (await api<AttrMapping[]>(endpoints.productTypeAttributes(productTypeId))).data || []
        : [],
    enabled: open && !!productTypeId,
  });

  const visibleAttributes = useMemo(
    () => getVisibleAttributes(typeAttributes),
    [typeAttributes],
  );

  const missingRequiredAttrs = useMemo(() => {
    if (!productTypeId) return [];
    return getMissingRequiredAttributeNames(visibleAttributes, attributes);
  }, [productTypeId, visibleAttributes, attributes]);

  useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      setCategoryId('');
      setSubcategoryId('');
      setProductTypeId('');
      setForm({
        name: '',
        brand: '',
        description: '',
        sku: '',
        gtin: '',
        complianceInfo: '',
        sellingPrice: '',
        status: 'ACTIVE',
      });
      setAttributes({});
      setProductInformation(EMPTY_PRODUCT_INFORMATION);
      setImages([]);
      return;
    }
    if (!productData?.product) return;
    const p = productData.product;
    setCategoryId(refId(p.categoryId));
    setSubcategoryId(refId(p.subcategoryId));
    setProductTypeId(refId(p.productTypeId));
    setForm({
      name: String(p.name || ''),
      brand: String(p.brand || ''),
      description: String(p.description || ''),
      sku: String(p.sku || ''),
      gtin: String(p.gtin || ''),
      complianceInfo: String(p.complianceInfo || ''),
      sellingPrice:
        p.sellingPricePaise != null ? String(Number(p.sellingPricePaise) / 100) : '',
      status: String(p.status || 'ACTIVE'),
    });
    const attrs: Record<string, string> = {};
    for (const a of p.attributes || []) {
      const id = typeof a.attributeId === 'object' ? a.attributeId._id : a.attributeId;
      attrs[String(id)] = formatAttrValue(a.value);
    }
    setAttributes(attrs);
    setProductInformation(productInformationFromApi(p.productInformation));
    const loaded = (productData.images || []).map((img, i) => ({
      imageUrl: String(img.imageUrl || ''),
      isPrimary: Boolean(img.isPrimary) || i === 0,
    }));
    setImages(loaded.length ? loaded : []);
  }, [open, isEdit, productData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
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

      const payload: Record<string, unknown> = {
        name: form.name,
        brand: form.brand || undefined,
        description: form.description || undefined,
        ...(form.sku.trim() ? { sku: form.sku.trim() } : {}),
        gtin: form.gtin.trim() || undefined,
        complianceInfo: form.complianceInfo.trim() || undefined,
        status: form.status,
        attributes: attrValues,
        images: cleanedImages,
        productInformation: productInformationToPayload(productInformation),
        ...(sellingPricePaise != null ? { sellingPricePaise } : {}),
      };

      if (isEdit) {
        return api(`${endpoints.masterProducts}/${productId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...payload,
            categoryId,
            subcategoryId,
            productTypeId,
          }),
        });
      }

      return api(endpoints.masterProducts, {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          categoryId,
          subcategoryId,
          productTypeId,
        }),
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated' : 'Product created');
      qc.invalidateQueries({ queryKey: ['master-products'] });
      qc.invalidateQueries({ queryKey: ['product-brands'] });
      if (isEdit) qc.invalidateQueries({ queryKey: ['master-product', productId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit =
    form.name.trim() &&
    categoryId &&
    subcategoryId &&
    productTypeId &&
    missingRequiredAttrs.length === 0;

  const catalogueSection = (
    <FormSection
      title={isEdit ? 'Catalogue placement' : '1. Catalogue placement'}
      description="Pick where this product sits in the catalogue tree."
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <FormField
          label="Category"
          required
          hint="Top-level group (e.g. Fresh & Daily Essentials)."
        >
          <Select
            value={categoryId || undefined}
            onValueChange={(v) => {
              setCategoryId(v);
              setSubcategoryId('');
              setProductTypeId('');
              setAttributes({});
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label="Subcategory"
          required
          hint="Choose category first, then subcategory."
        >
          <Select
            value={subcategoryId || undefined}
            onValueChange={(v) => {
              setSubcategoryId(v);
              setProductTypeId('');
              setAttributes({});
            }}
            disabled={!categoryId}
          >
            <SelectTrigger>
              <SelectValue placeholder={categoryId ? 'Select a subcategory' : 'Select category first'} />
            </SelectTrigger>
            <SelectContent>
              {subcategories?.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label="Product Type"
          required
          hint="Shared type for similar products (e.g. Fresh Fruits)."
        >
          <Select
            value={productTypeId || undefined}
            onValueChange={(v) => {
              setProductTypeId(v);
              setAttributes({});
            }}
            disabled={!subcategoryId}
          >
            <SelectTrigger>
              <SelectValue placeholder={subcategoryId ? 'Select a product type' : 'Select subcategory first'} />
            </SelectTrigger>
            <SelectContent>
              {productTypes?.map((pt) => (
                <SelectItem key={pt._id} value={pt._id}>
                  {pt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      {isEdit && productData?.product ? (
        <p className="text-xs text-muted-foreground">
          Current: {refName(productData.product.categoryId)} → {refName(productData.product.subcategoryId)} →{' '}
          {refName(productData.product.productTypeId)}
        </p>
      ) : null}
    </FormSection>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[94vh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? 'Update catalogue placement, product details, specifications, and images.'
              : 'Choose catalogue placement, then fill product details. Required fields are marked *.'}
          </p>
        </DialogHeader>

        {isEdit && loadingProduct ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">Loading product...</p>
        ) : (
          <form
            className="space-y-7 px-6 py-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (missingRequiredAttrs.length) {
                toast.error(`Fill required attributes: ${missingRequiredAttrs.join(', ')}`);
                return;
              }
              if (canSubmit) saveMutation.mutate();
            }}
          >
            {catalogueSection}

            <FormSection
              title={isEdit ? 'Basic details' : '2. Basic details'}
              description="Core identity of this master product."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  label="Product Name"
                  required
                  className="sm:col-span-2"
                  hint="Customer-facing product name (not the product type)."
                >
                  <Input
                    placeholder="e.g. Fresh Apple"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </FormField>
                <div className="space-y-5">
                  <BrandSelect
                    value={form.brand}
                    onChange={(brand) => setForm({ ...form, brand })}
                    brands={brands}
                  />
                  {productTypeId ? (
                    <NetContentAttributeFields
                      visibleAttributes={visibleAttributes}
                      attributes={attributes}
                      onChange={setAttributes}
                    />
                  ) : null}
                </div>
                <FormField
                  label="Reference selling price (₹)"
                  hint="Default price shown in the master catalogue. Sellers can override on their listing."
                >
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 45"
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  />
                </FormField>
                <FormField
                  label="SKU"
                  hint="Unique stock-keeping code. Leave blank to auto-generate."
                >
                  <Input
                    placeholder="e.g. MP-FRESH-APPLE-001"
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
                <FormField label="Status" hint="Active products can be listed by sellers.">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField
                  label="Description"
                  className="sm:col-span-2"
                  hint="Optional note for admins and sellers."
                >
                  <Textarea
                    placeholder="e.g. Crisp Royal Gala apples, packed fresh daily"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </FormField>
                <FormField
                  label="Compliance info"
                  className="sm:col-span-2"
                  hint="Optional regulatory or compliance notes."
                >
                  <Textarea
                    placeholder="e.g. FSSAI licence details, allergen warnings"
                    rows={2}
                    value={form.complianceInfo}
                    onChange={(e) => setForm({ ...form, complianceInfo: e.target.value })}
                  />
                </FormField>
              </div>
            </FormSection>

            {productTypeId && (
              <FormSection
                title={isEdit ? 'Product type attributes' : '3. Product type attributes'}
                description={
                  visibleAttributes.length
                    ? 'Catalogue specifications from the selected product type. Use Net content for amount + unit (e.g. 500 g).'
                    : 'No extra specifications for this product type.'
                }
              >
                <ProductTypeAttributeFields
                  visibleAttributes={visibleAttributes}
                  attributes={attributes}
                  onChange={setAttributes}
                    hideNetContent
                />
              </FormSection>
            )}

            <ProductInformationFields
              value={productInformation}
              onChange={setProductInformation}
              stepLabel={isEdit ? undefined : '4'}
            />

            <FormSection
              title={isEdit ? 'Images' : '5. Images (optional)'}
              description="Add one or more photos. The primary image appears in the products list."
            >
              <ProductImagesField
                images={images}
                onChange={setImages}
                uploadPath={endpoints.masterProductUpload}
              />
            </FormSection>

            <DialogFooter className="gap-2 border-t border-border px-0 pt-4 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
