'use client';

import { useState } from 'react';
import { EntityListPage } from '@/components/shared/entity-list-page';
import { endpoints } from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AttributesPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const endpoint =
    statusFilter === 'all'
      ? endpoints.attributes
      : `${endpoints.attributes}?isActive=${statusFilter === 'active' ? 'true' : 'false'}`;

  return (
    <EntityListPage
      title="Attributes"
      endpoint={endpoint}
      queryKey={`attributes-${statusFilter}`}
      columns={[
        { key: 'name', label: 'Attribute' },
        { key: 'key', label: 'Key' },
        { key: 'type', label: 'Type' },
        {
          key: 'isActive',
          label: 'Status',
          render: (r) => <StatusBadge status={r.isActive ? 'ACTIVE' : 'INACTIVE'} />,
        },
      ]}
      fields={[
        {
          name: 'name',
          label: 'Attribute Name',
          required: true,
          placeholder: 'e.g. Net Weight',
          hint: 'Label shown when filling product specifications.',
        },
        {
          name: 'key',
          label: 'Key',
          placeholder: 'e.g. weight',
          hint: 'Internal code (snake_case). Leave blank to auto-generate.',
        },
        {
          name: 'type',
          label: 'Input Type',
          type: 'select',
          required: true,
          placeholder: 'Select input type',
          hint: 'How sellers/admins enter this value (text, number, dropdown, etc.).',
          options: [
            { value: 'TEXT', label: 'Text' },
            { value: 'NUMBER', label: 'Number' },
            { value: 'DROPDOWN', label: 'Dropdown' },
            { value: 'MULTI_SELECT', label: 'Multi Select' },
            { value: 'BOOLEAN', label: 'Boolean (Yes/No)' },
          ],
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Explain when to use this attribute…',
          hint: 'Optional help text for admins.',
        },
      ]}
      extraFilters={
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      }
    />
  );
}
