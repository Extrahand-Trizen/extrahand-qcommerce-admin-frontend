'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { getDocumentLabel } from '@/lib/seller-onboarding';
import { Download, ExternalLink, Copy, Check, FileText, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export interface DocumentPreviewData {
  documentType: string;
  documentNumber?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  verificationStatus?: string | null;
  uploadedAt?: string | Date | null;
  rejectionReason?: string | null;
}

interface DocumentPreviewDialogProps {
  document: DocumentPreviewData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentPreviewDialog({
  document,
  open,
  onOpenChange,
}: DocumentPreviewDialogProps) {
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [loadError, setLoadError] = useState(false);

  if (!document) return null;

  const title = getDocumentLabel(document.documentType);
  const fileUrl = document.fileUrl ? String(document.fileUrl) : '';
  const isPdf =
    Boolean(fileUrl && fileUrl.toLowerCase().endsWith('.pdf')) ||
    Boolean(document.mimeType && document.mimeType.toLowerCase().includes('pdf'));
  const isImage =
    Boolean(fileUrl && /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(fileUrl)) ||
    Boolean(document.mimeType && document.mimeType.toLowerCase().startsWith('image/'));

  const handleCopyNumber = () => {
    if (document.documentNumber) {
      navigator.clipboard.writeText(document.documentNumber);
      setCopied(true);
      toast.success('Document number copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
        <DialogHeader className="p-5 pb-3 border-b bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                {title}
                {document.verificationStatus ? (
                  <StatusBadge status={document.verificationStatus} />
                ) : null}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {document.fileName || 'Document preview and verification'}
              </DialogDescription>
            </div>
            {fileUrl ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 gap-1.5 text-xs"
                >
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open full
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 gap-1.5 text-xs"
                >
                  <a href={fileUrl} download={document.fileName || 'document'}>
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </Button>
              </div>
            ) : null}
          </div>

          {document.documentNumber ? (
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border/60 text-xs">
              <span className="text-muted-foreground">Document Number:</span>
              <span className="font-mono font-medium bg-muted px-2 py-0.5 rounded border border-border">
                {document.documentNumber}
              </span>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="text-muted-foreground hover:text-foreground transition-colors ml-1 p-0.5"
                title="Copy number"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          ) : null}
        </DialogHeader>

        {/* Preview viewport */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[320px] max-h-[62vh] bg-slate-50/50">
          {!fileUrl ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-foreground">No file attached</p>
              <p className="text-xs mt-1">
                {document.documentNumber
                  ? `Only document number (${document.documentNumber}) was provided.`
                  : 'This document has not been uploaded yet.'}
              </p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-amber-800">
              <AlertCircle className="h-10 w-10 text-amber-600 mb-2" />
              <p className="text-sm font-medium">Failed to load preview</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                The file could not be displayed directly.
              </p>
              <Button asChild size="sm" variant="outline">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  Open link directly
                </a>
              </Button>
            </div>
          ) : isPdf ? (
            <div className="w-full h-full min-h-[460px] flex flex-col items-center">
              <iframe
                src={`${fileUrl}#toolbar=0`}
                className="w-full h-[460px] rounded-lg border bg-white"
                title={title}
                onError={() => setLoadError(true)}
              />
            </div>
          ) : isImage ? (
            <div className="relative flex flex-col items-center justify-center w-full">
              <div className="relative overflow-auto max-h-[55vh] flex items-center justify-center rounded-lg border bg-white p-2">
                <img
                  src={fileUrl}
                  alt={title}
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                  className="max-h-[50vh] max-w-full object-contain transition-transform duration-150"
                  onError={() => setLoadError(true)}
                />
              </div>
              <div className="flex items-center gap-2 mt-3 bg-white/90 border px-3 py-1 rounded-full shadow-sm">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  title="Zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-mono font-medium text-muted-foreground px-1">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  title="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                {zoom !== 1 ? (
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="text-[10px] text-amber-700 hover:underline ml-1"
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">{document.fileName || 'File Attachment'}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">{document.mimeType || 'Application file'}</p>
              <Button asChild size="sm" variant="outline">
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  Open File
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 px-5 border-t bg-muted/10 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
          <div className="flex items-center gap-4">
            {document.uploadedAt ? (
              <span>Uploaded: {format(new Date(document.uploadedAt), 'MMM d, yyyy h:mm a')}</span>
            ) : null}
            {document.rejectionReason ? (
              <span className="text-red-600 font-medium">Reason: {document.rejectionReason}</span>
            ) : null}
          </div>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
