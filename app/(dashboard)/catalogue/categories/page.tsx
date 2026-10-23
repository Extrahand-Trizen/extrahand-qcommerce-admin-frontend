'use client';

import { useState } from 'react';
import { EntityListPage } from '@/components/shared/entity-list-page';
import { endpoints } from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { CatalogueImageNameCell, OrderCell, VerticalCell } from '@/components/shared/catalogue-table-cells';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CategoriesPage() {
  const [verticalFilter, setVerticalFilter] = useState('all');

  const endpoint =
    verticalFilter !== 'all'
      ? `${endpoints.categories}?vertical=${verticalFilter}`
      : endpoints.categories;

  return (
    <EntityListPage
      title="Categories"
      description="Top-level catalogue groups partitioned by store vertical (Kirana vs Medical)."
      endpoint={endpoint}
      queryKey={`categories-${verticalFilter}`}
      searchPlaceholder="Search categories…"
      extraFilters={
        <Select value={verticalFilter} onValueChange={setVerticalFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Verticals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Verticals</SelectItem>
            <SelectItem value="KIRANA">🛒 Kirana Only</SelectItem>
            <SelectItem value="MEDICAL">💊 Medical Only</SelectItem>
            <SelectItem value="ALL">🌐 All Stores (Both)</SelectItem>
          </SelectContent>
        </Select>
      }
      columns={[
        { key: 'name', label: 'Category', render: (r) => <CatalogueImageNameCell row={r} /> },
        { key: 'vertical', label: 'Store Vertical', render: (r) => <VerticalCell row={r} /> },
        { key: 'displayOrder', label: 'Order', render: (r) => <OrderCell value={r.displayOrder} /> },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={String(r.status)} /> },
      ]}
      fields={[
        {
          section: 'Placement & Vertical',
          name: 'vertical',
          label: 'Store Vertical',
          type: 'select',
          required: true,
          defaultValue: 'KIRANA',
          placeholder: 'Select store vertical',
          hint: 'Controls where this category appears. Kirana categories will only be visible on the Kirana side.',
          options: [
            { value: 'KIRANA', label: '🛒 Kirana / Grocery Store Only' },
            { value: 'MEDICAL', label: '💊 Pharmacy / Medical Store Only' },
            { value: 'ALL', label: '🌐 All Stores (Both)' },
          ],
        },
        {
          section: 'Basic details',
          name: 'name',
          label: 'Category name',
          required: true,
          placeholder: 'e.g. Fresh & Daily Essentials',
          hint: 'Display name shown to customers and sellers.',
        },
        {
          section: 'Basic details',
          name: 'slug',
          label: 'Slug',
          placeholder: 'e.g. fresh',
          hint: 'URL-friendly ID. Leave blank to auto-generate from the name.',
        },
        {
          section: 'Basic details',
          name: 'code',
          label: 'Code',
          required: true,
          placeholder: 'e.g. FRESH',
          hint: '2–6 character uppercase SKU prefix for this category.',
        },
        {
          section: 'Basic details',
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Short description of what this category covers…',
          hint: 'Optional internal note for admins.',
        },
        {
          section: 'Display & order',
          name: 'displayOrder',
          label: 'Display order',
          type: 'number',
          placeholder: '1',
          hint: 'Lower numbers appear first in the catalogue.',
        },
        {
          section: 'Display & order',
          name: 'status',
          label: 'Status',
          type: 'status',
          placeholder: 'Select status',
          hint: 'Inactive categories are hidden from sellers.',
        },
        {
          section: 'Image',
          name: 'imageUrl',
          label: 'Category image',
          type: 'imageUrl',
          fullWidth: true,
          uploadPath: endpoints.categoryUpload,
          placeholder: 'https://example.com/category.jpg',
          hint: 'Square thumbnail shown in lists and the dashboard.',
        },
      ]}
    />
  );
}
