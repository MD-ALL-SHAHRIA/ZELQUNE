import Image from 'next/image';
import Link from 'next/link';
import { SAMPLE } from '@/content/sample-images';
import { Logo } from '@/shared/ui/logo';

/**
 * Sign-in pages: a quiet split. A full-height room photo with the promise on the left
 * (desktop), the form in a calm column on the right. Phones get the form only. No site header
 * or footer (the (auth) route group): only the logo, which leads back home.
 */
export function AuthShell({
  brandTitle,
  brandText,
  brandName,
  homeHref,
  title,
  lead,
  children,
}: {
  brandTitle: string;
  brandText: string;
  brandName: string;
  homeHref: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="tone-dark hidden bg-night text-ivory lg:block">
        {/* Pinned in view while a long form scrolls past. */}
        <div className="sticky top-0 h-svh overflow-hidden">
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
      <div className="flex flex-col items-center px-5 py-8 sm:py-10 lg:px-16">
        <Link
          href={homeHref}
          aria-label={brandName}
          className="self-start transition-opacity duration-500 hover:opacity-70 lg:self-center"
        >
          <Logo className="gap-2.5 [&>span]:text-[1.06rem] [&>svg]:h-6 lg:[&>span]:text-[1.2rem] lg:[&>svg]:h-7" />
        </Link>
        <div className="my-auto w-full max-w-[26rem] space-y-8 py-10 sm:py-12">
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
