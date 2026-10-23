'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
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
  categoryId?: string;
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
  quantity?: number;
  lifespanValue?: number;
  lifespanUnit?: string;
  createSellerListing?: boolean;
  addToMasterCatalogue?: boolean;
};

interface SubmissionReviewFormProps {
  submission: Record<string, unknown>;
  onSubmit: (payload: SubmissionReviewPayload) => void;
  isPending?: boolean;
  readOnly?: boolean;
}

function refName(value: unknown): string {
  if (!value) return '';
  let n = '';
  if (typeof value === 'object' && 'name' in value && (value as any).name) {
    n = String((value as any).name);
  } else if (typeof value === 'string') {
    n = value;
  }
  n = n.trim();
  if (n === 'undefined' || n === 'null' || n === '—' || n === '[object Object]') return '';
  return n;
}

function getCleanText(val: unknown): string {
  if (!val) return '';
  const s = String(val).trim();
  if (s === 'undefined' || s === 'null' || s === '—' || s === '[object Object]') return '';
  return s;
}

function refId(value: unknown): string {
  if (!value) return '';
  let id = '';
  if (typeof value === 'object' && '_id' in value) {
    id = String((value as NamedRef)._id || '');
  } else {
    id = String(value || '');
  }
  id = id.trim();
  if (id === 'undefined' || id === 'null' || id === '[object Object]') return '';
  return id;
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

  const sellerSubmittedCategory =
    getCleanText(submission.medicalCategory) ||
    getCleanText(submission.category) ||
    getCleanText(refName(submission.categoryId));

  const sellerSubmittedSubcategory =
    getCleanText(submission.medicalSubcategory) ||
    getCleanText(submission.subcategory) ||
    getCleanText(refName(submission.subcategoryId));

  const sellerSubmittedProductType =
    getCleanText(submission.productType) ||
    getCleanText(submission.dosageForm) ||
    getCleanText(refName(submission.productTypeId));

  const [categoryId, setCategoryId] = useState<string>(refId(submission.categoryId));
  const [subcategoryId, setSubcategoryId] = useState<string>(refId(submission.subcategoryId));
  const [productTypeId, setProductTypeId] = useState<string>(refId(submission.productTypeId));
  const [userChangedCategory, setUserChangedCategory] = useState(false);

  const [form, setForm] = useState({
    name: String(submission.submittedProductName || ''),
    brand: String(submission.brand || ''),
    description: String(submission.description || ''),
    sku: '',
    gtin: '',
    complianceInfo: '',
    sellingPrice: submission.sellingPricePaise != null ? String(Number(submission.sellingPricePaise) / 100) : '',
    quantity: submission.quantity != null ? String(submission.quantity) : '',
    lifespanValue: submission.lifespanValue != null ? String(submission.lifespanValue) : '',
    lifespanUnit: String(submission.lifespanUnit || 'Days'),
  });
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [productInformation, setProductInformation] = useState<ProductInformationFormState>(
    EMPTY_PRODUCT_INFORMATION,
  );
  const [images, setImages] = useState<ProductImageDraft[]>([]);
  const [createSellerListing, setCreateSellerListing] = useState(true);
  const [addToMasterCatalogue, setAddToMasterCatalogue] = useState(false);

  // Medical-specific editable fields for admin
  const [medForm, setMedForm] = useState({
    genericName: String(submission.genericName || ''),
    productType: String(submission.productType || ''),
    medicalCategory: String(submission.medicalCategory || ''),
    medicalSubcategory: String(submission.medicalSubcategory || ''),
    dosageForm: String(submission.dosageForm || ''),
    routeOfAdmin: String(submission.routeOfAdmin || ''),
    strength: String(submission.strength || ''),
    strengthUnit: String(submission.strengthUnit || 'mg'),
    packSize: String(submission.packSize || ''),
    packagingType: String(submission.packagingType || ''),
    netContent: String(submission.netContent || ''),
    releaseType: String(submission.releaseType || ''),
    productForm: String(submission.productForm || ''),
    indication: String(submission.indication || ''),
    directionsForUse: String(submission.directionsForUse || ''),
    keyBenefits: String(submission.keyBenefits || ''),
    keyIngredients: String(submission.keyIngredients || ''),
    safetyInfo: String(submission.safetyInfo || ''),
    sideEffects: String(submission.sideEffects || ''),
    allergenInfo: String(submission.allergenInfo || ''),
    storageCondition: String(submission.storageCondition || ''),
    disclaimer: String(submission.disclaimer || ''),
    sterility: String(submission.sterility || ''),
    useType: String(submission.useType || ''),
    marketerName: String(submission.marketerName || ''),
    countryOfOrigin: String(submission.countryOfOrigin || ''),
    licenceNumber: String(submission.licenceNumber || ''),
    prescriptionCategory: String(submission.prescriptionCategory || ''),
    regulatoryInfo: String(submission.regulatoryInfo || ''),
    mrpPaise: submission.mrpPaise != null ? String(Number(submission.mrpPaise) / 100) : '',
    unitOfSale: String(submission.unitOfSale || ''),
    batchNumber: String(submission.batchNumber || ''),
    mfgDate: String(submission.mfgDate || ''),
    expiryDate: String(submission.expiryDate || ''),
    rackLocation: String(submission.rackLocation || ''),
    coldChainRequired: Boolean(submission.coldChainRequired),
    prescriptionRequired: Boolean(submission.prescriptionRequired),
    additionalNotes: String(submission.additionalNotes || ''),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['product-brands'],
    queryFn: async () => (await api<string[]>(endpoints.productBrands)).data || [],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories-active'],
    queryFn: async () =>
      (await api<{ items: Array<{ _id: string; name: string; vertical?: string; code?: string }> }>(
        `${endpoints.categories}?status=ACTIVE&limit=100`
      )).data?.items || [],
    enabled: !readOnly,
  });

  const { data: subcategories, isLoading: subcategoriesLoading } = useQuery({
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

  const { data: productTypes, isLoading: productTypesLoading } = useQuery({
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

  const isMedical = Boolean(
    submission.isMedicalProduct ||
    submission.genericName ||
    submission.medicalCategory ||
    submission.medicalSubcategory
  );

  const [selectedVertical, setSelectedVertical] = useState<'KIRANA' | 'MEDICAL' | 'ALL'>('ALL');

  useEffect(() => {
    if (isMedical) {
      setSelectedVertical('MEDICAL');
    } else {
      setSelectedVertical('KIRANA');
    }
  }, [isMedical]);

  const medicalCategories = useMemo(() => {
    return categories
      .filter((c) => c.vertical === 'MEDICAL' || c.code === 'MED' || (c.name && c.name.toLowerCase().includes('prescription')))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const kiranaCategories = useMemo(() => {
    return categories
      .filter((c) => c.vertical !== 'MEDICAL' && c.code !== 'MED' && (!c.name || !c.name.toLowerCase().includes('prescription')))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const displayedCategories = useMemo(() => {
    if (selectedVertical === 'MEDICAL') return medicalCategories;
    if (selectedVertical === 'KIRANA') return kiranaCategories;
    return [...medicalCategories, ...kiranaCategories];
  }, [selectedVertical, medicalCategories, kiranaCategories]);

  const sortedSubcategories = useMemo(() => {
    if (!subcategories) return [];
    return [...subcategories].sort((a, b) => a.name.localeCompare(b.name));
  }, [subcategories]);

  const sortedProductTypes = useMemo(() => {
    if (!productTypes) return [];
    return [...productTypes].sort((a, b) => a.name.localeCompare(b.name));
  }, [productTypes]);

  useEffect(() => {
    if (!categoryId || !categories.length) return;
    const isCatMedical = medicalCategories.some((c) => c._id === categoryId);
    if (isCatMedical && selectedVertical === 'KIRANA') {
      setSelectedVertical('MEDICAL');
    } else if (!isCatMedical && selectedVertical === 'MEDICAL') {
      setSelectedVertical('KIRANA');
    }
  }, [categoryId, categories, medicalCategories, selectedVertical]);

  const medicalDetailsList: Array<[string, string]> = useMemo(() => {
    if (!isMedical) return [];
    const items: Array<[string, string | undefined]> = [
      ['Generic Name (API)', submission.genericName ? String(submission.genericName) : undefined],
      ['Product Type', submission.productType ? String(submission.productType) : undefined],
      ['Medical Category', submission.medicalCategory ? String(submission.medicalCategory) : undefined],
      ['Medical Subcategory', submission.medicalSubcategory ? String(submission.medicalSubcategory) : undefined],
      ['Dosage Form', submission.dosageForm ? String(submission.dosageForm) : undefined],
      ['Route of Administration', submission.routeOfAdmin ? String(submission.routeOfAdmin) : undefined],
      ['Strength', submission.strength ? `${submission.strength} ${submission.strengthUnit || ''}`.trim() : undefined],
      ['Pack Size & Packaging', [submission.packSize, submission.packagingType].filter(Boolean).join(' ') || undefined],
      ['Net Content (Vol / Wt)', submission.netContent ? String(submission.netContent) : undefined],
      ['Release Type', submission.releaseType ? String(submission.releaseType) : undefined],
      ['Product Form', submission.productForm ? String(submission.productForm) : undefined],
      [
        'Doctor Prescription Required',
        submission.prescriptionRequired != null
          ? submission.prescriptionRequired
            ? '⚠️ Yes (Doctor Prescription Required / Rx)'
            : 'No (Over-The-Counter / OTC)'
          : undefined,
      ],
      ['Prescription Category', submission.prescriptionCategory ? String(submission.prescriptionCategory) : undefined],
      ['Drug Licence Number', submission.licenceNumber ? String(submission.licenceNumber) : undefined],
      ['Regulatory Info', submission.regulatoryInfo ? String(submission.regulatoryInfo) : undefined],
      ['Therapeutic Indication / Use', submission.indication ? String(submission.indication) : undefined],
      ['Key Active Ingredients', submission.keyIngredients ? String(submission.keyIngredients) : undefined],
      ['Directions for Use', submission.directionsForUse ? String(submission.directionsForUse) : undefined],
      ['Key Benefits', submission.keyBenefits ? String(submission.keyBenefits) : undefined],
      ['Safety Info & Warnings', submission.safetyInfo ? String(submission.safetyInfo) : undefined],
      ['Side Effects', submission.sideEffects ? String(submission.sideEffects) : undefined],
      ['Allergen Information', submission.allergenInfo ? String(submission.allergenInfo) : undefined],
      ['Storage Condition', submission.storageCondition ? String(submission.storageCondition) : undefined],
      ['Cold Chain Required', submission.coldChainRequired ? '❄️ Yes (2°C - 8°C Cold Chain Required)' : 'No (Ambient)'],
      ['MRP (Maximum Retail Price)', submission.mrpPaise != null ? formatPaise(Number(submission.mrpPaise)) : undefined],
      ['Unit of Sale', submission.unitOfSale ? String(submission.unitOfSale) : undefined],
      ['Batch Number', submission.batchNumber ? String(submission.batchNumber) : undefined],
      ['Manufacturing Date', submission.mfgDate ? String(submission.mfgDate) : undefined],
      ['Expiry Date', submission.expiryDate ? String(submission.expiryDate) : undefined],
      ['Shelf / Rack Location', submission.rackLocation ? String(submission.rackLocation) : undefined],
      ['Marketer / Importer', submission.marketerName ? String(submission.marketerName) : undefined],
      ['Country of Origin', submission.countryOfOrigin ? String(submission.countryOfOrigin) : undefined],
      ['Sterility Status', submission.sterility ? String(submission.sterility) : undefined],
      ['Use Type', submission.useType ? String(submission.useType) : undefined],
      ['Disclaimer', submission.disclaimer ? String(submission.disclaimer) : undefined],
      ['Additional Notes', submission.additionalNotes ? String(submission.additionalNotes) : undefined],
    ];
    return items.filter((item): item is [string, string] => Boolean(item[1]));
  }, [submission, isMedical]);

  const requestedAttributesList: Array<[string, string]> = useMemo(() => {
    if (!Array.isArray(submission.requestedAttributes) || submission.requestedAttributes.length === 0) {
      return [];
    }
    return (submission.requestedAttributes as Array<{
      attributeId: { _id?: string; name?: string; unit?: string } | string;
      value: unknown;
    }>).map((a) => {
      const name =
        typeof a.attributeId === 'object' && a.attributeId?.name
          ? a.attributeId.name
          : 'Specification';
      const valStr = Array.isArray(a.value) ? a.value.join(', ') : String(a.value ?? '');
      return [name, valStr];
    });
  }, [submission.requestedAttributes]);

  useEffect(() => {
    const photoUrl = submission.photoUrl ? String(submission.photoUrl) : '';
    const extraImages = Array.isArray(submission.images)
      ? submission.images.map(String).filter(Boolean)
      : [];
    const urls = [photoUrl, ...extraImages].filter(Boolean);
    setImages(urls.map((url, i) => ({ imageUrl: url, isPrimary: i === 0 })));
    setProductInformation((prev) => ({
      ...prev,
      manufacturer: String(submission.manufacturerName || prev.manufacturer || ''),
      manufacturerAddress: String(submission.manufacturerAddress || prev.manufacturerAddress || ''),
      ingredients: String(submission.keyIngredients || submission.genericName || prev.ingredients || ''),
      storageInformation: String(submission.storageCondition || prev.storageInformation || ''),
      usageInstructions: String(submission.directionsForUse || prev.usageInstructions || ''),
      healthBenefits: String(submission.keyBenefits || prev.healthBenefits || ''),
      allergens: String(submission.allergenInfo || prev.allergens || ''),
    }));

    setForm((prev) => ({
      ...prev,
      name: String(submission.submittedProductName || prev.name || ''),
      brand: String(submission.brand || prev.brand || ''),
      description: String(submission.description || prev.description || ''),
      sellingPrice:
        submission.sellingPricePaise != null
          ? String(Number(submission.sellingPricePaise) / 100)
          : prev.sellingPrice,
      quantity: submission.quantity != null ? String(submission.quantity) : prev.quantity,
      lifespanValue:
        submission.lifespanValue != null ? String(submission.lifespanValue) : prev.lifespanValue,
      lifespanUnit: String(submission.lifespanUnit || prev.lifespanUnit || 'Days'),
    }));

    // Re-sync medical form when submission changes
    setMedForm({
      genericName: String(submission.genericName || ''),
      productType: String(submission.productType || ''),
      medicalCategory: String(submission.medicalCategory || ''),
      medicalSubcategory: String(submission.medicalSubcategory || ''),
      dosageForm: String(submission.dosageForm || ''),
      routeOfAdmin: String(submission.routeOfAdmin || ''),
      strength: String(submission.strength || ''),
      strengthUnit: String(submission.strengthUnit || 'mg'),
      packSize: String(submission.packSize || ''),
      packagingType: String(submission.packagingType || ''),
      netContent: String(submission.netContent || ''),
      releaseType: String(submission.releaseType || ''),
      productForm: String(submission.productForm || ''),
      indication: String(submission.indication || ''),
      directionsForUse: String(submission.directionsForUse || ''),
      keyBenefits: String(submission.keyBenefits || ''),
      keyIngredients: String(submission.keyIngredients || ''),
      safetyInfo: String(submission.safetyInfo || ''),
      sideEffects: String(submission.sideEffects || ''),
      allergenInfo: String(submission.allergenInfo || ''),
      storageCondition: String(submission.storageCondition || ''),
      disclaimer: String(submission.disclaimer || ''),
      sterility: String(submission.sterility || ''),
      useType: String(submission.useType || ''),
      marketerName: String(submission.marketerName || ''),
      countryOfOrigin: String(submission.countryOfOrigin || ''),
      licenceNumber: String(submission.licenceNumber || ''),
      prescriptionCategory: String(submission.prescriptionCategory || ''),
      regulatoryInfo: String(submission.regulatoryInfo || ''),
      mrpPaise: submission.mrpPaise != null ? String(Number(submission.mrpPaise) / 100) : '',
      unitOfSale: String(submission.unitOfSale || ''),
      batchNumber: String(submission.batchNumber || ''),
      mfgDate: String(submission.mfgDate || ''),
      expiryDate: String(submission.expiryDate || ''),
      rackLocation: String(submission.rackLocation || ''),
      coldChainRequired: Boolean(submission.coldChainRequired),
      prescriptionRequired: Boolean(submission.prescriptionRequired),
      additionalNotes: String(submission.additionalNotes || ''),
    });

    if (submission.categoryId) setCategoryId(refId(submission.categoryId));
    if (submission.subcategoryId) setSubcategoryId(refId(submission.subcategoryId));
    if (submission.productTypeId) setProductTypeId(refId(submission.productTypeId));

    if (Array.isArray(submission.requestedAttributes) && submission.requestedAttributes.length > 0) {
      setAttributes((prev) => {
        const next = { ...prev };
        (submission.requestedAttributes as Array<{
          attributeId: { _id?: string } | string;
          value: unknown;
        }>).forEach((attr) => {
          const attrId =
            typeof attr.attributeId === 'object' && attr.attributeId?._id
              ? String(attr.attributeId._id)
              : String(attr.attributeId || '');
          if (attrId && attr.value !== undefined && attr.value !== null) {
            next[attrId] = String(attr.value);
          }
        });
        return next;
      });
    }
  }, [submission]);

  // Auto-match category when categories query finishes if not manually selected by admin
  useEffect(() => {
    if (!categories || categories.length === 0 || userChangedCategory) return;

    // Check if seller requested a specific category (e.g. "Prescription Medicines")
    const requestedCat = (sellerSubmittedCategory || '').trim().toLowerCase();
    if (requestedCat) {
      const directMatch = categories.find((c) => c.name.toLowerCase().trim() === requestedCat);
      if (directMatch) {
        if (categoryId !== directMatch._id) {
          setCategoryId(directMatch._id);
        }
        return;
      }
      const partialMatch = categories.find(
        (c) => c.name.toLowerCase().includes(requestedCat) || requestedCat.includes(c.name.toLowerCase())
      );
      if (partialMatch) {
        if (categoryId !== partialMatch._id) {
          setCategoryId(partialMatch._id);
        }
        return;
      }
    }

    // If current categoryId is valid in categories, keep it
    if (categoryId && categories.some((c) => c._id === categoryId)) {
      return;
    }

    const refCatId = refId(submission.categoryId);
    if (refCatId && categories.some((c) => c._id === refCatId)) {
      setCategoryId(refCatId);
      return;
    }

    // If medical product, prioritize medical categories
    if (isMedical) {
      const medCat = categories.find((c) => c.vertical === 'MEDICAL' || c.code === 'MED' || c.name.toLowerCase().includes('prescription'));
      if (medCat) {
        setCategoryId(medCat._id);
        return;
      }
    }

    if (categories[0]?._id && !categoryId) {
      setCategoryId(categories[0]._id);
    }
  }, [categories, categoryId, sellerSubmittedCategory, userChangedCategory, submission.categoryId, isMedical]);

  // Auto-match subcategory when subcategories query finishes if not already selected
  useEffect(() => {
    if (!subcategories || subcategories.length === 0) return;

    if (subcategoryId && subcategories.some((s) => s._id === subcategoryId)) {
      return;
    }

    const rawSubcat = (sellerSubmittedSubcategory || '').trim().toLowerCase();
    if (rawSubcat) {
      const directMatch = subcategories.find((s) => s.name.toLowerCase().trim() === rawSubcat);
      if (directMatch) {
        setSubcategoryId(directMatch._id);
        return;
      }
      const partialMatch = subcategories.find(
        (s) => s.name.toLowerCase().includes(rawSubcat) || rawSubcat.includes(s.name.toLowerCase())
      );
      if (partialMatch) {
        setSubcategoryId(partialMatch._id);
        return;
      }
    }

    const refSubcatId = refId(submission.subcategoryId);
    if (refSubcatId && subcategories.some((s) => s._id === refSubcatId)) {
      setSubcategoryId(refSubcatId);
      return;
    }

    if (subcategories[0]?._id) {
      setSubcategoryId(subcategories[0]._id);
    }
  }, [subcategories, subcategoryId, sellerSubmittedSubcategory, submission.subcategoryId]);

  // Auto-match product type when productTypes query finishes if not already selected
  useEffect(() => {
    if (!productTypes || productTypes.length === 0) return;

    if (productTypeId && productTypes.some((pt) => pt._id === productTypeId)) {
      return;
    }

    const rawPt = (sellerSubmittedProductType || '').trim().toLowerCase();

    // 1. Try matching productType (e.g. "Medicine", "OTC medicine", "Medical device")
    if (rawPt) {
      const directMatch = productTypes.find((pt) => pt.name.toLowerCase().trim() === rawPt);
      if (directMatch) {
        setProductTypeId(directMatch._id);
        return;
      }
    }

    // 2. Partial match on productType
    if (rawPt) {
      const partialMatch = productTypes.find(
        (pt) => pt.name.toLowerCase().includes(rawPt) || rawPt.includes(pt.name.toLowerCase())
      );
      if (partialMatch) {
        setProductTypeId(partialMatch._id);
        return;
      }
    }

    const refPtId = refId(submission.productTypeId);
    if (refPtId && productTypes.some((pt) => pt._id === refPtId)) {
      setProductTypeId(refPtId);
      return;
    }

    if (productTypes[0]?._id) {
      setProductTypeId(productTypes[0]._id);
    }
  }, [productTypes, productTypeId, sellerSubmittedProductType, submission.productTypeId, submission.dosageForm]);

  const missingRequiredAttrs = useMemo(() => {
    if (approvalMode !== 'create' || !productTypeId) return [];
    return getMissingRequiredAttributeNames(visibleAttributes, attributes);
  }, [approvalMode, productTypeId, visibleAttributes, attributes]);

  const canApproveCreate =
    approvalMode === 'create' &&
    form.name.trim() &&
    categoryId &&
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
    const qtyNum = form.quantity.trim() ? Number(form.quantity.trim()) : undefined;
    const lvNum = form.lifespanValue.trim() ? Number(form.lifespanValue.trim()) : undefined;

    if (action === 'APPROVE' && approvalMode === 'map') {
      return {
        action,
        adminComment: comment || undefined,
        masterProductId,
        sellingPricePaise,
        quantity: qtyNum != null && !Number.isNaN(qtyNum) ? qtyNum : undefined,
        createSellerListing,
        addToMasterCatalogue: true,
      };
    }

    // For medical products, merge medical form fields into productInformation
    const baseProductInfo = productInformationToPayload(productInformation);
    const mergedProductInfo = isMedical
      ? {
          ...baseProductInfo,
          genericName: medForm.genericName || baseProductInfo.genericName,
          dosageForm: medForm.dosageForm || baseProductInfo.dosageForm,
          routeOfAdmin: medForm.routeOfAdmin || baseProductInfo.routeOfAdmin,
          strength: medForm.strength
            ? `${medForm.strength}${medForm.strengthUnit ? ` ${medForm.strengthUnit}` : ''}`.trim()
            : baseProductInfo.strength,
          prescriptionCategory: medForm.prescriptionCategory || baseProductInfo.prescriptionCategory,
          indication: medForm.indication || baseProductInfo.indication,
          sideEffects: medForm.sideEffects || baseProductInfo.sideEffects,
          coldChainRequired: medForm.coldChainRequired,
          prescriptionRequired: medForm.prescriptionRequired,
          ingredients: medForm.keyIngredients || baseProductInfo.ingredients || '',
          storageInformation: medForm.storageCondition || baseProductInfo.storageInformation || '',
          usageInstructions: medForm.directionsForUse || baseProductInfo.usageInstructions || '',
          healthBenefits: medForm.keyBenefits || baseProductInfo.healthBenefits || '',
          allergens: medForm.allergenInfo || baseProductInfo.allergens || '',
          marketerName: medForm.marketerName || undefined,
          countryOfOrigin: medForm.countryOfOrigin || undefined,
          disclaimer: medForm.disclaimer || undefined,
          sterility: medForm.sterility || undefined,
          useType: medForm.useType || undefined,
          licenceNumber: medForm.licenceNumber || undefined,
          regulatoryInfo: medForm.regulatoryInfo || undefined,
          safetyInfo: medForm.safetyInfo || undefined,
          manufacturer: productInformation.manufacturer || '',
          manufacturerAddress: productInformation.manufacturerAddress || '',
        }
      : baseProductInfo;

    return {
      action,
      adminComment: comment || undefined,
      categoryId,
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
      productInformation: mergedProductInfo,
      sellingPricePaise,
      quantity: qtyNum != null && !Number.isNaN(qtyNum) ? qtyNum : undefined,
      lifespanValue: lvNum != null && !Number.isNaN(lvNum) ? lvNum : undefined,
      lifespanUnit: form.lifespanUnit || (lvNum ? 'Days' : undefined),
      createSellerListing,
      addToMasterCatalogue,
    };
  }

  function handleApprove() {
    if (approvalMode === 'create' && !canApproveCreate) {
      if (missingRequiredAttrs.length) {
        toast.error(`Fill required attributes: ${missingRequiredAttrs.join(', ')}`);
      } else if (!categoryId) {
        toast.error('Select a category before approving');
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

  const seller = submission.sellerId as { _id?: string; fullName?: string; shopName?: string } | undefined;
  const storeName = seller?.shopName || seller?.fullName || 'Store';
  const mappedProduct = submission.mappedMasterProductId as { _id?: string; name?: string; status?: string } | undefined;
  const isMasterCatalogueMapped = mappedProduct?.status === 'ACTIVE';

  const submissionPhotos = useMemo(() => {
    const rawList = [
      submission.frontImageUrl,
      submission.photoUrl,
      ...(Array.isArray(submission.images) ? submission.images : []),
      submission.ingredientsImageUrl,
    ]
      .filter(Boolean)
      .map(String);
    return Array.from(new Set(rawList));
  }, [submission.frontImageUrl, submission.photoUrl, submission.images, submission.ingredientsImageUrl]);

  if (readOnly) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-blue-950 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Request Type: {isMasterCatalogueMapped ? 'Master Catalogue Product' : 'Store-Specific Custom Product'}
              </p>
              <h2 className="mt-0.5 text-base font-bold">
                This product was requested by <span className="text-blue-900 underline underline-offset-2">{storeName}</span>
              </h2>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                isMasterCatalogueMapped ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
              }`}
            >
              {isMasterCatalogueMapped ? 'Mapped to Master Catalogue' : 'Store-Specific Only'}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <InfoCard
            title="Seller Submission"
            items={[
              ['Requested By Store', storeName],
              ['Request Type', isMasterCatalogueMapped ? 'Master Catalogue Product' : 'Store-Specific Custom Product'],
              ['Product Name', submission.submittedProductName],
              ['Category', sellerSubmittedCategory || '—'],
              ['Subcategory', sellerSubmittedSubcategory || '—'],
              ['Product Type', sellerSubmittedProductType || '—'],
              ['Brand', submission.brand],
              ['Manufacturer Company', submission.manufacturerName],
              ['Manufacturer Address', submission.manufacturerAddress],
              ['Pack / Sold As', submission.packOrSoldAs],
              ['Selling Price', formatPaise(submission.sellingPricePaise as number | undefined)],
              ['Requested Stock', submission.quantity != null ? String(submission.quantity) : '—'],
              ['Requested Lifespan', submission.lifespanValue != null ? `${submission.lifespanValue} ${submission.lifespanUnit || 'Days'}` : '—'],
              ['Description', submission.description],
            ]}
          />
          <InfoCard
            title="Review Outcome"
            items={[
              ['Status', submission.status],
              ['Admin Comment', submission.adminComment],
              ['Master Product', mappedProduct?.name || '—'],
              [
                'Master Catalogue Status',
                mappedProduct?.status === 'ACTIVE'
                  ? 'In Master Catalogue (Public)'
                  : mappedProduct
                    ? 'Seller-Specific Only (Private)'
                    : 'Not Created',
              ],
            ]}
          />
        </div>
        {medicalDetailsList.length > 0 ? (
          <div className="space-y-3">
            <InfoCard
              title="Medical & Pharmaceutical Specifications (Excel Pharmacy Taxonomy)"
              items={medicalDetailsList}
            />
            {submission.coldChainRequired ? (
              <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-900 font-medium">
                <span className="text-base">❄️</span>
                <span>Cold-Chain Product: This medical product requires strict temperature-controlled storage (2°C to 8°C).</span>
              </div>
            ) : null}
            {submission.prescriptionRequired ? (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-900 font-medium">
                <span className="text-base">⚠️</span>
                <span>Doctor Prescription Required: Customers must upload and verify a valid doctor's prescription before purchasing.</span>
              </div>
            ) : null}
            {submission.prescriptionDocUrl ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs">
                <span className="font-semibold text-slate-700">Prescription / Verification Document</span>
                <a
                  href={String(submission.prescriptionDocUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  View Attached Document
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
        {requestedAttributesList.length > 0 ? (
          <InfoCard
            title="Seller Submitted Specifications (Net, Units & Details)"
            items={requestedAttributesList}
          />
        ) : null}
        {submissionPhotos.length > 0 ? (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Submitted Product Photos ({submissionPhotos.length})
            </h4>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {submissionPhotos.map((url, idx) => (
                <Card key={idx} className="overflow-hidden shadow-sm">
                  <CardHeader className="p-2 pb-1">
                    <CardTitle className="text-xs text-slate-600 font-medium truncate">
                      {idx === 0 ? 'Primary / Front' : `Image ${idx + 1}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 pt-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Product Photo ${idx + 1}`}
                      className="h-36 w-full rounded-md border object-cover"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-blue-950 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Request Type: {isMasterCatalogueMapped ? 'Master Catalogue Product' : 'Store-Specific Custom Product'}
            </p>
            <h2 className="mt-0.5 text-base font-bold">
              This product was requested by <span className="text-blue-900 underline underline-offset-2">{storeName}</span>
            </h2>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              isMasterCatalogueMapped ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
            }`}
          >
            {isMasterCatalogueMapped ? 'Mapped to Master Catalogue' : 'Store-Specific Only'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard
          title="What the seller submitted"
          items={[
            ['Requested By Store', storeName],
            ['Request Type', isMasterCatalogueMapped ? 'Master Catalogue Product' : 'Store-Specific Custom Product'],
            ['Seller Account', seller?.fullName || storeName],
            ['Product Name', submission.submittedProductName],
            ['Category', sellerSubmittedCategory || '—'],
            ['Subcategory', sellerSubmittedSubcategory || '—'],
            ['Product Type', sellerSubmittedProductType || '—'],
            ['Brand', submission.brand || '—'],
            ['Manufacturer Company', submission.manufacturerName || '—'],
            ['Manufacturer Address', submission.manufacturerAddress || '—'],
            ['Pack / Sold As', submission.packOrSoldAs || '—'],
            ['Selling Price', formatPaise(submission.sellingPricePaise as number | undefined)],
            ['Requested Stock', submission.quantity != null ? String(submission.quantity) : '—'],
            ['Requested Lifespan', submission.lifespanValue != null ? `${submission.lifespanValue} ${submission.lifespanUnit || 'Days'}` : '—'],
            ['Description', submission.description || '—'],
          ]}
        />
        {medicalDetailsList.length > 0 ? (
          <div className="space-y-4">
            <InfoCard
              title="Medical & Pharmaceutical Specifications (Excel Pharmacy Taxonomy)"
              items={medicalDetailsList}
            />
            {submission.coldChainRequired ? (
              <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-900 font-medium">
                <span className="text-base">❄️</span>
                <span>Cold-Chain Product: This medical product requires strict temperature-controlled storage (2°C to 8°C).</span>
              </div>
            ) : null}
            {submission.prescriptionRequired ? (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-900 font-medium">
                <span className="text-base">⚠️</span>
                <span>Doctor Prescription Required: Customers must upload and verify a valid doctor's prescription before purchasing.</span>
              </div>
            ) : null}
            {submission.prescriptionDocUrl ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs">
                <span className="font-semibold text-slate-700">Prescription / Verification Document</span>
                <a
                  href={String(submission.prescriptionDocUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  View Attached Document
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
        {requestedAttributesList.length > 0 ? (
          <InfoCard
            title="Submitted Specifications (Net, Units & Details)"
            items={requestedAttributesList}
          />
        ) : null}
      </div>

      {submissionPhotos.length > 0 ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Submitted Product Photos ({submissionPhotos.length})
          </h4>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {submissionPhotos.map((url, idx) => (
              <Card key={idx} className="overflow-hidden shadow-sm">
                <CardHeader className="p-2 pb-1">
                  <CardTitle className="text-xs text-slate-600 font-medium truncate">
                    {idx === 0 ? 'Primary / Front' : `Image ${idx + 1}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Product Photo ${idx + 1}`}
                    className="h-36 w-full rounded-md border object-cover"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

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
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Mapping to an existing Master Product will not modify its name, brand, attributes,
            Product Information, or images. Only the seller listing and price information will be
            applied.
          </div>
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
            <FormField label="Initial Shop Stock" hint="Starting inventory count for this seller.">
              <Input
                type="number"
                min="0"
                placeholder="e.g. 20"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </FormField>
          </div>
        </FormSection>
      ) : (
        <>
          {/* ── STEP 1: CATALOGUE PLACEMENT — always first for both medical & kirana ── */}
          <FormSection
            title="1. Catalogue Placement"
            description="Assign the correct category, subcategory and product type. Use the vertical filter to show medical or kirana categories."
          >
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Seller Submitted:</span>
              <span className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-800">
                Category: {sellerSubmittedCategory || '—'}
              </span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
                Subcategory: {sellerSubmittedSubcategory || '—'}
              </span>
              <span className="rounded bg-purple-100 px-2 py-0.5 font-medium text-purple-800">
                Product Type: {sellerSubmittedProductType || '—'}
              </span>
              {submission.dosageForm ? (
                <span className="rounded bg-indigo-100 px-2 py-0.5 font-medium text-indigo-800">
                  Dosage Form: {String(submission.dosageForm)}
                </span>
              ) : null}
            </div>

            <div className="mb-4 flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catalogue Vertical:</span>
              <div className="inline-flex rounded-lg border border-input p-0.5 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setSelectedVertical('MEDICAL')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all",
                    selectedVertical === 'MEDICAL' ? "bg-blue-100 text-blue-900 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  💊 Medical &amp; Pharmacy ({medicalCategories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVertical('KIRANA')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all",
                    selectedVertical === 'KIRANA' ? "bg-amber-100 text-amber-900 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  🛒 Kirana &amp; Grocery ({kiranaCategories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVertical('ALL')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all",
                    selectedVertical === 'ALL' ? "bg-slate-200 text-slate-900 shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  🌐 All Categories ({categories.length})
                </button>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <FormField
                label="Category"
                required
                hint={
                  sellerSubmittedCategory
                    ? `Seller uploaded: "${sellerSubmittedCategory}"`
                    : 'Choose the primary category.'
                }
              >
                <Select
                  value={categoryId || undefined}
                  onValueChange={(v) => {
                    setUserChangedCategory(true);
                    setCategoryId(v);
                    setSubcategoryId('');
                    setProductTypeId('');
                    setAttributes({});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={categoriesLoading ? 'Loading categories...' : 'Select category'} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedVertical === 'ALL' ? (
                      <>
                        {medicalCategories.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                              💊 Medical &amp; Pharmacy Categories ({medicalCategories.length})
                            </SelectLabel>
                            {medicalCategories.map((c) => (
                              <SelectItem key={c._id} value={c._id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                        {kiranaCategories.length > 0 && (
                          <>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                                🛒 Kirana &amp; Grocery Categories ({kiranaCategories.length})
                              </SelectLabel>
                              {kiranaCategories.map((c) => (
                                <SelectItem key={c._id} value={c._id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </>
                        )}
                      </>
                    ) : (
                      displayedCategories.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label="Subcategory"
                required
                hint={
                  sellerSubmittedSubcategory
                    ? `Seller uploaded: "${sellerSubmittedSubcategory}"`
                    : 'Choose the correct subcategory.'
                }
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
                    <SelectValue
                      placeholder={
                        !categoryId
                          ? 'Select category first'
                          : subcategoriesLoading
                          ? 'Loading subcategories...'
                          : 'Select subcategory'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedSubcategories.map((s) => (
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
                hint={
                  sellerSubmittedProductType
                    ? `Seller uploaded: "${sellerSubmittedProductType}"`
                    : 'Determines which attributes are required.'
                }
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
                    <SelectValue
                      placeholder={
                        !subcategoryId
                          ? 'Select subcategory first'
                          : productTypesLoading
                          ? 'Loading product types...'
                          : 'Select product type'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedProductTypes.map((pt) => (
                      <SelectItem key={pt._id} value={pt._id}>
                        {pt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </FormSection>

          {/* ── STEP 2: MEDICAL & PHARMACEUTICAL DETAILS (medical products only) ── */}
          {isMedical ? (
            <FormSection
              title="💊 2. Medical & Pharmaceutical Details"
              description="Review and correct all medical-specific fields before approving. These are editable by the admin."
            >
                {/* Seller-reported medical category/subcategory/type as read-only context — not editable here, use Catalogue Placement above */}
                {(medForm.medicalCategory || medForm.medicalSubcategory || medForm.productType) ? (
                  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
                    <span className="font-semibold">Seller reported:</span>
                    {medForm.medicalCategory ? (
                      <span className="rounded bg-blue-100 px-2 py-0.5 font-medium">{medForm.medicalCategory}</span>
                    ) : null}
                    {medForm.medicalSubcategory ? (
                      <span className="rounded bg-indigo-100 px-2 py-0.5 font-medium text-indigo-800">{medForm.medicalSubcategory}</span>
                    ) : null}
                    {medForm.productType ? (
                      <span className="rounded bg-purple-100 px-2 py-0.5 font-medium text-purple-800">{medForm.productType}</span>
                    ) : null}
                  </div>
                ) : null}
                {/* Rx / OTC toggles */}
                <div className="mb-5 flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-rose-400 text-rose-600"
                      checked={medForm.prescriptionRequired}
                      onChange={(e) => setMedForm({ ...medForm, prescriptionRequired: e.target.checked })}
                    />
                    <div>
                      <p className="text-sm font-semibold text-rose-900">⚠️ Prescription Required (Rx)</p>
                      <p className="text-xs text-rose-700">Customer must upload a valid doctor&apos;s prescription.</p>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-sky-400 text-sky-600"
                      checked={medForm.coldChainRequired}
                      onChange={(e) => setMedForm({ ...medForm, coldChainRequired: e.target.checked })}
                    />
                    <div>
                      <p className="text-sm font-semibold text-sky-900">❄️ Cold Chain Required</p>
                      <p className="text-xs text-sky-700">Requires temperature-controlled storage (2°C – 8°C).</p>
                    </div>
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Generic Name / Active Ingredient" required hint="Scientific or active pharmaceutical ingredient (e.g. Paracetamol, Amoxicillin).">
                    <Input
                      placeholder="e.g. Paracetamol"
                      value={medForm.genericName}
                      onChange={(e) => setMedForm({ ...medForm, genericName: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Dosage Form" required hint="Physical form (e.g. Tablet, Capsule, Syrup, Ointment, Injection).">
                    <Input
                      placeholder="e.g. Tablet"
                      value={medForm.dosageForm}
                      onChange={(e) => setMedForm({ ...medForm, dosageForm: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Route of Administration" hint="e.g. Oral, Topical, Intravenous, Inhalation.">
                    <Input
                      placeholder="e.g. Oral"
                      value={medForm.routeOfAdmin}
                      onChange={(e) => setMedForm({ ...medForm, routeOfAdmin: e.target.value })}
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="Strength" hint="Numeric value only.">
                      <Input
                        placeholder="e.g. 500"
                        value={medForm.strength}
                        onChange={(e) => setMedForm({ ...medForm, strength: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Strength Unit">
                      <Select
                        value={medForm.strengthUnit}
                        onValueChange={(v) => setMedForm({ ...medForm, strengthUnit: v })}
                      >
                        <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
                        <SelectContent>
                          {['mg', 'g', 'mcg', 'IU', 'mEq', 'mmol', 'ml', '%', 'other'].map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  <FormField label="Pack Size" hint="e.g. 10 Tablets per strip, 30 ml.">
                    <Input
                      placeholder="e.g. 10 Tablets"
                      value={medForm.packSize}
                      onChange={(e) => setMedForm({ ...medForm, packSize: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Packaging Type" hint="e.g. Strip, Bottle, Tube, Vial, Sachet.">
                    <Input
                      placeholder="e.g. Strip"
                      value={medForm.packagingType}
                      onChange={(e) => setMedForm({ ...medForm, packagingType: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Net Content (Vol / Wt)" hint="e.g. 100 ml, 200 g.">
                    <Input
                      placeholder="e.g. 100 ml"
                      value={medForm.netContent}
                      onChange={(e) => setMedForm({ ...medForm, netContent: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Release Type" hint="e.g. Immediate Release, Extended Release, Sustained Release.">
                    <Input
                      placeholder="e.g. Immediate Release"
                      value={medForm.releaseType}
                      onChange={(e) => setMedForm({ ...medForm, releaseType: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Product Form" hint="e.g. Film-Coated Tablet, Hard Gelatin Capsule.">
                    <Input
                      placeholder="e.g. Film-Coated Tablet"
                      value={medForm.productForm}
                      onChange={(e) => setMedForm({ ...medForm, productForm: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Prescription Category" hint="Schedule H, Schedule H1, Schedule X, OTC, etc.">
                    <Input
                      placeholder="e.g. Schedule H"
                      value={medForm.prescriptionCategory}
                      onChange={(e) => setMedForm({ ...medForm, prescriptionCategory: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Drug Licence Number" hint="Manufacturing or import licence number.">
                    <Input
                      placeholder="e.g. MFG/L/2024/123456"
                      value={medForm.licenceNumber}
                      onChange={(e) => setMedForm({ ...medForm, licenceNumber: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Marketer / Importer Name">
                    <Input
                      placeholder="e.g. Sun Pharmaceutical Industries Ltd."
                      value={medForm.marketerName}
                      onChange={(e) => setMedForm({ ...medForm, marketerName: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Country of Origin">
                    <Input
                      placeholder="e.g. India"
                      value={medForm.countryOfOrigin}
                      onChange={(e) => setMedForm({ ...medForm, countryOfOrigin: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Sterility Status" hint="e.g. Sterile, Non-Sterile.">
                    <Input
                      placeholder="e.g. Sterile"
                      value={medForm.sterility}
                      onChange={(e) => setMedForm({ ...medForm, sterility: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Use Type" hint="e.g. Single Use, Multi-Use, Disposable.">
                    <Input
                      placeholder="e.g. Single Use"
                      value={medForm.useType}
                      onChange={(e) => setMedForm({ ...medForm, useType: e.target.value })}
                    />
                  </FormField>

                  <FormField label="MRP (₹)" hint="Maximum retail price for medical product.">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 99.50"
                      value={medForm.mrpPaise}
                      onChange={(e) => setMedForm({ ...medForm, mrpPaise: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Unit of Sale" hint="e.g. Strip, Tablet, Bottle, Box.">
                    <Input
                      placeholder="e.g. Strip"
                      value={medForm.unitOfSale}
                      onChange={(e) => setMedForm({ ...medForm, unitOfSale: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Batch Number">
                    <Input
                      placeholder="e.g. BATCH2024001"
                      value={medForm.batchNumber}
                      onChange={(e) => setMedForm({ ...medForm, batchNumber: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Manufacturing Date" hint="Format: MM/YYYY or DD/MM/YYYY.">
                    <Input
                      placeholder="e.g. 01/2024"
                      value={medForm.mfgDate}
                      onChange={(e) => setMedForm({ ...medForm, mfgDate: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Expiry Date" hint="Format: MM/YYYY or DD/MM/YYYY.">
                    <Input
                      placeholder="e.g. 12/2026"
                      value={medForm.expiryDate}
                      onChange={(e) => setMedForm({ ...medForm, expiryDate: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Shelf / Rack Location" hint="Internal pharmacy rack location.">
                    <Input
                      placeholder="e.g. A-12"
                      value={medForm.rackLocation}
                      onChange={(e) => setMedForm({ ...medForm, rackLocation: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Therapeutic Indication / Use" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      placeholder="e.g. Used for relief of mild to moderate pain and fever."
                      value={medForm.indication}
                      onChange={(e) => setMedForm({ ...medForm, indication: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Key Active Ingredients" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      placeholder="e.g. Paracetamol 500mg, Caffeine 65mg"
                      value={medForm.keyIngredients}
                      onChange={(e) => setMedForm({ ...medForm, keyIngredients: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Directions for Use" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      placeholder="e.g. Take 1-2 tablets every 4-6 hours as needed."
                      value={medForm.directionsForUse}
                      onChange={(e) => setMedForm({ ...medForm, directionsForUse: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Key Benefits" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      placeholder="e.g. Provides fast and effective relief from pain and fever."
                      value={medForm.keyBenefits}
                      onChange={(e) => setMedForm({ ...medForm, keyBenefits: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Side Effects" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      placeholder="e.g. Nausea, stomach upset, allergic reactions in rare cases."
                      value={medForm.sideEffects}
                      onChange={(e) => setMedForm({ ...medForm, sideEffects: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Safety Info & Warnings" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      placeholder="e.g. Keep out of reach of children. Do not exceed recommended dose."
                      value={medForm.safetyInfo}
                      onChange={(e) => setMedForm({ ...medForm, safetyInfo: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Allergen Information" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      placeholder="e.g. Contains lactose. Not suitable for lactose intolerant patients."
                      value={medForm.allergenInfo}
                      onChange={(e) => setMedForm({ ...medForm, allergenInfo: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Storage Conditions" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      placeholder="e.g. Store in a cool, dry place below 25°C. Protect from light."
                      value={medForm.storageCondition}
                      onChange={(e) => setMedForm({ ...medForm, storageCondition: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Disclaimer" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      placeholder="e.g. For the use of a Registered Medical Practitioner only."
                      value={medForm.disclaimer}
                      onChange={(e) => setMedForm({ ...medForm, disclaimer: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Regulatory Info" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      placeholder="e.g. Compliant with Schedule M GMP standards."
                      value={medForm.regulatoryInfo}
                      onChange={(e) => setMedForm({ ...medForm, regulatoryInfo: e.target.value })}
                    />
                  </FormField>

                  <FormField label="Additional Notes" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      placeholder="Any additional admin notes about this medical product."
                      value={medForm.additionalNotes}
                      onChange={(e) => setMedForm({ ...medForm, additionalNotes: e.target.value })}
                    />
                  </FormField>
                </div>
            </FormSection>
          ) : null}

          {/* ── STEP 2/3: BASIC DETAILS ── */}
          <FormSection
            title={isMedical ? '3. Basic Details' : '2. Basic details'}
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
              <FormField label="Initial Shop Stock" hint="Starting inventory count for this seller.">
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 20"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Lifespan Value" hint="e.g. 7">
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 7"
                    value={form.lifespanValue}
                    onChange={(e) => setForm({ ...form, lifespanValue: e.target.value })}
                  />
                </FormField>
                <FormField label="Lifespan Unit">
                  <Select
                    value={form.lifespanUnit}
                    onValueChange={(u) => setForm({ ...form, lifespanUnit: u })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {['Days', 'Hours', 'Weeks', 'Months', 'Years'].map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
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

          {/* ── SELLER SUBMITTED ATTRIBUTES REFERENCE (medical only, always visible) ── */}
          {isMedical && requestedAttributesList.length > 0 ? (
            <InfoCard
              title="📋 Seller Submitted Specifications (Reference — read only)"
              items={requestedAttributesList}
            />
          ) : null}

          {/* ── STEP 3/4: PRODUCT TYPE ATTRIBUTES (editable, loads once product type is selected) ── */}
          {productTypeId ? (
            <FormSection
              title={isMedical ? '4. Product Type Attributes' : '3. Product type attributes'}
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

          {/* ── STEP 4/5: MANUFACTURER / PRODUCT INFORMATION ── */}
          {isMedical ? (
            <FormSection
              title="5. Manufacturer Details"
              description="Manufacturer name and address for this medical product."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Manufacturer Company">
                  <Input
                    placeholder="e.g. Sun Pharmaceutical Industries Ltd."
                    value={productInformation.manufacturer}
                    onChange={(e) =>
                      setProductInformation({ ...productInformation, manufacturer: e.target.value })
                    }
                  />
                </FormField>
                <FormField label="Manufacturer Address">
                  <Input
                    placeholder="e.g. Baroda, Gujarat, India"
                    value={productInformation.manufacturerAddress}
                    onChange={(e) =>
                      setProductInformation({
                        ...productInformation,
                        manufacturerAddress: e.target.value,
                      })
                    }
                  />
                </FormField>
              </div>
            </FormSection>
          ) : (
            <ProductInformationFields
              value={productInformation}
              onChange={setProductInformation}
              stepLabel={isMedical ? '5' : '4'}
            />
          )}

          {/* ── STEP 5/6: IMAGES ── */}
          <FormSection
            title={isMedical ? '6. Images' : '5. Images'}
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

          <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5">
            <input
              id="addToMasterCatalogue"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              checked={addToMasterCatalogue}
              onChange={(e) => setAddToMasterCatalogue(e.target.checked)}
            />
            <div className="space-y-1">
              <label htmlFor="addToMasterCatalogue" className="text-sm font-semibold text-amber-950">
                Add to Master Catalogue (Make available for all sellers)
              </label>
              <p className="text-xs text-amber-800 leading-relaxed">
                If checked, this product will be added as an ACTIVE product in the global Master Catalogue so other sellers can discover and add it to their stores. If left unchecked, it is approved ONLY for this requesting seller.
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
