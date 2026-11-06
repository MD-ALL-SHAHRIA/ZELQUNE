import { bn } from '@/i18n/dictionaries/bn';
import { en } from '@/i18n/dictionaries/en';
import { ButtonLink } from '@/shared/ui/button';
import { Container } from '@/shared/ui/typography';

// not-found.tsx gets no params, so the page speaks both languages and links to both homes.
export default function NotFound() {
  return (
    <section className="glow relative overflow-hidden border-b border-line">
      <Container className="grid min-h-[68svh] place-items-center py-20 text-center sm:py-28">
        <div className="flex flex-col items-center">
          {/* The arch, the brand's one curve, framing the number like a doorway. */}
          <div
            aria-hidden
            className="grid h-44 w-32 place-items-end justify-center rounded-t-full border border-ink/25 pb-7 sm:h-56 sm:w-40"
          >
            <span className="font-display text-5xl font-medium italic leading-none text-walnut sm:text-6xl">
              404
            </span>
          </div>
          <h1 className="mt-12 max-w-xl font-display text-[clamp(2rem,1.5rem+2vw,3.1rem)] font-medium leading-[1.08] tracking-[-0.01em] text-balance">
            {en.ui.notFound}
          </h1>
          <p
            lang="bn"
            className="mt-4 max-w-xl font-display text-[clamp(1.35rem,1.15rem+0.9vw,1.9rem)] leading-snug text-ink/70 text-balance"
          >
            {bn.ui.notFound}
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <ButtonLink href="/en" hrefLang="en">
              {en.ui.backHome}
            </ButtonLink>
            <span lang="bn" className="contents">
              <ButtonLink href="/bn" hrefLang="bn" variant="outline">
                {bn.ui.backHome}
              </ButtonLink>
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
