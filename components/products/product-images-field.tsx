'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/shared/form-field';
import { ImageIcon, Plus, Star, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUpload } from '@/lib/api';
import { toast } from 'sonner';

export type ProductImageDraft = {
  imageUrl: string;
  isPrimary: boolean;
};

interface ProductImagesFieldProps {
  images: ProductImageDraft[];
  onChange: (images: ProductImageDraft[]) => void;
  /** When set, shows a file upload button that posts to this API path. */
  uploadPath?: string;
}

export function ProductImagesField({ images, onChange, uploadPath }: ProductImagesFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  function updateUrl(index: number, url: string) {
    const next = images.map((img, i) => (i === index ? { ...img, imageUrl: url } : img));
    onChange(next);
  }

  function setPrimary(index: number) {
    onChange(images.map((img, i) => ({ ...img, isPrimary: i === index })));
  }

  function remove(index: number) {
    const next = images.filter((_, i) => i !== index);
    if (next.length && !next.some((img) => img.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
  }

  function addImage(url = '') {
    onChange([
      ...images,
      { imageUrl: url, isPrimary: images.length === 0 },
    ]);
  }

  async function handleUpload(file: File) {
    if (!uploadPath || uploadingRef.current) return;
    uploadingRef.current = true;
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await apiUpload(uploadPath, formData);
      const url = (res.data as { url?: string })?.url;
      if (!url) throw new Error('Upload did not return a URL');
      addImage(url);
      toast.success('Image uploaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      uploadingRef.current = false;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <FormField
        label="Product images"
        hint="Upload images or paste URLs. Mark one as primary — that thumbnail shows in the products list."
      >
        <div className="space-y-3">
          {uploadPath ? (
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Upload image
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => addImage()}>
                <Plus className="h-4 w-4" />
                Add URL
              </Button>
            </div>
          ) : null}
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
              <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No images yet</p>
              {!uploadPath ? (
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => addImage()}>
                  <Plus className="h-4 w-4" />
                  Add image
                </Button>
              ) : null}
            </div>
          ) : (
            images.map((img, index) => (
              <div
                key={index}
                className={cn(
                  'flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start',
                  img.isPrimary ? 'border-amber-300 bg-amber-50/40' : 'border-border bg-white'
                )}
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                  {img.imageUrl.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.imageUrl.trim()}
                      alt={`Product ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    placeholder={`https://example.com/product-${index + 1}.jpg`}
                    value={img.imageUrl}
                    onChange={(e) => updateUrl(index, e.target.value)}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={img.isPrimary ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPrimary(index)}
                    >
                      <Star className={cn('h-3.5 w-3.5', img.isPrimary && 'fill-current')} />
                      {img.isPrimary ? 'Primary' : 'Set as primary'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </FormField>
      {images.length > 0 && !uploadPath ? (
        <Button type="button" variant="outline" size="sm" onClick={() => addImage()}>
          <Plus className="h-4 w-4" />
          Add another image
        </Button>
      ) : null}
    </div>
  );
}
