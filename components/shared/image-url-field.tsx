'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageIcon, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUpload } from '@/lib/api';
import { toast } from 'sonner';

interface ImageUrlFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  alt?: string;
  previewSize?: 'sm' | 'md';
  uploadPath?: string;
}

export function ImageUrlField({
  value,
  onChange,
  placeholder = 'https://example.com/image.jpg',
  alt = 'Preview',
  previewSize = 'md',
  uploadPath,
}: ImageUrlFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);
  const trimmed = value.trim();
  const showPreview = trimmed && !broken;

  const sizeClass = previewSize === 'sm' ? 'h-10 w-10' : 'h-16 w-16';

  async function handleUpload(file: File) {
    if (!uploadPath || uploading) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await apiUpload(uploadPath, formData);
      const url = (res.data as { url?: string })?.url;
      if (!url) throw new Error('Upload did not return a URL');
      onChange(url);
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40',
          sizeClass,
        )}
      >
        {showPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trimmed}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
            onLoad={() => setBroken(false)}
          />
        ) : (
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {uploadPath ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
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
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload image'}
            </Button>
          </div>
        ) : null}
        <Input
          type="url"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setBroken(false);
            onChange(e.target.value);
          }}
          className="min-w-0"
        />
      </div>
    </div>
  );
}
