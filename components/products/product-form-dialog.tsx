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
import { FormSection } from '@/components/shared/form-section';
import { FormField } from '@/components/shared/form-field';
import { toast } from 'sonner';

const HIDDEN_ATTR_KEYS = new Set(['brand', 'pack_size', 'unit', 'quantity']);

const ATTR_HINTS: Record<string, string> = {
  weight: 'How much the customer gets — e.g. 1 kg, 500 g, 250 ml',
  sold_as: 'How this item is sold — as a pack, loose, or per piece',
  variety: 'Specific variety if applicable — e.g. Royal Gala, Robusta',
  organic: 'Is this product certified organic?',
  country_origin: 'Country or region of origin',
  pack_size: 'Pack description for packaged goods — e.g. 500 g, 1 L',
};

const ATTR_PLACEHOLDERS: Record<string, string> = {
  weight: 'e.g. 1 kg',
  variety: 'e.g. Royal Gala',
  pack_size: 'e.g. 500 g',
  country_origin: 'e.g. India',
};

type NamedRef = { _id: string; name: string };

type AttrMapping = {
  attributeId: {
    _id: string;
    name: string;
    key?: string;
    type: string;
    options?: Array<{ value: string; label: string }>;
  };
  isRequired: boolean;
};

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
    status: 'ACTIVE',
  });
  const [attributes, setAttributes] = useState<Record<string, string>>({});
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
    enabled: open && !isEdit,
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
    enabled: open && !isEdit && !!categoryId,
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
    enabled: open && !isEdit && !!subcategoryId,
  });

  const activeProductTypeId = isEdit ? refId(productData?.product.productTypeId) : productTypeId;

  const { data: typeAttributes } = useQuery({
    queryKey: ['pta', activeProductTypeId],
    queryFn: async () =>
      activeProductTypeId
        ? (await api<AttrMapping[]>(endpoints.productTypeAttributes(activeProductTypeId))).data || []
        : [],
    enabled: open && !!activeProductTypeId,
  });

  const visibleAttributes = useMemo(
    () => typeAttributes?.filter((ta) => !HIDDEN_ATTR_KEYS.has(ta.attributeId.key || '')) || [],
    [typeAttributes]
  );

  useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      setCategoryId('');
      setSubcategoryId('');
      setProductTypeId('');
      setForm({ name: '', brand: '', description: '', sku: '', status: 'ACTIVE' });
      setAttributes({});
      setImages([]);
      return;
    }
    if (!productData?.product) return;
    const p = productData.product;
    setForm({
      name: String(p.name || ''),
      brand: String(p.brand || ''),
      description: String(p.description || ''),
      sku: String(p.sku || ''),
      status: String(p.status || 'ACTIVE'),
    });
    const attrs: Record<string, string> = {};
    for (const a of p.attributes || []) {
      const id = typeof a.attributeId === 'object' ? a.attributeId._id : a.attributeId;
      attrs[String(id)] = formatAttrValue(a.value);
    }
    setAttributes(attrs);
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

      const payload = {
        name: form.name,
        brand: form.brand || undefined,
        description: form.description || undefined,
        sku: form.sku,
        status: form.status,
        attributes: attrValues,
        images: cleanedImages,
      };

      if (isEdit) {
        return api(`${endpoints.masterProducts}/${productId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
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
    form.sku.trim() &&
    (isEdit || (categoryId && subcategoryId && productTypeId));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[94vh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isEdit
              ? 'Update product details and specifications. Required fields are marked *.'
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
              if (canSubmit) saveMutation.mutate();
            }}
          >
            {isEdit ? (
              <div className="grid gap-3 rounded-lg border border-border bg-slate-50 p-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Category</p>
                  <p className="mt-1 font-medium">{refName(productData?.product.categoryId)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Subcategory</p>
                  <p className="mt-1 font-medium">{refName(productData?.product.subcategoryId)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Product Type</p>
                  <p className="mt-1 font-medium">{refName(productData?.product.productTypeId)}</p>
                </div>
              </div>
            ) : (
              <FormSection
                title="1. Catalogue placement"
                description="Pick where this product sits in the catalogue tree."
              >
                <div className="grid gap-5 sm:grid-cols-3">
                  <FormField
                    label="Category"
                    required
                    hint="Top-level group (e.g. Fresh & Daily Essentials)."
                  >
                    <Select
                      value={categoryId}
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
                      value={subcategoryId}
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
                      value={productTypeId}
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
              </FormSection>
            )}

            <FormSection
              title={isEdit ? 'Product details' : '2. Product details'}
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
                <BrandSelect
                  value={form.brand}
                  onChange={(brand) => setForm({ ...form, brand })}
                  brands={brands}
                />
                <FormField
                  label="SKU"
                  required
                  hint="Unique stock-keeping code. Must not match another product."
                >
                  <Input
                    placeholder="e.g. MP-FRESH-APPLE-001"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    required
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
                      <SelectItem value="DRAFT">Draft</SelectItem>
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
              </div>
            </FormSection>

            {activeProductTypeId && (
              <FormSection
                title={isEdit ? 'Specifications' : '3. Specifications'}
                description={
                  visibleAttributes.length
                    ? 'Values for this product type. Net Weight = how much; Sold As = Pack / Loose / Piece.'
                    : 'No extra specifications for this product type.'
                }
              >
                {visibleAttributes.length ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {visibleAttributes.map((ta) => {
                      const attr = ta.attributeId;
                      const key = attr.key || '';
                      const hint = ATTR_HINTS[key];
                      return (
                        <FormField
                          key={attr._id}
                          label={attr.name}
                          required={ta.isRequired}
                          hint={hint}
                        >
                          {attr.type === 'DROPDOWN' ? (
                            <Select
                              value={attributes[attr._id] || ''}
                              onValueChange={(v) => setAttributes({ ...attributes, [attr._id]: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${attr.name.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {attr.options?.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label || o.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : attr.type === 'BOOLEAN' ? (
                            <Select
                              value={attributes[attr._id] || ''}
                              onValueChange={(v) => setAttributes({ ...attributes, [attr._id]: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select Yes or No" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="false">No</SelectItem>
                                <SelectItem value="true">Yes</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              placeholder={ATTR_PLACEHOLDERS[key] || `Enter ${attr.name.toLowerCase()}`}
                              value={attributes[attr._id] || ''}
                              onChange={(e) => setAttributes({ ...attributes, [attr._id]: e.target.value })}
                            />
                          )}
                        </FormField>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No specification fields configured.</p>
                )}
              </FormSection>
            )}

            <FormSection
              title={isEdit ? 'Images' : '4. Images (optional)'}
              description="Add one or more photos. The primary image appears in the products list."
            >
              <ProductImagesField images={images} onChange={setImages} />
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
