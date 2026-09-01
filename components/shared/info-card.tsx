import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InfoCardProps {
  title: string;
  items: Array<[string, unknown]>;
}

export function InfoCard({ title, items }: InfoCardProps) {
  const visibleItems = items.filter(([, value]) => value != null && value !== '');

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
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
      </CardContent>
    </Card>
  );
}
