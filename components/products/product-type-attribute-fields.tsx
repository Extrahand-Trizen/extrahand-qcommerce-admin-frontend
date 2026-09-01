'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/shared/form-field';

/** Basic Details fields — never shown as product-type attributes. */
export const HIDDEN_ATTR_KEYS = new Set(['brand', 'pack_size', 'quantity']);

export type AttrMapping = {
  attributeId: {
    _id: string;
    name: string;
    key?: string;
    type: string;
    options?: Array<{ value: string; label: string }>;
  };
  isRequired: boolean;
};

const ATTR_HINTS: Record<string, string> = {
  sold_as: 'How this item is sold — Pack, Loose, or Piece',
  variety: 'Specific variety if applicable — e.g. Royal Gala, Robusta',
  organic: 'Is this product certified organic?',
  country_origin: 'Country or region of origin',
  pack_size: 'Pack description for packaged goods — e.g. 500 g, 1 L',
};

const ATTR_PLACEHOLDERS: Record<string, string> = {
  variety: 'e.g. Royal Gala',
  pack_size: 'e.g. 500 g',
  country_origin: 'e.g. India',
};

type AttributeBlock =
  | { kind: 'net_content'; netQuantity: AttrMapping; unit: AttrMapping }
  | { kind: 'single'; mapping: AttrMapping };

export function getVisibleAttributes(typeAttributes: AttrMapping[] | undefined): AttrMapping[] {
  return typeAttributes?.filter((ta) => !HIDDEN_ATTR_KEYS.has(ta.attributeId.key || '')) || [];
}

export function formatNetContentLabel(amount: string, unit: string): string | null {
  const trimmedAmount = amount.trim();
  const trimmedUnit = unit.trim();
  if (!trimmedAmount && !trimmedUnit) return null;
  if (trimmedAmount && trimmedUnit) return `${trimmedAmount} ${trimmedUnit}`;
  if (trimmedAmount) return `${trimmedAmount} (unit not selected yet)`;
  return trimmedUnit;
}

export function getMissingRequiredAttributeNames(
  visibleAttributes: AttrMapping[],
  attributes: Record<string, string>,
): string[] {
  const missing: string[] = [];
  const byKey = new Map(visibleAttributes.map((ta) => [ta.attributeId.key || '', ta]));
  const netQuantity = byKey.get('net_quantity');
  const unit = byKey.get('unit');

  if (netQuantity && unit) {
    const amountMissing = netQuantity.isRequired && !attributes[netQuantity.attributeId._id]?.trim();
    const unitMissing = unit.isRequired && !attributes[unit.attributeId._id]?.trim();
    if (amountMissing || unitMissing) missing.push('Net content (amount + unit)');
  } else {
    if (netQuantity?.isRequired && !attributes[netQuantity.attributeId._id]?.trim()) {
      missing.push('Net content — amount');
    }
    if (unit?.isRequired && !attributes[unit.attributeId._id]?.trim()) {
      missing.push('Unit');
    }
  }

  for (const ta of visibleAttributes) {
    const key = ta.attributeId.key || '';
    if (key === 'net_quantity' || key === 'unit') continue;
    if (ta.isRequired && !attributes[ta.attributeId._id]?.trim()) {
      missing.push(ta.attributeId.name);
    }
  }

  return missing;
}

function buildAttributeBlocks(visibleAttributes: AttrMapping[]): AttributeBlock[] {
  const byKey = new Map(visibleAttributes.map((ta) => [ta.attributeId.key || '', ta]));
  const netQuantity = byKey.get('net_quantity');
  const unit = byKey.get('unit');
  const blocks: AttributeBlock[] = [];

  if (netQuantity && unit) {
    blocks.push({ kind: 'net_content', netQuantity, unit });
  }

  for (const mapping of visibleAttributes) {
    const key = mapping.attributeId.key || '';
    if (key === 'net_quantity' || key === 'unit') continue;
    blocks.push({ kind: 'single', mapping });
  }

  return blocks;
}

function renderAttributeControl(
  mapping: AttrMapping,
  attributes: Record<string, string>,
  onChange: (next: Record<string, string>) => void,
) {
  const attr = mapping.attributeId;
  const key = attr.key || '';

  if (attr.type === 'DROPDOWN') {
    return (
      <Select
        value={attributes[attr._id] || ''}
        onValueChange={(v) => onChange({ ...attributes, [attr._id]: v })}
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
    );
  }

  if (attr.type === 'BOOLEAN') {
    return (
      <Select
        value={attributes[attr._id] || ''}
        onValueChange={(v) => onChange({ ...attributes, [attr._id]: v })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select Yes or No" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="false">No</SelectItem>
          <SelectItem value="true">Yes</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      placeholder={ATTR_PLACEHOLDERS[key] || `Enter ${attr.name.toLowerCase()}`}
      value={attributes[attr._id] || ''}
      onChange={(e) => onChange({ ...attributes, [attr._id]: e.target.value })}
    />
  );
}

interface ProductTypeAttributeFieldsProps {
  visibleAttributes: AttrMapping[];
  attributes: Record<string, string>;
  onChange: (attributes: Record<string, string>) => void;
}

export function ProductTypeAttributeFields({
  visibleAttributes,
  attributes,
  onChange,
}: ProductTypeAttributeFieldsProps) {
  const blocks = useMemo(() => buildAttributeBlocks(visibleAttributes), [visibleAttributes]);

  if (!blocks.length) {
    return <p className="text-sm text-muted-foreground">No specification fields configured.</p>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {blocks.map((block) => {
        if (block.kind === 'net_content') {
          const { netQuantity, unit } = block;
          const amountId = netQuantity.attributeId._id;
          const unitId = unit.attributeId._id;
          const preview = formatNetContentLabel(attributes[amountId] || '', attributes[unitId] || '');

          return (
            <FormField
              key="net_content"
              label="Net content"
              required={netQuantity.isRequired || unit.isRequired}
              className="sm:col-span-2"
              hint="How much the customer actually receives. Enter the amount and unit separately — e.g. 500 + g = 500 g, 1 + L = 1 L, 6 + pcs = 6 pcs."
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Amount</p>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 500"
                    value={attributes[amountId] || ''}
                    onChange={(e) => onChange({ ...attributes, [amountId]: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Unit</p>
                  {renderAttributeControl(unit, attributes, onChange)}
                </div>
              </div>
              {preview ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  Customer receives: <span className="font-semibold">{preview}</span>
                </p>
              ) : null}
            </FormField>
          );
        }

        const { mapping } = block;
        const attr = mapping.attributeId;
        const key = attr.key || '';
        const label = key === 'net_quantity' ? 'Net content — amount' : attr.name;
        const hint =
          key === 'net_quantity'
            ? 'How much the customer receives — enter the number only (e.g. 500, 1).'
            : ATTR_HINTS[key];

        return (
          <FormField
            key={attr._id}
            label={label}
            required={mapping.isRequired}
            hint={hint}
          >
            {renderAttributeControl(mapping, attributes, onChange)}
          </FormField>
        );
      })}
    </div>
  );
}

/** Merge Net Quantity + Unit rows for read-only product detail display. */
export function formatSpecificationRows(rows: Array<[string, string]>): Array<[string, string]> {
  const netQuantityRow = rows.find(([name]) => name.toLowerCase().includes('net quantity'));
  const unitRow = rows.find(([name]) => name.toLowerCase() === 'unit');
  if (!netQuantityRow || !unitRow) return rows;

  const combined = formatNetContentLabel(netQuantityRow[1], unitRow[1]) || '—';
  return [
    ['Net content', combined],
    ...rows.filter(([name]) => {
      const lower = name.toLowerCase();
      return lower !== 'net quantity' && lower !== 'unit';
    }),
  ];
}
