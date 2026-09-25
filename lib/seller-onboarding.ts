export type ShopCategory =
  | 'general_store'
  | 'supermarket_grocery'
  | 'medical_pharmacy'
  | 'restaurant_food'
  | 'bakery_sweets_snacks'
  | 'meat_poultry'
  | 'fish_seafood'
  | 'dairy_milk'
  | 'fruits_vegetables'
  | 'clothing_fashion'
  | 'footwear'
  | 'electronics_mobiles'
  | 'beauty_cosmetics'
  | 'home_kitchen'
  | 'hardware_electrical'
  | 'books_stationery'
  | 'toys_baby_products'
  | 'pet_supplies'
  | 'automotive_accessories'
  | 'jewellery_accessories'
  | 'flowers_gifts_lifestyle'
  | 'other_local_business';

export type DocumentKind =
  | 'fssai_certificate'
  | 'drug_sale_license'
  | 'pharmacist_details'
  | 'trade_license'
  | 'shops_establishment_registration'
  | 'legal_metrology'
  | 'fire_local_authority_approval'
  | 'local_municipal_permission'
  | 'local_market_permission'
  | 'local_trade_permission'
  | 'bis_product_certification'
  | 'product_specific_compliance'
  | 'veterinary_drug_license'
  | 'jewellery_product_requirements'
  | 'activity_specific_license'
  | 'shop_image'
  | 'bank_passbook'
  | 'pan_card'
  | 'aadhaar_card';

export interface CategoryOption {
  value: ShopCategory;
  label: string;
}

export const SHOP_CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'general_store', label: 'General Store / Kirana' },
  { value: 'supermarket_grocery', label: 'Supermarket / Grocery' },
  { value: 'medical_pharmacy', label: 'Medical / Pharmacy' },
  { value: 'restaurant_food', label: 'Restaurant / Food' },
  { value: 'bakery_sweets_snacks', label: 'Bakery / Sweets & Snacks' },
  { value: 'meat_poultry', label: 'Meat / Poultry' },
  { value: 'fish_seafood', label: 'Fish / Seafood' },
  { value: 'dairy_milk', label: 'Dairy / Milk' },
  { value: 'fruits_vegetables', label: 'Fruits & Vegetables' },
  { value: 'clothing_fashion', label: 'Clothing / Fashion' },
  { value: 'footwear', label: 'Footwear' },
  { value: 'electronics_mobiles', label: 'Electronics / Mobiles' },
  { value: 'beauty_cosmetics', label: 'Beauty / Cosmetics' },
  { value: 'home_kitchen', label: 'Home / Kitchen' },
  { value: 'hardware_electrical', label: 'Hardware / Electrical' },
  { value: 'books_stationery', label: 'Books / Stationery' },
  { value: 'toys_baby_products', label: 'Toys / Baby Products' },
  { value: 'pet_supplies', label: 'Pet Supplies' },
  { value: 'automotive_accessories', label: 'Automotive / Bike Accessories' },
  { value: 'jewellery_accessories', label: 'Jewellery / Accessories' },
  { value: 'flowers_gifts_lifestyle', label: 'Flowers / Gifts / Lifestyle' },
  { value: 'other_local_business', label: 'Other Local Business' },
];

export const SHOP_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  SHOP_CATEGORY_OPTIONS.map((c) => [c.value, c.label]),
);

export function getCategoryLabel(category?: string | null, fallback?: string | null): string {
  if (!category) return fallback || '—';
  return SHOP_CATEGORY_LABELS[category] || category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface CategoryDocumentRequirement {
  kind: DocumentKind;
  backendType: string;
  required: boolean;
  label: string;
  helper: string;
}

const FSSAI: CategoryDocumentRequirement = {
  kind: 'fssai_certificate',
  backendType: 'FSSAI_CERTIFICATE',
  required: true,
  label: 'FSSAI Registration / Licence',
  helper: 'Required for food-related businesses.',
};

const OPTIONAL_TRADE: CategoryDocumentRequirement = {
  kind: 'trade_license',
  backendType: 'TRADE_LICENSE',
  required: false,
  label: 'Trade / Shops & Establishment Registration',
  helper: 'Local authority trade or establishment registration.',
};

export const CATEGORY_DOCUMENT_REQUIREMENTS: Record<ShopCategory, CategoryDocumentRequirement[]> = {
  general_store: [
    FSSAI,
    OPTIONAL_TRADE,
    { kind: 'legal_metrology', backendType: 'LEGAL_METROLOGY', required: false, label: 'Legal Metrology', helper: 'Applicable for packaged products with weights & measures.' },
  ],
  supermarket_grocery: [
    FSSAI,
    OPTIONAL_TRADE,
    { kind: 'legal_metrology', backendType: 'LEGAL_METROLOGY', required: false, label: 'Legal Metrology', helper: 'Applicable for packaged products with weights & measures.' },
  ],
  medical_pharmacy: [
    { kind: 'drug_sale_license', backendType: 'DRUG_SALE_LICENSE', required: true, label: 'Drug Sale Licence', helper: 'Required for all pharmacy & medicine retail.' },
    { kind: 'pharmacist_details', backendType: 'PHARMACIST_DETAILS', required: true, label: 'Pharmacist Registration', helper: 'Qualified registered pharmacist certificate.' },
    { ...FSSAI, required: false, helper: 'Upload if packaged food or health drinks are sold.' },
    OPTIONAL_TRADE,
  ],
  restaurant_food: [
    FSSAI,
    OPTIONAL_TRADE,
    { kind: 'fire_local_authority_approval', backendType: 'FIRE_LOCAL_AUTHORITY_APPROVAL', required: false, label: 'Fire / Local Authority Approval', helper: 'Required for commercial dining & cooking.' },
  ],
  bakery_sweets_snacks: [FSSAI, OPTIONAL_TRADE],
  meat_poultry: [
    FSSAI,
    { kind: 'local_municipal_permission', backendType: 'LOCAL_MUNICIPAL_PERMISSION', required: false, label: 'Municipal / Hygiene Permission', helper: 'Local slaughterhouse/hygiene authority approval.' },
  ],
  fish_seafood: [
    FSSAI,
    { kind: 'local_municipal_permission', backendType: 'LOCAL_MUNICIPAL_PERMISSION', required: false, label: 'Municipal / Hygiene Permission', helper: 'Local health and sanitation permit.' },
  ],
  dairy_milk: [
    FSSAI,
    { kind: 'local_trade_permission', backendType: 'LOCAL_TRADE_PERMISSION', required: false, label: 'Dairy Trade Permission', helper: 'Local milk and dairy distribution permit.' },
  ],
  fruits_vegetables: [
    { kind: 'fssai_certificate', backendType: 'FSSAI_CERTIFICATE', required: false, label: 'FSSAI Registration', helper: 'Mandatory if selling processed/cut fruit products.' },
    { kind: 'local_market_permission', backendType: 'LOCAL_MARKET_PERMISSION', required: false, label: 'APMC / Market Permission', helper: 'Local market yard or mandi permit.' },
  ],
  clothing_fashion: [OPTIONAL_TRADE],
  footwear: [OPTIONAL_TRADE],
  electronics_mobiles: [
    OPTIONAL_TRADE,
    { kind: 'bis_product_certification', backendType: 'BIS_PRODUCT_CERTIFICATION', required: false, label: 'BIS Certification', helper: 'Applicable for certified electronic appliances.' },
  ],
  beauty_cosmetics: [
    OPTIONAL_TRADE,
    { kind: 'product_specific_compliance', backendType: 'PRODUCT_SPECIFIC_COMPLIANCE', required: false, label: 'Cosmetics Compliance', helper: 'Drugs & Cosmetics Act compliance certificate.' },
  ],
  home_kitchen: [
    OPTIONAL_TRADE,
    { kind: 'product_specific_compliance', backendType: 'PRODUCT_SPECIFIC_COMPLIANCE', required: false, label: 'Product Compliance', helper: 'Kitchenware standard certificate.' },
  ],
  hardware_electrical: [
    OPTIONAL_TRADE,
    { kind: 'bis_product_certification', backendType: 'BIS_PRODUCT_CERTIFICATION', required: false, label: 'BIS Electrical Certification', helper: 'Certification for ISI/BIS electrical hardware.' },
  ],
  books_stationery: [OPTIONAL_TRADE],
  toys_baby_products: [
    OPTIONAL_TRADE,
    { kind: 'bis_product_certification', backendType: 'BIS_PRODUCT_CERTIFICATION', required: false, label: 'BIS Toy Safety Certification', helper: 'Mandatory BIS ISI safety mark for toys.' },
  ],
  pet_supplies: [
    OPTIONAL_TRADE,
    { kind: 'fssai_certificate', backendType: 'FSSAI_CERTIFICATE', required: false, label: 'FSSAI Animal Feed / Food', helper: 'Required if storing packaged pet foods.' },
    { kind: 'veterinary_drug_license', backendType: 'VETERINARY_DRUG_LICENSE', required: false, label: 'Veterinary Drug Licence', helper: 'Required if selling veterinary medicines.' },
  ],
  automotive_accessories: [
    OPTIONAL_TRADE,
    { kind: 'product_specific_compliance', backendType: 'PRODUCT_SPECIFIC_COMPLIANCE', required: false, label: 'Automotive Compliance', helper: 'Safety / homologation standards.' },
  ],
  jewellery_accessories: [
    OPTIONAL_TRADE,
    { kind: 'jewellery_product_requirements', backendType: 'JEWELLERY_PRODUCT_REQUIREMENTS', required: false, label: 'Hallmarking Registration (BIS)', helper: 'Precious metal hallmarking certificate.' },
  ],
  flowers_gifts_lifestyle: [OPTIONAL_TRADE],
  other_local_business: [
    OPTIONAL_TRADE,
    { kind: 'activity_specific_license', backendType: 'ACTIVITY_SPECIFIC_LICENSE', required: false, label: 'Activity-specific Licence', helper: 'Business licence according to specific trade.' },
  ],
};

export const DOCUMENT_KIND_TO_BACKEND: Record<string, string> = {
  fssai_certificate: 'FSSAI_CERTIFICATE',
  drug_sale_license: 'DRUG_SALE_LICENSE',
  pharmacist_details: 'PHARMACIST_DETAILS',
  trade_license: 'TRADE_LICENSE',
  shops_establishment_registration: 'SHOPS_ESTABLISHMENT_REGISTRATION',
  legal_metrology: 'LEGAL_METROLOGY',
  fire_local_authority_approval: 'FIRE_LOCAL_AUTHORITY_APPROVAL',
  local_municipal_permission: 'LOCAL_MUNICIPAL_PERMISSION',
  local_market_permission: 'LOCAL_MARKET_PERMISSION',
  local_trade_permission: 'LOCAL_TRADE_PERMISSION',
  bis_product_certification: 'BIS_PRODUCT_CERTIFICATION',
  product_specific_compliance: 'PRODUCT_SPECIFIC_COMPLIANCE',
  veterinary_drug_license: 'VETERINARY_DRUG_LICENSE',
  jewellery_product_requirements: 'JEWELLERY_PRODUCT_REQUIREMENTS',
  activity_specific_license: 'ACTIVITY_SPECIFIC_LICENSE',
  shop_image: 'SHOP_IMAGE',
  bank_passbook: 'BANK_PASSBOOK',
  pan_card: 'PAN_CARD',
  aadhaar_card: 'AADHAAR_CARD',
};

export const BACKEND_TYPE_TO_LABEL: Record<string, string> = {
  FSSAI_CERTIFICATE: 'FSSAI Certificate',
  DRUG_SALE_LICENSE: 'Drug Sale Licence',
  PHARMACIST_DETAILS: 'Pharmacist Certificate',
  TRADE_LICENSE: 'Trade Licence',
  SHOPS_ESTABLISHMENT_REGISTRATION: 'Shops & Establishment Certificate',
  LEGAL_METROLOGY: 'Legal Metrology Certificate',
  FIRE_LOCAL_AUTHORITY_APPROVAL: 'Fire Safety Approval',
  LOCAL_MUNICIPAL_PERMISSION: 'Municipal Sanitation Permission',
  LOCAL_MARKET_PERMISSION: 'APMC Market Permission',
  LOCAL_TRADE_PERMISSION: 'Trade Permission',
  BIS_PRODUCT_CERTIFICATION: 'BIS Product Certification',
  PRODUCT_SPECIFIC_COMPLIANCE: 'Product Compliance Certificate',
  VETERINARY_DRUG_LICENSE: 'Veterinary Drug Licence',
  JEWELLERY_PRODUCT_REQUIREMENTS: 'Jewellery Hallmarking (BIS)',
  ACTIVITY_SPECIFIC_LICENSE: 'Activity Licence',
  SHOP_IMAGE: 'Shop Front Photo',
  BANK_PASSBOOK: 'Bank Passbook / Cancelled Cheque',
  PAN_CARD: 'PAN Card Copy',
  AADHAAR_CARD: 'Aadhaar Card Copy',
};

export function getDocumentLabel(type: string): string {
  return BACKEND_TYPE_TO_LABEL[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getApplicableRequirements(
  category?: string | null,
  subcategory?: string | string[] | null,
): CategoryDocumentRequirement[] {
  if (!category || !(category in CATEGORY_DOCUMENT_REQUIREMENTS)) {
    return [
      FSSAI,
      OPTIONAL_TRADE,
    ];
  }
  const catKey = category as ShopCategory;
  const reqs = [...CATEGORY_DOCUMENT_REQUIREMENTS[catKey]];

  if (catKey === 'medical_pharmacy' && subcategory) {
    const subList = Array.isArray(subcategory)
      ? subcategory
      : subcategory.split(',').map((s) => s.trim());
    const requiresPharmacist = subList.some((s) =>
      ['Pharmacy', 'Medical Store', 'Hospital Pharmacy', 'Veterinary Pharmacy', 'Prescription Medicines'].includes(s),
    );
    return reqs.map((r) => (r.kind === 'pharmacist_details' ? { ...r, required: requiresPharmacist } : r));
  }

  return reqs;
}

export function maskAccountNumber(num?: string | null): string {
  if (!num) return '—';
  const clean = String(num).trim();
  if (clean.length <= 4) return clean;
  return '•'.repeat(Math.max(4, clean.length - 4)) + clean.slice(-4);
}

export function maskAadhaar(num?: string | null): string {
  if (!num) return '—';
  const digits = String(num).replace(/\D/g, '');
  if (digits.length !== 12) return num;
  return `•••• •••• ${digits.slice(-4)}`;
}
