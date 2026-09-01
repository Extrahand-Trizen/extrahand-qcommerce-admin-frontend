import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Optional — prefer header title; use only for actions or wizard screens */
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  if (!title && !description && !actions) return null;

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      {(title || description) && (
        <div>
          {title ? <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1> : null}
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      )}
      {!title && !description && <div />}
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
