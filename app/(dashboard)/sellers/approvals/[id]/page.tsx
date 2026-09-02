'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { InfoCard } from '@/components/shared/info-card';
import { ReviewActions } from '@/components/shared/review-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StoreLocationMapDialog } from '@/components/sellers/store-location-map-dialog';
import { useState } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';

export default function SellerApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [comment, setComment] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['seller-detail', id],
    queryFn: async () => {
      const res = await api<{
        seller: Record<string, unknown>;
        onboarding: Record<string, unknown>;
        documents: Array<Record<string, unknown>>;
        history: Array<Record<string, unknown>>;
      }>(`${endpoints.sellers}/${id}`);
      return res.data!;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (action: 'approve' | 'reject' | 'request-changes') => {
      return api(`${endpoints.sellers}/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      });
    },
    onSuccess: () => {
      toast.success('Action completed');
      qc.invalidateQueries({ queryKey: ['seller-approvals'] });
      qc.invalidateQueries({ queryKey: ['seller-detail', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.onboarding) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">Seller not found</p>
        <Link href="/sellers/approvals" className="text-sm text-amber-600 hover:underline mt-2">Back to approvals</Link>
      </div>
    );
  }

  const o = data.onboarding;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href="/sellers/approvals" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to approvals
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{String(o.shopName)}</h1>
            <p className="text-sm text-muted-foreground mt-1">Seller onboarding review</p>
          </div>
          <StatusBadge status={String(o.status)} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard title="Owner Details" items={[
          ['Full Name', o.fullName], ['Mobile', o.mobileNumber], ['Email', o.email],
        ]} />
        <InfoCard title="Shop Details" items={[
          ['Shop Name', o.shopName], ['Shop Type', o.shopType], ['Shop Mobile', o.shopMobileNumber], ['Description', o.shopDescription],
        ]} />
        {(() => {
          const rawLat = o.latitude;
          const rawLng = o.longitude;
          const lat = typeof rawLat === 'number' ? rawLat : (rawLat ? parseFloat(String(rawLat)) : null);
          const lng = typeof rawLng === 'number' ? rawLng : (rawLng ? parseFloat(String(rawLng)) : null);
          const hasCoordinates = lat != null && lng != null && !isNaN(lat) && !isNaN(lng);

          return (
            <>
              <InfoCard
                title="Shop Location"
                items={[
                  ['Address', o.address],
                  ['Area', o.area],
                  ['City', o.city],
                  ['State', o.state],
                  ['Pincode', o.pincode],
                  ['Landmark', o.landmark],
                  ...(hasCoordinates ? ([['Coordinates', `${lat.toFixed(6)}, ${lng.toFixed(6)}`]] as Array<[string, unknown]>) : []),
                ]}
                action={
                  hasCoordinates ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMapOpen(true)}
                      className="h-8 gap-1.5 border-amber-300 bg-amber-50/60 font-medium text-amber-900 hover:bg-amber-100 hover:text-amber-950"
                    >
                      <MapPin className="h-3.5 w-3.5 text-amber-600" />
                      View on Map
                    </Button>
                  ) : null
                }
              />
              {hasCoordinates ? (
                <StoreLocationMapDialog
                  open={mapOpen}
                  onOpenChange={setMapOpen}
                  shopName={String(o.shopName || '')}
                  ownerName={String(o.fullName || '')}
                  address={String(o.address || '')}
                  area={String(o.area || '')}
                  city={String(o.city || '')}
                  state={String(o.state || '')}
                  pincode={String(o.pincode || '')}
                  latitude={lat}
                  longitude={lng}
                />
              ) : null}
            </>
          );
        })()}
        <InfoCard title="Business Details" items={[
          ['Business Type', o.businessType], ['PAN', o.pan], ['GSTIN', o.gstin], ['FSSAI', o.fssaiNumber],
        ]} />
      </div>

      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base font-semibold">Documents</CardTitle></CardHeader>
        <CardContent>
          {!data.documents?.length ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No documents uploaded</p>
          ) : (
            <div className="space-y-4">
              {data.documents.map((doc) => {
                const fileUrl = doc.fileUrl ? String(doc.fileUrl) : '';
                const isImage = /\.(jpg|jpeg|png|webp)$/i.test(fileUrl) || String(doc.mimeType || '').startsWith('image/');
                return (
                  <div key={String(doc._id)} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{String(doc.documentType).replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{String(doc.fileName)}</p>
                        {doc.documentNumber ? (
                          <p className="text-xs text-muted-foreground mt-1">No. {String(doc.documentNumber)}</p>
                        ) : null}
                      </div>
                      <StatusBadge status={String(doc.verificationStatus)} />
                    </div>
                    {fileUrl ? (
                      <div className="space-y-2">
                        {isImage ? (
                          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={fileUrl}
                              alt={String(doc.documentType)}
                              className="max-h-56 rounded-md border object-contain bg-muted/30"
                            />
                          </a>
                        ) : null}
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-amber-600 hover:underline inline-block"
                        >
                          View document
                        </a>
                      </div>
                    ) : doc.documentNumber ? (
                      <p className="text-sm text-muted-foreground">Number provided — no file uploaded</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-base font-semibold">Review Action</CardTitle></CardHeader>
        <CardContent>
          <ReviewActions
            comment={comment}
            onCommentChange={setComment}
            onApprove={() => reviewMutation.mutate('approve')}
            onRequestChanges={() => reviewMutation.mutate('request-changes')}
            onReject={() => reviewMutation.mutate('reject')}
            isPending={reviewMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
