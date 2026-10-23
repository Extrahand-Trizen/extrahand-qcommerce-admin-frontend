'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormSection } from '@/components/shared/form-section';
import { FormField } from '@/components/shared/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  manufacturerAddress: string;
  healthBenefits: string;
  specialFeatures: string;
  storageInformation: string;
  usageInstructions: string;
  allergens: string;
  nutrition: NutritionInformationFormState;
  // Medical & Clinical Fields
  genericName?: string;
  dosageForm?: string;
  routeOfAdmin?: string;
  strength?: string;
  prescriptionCategory?: string;
  indication?: string;
  sideEffects?: string;
  coldChainRequired?: boolean;
  prescriptionRequired?: boolean;
};

export const EMPTY_PRODUCT_INFORMATION: ProductInformationFormState = {
  ingredients: '',
  manufacturer: '',
  manufacturerAddress: '',
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
  genericName: '',
  dosageForm: '',
  routeOfAdmin: '',
  strength: '',
  prescriptionCategory: '',
  indication: '',
  sideEffects: '',
  coldChainRequired: false,
  prescriptionRequired: false,
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
    manufacturerAddress: String(src.manufacturerAddress || ''),
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
    genericName: String(src.genericName || ''),
    dosageForm: String(src.dosageForm || ''),
    routeOfAdmin: String(src.routeOfAdmin || ''),
    strength: String(src.strength || ''),
    prescriptionCategory: String(src.prescriptionCategory || ''),
    indication: String(src.indication || ''),
    sideEffects: String(src.sideEffects || ''),
    coldChainRequired: Boolean(src.coldChainRequired),
    prescriptionRequired: Boolean(src.prescriptionRequired),
  };
}

/** Build API payload — includes all keys so empty values clear stored fields on update. */
export function productInformationToPayload(state: ProductInformationFormState) {
  return {
    ingredients: state.ingredients,
    manufacturer: state.manufacturer,
    manufacturerAddress: state.manufacturerAddress,
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
    genericName: state.genericName || undefined,
    dosageForm: state.dosageForm || undefined,
    routeOfAdmin: state.routeOfAdmin || undefined,
    strength: state.strength || undefined,
    prescriptionCategory: state.prescriptionCategory || undefined,
    indication: state.indication || undefined,
    sideEffects: state.sideEffects || undefined,
    coldChainRequired: Boolean(state.coldChainRequired),
    prescriptionRequired: Boolean(state.prescriptionRequired),
  };
}

interface ProductInformationFieldsProps {
  value: ProductInformationFormState;
  onChange: (value: ProductInformationFormState) => void;
  title?: string;
  description?: string;
  stepLabel?: string;
  vertical?: 'KIRANA' | 'MEDICAL';
}

export function ProductInformationFields({
  value,
  onChange,
  title = 'Product Information',
  description = 'Detailed information separate from catalogue specifications.',
  stepLabel,
  vertical = 'KIRANA',
}: ProductInformationFieldsProps) {
  const sectionTitle = stepLabel ? `${stepLabel}. ${title}` : title;

  const setField = <K extends keyof Omit<ProductInformationFormState, 'nutrition'>>(
    field: K,
    next: ProductInformationFormState[K],
  ) => {
    onChange({ ...value, [field]: next });
  };

  const setNutrition = (field: keyof NutritionInformationFormState, next: string) => {
    onChange({ ...value, nutrition: { ...value.nutrition, [field]: next } });
  };

  if (vertical === 'MEDICAL') {
    return (
      <FormSection
        title={sectionTitle}
        description="Clinical specifications, active ingredients, dosage form, schedule, and safety warnings."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="Generic Name / Active Ingredient"
            required
            hint="Scientific / active pharmaceutical ingredient name (e.g. Paracetamol, Amoxicillin)."
          >
            <Input
              placeholder="e.g. Paracetamol"
              value={value.genericName || ''}
              onChange={(e) => setField('genericName', e.target.value)}
            />
          </FormField>

          <FormField
            label="Dosage Form"
            required
            hint="Physical pharmaceutical form (e.g. Tablet, Capsule, Syrup, Ointment, Injection)."
          >
            <Input
              placeholder="e.g. Tablet"
              value={value.dosageForm || ''}
              onChange={(e) => setField('dosageForm', e.target.value)}
            />
          </FormField>

          <FormField
            label="Strength / Concentration"
            required
            hint="Strength of active ingredient per unit (e.g. 500 mg, 10 mg/5 ml)."
          >
            <Input
              placeholder="e.g. 650 mg"
              value={value.strength || ''}
              onChange={(e) => setField('strength', e.target.value)}
            />
          </FormField>

          <FormField
            label="Route of Administration"
            hint="Route to administer (e.g. Oral, Topical, Intravenous, Ophthalmic)."
          >
            <Input
              placeholder="e.g. Oral"
              value={value.routeOfAdmin || ''}
              onChange={(e) => setField('routeOfAdmin', e.target.value)}
            />
          </FormField>

          <FormField
            label="Prescription Category"
            required
            hint="Drug schedule / prescription requirement."
          >
            <Select
              value={value.prescriptionCategory || undefined}
              onValueChange={(v) => setField('prescriptionCategory', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select prescription schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Schedule H (Prescription Required)">Schedule H (Prescription Required)</SelectItem>
                <SelectItem value="Schedule H1 (Strict Prescription & Register)">Schedule H1 (Strict Prescription & Register)</SelectItem>
                <SelectItem value="Schedule X (Narcotics / Psychotropic)">Schedule X (Narcotics / Psychotropic)</SelectItem>
                <SelectItem value="Schedule G (Medical Supervision)">Schedule G (Medical Supervision)</SelectItem>
                <SelectItem value="OTC (Over The Counter / Non-Prescription)">OTC (Over The Counter / Non-Prescription)</SelectItem>
                <SelectItem value="Ayurvedic / Herbal (Non-Scheduled)">Ayurvedic / Herbal (Non-Scheduled)</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Cold-Chain Required"
            hint="Requires cold storage (2°C - 8°C), e.g. Insulin, Vaccines."
          >
            <div className="flex h-9 items-center gap-2">
              <input
                type="checkbox"
                id="coldChainToggle"
                checked={Boolean(value.coldChainRequired)}
                onChange={(e) => setField('coldChainRequired', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="coldChainToggle" className="text-sm font-medium text-foreground cursor-pointer">
                Requires Cold-Chain Delivery (2°C – 8°C)
              </label>
            </div>
          </FormField>

          <FormField
            label="Doctor Prescription Required"
            hint="Customer must provide and verify a valid doctor's prescription at checkout."
          >
            <div className="flex h-9 items-center gap-2">
              <input
                type="checkbox"
                id="prescriptionRequiredToggle"
                checked={Boolean(value.prescriptionRequired)}
                onChange={(e) => setField('prescriptionRequired', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <label htmlFor="prescriptionRequiredToggle" className="text-sm font-medium text-foreground cursor-pointer">
                Requires Doctor's Prescription (Rx)
              </label>
            </div>
          </FormField>

          <FormField label="Manufacturer" hint="Pharmaceutical company manufacturing this medicine.">
            <Input
              placeholder="e.g. Cipla Ltd."
              value={value.manufacturer}
              onChange={(e) => setField('manufacturer', e.target.value)}
            />
          </FormField>

          <FormField label="Manufacturer Address" hint="Registered manufacturing facility location.">
            <Input
              placeholder="e.g. Verna Industrial Estate, Goa"
              value={value.manufacturerAddress}
              onChange={(e) => setField('manufacturerAddress', e.target.value)}
            />
          </FormField>

          <FormField
            label="Storage Condition"
            className="sm:col-span-2"
            hint="Preservation instructions (e.g. Store below 25°C, protect from direct sunlight)."
          >
            <Input
              placeholder="e.g. Store in a cool & dry place below 25°C. Keep out of reach of children."
              value={value.storageInformation}
              onChange={(e) => setField('storageInformation', e.target.value)}
            />
          </FormField>

          <FormField
            label="Indication / Therapeutic Use"
            className="sm:col-span-2"
            hint="Symptoms or conditions this medicine treats."
          >
            <Textarea
              rows={2}
              placeholder="e.g. Relief of fever, headache, body ache and mild to moderate pain."
              value={value.indication || ''}
              onChange={(e) => setField('indication', e.target.value)}
            />
          </FormField>

          <FormField
            label="Side Effects & Warnings"
            className="sm:col-span-2"
            hint="Contraindications, common side effects, and precautions."
          >
            <Textarea
              rows={2}
              placeholder="e.g. Overdose may cause liver damage. Consult a physician before prolonged use."
              value={value.sideEffects || ''}
              onChange={(e) => setField('sideEffects', e.target.value)}
            />
          </FormField>
        </div>
      </FormSection>
    );
  }

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
        <FormField label="Manufacturer Address" hint="Registered address of the manufacturing company.">
          <Input
            placeholder="e.g. Plot 12, Industrial Area, Mumbai"
            value={value.manufacturerAddress}
            onChange={(e) => setField('manufacturerAddress', e.target.value)}
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
              placeholder="e.g. 8 g"
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
  const items: Array<[string, unknown]> = [];

  if (state.genericName) items.push(['Generic Name', state.genericName]);
  if (state.dosageForm) items.push(['Dosage Form', state.dosageForm]);
  if (state.strength) items.push(['Strength', state.strength]);
  if (state.routeOfAdmin) items.push(['Route of Admin', state.routeOfAdmin]);
  if (state.prescriptionCategory) items.push(['Prescription Category', state.prescriptionCategory]);
  if (state.prescriptionRequired) items.push(['Doctor Prescription Required', 'Yes (Doctor Rx Required)']);
  if (state.coldChainRequired) items.push(['Cold-Chain Required', 'Yes (2°C – 8°C)']);
  if (state.indication) items.push(['Indication', state.indication]);
  if (state.sideEffects) items.push(['Side Effects / Warnings', state.sideEffects]);

  items.push(
    ['Ingredients', state.ingredients],
    ['Manufacturer', state.manufacturer],
    ['Health Benefits', state.healthBenefits],
    ['Special Features', state.specialFeatures],
    ['Storage Information', state.storageInformation],
    ['Usage Instructions', state.usageInstructions],
    ['Allergens', state.allergens],
  );

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
