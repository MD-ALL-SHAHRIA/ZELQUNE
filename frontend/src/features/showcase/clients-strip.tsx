import Image from 'next/image';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type HomeContent } from '@/shared/api/content';
import { Container } from '@/shared/ui/typography';

type Client = HomeContent['clients'][number];

/* Two identical runs drift left, shifted by half; paused for reduced motion and on hover. */
const STRIP_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .clients-run { animation: clients 40s linear infinite; }
  .clients:hover .clients-run { animation-play-state: paused; }
}
@keyframes clients { from { transform: translateX(0); } to { transform: translateX(-50%); } }
`;

/**
 * Businesses that bought from Zelqune (Content → Clients): logos drift by like the statement
 * band. Hidden until the owner adds at least one; nothing here is invented.
 */
export function ClientsStrip({ clients, dict }: { clients: Client[]; dict: Dictionary }) {
  if (!clients.length) return null;
  // Repeat short lists so one run is wider than the screen.
  const items = Array.from({ length: Math.ceil(8 / clients.length) }, () => clients).flat();
  const run = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((c, i) => {
        const logo = c.logoUrl ? (
          <span className="relative block h-12 w-36 sm:h-14 sm:w-44">
            <Image
              src={c.logoUrl}
              alt={hidden ? '' : c.name}
              fill
              sizes="176px"
              className="object-contain opacity-70 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0"
            />
          </span>
        ) : (
          <span className="font-display text-[1.6rem] whitespace-nowrap text-ink/70 transition-colors group-hover:text-ink">
            {c.name}
          </span>
        );
        return (
          <li key={`${c.name}-${i}`} className="px-8 sm:px-12">
            {c.url && !hidden ? (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
                title={c.name}
              >
                {logo}
              </a>
            ) : (
              <span className="group block" title={c.name}>
                {logo}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
  return (
    <section aria-labelledby="clients-heading" className="border-y border-line py-12 sm:py-16">
      <style>{STRIP_CSS}</style>
      <Container>
        <h2
          id="clients-heading"
          className="text-center text-[0.8rem] font-semibold tracking-[0.24em] text-stone uppercase [:lang(bn)_&]:tracking-normal [:lang(bn)_&]:normal-case [:lang(bn)_&]:text-[0.95rem]"
        >
          {dict.home2.clientsHeading}
        </h2>
      </Container>
      <div className="clients mt-8 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="clients-run flex w-max">
          {run(false)}
          {run(true)}
        </div>
      </div>
    </section>
  );
}
