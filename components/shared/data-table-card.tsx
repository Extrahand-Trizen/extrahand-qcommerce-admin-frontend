import { cn } from '@/lib/utils';

interface DataTableCardProps {
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function DataTableCard({ toolbar, children, footer, className }: DataTableCardProps) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-white', className)}>
      {toolbar && (
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
      {footer}
    </div>
  );
}
