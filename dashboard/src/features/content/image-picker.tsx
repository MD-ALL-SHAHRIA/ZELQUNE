'use client';

import { ImagePlus, X } from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { checkImage, type ImageType, putFile } from '@/lib/upload';

/**
 * Uploads a content image (presigned PUT, then confirm) and reports its asset id. Shows the
 * current image, or a note that the site's sample is used.
 */
export function ImagePicker({
  url,
  onChange,
  label,
}: {
  url: string | null;
  onChange: (asset: { id: string; url: string } | null) => void;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    const problem = checkImage(file);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    const ticket = await api.POST('/v1/admin/content/assets/uploads', {
      body: { mimeType: file.type as ImageType, bytes: file.size },
    });
    if (!ticket.data) {
      setBusy(false);
      return setError(errorMessage(ticket.error));
    }
    if (!(await putFile(ticket.data, file))) {
      setBusy(false);
      return setError('The upload failed. Try again.');
    }
    const done = await api.POST('/v1/admin/content/assets/{id}/confirm', {
      params: { path: { id: ticket.data.assetId } },
    });
    setBusy(false);
    if (done.data) onChange({ id: done.data.id, url: done.data.url });
    else setError(errorMessage(done.error));
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-[0.78rem] font-medium text-stone">{label}</span>
      <div className="flex items-center gap-3">
        <div className="relative grid aspect-[16/9] w-36 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-sand text-center text-[0.7rem] text-stone">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview of the stored file
            <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="px-2">Site sample</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-1.5 text-[0.8rem] hover:bg-sand">
            <ImagePlus className="size-4" aria-hidden />{' '}
            {busy ? 'Uploading…' : url ? 'Replace' : 'Upload'}
            <input
              type="file"
              accept="image/webp,image/jpeg,image/png,image/avif"
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
              className="inline-flex items-center gap-1.5 text-[0.75rem] text-stone hover:text-ink"
            >
              <X className="size-3.5" aria-hidden /> Use the sample
            </button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-[0.75rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
