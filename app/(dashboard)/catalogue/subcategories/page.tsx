'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EntityListPage } from '@/components/shared/entity-list-page';
import { api, endpoints } from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageIcon } from 'lucide-react';

function SubcategoryNameCell({ row }: { row: Record<string, unknown> }) {
  const name = String(row.name || '');
  const imageUrl = row.imageUrl ? String(row.imageUrl) : '';

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-9 w-9 shrink-0 rounded-md border border-border object-cover bg-muted"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/50">
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
      <span className="font-medium truncate">{name}</span>
    </div>
  );
}

export default function SubcategoriesPage() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { data: categories } = useQuery({
    queryKey: ['categories-all'],
    queryFn: async () => {
      const res = await api<{ items: Array<{ _id: string; name: string }> }>(`${endpoints.categories}?limit=100`);
      return res.data?.items || [];
    },
  });

  return (
    <EntityListPage
      title="Subcategories"
      endpoint={
        categoryFilter !== 'all'
          ? `${endpoints.subcategories}?categoryId=${categoryFilter}`
          : endpoints.subcategories
      }
      queryKey={`subcategories-${categoryFilter}`}
      columns={[
        { key: 'name', label: 'Subcategory', render: (r) => <SubcategoryNameCell row={r} /> },
        {
          key: 'categoryId',
          label: 'Category',
          render: (r) => {
            const cat = r.categoryId as { name?: string } | string;
            return typeof cat === 'object' ? cat?.name || '—' : String(cat);
          },
        },
        { key: 'displayOrder', label: 'Order' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status)} /> },
      ]}
      fields={[
        {
          name: 'categoryId',
          label: 'Parent Category',
          type: 'category',
          required: true,
          placeholder: 'Select a category',
          hint: 'Which top-level category this belongs under.',
        },
        {
          name: 'name',
          label: 'Subcategory Name',
          required: true,
          placeholder: 'e.g. Fruits & Vegetables',
          hint: 'Display name shown in the catalogue.',
        },
        {
          name: 'slug',
          label: 'Slug',
          placeholder: 'e.g. fruits-veg',
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
          hint: 'Inactive subcategories are hidden from sellers.',
        },
        {
          name: 'imageUrl',
          label: 'Image URL',
          fullWidth: true,
          placeholder: 'https://example.com/subcategory.jpg',
          hint: 'Optional thumbnail shown in the list.',
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'What products belong in this subcategory…',
          hint: 'Optional internal note for admins.',
        },
      ]}
      extraFilters={
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Filter by category" />
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
      }
    />
  );
}
