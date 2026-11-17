import Image from 'next/image';
import { productImages } from '@/features/catalog/product-images';
import { productName } from '@/features/catalog/product-copy';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type ProductSummary } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';
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
 * brass seal turns. Where: left/top in %, width in rem, start offset and tilt, arch or square.
 */
const TABLE = [
  { left: '4%', top: '14%', w: 11, fx: '-40%', fy: '30%', fr: '-8deg', arch: true },
  { left: '15%', top: '58%', w: 8.5, fx: '-60%', fy: '-10%', fr: '6deg', arch: false },
  { left: '1%', top: '72%', w: 7, fx: '-30%', fy: '60%', fr: '-4deg', arch: false },
  { left: '82%', top: '8%', w: 9, fx: '50%', fy: '40%', fr: '7deg', arch: false },
  { left: '78%', top: '55%', w: 12, fx: '40%', fy: '-20%', fr: '-6deg', arch: true },
  { left: '64%', top: '70%', w: 7.5, fx: '20%', fy: '70%', fr: '5deg', arch: false },
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
      <div className="work-table relative w-full overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          {pieces.map((image, i) => {
            const t = TABLE[i]!;
            return (
              <span
                key={image.src + i}
                className={cn(
                  'table-piece absolute block overflow-hidden bg-sand shadow-[0_30px_80px_-40px_rgba(43,30,25,0.35)]',
                  t.arch ? 'aspect-[3/4] rounded-t-full' : 'aspect-[4/5]',
                )}
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
            className="table-seal absolute top-[9%] left-[60%] w-[10.5rem] text-walnut"
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
