'use client';

import { useState } from 'react';
import { EntityListPage } from '@/components/shared/entity-list-page';
import { endpoints } from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AttributeNameCell, AttributeTypeBadge } from '@/components/shared/catalogue-table-cells';

export default function AttributesPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const endpoint =
    statusFilter === 'all'
      ? endpoints.attributes
      : `${endpoints.attributes}?isActive=${statusFilter === 'active' ? 'true' : 'false'}`;

  return (
    <EntityListPage
      title="Attributes"
      description="Reusable specification fields linked to product types (e.g. net quantity, flavour)."
      endpoint={endpoint}
      queryKey={`attributes-${statusFilter}`}
      searchPlaceholder="Search attributes…"
      columns={[
        { key: 'name', label: 'Attribute', render: (r) => <AttributeNameCell row={r} /> },
        { key: 'type', label: 'Input type', render: (r) => <AttributeTypeBadge type={String(r.type || '')} /> },
        {
          key: 'isActive',
          label: 'Status',
          render: (r) => <StatusBadge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} />,
        },
      ]}
      fields={[
        {
          section: 'Basic details',
          name: 'name',
          label: 'Attribute name',
          required: true,
          placeholder: 'e.g. Net Quantity',
          hint: 'Label shown when filling product specifications.',
        },
        {
          section: 'Basic details',
          name: 'key',
          label: 'Key',
          placeholder: 'e.g. net_quantity',
          hint: 'Internal code (snake_case). Leave blank to auto-generate.',
        },
        {
          section: 'Basic details',
          name: 'type',
          label: 'Input type',
          type: 'select',
          required: true,
          placeholder: 'Select input type',
          hint: 'How admins and sellers enter this value.',
          options: [
            { value: 'TEXT', label: 'Text' },
            { value: 'NUMBER', label: 'Number' },
            { value: 'DROPDOWN', label: 'Dropdown' },
            { value: 'MULTI_SELECT', label: 'Multi select' },
            { value: 'BOOLEAN', label: 'Boolean (Yes / No)' },
          ],
        },
        {
          section: 'Basic details',
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Explain when to use this attribute…',
          hint: 'Optional help text for admins.',
        },
      ]}
      extraFilters={
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full bg-white sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      }
    />
  );
}
