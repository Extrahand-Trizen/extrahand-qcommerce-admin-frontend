'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { StatusBadge } from '@/components/shared/status-badge';
import { SubmissionReviewForm, SubmissionReviewPayload } from '@/components/product-submissions/submission-review-form';
import { ProductFormDialog } from '@/components/products/product-form-dialog';
import { ProductDetailView } from '@/components/products/product-detail-view';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

export default function ProductSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [editProductOpen, setEditProductOpen] = useState(false);

  const { data: submission, isLoading } = useQuery({
    queryKey: ['product-submission', id],
    queryFn: async () => {
      const res = await api<Record<string, unknown>>(`${endpoints.productSubmissions}/${id}`);
      return res.data!;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (payload: SubmissionReviewPayload) => {
      return api(`${endpoints.productSubmissions}/${id}/review`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (_data, variables) => {
      const messages = {
        APPROVE: 'Product request approved and master product saved',
        REJECT: 'Product request rejected',
        CHANGES_REQUIRED: 'Changes requested from seller',
      };
      toast.success(messages[variables.action]);
      qc.invalidateQueries({ queryKey: ['product-submission', id] });
      qc.invalidateQueries({ queryKey: ['submissions'] });
      qc.invalidateQueries({ queryKey: ['master-products'] });
      if (variables.action === 'APPROVE') {
        router.push('/product-submissions');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">Submission not found</p>
        <Link href="/product-submissions" className="mt-2 text-sm text-amber-600 hover:underline">
          Back to submissions
        </Link>
      </div>
    );
  }

  const status = String(submission.status);
  const isReviewable = !['APPROVED', 'REJECTED'].includes(status);
  const seller = submission.sellerId as { fullName?: string; shopName?: string } | undefined;
  const mappedProduct = submission.mappedMasterProductId as { _id?: string; name?: string } | undefined;
  const mappedProductId = mappedProduct?._id ? String(mappedProduct._id) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/product-submissions"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to submissions
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {String(submission.submittedProductName)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {seller?.shopName || seller?.fullName || 'Seller'} ·{' '}
              {submission.createdAt
                ? format(new Date(String(submission.createdAt)), 'MMM d, yyyy h:mm a')
                : '—'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {mappedProductId ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/products/${mappedProductId}`}>View product</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditProductOpen(true)}>
                  Edit master product
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <SubmissionReviewForm
        submission={submission}
        readOnly={!isReviewable}
        isPending={reviewMutation.isPending}
        onSubmit={(payload) => reviewMutation.mutate(payload)}
      />

      {mappedProductId && status === 'APPROVED' ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Linked master product</h2>
          <ProductDetailView productId={mappedProductId} />
        </div>
      ) : null}

      {mappedProductId ? (
        <ProductFormDialog
          open={editProductOpen}
          productId={mappedProductId}
          onClose={() => {
            setEditProductOpen(false);
            qc.invalidateQueries({ queryKey: ['product-submission', id] });
          }}
        />
      ) : null}
    </div>
  );
}
