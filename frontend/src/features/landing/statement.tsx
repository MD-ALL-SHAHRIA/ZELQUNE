import Image from 'next/image';
import { productImages } from '@/features/catalog/product-images';
import { productName } from '@/features/catalog/product-copy';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type ProductSummary } from '@/shared/api/types';
import { Container } from '@/shared/ui/typography';

/* The words drift left forever (two identical runs, shifted by half). Paused for reduced motion
   and while the pointer rests on the band. */
const MARQUEE_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .marquee .loop-run { animation: marquee 48s linear infinite; }
  .marquee:hover .loop-run { animation-play-state: paused; }
}
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
`;

/**
 * The brand's sentence on cream, then its promises drifting by on a slim walnut ribbon that
 * runs straight into the dark Services band below (the ribbon is the seam between light and
 * dark, and the page's accent).
 */
/**
 * The workshop table (desktop): pieces laid around the sentence. Each drifts in from its own
 * side at its own pace as the section crosses the screen (globals.css, .table-piece) and the
 * brass seal turns. Three arches a side, mirrored: left/top, width in rem, start offset, tilt.
 */
const TABLE = [
  { left: '5%', top: '10%', w: 12, fx: '-45%', fy: '25%', fr: '-5deg' },
  { left: '19%', top: '50%', w: 8, fx: '-70%', fy: '10%', fr: '4deg' },
  { left: '4%', top: '62%', w: 10, fx: '-35%', fy: '45%', fr: '-3deg' },
  { left: 'calc(95% - 12rem)', top: '10%', w: 12, fx: '45%', fy: '25%', fr: '5deg' },
  { left: 'calc(81% - 8rem)', top: '50%', w: 8, fx: '70%', fy: '10%', fr: '-4deg' },
  { left: 'calc(96% - 10rem)', top: '62%', w: 10, fx: '35%', fy: '45%', fr: '3deg' },
] as const;

export function Statement({
  dict,
  lang,
  products,
}: {
  dict: Dictionary;
  lang: Locale;
  products: ProductSummary[];
}) {
  const pieces = products.slice(0, TABLE.length).flatMap((p) => {
    const name = productName(p, lang, dict);
    return productImages(p.primaryMedia ? [p.primaryMedia] : [], name, lang, p.slug).slice(0, 1);
  });

  const words = dict.premium.marquee;
  // Lit word by word as it scrolls past (globals.css, .lit-word); plain text without support.
  const statement = dict.premium.statement.split(' ');
  const seal = `${words.join(' · ')} · `;
  const run = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {words.map((w) => (
        <li key={w} className="flex items-center">
          <span className="px-6 font-display text-[1.5rem] leading-none italic sm:px-9 sm:text-[2rem] lg:text-[2.4rem] [:lang(bn)_&]:not-italic">
            {w}
          </span>
          <span aria-hidden className="size-1.5 shrink-0 rotate-45 bg-current opacity-60" />
        </li>
      ))}
    </ul>
  );
  return (
    <section className="bg-cream text-ink">
      <style>{MARQUEE_CSS}</style>
      <div className="work-table relative w-full overflow-clip">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          {pieces.map((image, i) => {
            const t = TABLE[i]!;
            return (
              <span
                key={image.src + i}
                className="table-piece absolute block aspect-[3/4] overflow-hidden rounded-t-full bg-sand shadow-[0_30px_80px_-40px_rgba(43,30,25,0.35)]"
                style={
                  {
                    left: t.left,
                    top: t.top,
                    width: `${t.w}rem`,
                    '--fx': t.fx,
                    '--fy': t.fy,
                    '--fr': t.fr,
                  } as React.CSSProperties
                }
              >
                <Image src={image.src} alt="" fill sizes="12rem" className="object-cover" />
              </span>
            );
          })}
          {/* The brass seal: the promises on a ring, turning with the scroll. */}
          <svg
            viewBox="0 0 200 200"
            className="table-seal absolute top-[4%] left-[calc(50%-4.75rem)] w-[9.5rem] text-walnut"
          >
            <defs>
              <path id="seal-ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
            </defs>
            <circle
              cx="100"
              cy="100"
              r="96"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.5"
            />
            <text className="fill-current font-sans text-[13px] font-medium uppercase tracking-[0.2em] [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal">
              <textPath href="#seal-ring" textLength="486" lengthAdjust="spacing">
                {seal}
              </textPath>
            </text>
            <rect
              x="94"
              y="94"
              width="12"
              height="12"
              transform="rotate(45 100 100)"
              className="fill-current"
            />
          </svg>
        </div>
        <Container className="reveal relative flex flex-col items-center py-20 text-center sm:py-24 lg:py-56">
          {/* A small brass mark: a rule, a diamond, a rule. */}
          <span aria-hidden className="mb-9 flex items-center gap-3 text-walnut">
            <span className="h-px w-10 bg-current" />
            <span className="size-1.5 rotate-45 bg-current" />
            <span className="h-px w-10 bg-current" />
          </span>
          <p className="lit max-w-[24ch] font-display text-[2rem] leading-[1.12] tracking-[-0.01em] text-balance sm:text-[2.8rem] lg:text-[3.5rem] [:lang(bn)_&]:font-normal [:lang(bn)_&]:leading-[1.35] [:lang(bn)_&]:tracking-normal">
            {statement.map((word, i) => (
              <span
                key={i}
                className="lit-word"
                style={{ '--p': i / statement.length } as React.CSSProperties}
              >
                {word}{' '}
              </span>
            ))}
          </p>
        </Container>
      </div>
      <div data-loop className="marquee overflow-hidden bg-walnut py-5 text-paper sm:py-6">
        <div className="loop-run flex w-max">
          {run(false)}
          {run(true)}
        </div>
      </div>
    </section>
  );
}
