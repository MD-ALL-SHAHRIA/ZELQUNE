'use client';

export const IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/avif'] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Checks the file before asking the gateway for an upload ticket. */
export function checkImage(file: File): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type))
    return 'Use a WebP, JPEG, PNG or AVIF image.';
  if (file.size > MAX_IMAGE_BYTES) return 'The image is larger than 10 MB.';
  return null;
}

/** PUTs the file to the presigned URL from the ticket. */
export async function putFile(
  ticket: { uploadUrl: string; method: 'PUT'; headers: Record<string, string> },
  file: File,
): Promise<boolean> {
  const res = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: file });
  return res.ok;
}
