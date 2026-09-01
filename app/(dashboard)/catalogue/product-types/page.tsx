'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EntityListPage } from '@/components/shared/entity-list-page';
import { api, endpoints } from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
              `${endpoints.subcategories}?categoryId=${categoryFilter}&limit=100`
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
      endpoint={endpoint}
      queryKey={`product-types-${categoryFilter}-${subcategoryFilter}`}
      columns={[
        { key: 'name', label: 'Product Type' },
        {
          key: 'categoryId',
          label: 'Category',
          render: (r) => {
            const cat = r.categoryId as { name?: string };
            return cat?.name || '—';
          },
        },
        {
          key: 'subcategoryId',
          label: 'Subcategory',
          render: (r) => {
            const sub = r.subcategoryId as { name?: string };
            return sub?.name || '—';
          },
        },
        { key: 'displayOrder', label: 'Order' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status)} /> },
      ]}
      fields={[
        {
          name: 'categoryId',
          label: 'Category',
          type: 'category',
          required: true,
          placeholder: 'Select a category',
          hint: 'Top-level catalogue category.',
        },
        {
          name: 'subcategoryId',
          label: 'Subcategory',
          type: 'subcategory',
          required: true,
          dependsOn: 'categoryId',
          placeholder: 'Select a subcategory',
          hint: 'Choose category first, then pick the subcategory.',
        },
        {
          name: 'name',
          label: 'Product Type Name',
          required: true,
          placeholder: 'e.g. Fresh Fruits',
          hint: 'Shared type for many products (e.g. Apple, Banana → Fresh Fruits).',
        },
        {
          name: 'slug',
          label: 'Slug',
          placeholder: 'e.g. fresh-fruits',
          hint: 'URL-friendly ID. Leave blank to auto-generate.',
        },
        {
          name: 'displayOrder',
          label: 'Display Order',
          type: 'number',
          placeholder: 'e.g. 1',
          hint: 'Lower numbers appear first.',
        },
        {
          name: 'status',
          label: 'Status',
          type: 'status',
          placeholder: 'Select status',
          hint: 'Inactive types cannot be used for new products.',
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'What kinds of products use this type…',
          hint: 'Optional note for admins.',
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
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
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
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Subcategory" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subcategories</SelectItem>
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
