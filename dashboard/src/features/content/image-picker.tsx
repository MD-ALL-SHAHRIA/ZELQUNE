'use client';

import { ImagePlus, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { checkImage, type ImageType, putFile } from '@/lib/upload';

/**
 * Uploads a content image (presigned PUT, then confirm) and reports its asset id. Shows the
 * current image, or the site's built-in sample when none is set. Drop a file or click.
 */
export function ImagePicker({
  url,
  fallback,
  onChange,
  label,
  aspect = 'aspect-[16/9]',
}: {
  url: string | null;
  /** What the site shows when no image is uploaded. */
  fallback?: string;
  onChange: (asset: { id: string; url: string } | null) => void;
  label: string;
  aspect?: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const upload = async (file: File) => {
    const problem = checkImage(file);
    if (problem) return toast('error', problem);
    setBusy(true);
    const ticket = await api.POST('/v1/admin/content/assets/uploads', {
      body: { mimeType: file.type as ImageType, bytes: file.size },
    });
    if (!ticket.data) {
      setBusy(false);
      return toast('error', errorMessage(ticket.error));
    }
    if (!(await putFile(ticket.data, file))) {
      setBusy(false);
      return toast('error', 'The upload failed. Try again.');
    }
    const done = await api.POST('/v1/admin/content/assets/{id}/confirm', {
      params: { path: { id: ticket.data.assetId } },
    });
    setBusy(false);
    if (done.data) onChange({ id: done.data.id, url: done.data.url });
    else toast('error', errorMessage(done.error));
  };

  const shown = url ?? fallback ?? null;
  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const file = e.dataTransfer.files[0];
          if (file) void upload(file);
        }}
        className={cn(
          'group relative block cursor-pointer overflow-hidden rounded-xl border bg-sand transition-colors',
          aspect,
          drag ? 'border-walnut ring-3 ring-walnut/20' : 'border-line hover:border-ink/30',
        )}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of the stored file
          <img
            src={shown}
            alt={label}
            className={cn(
              'absolute inset-0 h-full w-full object-cover',
              !url && 'opacity-70 saturate-50',
            )}
          />
        ) : null}
        <span
          className={cn(
            'absolute inset-0 grid place-items-center bg-espresso/0 transition-colors',
            shown || busy ? 'text-ivory' : 'text-stone group-hover:text-ivory',
            busy ? 'bg-espresso/55' : 'group-hover:bg-espresso/45',
          )}
        >
          <span
            className={cn(
              'flex flex-col items-center gap-1 text-[0.8125rem] font-medium',
              busy || !shown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
          >
            <ImagePlus className="size-5" aria-hidden />
            {busy ? 'Uploading…' : url ? 'Replace photo' : 'Upload photo'}
          </span>
        </span>
        {!url && fallback && !busy ? (
          <span className="absolute top-2 left-2 rounded-md bg-surface/90 px-1.5 py-0.5 text-[0.6875rem] font-medium text-stone">
            Site sample
          </span>
        ) : null}
        <input
          type="file"
          accept="image/webp,image/jpeg,image/png,image/avif"
          aria-label={label}
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void upload(file);
          }}
        />
      </label>
      {url ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-stone hover:text-ink"
        >
          <RotateCcw className="size-3" aria-hidden />{' '}
          {fallback ? 'Use the site sample' : 'Remove photo'}
        </button>
      ) : null}
    </div>
  );
}
