'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/shared/form-field';
import { Plus } from 'lucide-react';

const ADD_NEW = '__add_new_brand__';

interface BrandSelectProps {
  value: string;
  onChange: (value: string) => void;
  brands: string[];
  required?: boolean;
}

export function BrandSelect({ value, onChange, brands, required }: BrandSelectProps) {
  const [addingNew, setAddingNew] = useState(false);
  const [newBrand, setNewBrand] = useState('');

  const showNewInput = addingNew || (value && !brands.includes(value) && value !== '');

  function handleSelect(v: string) {
    if (v === ADD_NEW) {
      setAddingNew(true);
      setNewBrand('');
      onChange('');
      return;
    }
    setAddingNew(false);
    onChange(v);
  }

  function handleNewBrandChange(v: string) {
    setNewBrand(v);
    onChange(v);
  }

  return (
    <FormField
      label="Brand"
      required={required}
      hint="Who makes or supplies this product (e.g. Local Farm, Amul)."
    >
      {!showNewInput ? (
        <Select value={value || undefined} onValueChange={handleSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select an existing brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ADD_NEW} className="font-medium text-amber-700">
              <span className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add new brand
              </span>
            </SelectItem>
            {brands.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="space-y-2">
          <Input
            autoFocus
            placeholder="e.g. Local Farm"
            value={newBrand || value}
            onChange={(e) => handleNewBrandChange(e.target.value)}
          />
          {brands.length > 0 && (
            <button
              type="button"
              className="text-xs text-amber-700 hover:underline"
              onClick={() => {
                setAddingNew(false);
                onChange('');
              }}
            >
              Choose from existing brands
            </button>
          )}
        </div>
      )}
    </FormField>
  );
}
