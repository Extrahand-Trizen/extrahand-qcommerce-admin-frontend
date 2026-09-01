'use client';

import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_STYLES: Record<string, string> = {
  TEXT: 'bg-slate-100 text-slate-700',
  NUMBER: 'bg-blue-50 text-blue-700',
  DROPDOWN: 'bg-violet-50 text-violet-700',
  MULTI_SELECT: 'bg-purple-50 text-purple-700',
  BOOLEAN: 'bg-emerald-50 text-emerald-700',
};

export function CatalogueImageNameCell({
  row,
  imageSize = 'md',
}: {
  row: Record<string, unknown>;
  imageSize?: 'sm' | 'md';
}) {
  const name = String(row.name || '');
  const slug = row.slug ? String(row.slug) : '';
  const imageUrl = row.imageUrl ? String(row.imageUrl) : '';
  const size = imageSize === 'sm' ? 'h-9 w-9' : 'h-10 w-10';

  return (
    <div className="flex min-w-[180px] items-center gap-3">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className={cn('shrink-0 rounded-lg border border-border object-cover bg-muted', size)}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40',
            size,
          )}
        >
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{name}</p>
        {slug ? <p className="truncate font-mono text-[11px] text-muted-foreground">{slug}</p> : null}
      </div>
    </div>
  );
}

export function CataloguePlacementCell({ row }: { row: Record<string, unknown> }) {
  const cat = row.categoryId as { name?: string } | string | undefined;
  const sub = row.subcategoryId as { name?: string } | string | undefined;
  const categoryName = typeof cat === 'object' ? cat?.name : null;
  const subcategoryName = typeof sub === 'object' ? sub?.name : null;

  if (!categoryName && !subcategoryName) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="min-w-[140px] text-sm">
      {categoryName ? <p className="truncate text-foreground">{categoryName}</p> : null}
      {subcategoryName ? (
        <p className="truncate text-xs text-muted-foreground">{subcategoryName}</p>
      ) : null}
    </div>
  );
}

export function AttributeNameCell({ row }: { row: Record<string, unknown> }) {
  const name = String(row.name || '');
  const key = row.key ? String(row.key) : '';

  return (
    <div className="min-w-[160px]">
      <p className="font-medium text-foreground">{name}</p>
      {key ? (
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{key}</p>
      ) : null}
    </div>
  );
}

export function AttributeTypeBadge({ type }: { type: string }) {
  const label = type.replace(/_/g, ' ');
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        TYPE_STYLES[type] || 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}

export function OrderCell({ value }: { value: unknown }) {
  if (value == null || value === '') return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums text-sm text-foreground">{String(value)}</span>;
}
