import { AlertCircle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';

export function TableLoadingRows({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full max-w-[140px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function TableEmptyRow({ cols, message = 'No records found' }: { cols: number; message?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="h-40">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">{message}</p>
          <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function TableErrorRow({
  cols,
  error,
  onRetry,
}: {
  cols: number;
  error: Error;
  onRetry?: () => void;
}) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="h-40">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-sm font-medium text-red-600">Failed to load data</p>
          <p className="text-xs text-muted-foreground max-w-md">{error.message}</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
