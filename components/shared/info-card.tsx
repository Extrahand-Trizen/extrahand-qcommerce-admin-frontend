import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface InfoCardProps {
  title: string;
  items: Array<[string, unknown]>;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function InfoCard({ title, items, action, footer, className }: InfoCardProps) {
  const visibleItems = items.filter(([, value]) => value != null && value !== '');

  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="space-y-3">
        {!visibleItems.length ? (
          <p className="text-sm text-muted-foreground">No information available</p>
        ) : (
          visibleItems.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 text-sm border-b border-border/60 pb-3 last:border-0 last:pb-0">
              <span className="text-muted-foreground shrink-0">{label}</span>
              <span className="font-medium text-right break-words max-w-[65%]">{String(value)}</span>
            </div>
          ))
        )}
        {footer ? <div className="pt-2 border-t border-border/60">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
