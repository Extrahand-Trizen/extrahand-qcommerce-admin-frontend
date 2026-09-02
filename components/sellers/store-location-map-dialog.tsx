'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface StoreLocationMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopName?: string;
  ownerName?: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
}

export function StoreLocationMapDialog({
  open,
  onOpenChange,
  shopName,
  ownerName,
  address,
  area,
  city,
  state,
  pincode,
  latitude,
  longitude,
}: StoreLocationMapDialogProps) {
  const [copied, setCopied] = useState(false);

  const formattedAddress = [address, area, city, state, pincode]
    .filter((part): part is string => Boolean(part && String(part).trim() !== ''))
    .join(', ');

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const embedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

  const copyCoordinates = () => {
    navigator.clipboard.writeText(`${latitude}, ${longitude}`);
    setCopied(true);
    toast.success('Coordinates copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {shopName ? `${shopName} — Location` : 'Store Location'}
              </DialogTitle>
              {ownerName ? (
                <DialogDescription className="text-xs text-muted-foreground">
                  Owner: {ownerName}
                </DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {/* Map Preview */}
          <div className="relative h-[340px] w-full overflow-hidden rounded-lg border border-border bg-muted">
            <iframe
              title="Store Location Map"
              src={embedUrl}
              className="h-full w-full border-0"
              loading="lazy"
              allowFullScreen
            />
          </div>

          {/* Location Summary Box */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-foreground">
                {shopName || 'Registered Address'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Coordinates
              </span>
            </div>

            {formattedAddress ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {formattedAddress}
              </p>
            ) : null}

            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <span className="font-mono">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </span>
              <button
                type="button"
                onClick={copyCoordinates}
                className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 hover:underline"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4" />
            Open in Google Maps
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
