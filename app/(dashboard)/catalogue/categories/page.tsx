'use client';

import { EntityListPage } from '@/components/shared/entity-list-page';
import { endpoints } from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { ImageIcon } from 'lucide-react';

function CategoryNameCell({ row }: { row: Record<string, unknown> }) {
  const name = String(row.name || '');
  const imageUrl = row.imageUrl ? String(row.imageUrl) : '';

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-md border border-border object-cover bg-muted"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/50">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-medium truncate">{name}</p>
        {row.slug ? <p className="text-xs text-muted-foreground truncate">{String(row.slug)}</p> : null}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <EntityListPage
      title="Categories"
      endpoint={endpoints.categories}
      queryKey="categories"
      columns={[
        { key: 'name', label: 'Category', render: (r) => <CategoryNameCell row={r} /> },
        { key: 'displayOrder', label: 'Order' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status)} /> },
      ]}
      fields={[
        {
          name: 'name',
          label: 'Category Name',
          required: true,
          placeholder: 'e.g. Fresh & Daily Essentials',
          hint: 'Display name shown to customers and sellers.',
        },
        {
          name: 'slug',
          label: 'Slug',
          placeholder: 'e.g. fresh-daily-essentials',
          hint: 'URL-friendly ID. Leave blank to auto-generate from the name.',
        },
        {
          name: 'displayOrder',
          label: 'Display Order',
          type: 'number',
          placeholder: 'e.g. 1',
          hint: 'Lower numbers appear first in the catalogue.',
        },
        {
          name: 'status',
          label: 'Status',
          type: 'status',
          placeholder: 'Select status',
          hint: 'Inactive categories are hidden from sellers.',
        },
        {
          name: 'imageUrl',
          label: 'Image URL',
          fullWidth: true,
          placeholder: 'https://example.com/category.jpg',
          hint: 'Square image recommended. Shown next to the category name in the list.',
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Short description of what this category covers…',
          hint: 'Optional internal note for admins.',
        },
      ]}
    />
  );
}
