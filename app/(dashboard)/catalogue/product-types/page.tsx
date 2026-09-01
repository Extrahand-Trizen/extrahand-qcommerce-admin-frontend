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
} from '@/components/shared/catalogue-table-cells';

export default function ProductTypesPage() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');

  const { data: categories } = useQuery({
    queryKey: ['categories-all'],
    queryFn: async () =>
      (await api<{ items: Array<{ _id: string; name: string }> }>(`${endpoints.categories}?limit=100`)).data?.items ||
      [],
  });

  const { data: filterSubs } = useQuery({
    queryKey: ['subcategories-filter', categoryFilter],
    queryFn: async () =>
      categoryFilter !== 'all'
        ? (
            await api<{ items: Array<{ _id: string; name: string }> }>(
              `${endpoints.subcategories}?categoryId=${categoryFilter}&limit=100`,
            )
          ).data?.items || []
        : [],
    enabled: categoryFilter !== 'all',
  });

  const queryParts: string[] = [];
  if (categoryFilter !== 'all') queryParts.push(`categoryId=${categoryFilter}`);
  if (subcategoryFilter !== 'all') queryParts.push(`subcategoryId=${subcategoryFilter}`);
  const endpoint =
    queryParts.length > 0 ? `${endpoints.productTypes}?${queryParts.join('&')}` : endpoints.productTypes;

  return (
    <EntityListPage
      title="Product Types"
      description="Shared product templates that define which specification attributes apply."
      endpoint={endpoint}
      queryKey={`product-types-${categoryFilter}-${subcategoryFilter}`}
      searchPlaceholder="Search product types…"
      columns={[
        {
          key: 'name',
          label: 'Product type',
          render: (r) => <CatalogueImageNameCell row={r} imageSize="sm" />,
        },
        { key: 'categoryId', label: 'Placement', render: (r) => <CataloguePlacementCell row={r} /> },
        { key: 'displayOrder', label: 'Order', render: (r) => <OrderCell value={r.displayOrder} /> },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status)} /> },
      ]}
      fields={[
        {
          section: 'Placement',
          name: 'categoryId',
          label: 'Category',
          type: 'category',
          required: true,
          placeholder: 'Select a category',
          hint: 'Top-level catalogue category.',
        },
        {
          section: 'Placement',
          name: 'subcategoryId',
          label: 'Subcategory',
          type: 'subcategory',
          required: true,
          dependsOn: 'categoryId',
          placeholder: 'Select a subcategory',
          hint: 'Choose category first, then pick the subcategory.',
        },
        {
          section: 'Basic details',
          name: 'name',
          label: 'Product type name',
          required: true,
          placeholder: 'e.g. Milk',
          hint: 'Shared type for many products (e.g. Apple, Banana → Fresh Fruits).',
        },
        {
          section: 'Basic details',
          name: 'slug',
          label: 'Slug',
          placeholder: 'e.g. milk',
          hint: 'URL-friendly ID. Stored as subcategory-slug combined in the catalogue seed.',
        },
        {
          section: 'Basic details',
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'What kinds of products use this type…',
          hint: 'Optional note for admins.',
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
          hint: 'Inactive types cannot be used for new products.',
        },
      ]}
      extraFilters={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v);
              setSubcategoryFilter('all');
            }}
          >
            <SelectTrigger className="w-full bg-white sm:w-44">
              <SelectValue placeholder="Category" />
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
          <Select
            value={subcategoryFilter}
            onValueChange={setSubcategoryFilter}
            disabled={categoryFilter === 'all'}
          >
            <SelectTrigger className="w-full bg-white sm:w-44">
              <SelectValue placeholder="Subcategory" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subcategories</SelectItem>
              {filterSubs?.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    />
  );
}
