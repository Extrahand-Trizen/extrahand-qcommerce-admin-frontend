'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BrandSelect } from '@/components/products/brand-select';
import { ProductImagesField, ProductImageDraft } from '@/components/products/product-images-field';
import {
  ProductInformationFields,
  EMPTY_PRODUCT_INFORMATION,
  productInformationToPayload,
  type ProductInformationFormState,
} from '@/components/products/product-information-fields';
import { FormSection } from '@/components/shared/form-section';
import { FormField } from '@/components/shared/form-field';
import {
  Store,
  Search,
  Package,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Building2,
  Phone,
  Lock,
  Tag,
  AlertCircle,
  FileText,
  Calendar,
  CheckCircle2,
  DollarSign,
  Boxes,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface PreselectedStoreInfo {
  sellerId: string;
  shopName: string;
  shopType?: string;
  mobileNumber?: string;
  ownerName?: string;
}

interface AdminAddProductDialogProps {
  open: boolean;
  onClose: () => void;
  preselectedStore?: PreselectedStoreInfo | null;
  onSuccess?: (createdListing: any) => void;
}

type AddMode = 'CATALOGUE' | 'NEW';
type VerticalType = 'KIRANA' | 'MEDICAL' | 'SEASONAL' | 'OTHER';

const MEDICAL_DOSAGE_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Oral suspension', 'Drops (oral)',
  'Cream', 'Ointment', 'Gel', 'Lotion', 'Eye drops', 'Ear drops',
  'Inhaler', 'Nasal spray', 'Powder', 'Granules', 'Sachet', 'Injection', 'Other'
];

const MEDICAL_ROUTES = [
  'Oral', 'Topical', 'Ophthalmic (eye)', 'Otic (ear)', 'Nasal',
  'Inhalation', 'Injection', 'External use', 'Other'
];

const MEDICAL_STRENGTH_UNITS = [
  'mg', 'mcg', 'g', 'mg/mL', 'mcg/mL', 'mg/5 mL', '% w/w', '% w/v', 'IU', 'Other'
];

export function AdminAddProductDialog({
  open,
  onClose,
  preselectedStore,
  onSuccess,
}: AdminAddProductDialogProps) {
  const qc = useQueryClient();

  // Mode state
  const [mode, setMode] = useState<AddMode>('NEW');

  // Store Selection State
  const [selectedSellerId, setSelectedSellerId] = useState<string>(preselectedStore?.sellerId || '');
  const [selectedStoreInfo, setSelectedStoreInfo] = useState<PreselectedStoreInfo | null>(preselectedStore || null);
  const [storeSearch, setStoreSearch] = useState('');
  const [debouncedStoreSearch, setDebouncedStoreSearch] = useState('');

  // Sync preselectedStore when dialog opens
  useEffect(() => {
    if (preselectedStore) {
      setSelectedSellerId(preselectedStore.sellerId);
      setSelectedStoreInfo(preselectedStore);
    } else {
      setSelectedSellerId('');
      setSelectedStoreInfo(null);
    }
  }, [preselectedStore, open]);

  // Debounce store search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedStoreSearch(storeSearch), 300);
    return () => clearTimeout(t);
  }, [storeSearch]);

  // Query stores if not preselected
  const { data: storesList = [], isLoading: loadingStores } = useQuery({
    queryKey: ['admin-stores-search', debouncedStoreSearch],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: '20' });
      if (debouncedStoreSearch.trim()) p.set('search', debouncedStoreSearch.trim());
      const res = await api<{ items: Array<any> }>(`${endpoints.sellerStores}?${p}`);
      return (res.data?.items || []).map((s: any) => ({
        sellerId: s.sellerId,
        shopName: s.shopName,
        shopType: s.shopType || s.shopCategory,
        mobileNumber: s.mobileNumber,
        ownerName: s.ownerName,
      }));
    },
    enabled: open && !preselectedStore,
  });

  // ==========================================
  // MODE A: MASTER CATALOGUE PRODUCT SELECTION
  // ==========================================
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [debouncedCatalogueSearch, setDebouncedCatalogueSearch] = useState('');
  const [selectedMasterProduct, setSelectedMasterProduct] = useState<any | null>(null);

  // Filters and pagination for Mode A
  const [catalogueVertical, setCatalogueVertical] = useState<string>('ALL');
  const [catalogueCategoryId, setCatalogueCategoryId] = useState<string>('ALL');
  const [cataloguePage, setCataloguePage] = useState<number>(1);

  // Listing configuration for Mode A
  const [cataloguePriceRupees, setCataloguePriceRupees] = useState('');
  const [catalogueMrpRupees, setCatalogueMrpRupees] = useState('');
  const [catalogueStock, setCatalogueStock] = useState('10');
  const [catalogueUnit, setCatalogueUnit] = useState('');
  const [catalogueSku, setCatalogueSku] = useState('');
  const [catalogueAvailability, setCatalogueAvailability] = useState<'AVAILABLE' | 'OUT_OF_STOCK'>('AVAILABLE');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCatalogueSearch(catalogueSearch), 300);
    return () => clearTimeout(t);
  }, [catalogueSearch]);

  const { data: masterProductsData, isLoading: loadingCatalogue } = useQuery({
    queryKey: ['admin-master-products-search', debouncedCatalogueSearch, catalogueVertical, catalogueCategoryId, cataloguePage],
    queryFn: async () => {
      const p = new URLSearchParams({
        status: 'ACTIVE',
        limit: '30',
        page: String(cataloguePage),
      });
      if (debouncedCatalogueSearch.trim()) p.set('search', debouncedCatalogueSearch.trim());
      if (catalogueCategoryId && catalogueCategoryId !== 'ALL') p.set('categoryId', catalogueCategoryId);
      if (catalogueVertical && catalogueVertical !== 'ALL') p.set('vertical', catalogueVertical);
      const res = await api<{ items: Array<any>; total?: number; pages?: number }>(`${endpoints.masterProducts}?${p}`);
      return {
        items: res.data?.items || [],
        total: res.data?.total ?? (res.data?.items || []).length,
        pages: res.data?.pages ?? 1,
      };
    },
    enabled: open && mode === 'CATALOGUE',
  });

  const masterProducts = masterProductsData?.items || [];
  const masterTotal = masterProductsData?.total ?? 0;
  const masterPages = masterProductsData?.pages ?? 1;

  const handleSelectMasterProduct = (prod: any) => {
    setSelectedMasterProduct(prod);
    const spRupees = prod.sellingPricePaise ? (prod.sellingPricePaise / 100).toFixed(2).replace(/\.00$/, '') : '';
    const mrpRupees = prod.compareAtPricePaise ? (prod.compareAtPricePaise / 100).toFixed(2).replace(/\.00$/, '') : '';
    setCataloguePriceRupees(spRupees);
    setCatalogueMrpRupees(mrpRupees);
    setCatalogueSku(prod.sku || '');
    setCatalogueUnit(prod.productInformation?.packSize || prod.packOrSoldAs || '');
    setCatalogueStock('10');
    setCatalogueAvailability('AVAILABLE');
  };

  // ==========================================
  // MODE B: CREATE NEW PRODUCT
  // ==========================================
  const [vertical, setVertical] = useState<VerticalType>('KIRANA');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [gtin, setGtin] = useState('');

  // Taxonomy
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [productTypeId, setProductTypeId] = useState('');

  // Other products custom taxonomy
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customSubcategoryName, setCustomSubcategoryName] = useState('');
  const [customProductTypeName, setCustomProductTypeName] = useState('');

  // Pricing & Inventory
  const [sellingPriceRupees, setSellingPriceRupees] = useState('');
  const [mrpRupees, setMrpRupees] = useState('');
  const [stock, setStock] = useState('10');
  const [unit, setUnit] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('3');
  const [minOrderQuantity, setMinOrderQuantity] = useState('1');
  const [maxOrderQuantity, setMaxOrderQuantity] = useState('');
  const [addToMasterCatalogue, setAddToMasterCatalogue] = useState(true);

  // Images
  const [images, setImages] = useState<ProductImageDraft[]>([]);

  // Kirana Product Info
  const [kiranaInfo, setKiranaInfo] = useState<ProductInformationFormState>(EMPTY_PRODUCT_INFORMATION);
  const [lifespanValue, setLifespanValue] = useState('');
  const [lifespanUnit, setLifespanUnit] = useState('Days');

  // Medical Specific State
  const [genericName, setGenericName] = useState('');
  const [dosageForm, setDosageForm] = useState('Tablet');
  const [routeOfAdmin, setRouteOfAdmin] = useState('Oral');
  const [strength, setStrength] = useState('');
  const [strengthUnit, setStrengthUnit] = useState('mg');
  const [prescriptionRequired, setPrescriptionRequired] = useState(false);
  const [coldChainRequired, setColdChainRequired] = useState(false);
  const [licenceNumber, setLicenceNumber] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [rackLocation, setRackLocation] = useState('');
  const [medicalManufacturer, setMedicalManufacturer] = useState('');
  const [medicalMarketer, setMedicalMarketer] = useState('');
  const [medicalSafetyInfo, setMedicalSafetyInfo] = useState('');
  const [medicalSideEffects, setMedicalSideEffects] = useState('');

  // Seasonal Specific State
  const [festival, setFestival] = useState('');
  const [seasonalSubcategory, setSeasonalSubcategory] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');
  const [seasonalSpecs, setSeasonalSpecs] = useState<Record<string, string>>({});
  const [seasonalManufacturer, setSeasonalManufacturer] = useState('');
  const [seasonalPacker, setSeasonalPacker] = useState('');

  // Other Product State
  const [otherManufacturer, setOtherManufacturer] = useState('');
  const [otherManufacturerAddress, setOtherManufacturerAddress] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('India');
  const [manufacturerEmail, setManufacturerEmail] = useState('');
  const [manufacturerContact, setManufacturerContact] = useState('');
  const [importerDetails, setImporterDetails] = useState('');
  const [packerDetails, setPackerDetails] = useState('');
  const [customAttributes, setCustomAttributes] = useState<Array<{ label: string; value: string }>>([]);

  // Query Brands
  const { data: brands = [] } = useQuery({
    queryKey: ['product-brands'],
    queryFn: async () => (await api<string[]>(endpoints.productBrands)).data || [],
    enabled: open,
  });

  // Query Categories
  const { data: allCategories = [] } = useQuery({
    queryKey: ['categories-active-all'],
    queryFn: async () =>
      (await api<{ items: Array<{ _id: string; name: string; vertical?: string; code?: string }> }>(`${endpoints.categories}?status=ACTIVE&limit=200`))
        .data?.items || [],
    enabled: open,
  });

  // Categories filtered for Mode A Master Catalogue browser
  const filteredCatalogueCategories = useMemo(() => {
    if (catalogueVertical === 'ALL') return allCategories;
    if (catalogueVertical === 'MEDICAL') {
      return allCategories.filter((c) => c.vertical === 'MEDICAL' || c.code === 'MED');
    }
    if (catalogueVertical === 'SEASONAL') {
      return allCategories.filter((c) => c.vertical === 'SEASONAL' || c.code === 'SEA');
    }
    return allCategories.filter((c) => !c.vertical || c.vertical === 'KIRANA' || c.code === 'KIR');
  }, [allCategories, catalogueVertical]);

  // Filter Categories by selected vertical
  const filteredCategories = useMemo(() => {
    if (vertical === 'MEDICAL') {
      return allCategories.filter((c) => c.vertical === 'MEDICAL' || c.code === 'MED');
    }
    if (vertical === 'SEASONAL') {
      return allCategories.filter((c) => c.vertical === 'SEASONAL' || c.code === 'FEST');
    }
    if (vertical === 'OTHER') {
      return allCategories;
    }
    // KIRANA default
    return allCategories.filter(
      (c) => c.vertical === 'KIRANA' || c.vertical === 'ALL' || (c.vertical !== 'MEDICAL' && c.vertical !== 'SEASONAL' && c.code !== 'MED' && c.code !== 'FEST')
    );
  }, [allCategories, vertical]);

  // Query Subcategories
  const { data: subcategories = [] } = useQuery({
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

  // Query Product Types
  const { data: productTypes = [] } = useQuery({
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

  // Reset category chain when vertical changes
  const handleVerticalChange = (v: VerticalType) => {
    setVertical(v);
    setCategoryId('');
    setSubcategoryId('');
    setProductTypeId('');
  };

  // Add / Remove dynamic custom attribute
  const addCustomAttr = () => setCustomAttributes([...customAttributes, { label: '', value: '' }]);
  const updateCustomAttr = (idx: number, field: 'label' | 'value', val: string) => {
    setCustomAttributes(
      customAttributes.map((attr, i) => (i === idx ? { ...attr, [field]: val } : attr))
    );
  };
  const removeCustomAttr = (idx: number) => {
    setCustomAttributes(customAttributes.filter((_, i) => i !== idx));
  };

  // ==========================================
  // SUBMISSION MUTATION
  // ==========================================
  const addProductMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSellerId) {
        throw new Error('Please select a seller store first.');
      }

      if (mode === 'CATALOGUE') {
        if (!selectedMasterProduct) {
          throw new Error('Please search and select a product from the Master Catalogue.');
        }
        const spVal = parseFloat(cataloguePriceRupees);
        if (isNaN(spVal) || spVal < 0) {
          throw new Error('Please enter a valid selling price.');
        }

        const mrpVal = catalogueMrpRupees ? parseFloat(catalogueMrpRupees) : undefined;
        if (mrpVal !== undefined && !isNaN(mrpVal) && mrpVal > 0 && spVal > mrpVal) {
          throw new Error('Selling price cannot exceed MRP.');
        }

        const payload = {
          mode: 'CATALOGUE',
          masterProductId: selectedMasterProduct._id,
          sellingPricePaise: Math.round(spVal * 100),
          compareAtPricePaise: mrpVal && !isNaN(mrpVal) && mrpVal > 0 ? Math.round(mrpVal * 100) : undefined,
          stock: Math.max(0, parseInt(catalogueStock, 10) || 0),
          unit: catalogueUnit.trim() || undefined,
          sellerSku: catalogueSku.trim() || undefined,
          availability: catalogueAvailability,
        };

        const res = await api<{ success: boolean; listingId: string; product: any }>(
          endpoints.adminAddStoreProduct(selectedSellerId),
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
        return res.data;
      }

      // MODE: NEW PRODUCT
      if (!name.trim()) throw new Error('Product name is required.');
      const spVal = parseFloat(sellingPriceRupees);
      if (isNaN(spVal) || spVal <= 0) throw new Error('Please enter a valid selling price (> 0).');
      const mrpVal = mrpRupees ? parseFloat(mrpRupees) : undefined;
      if (mrpVal !== undefined && mrpVal > 0 && spVal > mrpVal) {
        throw new Error('Selling price cannot exceed MRP.');
      }

      if (vertical !== 'OTHER' && !categoryId) {
        throw new Error('Please select a Category.');
      }
      if (vertical !== 'OTHER' && !subcategoryId) {
        throw new Error('Please select a Subcategory.');
      }
      if (vertical !== 'OTHER' && !productTypeId) {
        throw new Error('Please select a Product Type.');
      }

      if (vertical === 'OTHER' && !categoryId && !customCategoryName.trim()) {
        throw new Error('Please select a category or enter a custom category name.');
      }

      const formattedImages = images.map((img, idx) => ({
        imageUrl: img.imageUrl,
        isPrimary: img.isPrimary ?? idx === 0,
        displayOrder: idx,
      }));

      // Assemble vertical specific details
      const medicalDetails = vertical === 'MEDICAL' ? {
        genericName: genericName.trim() || undefined,
        dosageForm,
        routeOfAdmin,
        strength: strength.trim() ? `${strength.trim()} ${strengthUnit}` : undefined,
        prescriptionRequired,
        coldChainRequired,
        licenceNumber: licenceNumber.trim() || undefined,
        batchNumber: batchNumber.trim() || undefined,
        expiryDate: expiryDate.trim() || undefined,
        mfgDate: mfgDate.trim() || undefined,
        rackLocation: rackLocation.trim() || undefined,
        marketerName: medicalMarketer.trim() || undefined,
        safetyInfo: medicalSafetyInfo.trim() || undefined,
        sideEffects: medicalSideEffects.trim() || undefined,
      } : undefined;

      const seasonalDetails = vertical === 'SEASONAL' ? {
        festival: festival.trim() || undefined,
        seasonalSubcategory: seasonalSubcategory.trim() || undefined,
        availableFrom: availableFrom || undefined,
        availableUntil: availableUntil || undefined,
        specifications: seasonalSpecs,
        manufacturerDetails: {
          manufacturerName: seasonalManufacturer.trim() || undefined,
          packerName: seasonalPacker.trim() || undefined,
        },
      } : undefined;

      const otherDetails = vertical === 'OTHER' ? {
        customCategoryName: customCategoryName.trim() || undefined,
        customSubcategoryName: customSubcategoryName.trim() || undefined,
        customProductTypeName: customProductTypeName.trim() || undefined,
        countryOfOrigin: countryOfOrigin.trim() || undefined,
        manufacturerDetails: {
          manufacturerName: otherManufacturer.trim() || undefined,
          manufacturerAddress: otherManufacturerAddress.trim() || undefined,
          manufacturerContactNumber: manufacturerContact.trim() || undefined,
          manufacturerEmail: manufacturerEmail.trim() || undefined,
          importerDetails: importerDetails.trim() || undefined,
          packerDetails: packerDetails.trim() || undefined,
        },
        customAttributes: customAttributes.filter((a) => a.label.trim() && a.value.trim()),
      } : undefined;

      const normalizedKiranaInfo = vertical === 'KIRANA' ? productInformationToPayload(kiranaInfo) : {};

      const payload = {
        mode: 'NEW',
        name: name.trim(),
        brand: brand.trim() || undefined,
        description: description.trim() || undefined,
        sku: sku.trim() || undefined,
        gtin: gtin.trim() || undefined,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        productTypeId: productTypeId || undefined,
        vertical: vertical === 'OTHER' ? 'KIRANA' : vertical,
        isMedicalProduct: vertical === 'MEDICAL',
        isSeasonalProduct: vertical === 'SEASONAL',
        isOtherProduct: vertical === 'OTHER',
        sellingPricePaise: Math.round(spVal * 100),
        compareAtPricePaise: mrpVal ? Math.round(mrpVal * 100) : undefined,
        stock: Math.max(0, parseInt(stock, 10) || 0),
        unit: unit.trim() || undefined,
        lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold, 10) : undefined,
        minOrderQuantity: minOrderQuantity ? parseInt(minOrderQuantity, 10) : undefined,
        maxOrderQuantity: maxOrderQuantity ? parseInt(maxOrderQuantity, 10) : undefined,
        images: formattedImages,
        addToMasterCatalogue,
        productInformation: {
          ...normalizedKiranaInfo,
          ...(vertical === 'MEDICAL' && medicalManufacturer ? { manufacturer: medicalManufacturer } : {}),
        },
        lifespanValue: lifespanValue ? parseInt(lifespanValue, 10) : undefined,
        lifespanUnit: lifespanUnit || undefined,
        medicalDetails,
        seasonalDetails,
        otherDetails,
      };

      const res = await api<{ success: boolean; listingId: string; product: any }>(
        endpoints.adminAddStoreProduct(selectedSellerId),
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Product added directly to seller store successfully!');
      qc.invalidateQueries({ queryKey: ['seller-store-products', selectedSellerId] });
      qc.invalidateQueries({ queryKey: ['seller-store-total-products-count', selectedSellerId] });
      qc.invalidateQueries({ queryKey: ['seller-store-categories', selectedSellerId] });
      qc.invalidateQueries({ queryKey: ['seller-stores'] });
      qc.invalidateQueries({ queryKey: ['master-products'] });
      onSuccess?.(data);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add product to store');
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto p-6 sm:p-7">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Add Product to Seller Store
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Add new products or select from the catalogue directly on behalf of the store.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* STEP 1: STORE SELECTION */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Store className="h-4 w-4 text-amber-600" />
                Target Seller Store
              </label>
              {preselectedStore ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                  <Lock className="h-3 w-3" /> Locked to current store
                </span>
              ) : selectedStoreInfo ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSellerId('');
                    setSelectedStoreInfo(null);
                  }}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium hover:underline"
                >
                  Change Store
                </button>
              ) : null}
            </div>

            {selectedStoreInfo ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    {selectedStoreInfo.shopName}
                    <span className="text-[11px] font-normal text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">
                      {selectedStoreInfo.shopType || 'Shop'}
                    </span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                    {selectedStoreInfo.ownerName && <span>Owner: {selectedStoreInfo.ownerName}</span>}
                    {selectedStoreInfo.mobileNumber && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {selectedStoreInfo.mobileNumber}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Target Store Selected
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search seller by store name, owner, or mobile number..."
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    className="pl-9 bg-white"
                  />
                </div>
                {loadingStores ? (
                  <p className="text-xs text-slate-400 py-2">Searching stores...</p>
                ) : storesList.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto space-y-1 bg-white border rounded-lg p-1.5 shadow-2xs">
                    {storesList.map((store) => (
                      <div
                        key={store.sellerId}
                        onClick={() => {
                          setSelectedSellerId(store.sellerId);
                          setSelectedStoreInfo(store);
                        }}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-amber-50 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{store.shopName}</p>
                          <p className="text-xs text-slate-500">
                            {store.ownerName} · {store.mobileNumber} ({store.shopType || 'Store'})
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="text-xs">
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : storeSearch.trim() ? (
                  <p className="text-xs text-muted-foreground py-1">No matching stores found.</p>
                ) : (
                  <p className="text-xs text-muted-foreground py-1">Type above to find a store.</p>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: MODE SELECTOR */}
          <div className="flex items-center gap-2 border-b pb-3">
            <button
              type="button"
              onClick={() => setMode('NEW')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all',
                mode === 'NEW'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Create New Product
            </button>
            <button
              type="button"
              onClick={() => setMode('CATALOGUE')}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all',
                mode === 'CATALOGUE'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <Package className="h-3.5 w-3.5" />
              Select from Master Catalogue
            </button>
          </div>

          {/* ==================================================== */}
          {/* MODE A: MASTER CATALOGUE PRODUCT SELECTION & SETUP */}
          {/* ==================================================== */}
          {mode === 'CATALOGUE' ? (
            <div className="space-y-5">
              {!selectedMasterProduct ? (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Filter by Vertical">
                      <Select
                        value={catalogueVertical}
                        onValueChange={(val) => {
                          setCatalogueVertical(val);
                          setCatalogueCategoryId('ALL');
                          setCataloguePage(1);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Verticals" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Verticals (Kirana, Medical, Seasonal)</SelectItem>
                          <SelectItem value="KIRANA">Kirana & Grocery</SelectItem>
                          <SelectItem value="MEDICAL">Medical & Pharmacy</SelectItem>
                          <SelectItem value="SEASONAL">Festive & Seasonal</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Filter by Category">
                      <Select
                        value={catalogueCategoryId}
                        onValueChange={(val) => {
                          setCatalogueCategoryId(val);
                          setCataloguePage(1);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="ALL">All Categories ({filteredCatalogueCategories.length})</SelectItem>
                          {filteredCatalogueCategories.map((c) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.name} {c.vertical ? `(${c.vertical})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  <FormField label="Search Products" hint="Search by product name, brand, or SKU">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search products (e.g. Amul Butter, Dolo 650, Parle-G)..."
                        value={catalogueSearch}
                        onChange={(e) => {
                          setCatalogueSearch(e.target.value);
                          setCataloguePage(1);
                        }}
                        className="pl-9"
                      />
                    </div>
                  </FormField>

                  <div className="flex items-center justify-between text-xs text-slate-600 px-0.5">
                    <span>
                      Showing <strong>{masterProducts.length}</strong> of <strong>{masterTotal}</strong> master products
                    </span>
                    {masterPages > 1 && (
                      <span className="font-medium text-slate-500">
                        Page {cataloguePage} of {masterPages}
                      </span>
                    )}
                  </div>

                  {loadingCatalogue ? (
                    <p className="text-xs text-slate-400 py-3 text-center">Searching active catalogue...</p>
                  ) : masterProducts.length > 0 ? (
                    <div className="max-h-72 overflow-y-auto space-y-2 border rounded-xl p-2 bg-slate-50/50">
                      {masterProducts.map((p) => {
                        const img = p.images?.find((i: any) => i.isPrimary)?.imageUrl || p.images?.[0]?.imageUrl || '';
                        const spRupees = p.sellingPricePaise ? (p.sellingPricePaise / 100).toFixed(2).replace(/\.00$/, '') : '—';
                        return (
                          <div
                            key={p._id}
                            onClick={() => handleSelectMasterProduct(p)}
                            className="flex items-center justify-between gap-3 p-2.5 bg-white border border-slate-200 rounded-lg hover:border-amber-400 hover:shadow-xs cursor-pointer transition-all"
                          >
                            <div className="flex items-center gap-3">
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={img}
                                  alt={p.name}
                                  className="h-12 w-12 rounded-md object-cover border"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-md bg-slate-100 flex items-center justify-center border text-slate-400">
                                  <Package className="h-6 w-6" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-semibold text-slate-900 leading-tight">
                                  {p.name}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {p.brand ? `${p.brand} · ` : ''}SKU: {p.sku || '—'} · Ref Price: ₹{spRupees}
                                </p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="text-xs shrink-0">
                              Choose
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : catalogueSearch.trim() ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No active master catalogue products found matching &quot;{catalogueSearch.trim()}&quot;.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No active master catalogue products found in this category.
                    </p>
                  )}

                  {masterPages > 1 && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={cataloguePage <= 1 || loadingCatalogue}
                        onClick={() => setCataloguePage((p) => Math.max(1, p - 1))}
                        className="text-xs"
                      >
                        Previous Page
                      </Button>
                      <span className="text-xs text-slate-500">
                        Page {cataloguePage} of {masterPages}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={cataloguePage >= masterPages || loadingCatalogue}
                        onClick={() => setCataloguePage((p) => Math.min(masterPages, p + 1))}
                        className="text-xs"
                      >
                        Next Page
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Selected Product Card */}
                  <div className="flex items-center justify-between p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      {selectedMasterProduct.images?.[0]?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedMasterProduct.images[0].imageUrl}
                          alt={selectedMasterProduct.name}
                          className="h-14 w-14 rounded-lg object-cover border bg-white"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-white border flex items-center justify-center text-slate-400">
                          <Package className="h-7 w-7" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded">
                            Master Catalogue Item
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-base leading-tight mt-1">
                          {selectedMasterProduct.name}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {selectedMasterProduct.brand ? `Brand: ${selectedMasterProduct.brand} · ` : ''}
                          SKU: {selectedMasterProduct.sku || '—'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedMasterProduct(null)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Choose Different Product
                    </Button>
                  </div>

                  {/* Store Specific Pricing & Inventory */}
                  <FormSection
                    title="Store Pricing & Inventory"
                    description="Set this store's selling price and stock level."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Selling Price (₹)" required hint="Price the customer pays in this shop.">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 99"
                          value={cataloguePriceRupees}
                          onChange={(e) => setCataloguePriceRupees(e.target.value)}
                        />
                      </FormField>

                      <FormField label="MRP (₹)" hint="Maximum Retail Price (official packaging MRP).">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 120"
                          value={catalogueMrpRupees}
                          onChange={(e) => setCatalogueMrpRupees(e.target.value)}
                        />
                      </FormField>

                      <FormField label="Physical Stock" required hint="Current quantity on shelf in this store.">
                        <Input
                          type="number"
                          step="1"
                          placeholder="e.g. 10"
                          value={catalogueStock}
                          onChange={(e) => setCatalogueStock(e.target.value)}
                        />
                      </FormField>

                      <FormField label="Unit / Pack Size" hint="e.g. 500 g, 1 L, 10 tablets, 1 piece">
                        <Input
                          placeholder="e.g. 500 g"
                          value={catalogueUnit}
                          onChange={(e) => setCatalogueUnit(e.target.value)}
                        />
                      </FormField>

                      <FormField label="Store SKU / Product Code" hint="Optional internal code used by this shop.">
                        <Input
                          placeholder="e.g. SHOP-SKU-001"
                          value={catalogueSku}
                          onChange={(e) => setCatalogueSku(e.target.value)}
                        />
                      </FormField>

                      <FormField label="Availability Status">
                        <Select
                          value={catalogueAvailability}
                          onValueChange={(v) => setCatalogueAvailability(v as 'AVAILABLE' | 'OUT_OF_STOCK')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AVAILABLE">Available / In Stock</SelectItem>
                            <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>
                    </div>
                  </FormSection>
                </div>
              )}
            </div>
          ) : (
            /* ==================================================== */
            /* MODE B: CREATE NEW PRODUCT                          */
            /* ==================================================== */
            <div className="space-y-6">
              {/* Product Vertical Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Select Product Vertical
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'KIRANA', label: 'Kirana / Grocery', desc: 'FMCG, Food, Daily Essentials' },
                    { id: 'MEDICAL', label: 'Medical / Pharmacy', desc: 'Medicines, Wellness, Healthcare' },
                    { id: 'SEASONAL', label: 'Seasonal / Festive', desc: 'Festival items, Fireworks, Diyas' },
                    { id: 'OTHER', label: 'Other Products', desc: 'Custom categories & items' },
                  ].map((v) => (
                    <div
                      key={v.id}
                      onClick={() => handleVerticalChange(v.id as VerticalType)}
                      className={cn(
                        'p-3 rounded-xl border text-left cursor-pointer transition-all',
                        vertical === v.id
                          ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-400'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <p className="text-xs font-bold text-slate-900">{v.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{v.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Taxonomy Section */}
              <FormSection
                title="1. Category & Classification"
                description={
                  vertical === 'OTHER'
                    ? 'Select or enter free-text category, subcategory, and product type.'
                    : 'Select the taxonomy branch for this product.'
                }
              >
                {vertical === 'OTHER' ? (
                  <div className="space-y-3">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <FormField label="Category Name" required>
                        <Input
                          placeholder="e.g. Electronics, Stationary..."
                          value={customCategoryName}
                          onChange={(e) => setCustomCategoryName(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Subcategory Name">
                        <Input
                          placeholder="e.g. Cables & Chargers..."
                          value={customSubcategoryName}
                          onChange={(e) => setCustomSubcategoryName(e.target.value)}
                        />
                      </FormField>
                      <FormField label="Product Type Name">
                        <Input
                          placeholder="e.g. USB Type-C Cable..."
                          value={customProductTypeName}
                          onChange={(e) => setCustomProductTypeName(e.target.value)}
                        />
                      </FormField>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField label="Category" required>
                      <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubcategoryId(''); setProductTypeId(''); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCategories.map((c) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Subcategory" required>
                      <Select
                        value={subcategoryId}
                        onValueChange={(v) => { setSubcategoryId(v); setProductTypeId(''); }}
                        disabled={!categoryId || subcategories.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={!categoryId ? 'Pick category first' : subcategories.length ? 'Select Subcategory' : 'No subcategories'} />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategories.map((s) => (
                            <SelectItem key={s._id} value={s._id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Product Type" required>
                      <Select
                        value={productTypeId}
                        onValueChange={setProductTypeId}
                        disabled={!subcategoryId || productTypes.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={!subcategoryId ? 'Pick subcategory first' : productTypes.length ? 'Select Product Type' : 'No types'} />
                        </SelectTrigger>
                        <SelectContent>
                          {productTypes.map((pt) => (
                            <SelectItem key={pt._id} value={pt._id}>
                              {pt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                )}
              </FormSection>

              {/* Basic Details */}
              <FormSection title="2. Basic Product Information" description="Name, brand, description, and barcodes.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Product Name" required>
                    <Input
                      placeholder="e.g. Fortune Sunflower Oil 1L"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </FormField>

                  <BrandSelect value={brand} onChange={setBrand} brands={brands} />

                  <div className="sm:col-span-2">
                    <FormField label="Description">
                      <Textarea
                        placeholder="Detailed product description, key highlights, or ingredients summary..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                      />
                    </FormField>
                  </div>

                  <FormField label="SKU / Barcode" hint="Leave blank to auto-generate from category code">
                    <Input placeholder="e.g. OIL-SUN-001" value={sku} onChange={(e) => setSku(e.target.value)} />
                  </FormField>

                  <FormField label="GTIN / EAN Barcode" hint="Optional 8, 12, 13, or 14-digit retail barcode">
                    <Input placeholder="e.g. 8901234567890" value={gtin} onChange={(e) => setGtin(e.target.value)} />
                  </FormField>
                </div>
              </FormSection>

              {/* Pricing & Stock */}
              <FormSection
                title="3. Pricing & Inventory Configuration"
                description="Set the shop's selling price, MRP, and stock level."
              >
                <div className="grid gap-4 sm:grid-cols-2 sm:grid-cols-3">
                  <FormField label="Selling Price (₹)" required hint="Price customer actually pays in shop">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 149"
                      value={sellingPriceRupees}
                      onChange={(e) => setSellingPriceRupees(e.target.value)}
                    />
                  </FormField>

                  <FormField label="MRP (₹)" hint="Maximum Retail Price (≥ Selling Price)">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 175"
                      value={mrpRupees}
                      onChange={(e) => setMrpRupees(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Available Stock" required hint="Current quantity available in this store">
                    <Input
                      type="number"
                      step="1"
                      placeholder="e.g. 20"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Unit / Pack Size" hint="e.g. 1 kg, 500 ml, 1 pc, 10 tablets">
                    <Input placeholder="e.g. 1 kg" value={unit} onChange={(e) => setUnit(e.target.value)} />
                  </FormField>

                  <FormField label="Low Stock Threshold" hint="Alert store when stock dips to this number">
                    <Input
                      type="number"
                      placeholder="e.g. 3"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                    />
                  </FormField>

                  <FormField label="Min Order Quantity" hint="Minimum units a customer can purchase">
                    <Input
                      type="number"
                      placeholder="e.g. 1"
                      value={minOrderQuantity}
                      onChange={(e) => setMinOrderQuantity(e.target.value)}
                    />
                  </FormField>
                </div>
              </FormSection>

              {/* Product Images */}
              <FormSection title="4. Product Images" description="Upload photos or enter direct URLs.">
                <ProductImagesField
                  images={images}
                  onChange={setImages}
                  uploadPath={endpoints.masterProductUpload}
                />
              </FormSection>

              {/* VERTICAL-SPECIFIC DETAILS */}
              {vertical === 'MEDICAL' && (
                <FormSection
                  title="5. Medical & Pharmaceutical Details"
                  description="Dosage, salt composition, schedules, and compliance details."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Generic Name / Salt Composition" hint="e.g. Paracetamol IP, Amoxicillin">
                      <Input
                        placeholder="e.g. Paracetamol 650mg"
                        value={genericName}
                        onChange={(e) => setGenericName(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Dosage Form">
                      <Select value={dosageForm} onValueChange={setDosageForm}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEDICAL_DOSAGE_FORMS.map((df) => (
                            <SelectItem key={df} value={df}>
                              {df}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Route of Administration">
                      <Select value={routeOfAdmin} onValueChange={setRouteOfAdmin}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEDICAL_ROUTES.map((ro) => (
                            <SelectItem key={ro} value={ro}>
                              {ro}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <FormField label="Strength">
                          <Input
                            placeholder="e.g. 500"
                            value={strength}
                            onChange={(e) => setStrength(e.target.value)}
                          />
                        </FormField>
                      </div>
                      <div className="w-28">
                        <FormField label="Unit">
                          <Select value={strengthUnit} onValueChange={setStrengthUnit}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MEDICAL_STRENGTH_UNITS.map((su) => (
                                <SelectItem key={su} value={su}>
                                  {su}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>
                    </div>

                    <FormField label="Drug Licence Number">
                      <Input
                        placeholder="e.g. 20B/21B Licence Number"
                        value={licenceNumber}
                        onChange={(e) => setLicenceNumber(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Batch Number">
                      <Input
                        placeholder="e.g. BTCH-2026-X"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Expiry Date (MM/YYYY or YYYY-MM-DD)">
                      <Input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Manufacturing Date">
                      <Input
                        type="date"
                        value={mfgDate}
                        onChange={(e) => setMfgDate(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Shelf / Rack Location">
                      <Input
                        placeholder="e.g. Rack A-3, Shelf 2"
                        value={rackLocation}
                        onChange={(e) => setRackLocation(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Marketer / Distributor Name">
                      <Input
                        placeholder="e.g. Cipla Ltd."
                        value={medicalMarketer}
                        onChange={(e) => setMedicalMarketer(e.target.value)}
                      />
                    </FormField>

                    <div className="sm:col-span-2 flex flex-wrap gap-6 pt-2">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prescriptionRequired}
                          onChange={(e) => setPrescriptionRequired(e.target.checked)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span>Prescription Required (Rx / Schedule H)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={coldChainRequired}
                          onChange={(e) => setColdChainRequired(e.target.checked)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span>Cold Chain Storage Required (2°C - 8°C)</span>
                      </label>
                    </div>
                  </div>
                </FormSection>
              )}

              {vertical === 'SEASONAL' && (
                <FormSection
                  title="5. Seasonal & Festival Details"
                  description="Festival tags, availability window, and seasonal specifications."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Festival Name" required hint="e.g. Diwali, Holi, Rakhi, Christmas">
                      <Input
                        placeholder="e.g. Diwali"
                        value={festival}
                        onChange={(e) => setFestival(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Seasonal Subcategory" hint="e.g. Clay Diyas, Decorative Lights">
                      <Input
                        placeholder="e.g. Handmade Clay Diyas"
                        value={seasonalSubcategory}
                        onChange={(e) => setSeasonalSubcategory(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Available From Date">
                      <Input
                        type="date"
                        value={availableFrom}
                        onChange={(e) => setAvailableFrom(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Available Until Date">
                      <Input
                        type="date"
                        value={availableUntil}
                        onChange={(e) => setAvailableUntil(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Manufacturer / Artisan Name">
                      <Input
                        placeholder="e.g. Royal Craft Handicrafts"
                        value={seasonalManufacturer}
                        onChange={(e) => setSeasonalManufacturer(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Packer Details">
                      <Input
                        placeholder="e.g. Packaged by ExtraHand Hub"
                        value={seasonalPacker}
                        onChange={(e) => setSeasonalPacker(e.target.value)}
                      />
                    </FormField>
                  </div>
                </FormSection>
              )}

              {vertical === 'OTHER' && (
                <FormSection
                  title="5. Manufacturer & Compliance Details"
                  description="Manufacturer information and custom product attributes."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Manufacturer Name">
                      <Input
                        placeholder="e.g. Apex Consumer Products Ltd."
                        value={otherManufacturer}
                        onChange={(e) => setOtherManufacturer(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Country of Origin">
                      <Input
                        placeholder="e.g. India"
                        value={countryOfOrigin}
                        onChange={(e) => setCountryOfOrigin(e.target.value)}
                      />
                    </FormField>

                    <div className="sm:col-span-2">
                      <FormField label="Manufacturer Address">
                        <Textarea
                          placeholder="Registered manufacturer factory / corporate address..."
                          value={otherManufacturerAddress}
                          onChange={(e) => setOtherManufacturerAddress(e.target.value)}
                          rows={2}
                        />
                      </FormField>
                    </div>

                    <FormField label="Consumer Care Email">
                      <Input
                        placeholder="e.g. support@brand.com"
                        value={manufacturerEmail}
                        onChange={(e) => setManufacturerEmail(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Consumer Care Phone">
                      <Input
                        placeholder="e.g. 1800-123-4567"
                        value={manufacturerContact}
                        onChange={(e) => setManufacturerContact(e.target.value)}
                      />
                    </FormField>
                  </div>

                  {/* Dynamic Custom Attributes */}
                  <div className="mt-4 space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Custom Specifications &amp; Attributes
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={addCustomAttr}
                        className="gap-1 text-xs"
                      >
                        <Plus className="h-3 w-3" /> Add Attribute
                      </Button>
                    </div>
                    {customAttributes.map((attr, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder="Attribute Name (e.g. Material, Color)"
                          value={attr.label}
                          onChange={(e) => updateCustomAttr(idx, 'label', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Value (e.g. Stainless Steel, Black)"
                          value={attr.value}
                          onChange={(e) => updateCustomAttr(idx, 'value', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomAttr(idx)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </FormSection>
              )}

              {vertical === 'KIRANA' && (
                <FormSection
                  title="5. Product Information & Shelf Life"
                  description="Manufacturer details, ingredients, storage, and shelf life."
                >
                  <ProductInformationFields
                    value={kiranaInfo}
                    onChange={setKiranaInfo}
                    vertical="KIRANA"
                  />
                  <div className="grid gap-4 sm:grid-cols-2 mt-4 pt-4 border-t">
                    <FormField label="Shelf Life Value" hint="e.g. 6, 12, 24">
                      <Input
                        type="number"
                        placeholder="e.g. 12"
                        value={lifespanValue}
                        onChange={(e) => setLifespanValue(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Shelf Life Unit">
                      <Select value={lifespanUnit} onValueChange={setLifespanUnit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Days">Days</SelectItem>
                          <SelectItem value="Months">Months</SelectItem>
                          <SelectItem value="Years">Years</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </FormSection>
              )}

              {/* Master Catalogue Checkbox */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="add-to-master"
                  checked={addToMasterCatalogue}
                  onChange={(e) => setAddToMasterCatalogue(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="add-to-master" className="text-xs cursor-pointer">
                  <span className="font-semibold text-slate-900 block">
                    Also publish to Global Master Catalogue
                  </span>
                  <span className="text-slate-600">
                    If checked, this product will be available for all seller stores to discover and add to their shops.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4 mt-6">
          <Button variant="ghost" type="button" onClick={onClose} disabled={addProductMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => addProductMutation.mutate()}
            disabled={addProductMutation.isPending || !selectedSellerId}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold gap-1.5"
          >
            {addProductMutation.isPending ? (
              'Adding Product to Store...'
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Product to Store
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

