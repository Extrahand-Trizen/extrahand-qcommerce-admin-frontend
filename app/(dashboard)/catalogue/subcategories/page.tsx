'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EntityListPage } from '@/components/shared/entity-list-page';
import { api, endpoints } from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CatalogueImageNameCell,
  CataloguePlacementCell,
  OrderCell,
  VerticalCell,
} from '@/components/shared/catalogue-table-cells';

export default function SubcategoriesPage() {
  const [verticalFilter, setVerticalFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: categories } = useQuery({
    queryKey: ['categories-all', verticalFilter],
    queryFn: async () => {
      const url =
        verticalFilter !== 'all'
          ? `${endpoints.categories}?limit=100&vertical=${verticalFilter}`
          : `${endpoints.categories}?limit=100`;
      const res = await api<{ items: Array<{ _id: string; name: string }> }>(url);
      return res.data?.items || [];
    },
  });

  const queryParts: string[] = [];
  if (categoryFilter !== 'all') queryParts.push(`categoryId=${categoryFilter}`);
  if (verticalFilter !== 'all') queryParts.push(`vertical=${verticalFilter}`);
  const endpoint =
    queryParts.length > 0 ? `${endpoints.subcategories}?${queryParts.join('&')}` : endpoints.subcategories;

  return (
    <EntityListPage
      title="Subcategories"
      description="Second-level groupings under each category, partitioned by store vertical."
      endpoint={endpoint}
      queryKey={`subcategories-${verticalFilter}-${categoryFilter}`}
      searchPlaceholder="Search subcategories…"
      columns={[
        { key: 'name', label: 'Subcategory', render: (r) => <CatalogueImageNameCell row={r} imageSize="sm" /> },
        { key: 'categoryId', label: 'Category', render: (r) => <CataloguePlacementCell row={r} /> },
        { key: 'vertical', label: 'Store Vertical', render: (r) => <VerticalCell row={r} /> },
        { key: 'displayOrder', label: 'Order', render: (r) => <OrderCell value={r.displayOrder} /> },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status)} /> },
      ]}
      fields={[
        {
          section: 'Placement',
          name: 'vertical',
          label: 'Store Vertical',
          type: 'select',
          defaultValue: 'KIRANA',
          placeholder: 'Select store vertical',
          hint: 'Controls visibility. Defaults to Kirana or inherits from parent category.',
          options: [
            { value: 'KIRANA', label: '🛒 Kirana / Grocery' },
            { value: 'MEDICAL', label: '💊 Pharmacy / Medical' },
            { value: 'ALL', label: '🌐 All Stores (Both)' },
          ],
        },
        {
          section: 'Placement',
          name: 'categoryId',
          label: 'Parent category',
          type: 'category',
          required: true,
          placeholder: 'Select a category',
          hint: 'Which top-level category this belongs under.',
        },
        {
          section: 'Basic details',
          name: 'name',
          label: 'Subcategory name',
          required: true,
          placeholder: 'e.g. Fruits & Vegetables',
          hint: 'Display name shown in the catalogue.',
        },
        {
          section: 'Basic details',
          name: 'slug',
          label: 'Slug',
          placeholder: 'e.g. fruits-veg',
          hint: 'URL-friendly ID. Leave blank to auto-generate.',
        },
        {
          section: 'Basic details',
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'What products belong in this subcategory…',
          hint: 'Optional internal note for admins.',
        },
        {
          section: 'Display & order',
          name: 'displayOrder',
          label: 'Display order',
          type: 'number',
          placeholder: '1',
          hint: 'Lower numbers appear first.',
        },
        {
          section: 'Display & order',
          name: 'status',
          label: 'Status',
          type: 'status',
          placeholder: 'Select status',
          hint: 'Inactive subcategories are hidden from sellers.',
        },
        {
          section: 'Image',
          name: 'imageUrl',
          label: 'Subcategory image',
          type: 'imageUrl',
          fullWidth: true,
          uploadPath: endpoints.subcategoryUpload,
          placeholder: 'https://example.com/subcategory.jpg',
          hint: 'Optional thumbnail shown in lists.',
        },
      ]}
      extraFilters={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Select
            value={verticalFilter}
            onValueChange={(v) => {
              setVerticalFilter(v);
              setCategoryFilter('all');
            }}
          >
            <SelectTrigger className="w-full bg-white sm:w-44">
              <SelectValue placeholder="All Verticals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verticals</SelectItem>
              <SelectItem value="KIRANA">🛒 Kirana Only</SelectItem>
              <SelectItem value="MEDICAL">💊 Medical Only</SelectItem>
              <SelectItem value="ALL">🌐 All Stores (Both)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full bg-white sm:w-52">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    />
  );
}
