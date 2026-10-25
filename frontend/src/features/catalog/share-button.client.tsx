'use client';

import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';

/**
 * One share action beside the title (Apex pattern: wishlist and sharing moved out of the buy
 * area). Uses the phone's share sheet when there is one, otherwise copies the link.
 */
export function ShareButton({
  url,
  title,
  copy,
}: {
  url: string;
  title: string;
  copy: { share: string; linkCopied: string };
}) {
  const [copied, setCopied] = useState(false);
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // The visitor closed the share sheet: nothing to do.
    }
  }
  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={copied ? copy.linkCopied : copy.share}
      title={copied ? copy.linkCopied : copy.share}
      className="grid size-11 shrink-0 place-items-center border border-line text-ink/80 transition-colors duration-300 hover:border-ink hover:text-ink"
    >
      {copied ? (
        <Check aria-hidden strokeWidth={1.5} className="size-[1.1rem]" />
      ) : (
        <Share2 aria-hidden strokeWidth={1.4} className="size-[1.1rem]" />
      )}
      <span role="status" className="sr-only">
        {copied ? copy.linkCopied : ''}
      </span>
    </button>
  );
}
