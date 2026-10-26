import 'server-only';
import { createApiClient, type Schemas } from '@zelqune/api-client';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { applyTexts } from '@/content/editable-texts';

export type HomeContent = NonNullable<Schemas['HomeContentResponseDto_Output']['home']>['content'];

/** Content edits show on the site within a minute (ISR). */
const CONTENT_REVALIDATE_SECONDS = 60;

const api = createApiClient(
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  { fetch: (request) => fetch(request, { next: { revalidate: CONTENT_REVALIDATE_SECONDS } }) },
);

/**
 * The owner's home content from the dashboard (ADR 0015), or null before the first save or when
 * the backend is unreachable: the site then uses its built-in copy, so it never breaks.
 */
export async function getHomeContent(): Promise<HomeContent | null> {
  try {
    const { data } = await api.GET('/v1/content/home');
    return data?.home?.content ?? null;
  } catch {
    return null;
  }
}

const pick = (value: { en: string; bn: string } | undefined, lang: Locale, fallback: string) => {
  const text = value?.[lang]?.trim();
  return text ? text : fallback;
};

/** The dictionary with the owner's texts laid over it (empty fields keep the built-in copy). */
export function withContent(
  dict: Dictionary,
  content: HomeContent | null,
  lang: Locale,
): Dictionary {
  if (!content) return dict;
  const h = content.hero;
  const base = applyTexts(dict, content.texts, lang);
  return {
    ...base,
    layout: {
      ...base.layout,
      announcement: pick(content.announcement, lang, dict.layout.announcement),
    },
    home: {
      ...base.home,
      heroHeading: pick(h.heading, lang, dict.home.heroHeading),
      heroHeadingAccent: pick(h.accent, lang, dict.home.heroHeadingAccent),
      heroSubline: pick(h.subline, lang, dict.home.heroSubline),
    },
    landing: {
      ...base.landing,
      heroEyebrow: pick(h.eyebrow, lang, dict.landing.heroEyebrow),
      values: content.trust.length
        ? content.trust.map((t, i) => ({
            title: pick(t.title, lang, base.landing.values[i]?.title ?? ''),
            text: pick(t.text, lang, base.landing.values[i]?.text ?? ''),
          }))
        : base.landing.values,
    },
  };
}
