import Image from 'next/image';
import { type Locale } from '@/i18n/config';
import { type HomeContent } from '@/shared/api/content';
import { cn } from '@/shared/lib/cn';

export type Project = HomeContent['projects'][number];

const pick = (v: { en: string; bn: string }, lang: Locale) => v[lang].trim() || v.en.trim();

/**
 * Real projects the owner added in the dashboard (Content → Projects): the first photo large,
 * up to three more as a strip, then the place, title and a short note.
 */
export function ProjectGrid({ projects, lang }: { projects: Project[]; lang: Locale }) {
  return (
    <ul
      className={cn(
        'mx-auto grid gap-x-8 gap-y-14',
        // One or two projects sit centred instead of hugging the left of a three-column grid.
        projects.length === 1
          ? 'max-w-xl'
          : projects.length === 2
            ? 'max-w-4xl sm:grid-cols-2'
            : 'sm:grid-cols-2 lg:grid-cols-3',
      )}
    >
      {projects.map((p, i) => {
        const [cover, ...more] = p.imageUrls;
        const title = pick(p.title, lang);
        return (
          <li key={`${p.title.en}-${i}`} className="reveal space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden bg-paper">
              {cover ? (
                <Image
                  src={cover}
                  alt={title}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : null}
            </div>
            {more.length ? (
              <div className="grid grid-cols-3 gap-2">
                {more.slice(0, 3).map((src, j) => (
                  <div key={src} className="relative aspect-square overflow-hidden bg-paper">
                    <Image
                      src={src}
                      alt={`${title} ${j + 2}`}
                      fill
                      sizes="(min-width: 1024px) 11vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
            <div className="space-y-1.5">
              {pick(p.location, lang) ? (
                <p className="text-[0.75rem] font-semibold tracking-[0.2em] text-stone uppercase [:lang(bn)_&]:tracking-normal [:lang(bn)_&]:normal-case">
                  {pick(p.location, lang)}
                </p>
              ) : null}
              <h3 className="font-display text-[1.6rem] leading-tight">{title}</h3>
              {pick(p.text, lang) ? (
                <p className="text-[0.95rem] leading-relaxed text-ink/75">{pick(p.text, lang)}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
