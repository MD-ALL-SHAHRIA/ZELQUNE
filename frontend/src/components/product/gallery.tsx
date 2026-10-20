import { Photo } from '@/components/photo';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatNumber } from '@/i18n/format';
import { type ProductDetail } from '@/lib/api-types';

/** Swipeable gallery with CSS scroll-snap only (no client JS). */
export function Gallery({
  media,
  name,
  lang,
  dict,
}: {
  media: ProductDetail['media'];
  name: string;
  lang: Locale;
  dict: Dictionary;
}) {
  if (!media.length) {
    return (
      <Photo src={null} alt={name} placeholder={dict.ui.photoPlaceholder} sizes="100vw" priority />
    );
  }
  const total = formatNumber(media.length, lang);
  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
      {media.map((m, i) => (
        <figure key={m.id} className="w-full shrink-0 snap-center">
          <Photo
            src={m.url}
            alt={(lang === 'bn' ? m.altBn : m.altEn) ?? name}
            placeholder={dict.ui.photoPlaceholder}
            sizes="(min-width: 768px) 50vw, 100vw"
            priority={i === 0}
          />
          {media.length > 1 ? (
            <figcaption className="mt-1 text-center text-xs text-muted">
              {fill(dict.ui.photoCount, { n: formatNumber(i + 1, lang), total })}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
