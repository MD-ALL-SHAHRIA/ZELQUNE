import Image from 'next/image';
import { SAMPLE } from '@/content/sample-images';

/**
 * Sign-in pages: a quiet split. A full-height room photo with the promise on the left
 * (desktop), the form in a calm column on the right. Phones get the form only.
 */
export function AuthShell({
  brandTitle,
  brandText,
  title,
  lead,
  children,
}: {
  brandTitle: string;
  brandText: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-9rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="tone-dark hidden bg-night text-ivory lg:block">
        {/* Pinned in view while a long form scrolls past. */}
        <div className="sticky top-36 h-[calc(100svh-9rem)] overflow-hidden">
          <Image
            src={SAMPLE.livingNeutral.src}
            alt=""
            fill
            sizes="50vw"
            className="object-cover opacity-70"
            priority
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,18,15,0.15),rgba(26,18,15,0.85))]"
          />
          <div className="absolute inset-x-12 bottom-14 max-w-md space-y-5">
            <span aria-hidden className="block h-20 w-14 rounded-t-full border border-amber/70" />
            <p className="font-display text-[2.6rem] leading-[1.05]">{brandTitle}</p>
            <p className="text-lg leading-relaxed text-ivory/80">{brandText}</p>
          </div>
        </div>
      </aside>
      <div className="flex items-start justify-center px-5 py-12 sm:py-16 lg:items-center lg:px-16">
        <div className="w-full max-w-[26rem] space-y-8">
          <div className="space-y-3">
            <h1 className="font-display text-[2.4rem] font-medium leading-tight [:lang(bn)_&]:text-[2rem]">
              {title}
            </h1>
            {lead ? <p className="leading-relaxed text-stone">{lead}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
