import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ReviewActionsProps {
  comment: string;
  onCommentChange: (value: string) => void;
  onApprove: () => void;
  onRequestChanges: () => void;
  onReject: () => void;
  isPending?: boolean;
  commentLabel?: string;
  commentPlaceholder?: string;
}

export function ReviewActions({
  comment,
  onCommentChange,
  onApprove,
  onRequestChanges,
  onReject,
  isPending,
  commentLabel = 'Admin Comment',
  commentPlaceholder = 'Optional comment for the seller...',
}: ReviewActionsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{commentLabel}</Label>
        <Textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder={commentPlaceholder}
          rows={3}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="success" onClick={onApprove} disabled={isPending}>
          {isPending ? 'Processing...' : 'Approve'}
        </Button>
        <Button variant="outline" onClick={onRequestChanges} disabled={isPending}>
          Request Changes
        </Button>
        <Button variant="destructive" onClick={onReject} disabled={isPending}>
          Reject
        </Button>
      </div>
    </div>
  );
}
