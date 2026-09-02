import { cn } from '@/lib/utils';

const variants: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  INACTIVE: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10',
  PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  REJECTED: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  CHANGES_REQUIRED: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
  SUSPENDED: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
  DRAFT: 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-500/10',
  CUSTOM: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        variants[status] || 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10',
        className,
      )}
    >
      {label}
    </span>
  );
}
