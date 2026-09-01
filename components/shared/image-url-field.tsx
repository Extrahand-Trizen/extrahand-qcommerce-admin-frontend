'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUrlFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  alt?: string;
  previewSize?: 'sm' | 'md';
}

export function ImageUrlField({
  value,
  onChange,
  placeholder = 'https://example.com/image.jpg',
  alt = 'Preview',
  previewSize = 'md',
}: ImageUrlFieldProps) {
  const [broken, setBroken] = useState(false);
  const trimmed = value.trim();
  const showPreview = trimmed && !broken;

  const sizeClass = previewSize === 'sm' ? 'h-10 w-10' : 'h-16 w-16';

  return (
    <div className="flex items-start gap-3">
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
      <Input
        type="url"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setBroken(false);
          onChange(e.target.value);
        }}
        className="min-w-0 flex-1"
      />
    </div>
  );
}
