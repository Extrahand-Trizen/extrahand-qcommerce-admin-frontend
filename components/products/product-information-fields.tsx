'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormSection } from '@/components/shared/form-section';
import { FormField } from '@/components/shared/form-field';

export type NutritionInformationFormState = {
  servingSize: string;
  energy: string;
  protein: string;
  carbohydrates: string;
  totalFat: string;
  saturatedFat: string;
  sugar: string;
  sodium: string;
};

export type ProductInformationFormState = {
  ingredients: string;
  manufacturer: string;
  healthBenefits: string;
  specialFeatures: string;
  storageInformation: string;
  usageInstructions: string;
  allergens: string;
  nutrition: NutritionInformationFormState;
};

export const EMPTY_PRODUCT_INFORMATION: ProductInformationFormState = {
  ingredients: '',
  manufacturer: '',
  healthBenefits: '',
  specialFeatures: '',
  storageInformation: '',
  usageInstructions: '',
  allergens: '',
  nutrition: {
    servingSize: '',
    energy: '',
    protein: '',
    carbohydrates: '',
    totalFat: '',
    saturatedFat: '',
    sugar: '',
    sodium: '',
  },
};

type NutritionRecord = Record<string, unknown>;

export function productInformationFromApi(raw: unknown): ProductInformationFormState {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const nutrition =
    src.nutritionInformation && typeof src.nutritionInformation === 'object'
      ? (src.nutritionInformation as NutritionRecord)
      : {};

  return {
    ingredients: String(src.ingredients || ''),
    manufacturer: String(src.manufacturer || ''),
    healthBenefits: String(src.healthBenefits || ''),
    specialFeatures: String(src.specialFeatures || ''),
    storageInformation: String(src.storageInformation || ''),
    usageInstructions: String(src.usageInstructions || ''),
    allergens: String(src.allergens || ''),
    nutrition: {
      servingSize: String(nutrition.servingSize || ''),
      energy: String(nutrition.energy || ''),
      protein: String(nutrition.protein || ''),
      carbohydrates: String(nutrition.carbohydrates || ''),
      totalFat: String(nutrition.totalFat || ''),
      saturatedFat: String(nutrition.saturatedFat || ''),
      sugar: String(nutrition.sugar || ''),
      sodium: String(nutrition.sodium || ''),
    },
  };
}

/** Build API payload — includes all keys so empty values clear stored fields on update. */
export function productInformationToPayload(state: ProductInformationFormState) {
  return {
    ingredients: state.ingredients,
    manufacturer: state.manufacturer,
    healthBenefits: state.healthBenefits,
    specialFeatures: state.specialFeatures,
    storageInformation: state.storageInformation,
    usageInstructions: state.usageInstructions,
    allergens: state.allergens,
    nutritionInformation: {
      servingSize: state.nutrition.servingSize,
      energy: state.nutrition.energy,
      protein: state.nutrition.protein,
      carbohydrates: state.nutrition.carbohydrates,
      totalFat: state.nutrition.totalFat,
      saturatedFat: state.nutrition.saturatedFat,
      sugar: state.nutrition.sugar,
      sodium: state.nutrition.sodium,
    },
  };
}

interface ProductInformationFieldsProps {
  value: ProductInformationFormState;
  onChange: (value: ProductInformationFormState) => void;
  title?: string;
  description?: string;
  stepLabel?: string;
}

export function ProductInformationFields({
  value,
  onChange,
  title = 'Product Information',
  description = 'Ingredients, manufacturer, storage, usage, nutrition, and allergens — separate from catalogue specifications.',
  stepLabel,
}: ProductInformationFieldsProps) {
  const sectionTitle = stepLabel ? `${stepLabel}. ${title}` : title;

  const setField = <K extends keyof Omit<ProductInformationFormState, 'nutrition'>>(
    field: K,
    next: string,
  ) => {
    onChange({ ...value, [field]: next });
  };

  const setNutrition = (field: keyof NutritionInformationFormState, next: string) => {
    onChange({ ...value, nutrition: { ...value.nutrition, [field]: next } });
  };

  return (
    <FormSection title={sectionTitle} description={description}>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="Ingredients"
          className="sm:col-span-2"
          hint="Comma-separated list of ingredients."
        >
          <Textarea
            rows={3}
            placeholder="e.g. Wheat flour, sugar, vegetable oil, salt"
            value={value.ingredients}
            onChange={(e) => setField('ingredients', e.target.value)}
          />
        </FormField>
        <FormField label="Manufacturer" hint="Company or brand that manufactures this product.">
          <Input
            placeholder="e.g. Britannia Industries Ltd."
            value={value.manufacturer}
            onChange={(e) => setField('manufacturer', e.target.value)}
          />
        </FormField>
        <FormField label="Health Benefits" hint="Key benefits or wellness information for customers.">
          <Textarea
            rows={2}
            placeholder="e.g. High in fibre and a source of vitamin C."
            value={value.healthBenefits}
            onChange={(e) => setField('healthBenefits', e.target.value)}
          />
        </FormField>
        <FormField label="Special Features" hint="Distinctive product features or certifications.">
          <Textarea
            rows={2}
            placeholder="e.g. Organic, preservative-free, and ready to cook."
            value={value.specialFeatures}
            onChange={(e) => setField('specialFeatures', e.target.value)}
          />
        </FormField>
        <FormField label="Allergens" hint="Allergen warnings for customers.">
          <Textarea
            rows={2}
            placeholder="e.g. Contains milk and nuts."
            value={value.allergens}
            onChange={(e) => setField('allergens', e.target.value)}
          />
        </FormField>
        <FormField
          label="Storage Information"
          className="sm:col-span-2"
          hint="How the product should be stored."
        >
          <Textarea
            rows={2}
            placeholder="e.g. Store in a cool and dry place. Refrigerate after opening."
            value={value.storageInformation}
            onChange={(e) => setField('storageInformation', e.target.value)}
          />
        </FormField>
        <FormField
          label="Usage Instructions"
          className="sm:col-span-2"
          hint="How the customer should use or prepare the product."
        >
          <Textarea
            rows={2}
            placeholder="e.g. Mix with hot water and stir well before serving."
            value={value.usageInstructions}
            onChange={(e) => setField('usageInstructions', e.target.value)}
          />
        </FormField>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <p className="text-sm font-medium">Nutrition Information</p>
          <p className="text-xs text-muted-foreground">
            Optional per-serving nutrition facts. Not catalogue attributes.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Serving Size">
            <Input
              placeholder="e.g. 30 g"
              value={value.nutrition.servingSize}
              onChange={(e) => setNutrition('servingSize', e.target.value)}
            />
          </FormField>
          <FormField label="Energy">
            <Input
              placeholder="e.g. 120 kcal"
              value={value.nutrition.energy}
              onChange={(e) => setNutrition('energy', e.target.value)}
            />
          </FormField>
          <FormField label="Protein">
            <Input
              placeholder="e.g. 2.5 g"
              value={value.nutrition.protein}
              onChange={(e) => setNutrition('protein', e.target.value)}
            />
          </FormField>
          <FormField label="Carbohydrates">
            <Input
              placeholder="e.g. 18 g"
              value={value.nutrition.carbohydrates}
              onChange={(e) => setNutrition('carbohydrates', e.target.value)}
            />
          </FormField>
          <FormField label="Total Fat">
            <Input
              placeholder="e.g. 4 g"
              value={value.nutrition.totalFat}
              onChange={(e) => setNutrition('totalFat', e.target.value)}
            />
          </FormField>
          <FormField label="Saturated Fat">
            <Input
              placeholder="e.g. 1.2 g"
              value={value.nutrition.saturatedFat}
              onChange={(e) => setNutrition('saturatedFat', e.target.value)}
            />
          </FormField>
          <FormField label="Sugar">
            <Input
              placeholder="e.g. 6 g"
              value={value.nutrition.sugar}
              onChange={(e) => setNutrition('sugar', e.target.value)}
            />
          </FormField>
          <FormField label="Sodium">
            <Input
              placeholder="e.g. 150 mg"
              value={value.nutrition.sodium}
              onChange={(e) => setNutrition('sodium', e.target.value)}
            />
          </FormField>
        </div>
      </div>
    </FormSection>
  );
}

export function productInformationDisplayItems(raw: unknown): Array<[string, unknown]> {
  const state = productInformationFromApi(raw);
  const items: Array<[string, unknown]> = [
    ['Ingredients', state.ingredients],
    ['Manufacturer', state.manufacturer],
    ['Health Benefits', state.healthBenefits],
    ['Special Features', state.specialFeatures],
    ['Storage Information', state.storageInformation],
    ['Usage Instructions', state.usageInstructions],
    ['Allergens', state.allergens],
  ];

  const nutritionRows: Array<[string, string]> = [
    ['Serving Size', state.nutrition.servingSize],
    ['Energy', state.nutrition.energy],
    ['Protein', state.nutrition.protein],
    ['Carbohydrates', state.nutrition.carbohydrates],
    ['Total Fat', state.nutrition.totalFat],
    ['Saturated Fat', state.nutrition.saturatedFat],
    ['Sugar', state.nutrition.sugar],
    ['Sodium', state.nutrition.sodium],
  ];

  for (const [label, value] of nutritionRows) {
    if (value.trim()) items.push([`Nutrition — ${label}`, value]);
  }

  return items.filter(([, value]) => String(value || '').trim());
}

export function hasProductInformation(raw: unknown): boolean {
  return productInformationDisplayItems(raw).length > 0;
}
