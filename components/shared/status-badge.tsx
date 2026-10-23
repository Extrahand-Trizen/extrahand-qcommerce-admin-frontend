import { cn } from '@/lib/utils';

const variants: Record<string, string> = {
  ACTIVE: 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-400/50 font-semibold',
  INACTIVE: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-400/20 font-medium',
  PENDING: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-500/30',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-500/30',
  PENDING_REVIEW: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-500/30',
  UNDER_REVIEW: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-500/30',
  APPROVED: 'bg-amber-100/70 text-amber-950 ring-1 ring-inset ring-amber-400 font-semibold',
  REJECTED: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300 font-medium',
  DELETED: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300',

  CHANGES_REQUIRED: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-500/30',
  SUSPENDED: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300 font-medium',
  DRAFT: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-500/20',
  CUSTOM: 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-400/30',
  VERIFIED: 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-400/50 font-semibold',
  NOT_VERIFIED: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-400/20',
  FAILED: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300',
  SUBMITTED: 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-400/30',
  RESUBMITTED: 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-400/30',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label =
    status === 'DRAFT'
      ? 'Private Product'
      : status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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

export function VerticalBadge({ vertical, className }: { vertical?: string; className?: string }) {
  if (vertical === 'MEDICAL') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20',
          className,
        )}
      >
        💊 Medical
      </span>
    );
  }
  if (vertical === 'ALL') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20',
          className,
        )}
      >
        🌐 All Stores
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20',
        className,
      )}
    >
      🛒 Kirana
    </span>
  );
}

