'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductDetailView } from '@/components/products/product-detail-view';
import { ProductFormDialog } from '@/components/products/product-form-dialog';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to products
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Product Details</h1>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Edit Product
        </Button>
      </div>

      <ProductDetailView productId={id} />

      <ProductFormDialog
        open={editOpen}
        productId={id}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}
