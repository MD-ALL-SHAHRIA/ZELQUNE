import { ImageResponse } from 'next/og';
import { productImages } from '@/features/catalog/product-images';
import { en } from '@/i18n/dictionaries/en';
import { formatNumber } from '@/i18n/format';
import { getProduct, REVALIDATE_SECONDS } from '@/shared/api/server';
import { resolvePage } from '@/shared/lib/page-params';

// ISR like the page: rendered on first request, refreshed at most every 5 minutes.
export const revalidate = 300;

const SIZE = { width: 1200, height: 630 };

/**
 * One branded share card per product (Facebook, WhatsApp, Messenger). The id ends in ".png" so
 * the URL has a file extension, which keeps it out of the language/price-arm proxy.
 */
export function generateImageMetadata() {
  return [{ id: 'card.png', size: SIZE, contentType: 'image/png', alt: en.brand.name }];
}

type Params = Promise<{ lang: string; exp: string; slug: string }>;

/** A Google Fonts face subset to exactly the text drawn (TTF, which the renderer needs). */
async function googleFont(family: string, weight: number, text: string) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${family.replaceAll(' ', '+')}:wght@${weight}&text=${encodeURIComponent(text)}`,
      { next: { revalidate: 60 * 60 * 24 * 7 } },
    ).then((r) => (r.ok ? r.text() : ''));
    const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    if (!url) return null;
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 } });
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** The photo as a data URL when it is a JPEG or PNG (the only formats the renderer draws). */
async function photo(src: string): Promise<string | null> {
  try {
    const url = src.startsWith('https://images.unsplash.com/')
      ? `${src}?w=900&h=1080&fit=crop&q=80&fm=jpg`
      : src;
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !/image\/(jpeg|png)/.test(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:${type.split(';')[0]};base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * Latin text only (the renderer cannot shape Bangla), so the card always uses the English name;
 * the ৳ sign comes from a one-glyph Hind Siliguri subset.
 */
export default async function Image({ params }: { params: Params }) {
  const { segment } = await resolvePage(params);
  const { slug } = await params;
  const product = await getProduct(slug, segment);
  const name = product ? (en.products[product.slug]?.name ?? product.nameEn) : en.brand.name;
  const category = product?.categories[0]?.nameEn ?? '';
  const amount = product?.variants[0]?.price?.amountPaisa ?? product?.fromPrice?.amountPaisa;
  const price = amount ? formatNumber(amount / 100, 'en') : null;
  const hero = product ? productImages(product.media, name, 'en', product.slug)[0] : undefined;
  const promise = en.premium.trust.items[0]?.title ?? '';
  // Sample photos keep their note, even on the share card.
  const note = hero?.sample ? en.landing.sampleNote : null;

  const [display, taka, img] = await Promise.all([
    googleFont(
      'Cormorant Garamond',
      400,
      `${name}${price ?? ''}ZELQUNEBDT ${category.toUpperCase()}${promise}${note ?? ''}`,
    ),
    price ? googleFont('Hind Siliguri', 400, '৳') : Promise.resolve(null),
    hero ? photo(hero.src) : Promise.resolve(null),
  ]);
  const fonts = [
    ...(display ? [{ name: 'Display', data: display, weight: 400 as const }] : []),
    ...(taka ? [{ name: 'Taka', data: taka, weight: 400 as const }] : []),
  ];
  const serif = display ? 'Display, Taka' : 'Taka';
  const currency = taka ? '৳' : 'BDT ';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        fontFamily: serif,
        background: '#FAF6EF',
        color: '#16120F',
        padding: 48,
        gap: 64,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            width: 440,
            height: note ? 506 : 534,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#EDE3D3',
            borderTopLeftRadius: 220,
            borderTopRightRadius: 220,
            overflow: 'hidden',
          }}
        >
          {img ? (
            <img
              src={img}
              width={440}
              height={note ? 506 : 534}
              alt=""
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <svg width="150" height="225" viewBox="0 0 64 96">
              <path
                d="M4 92V32a28 28 0 0 1 56 0v60z"
                fill="none"
                stroke="#E3A857"
                strokeWidth="3"
              />
              <path d="M20 84V44M32 84V36M44 84V44" stroke="#4A3426" strokeWidth="3" />
            </svg>
          )}
        </div>
        {img && note ? <div style={{ fontSize: 15, color: '#6A5E51' }}>{note}</div> : null}
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          paddingTop: 8,
          paddingBottom: 4,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="30" height="45" viewBox="0 0 64 96">
            <path d="M4 92V32a28 28 0 0 1 56 0v60z" fill="#16120F" />
            <path d="M20 84V44M32 84V36M44 84V44" stroke="#FAF6EF" strokeWidth="5" />
          </svg>
          <div style={{ fontFamily: serif, fontSize: 30, letterSpacing: 12 }}>ZELQUNE</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {category ? (
            <div style={{ fontSize: 18, letterSpacing: 5, color: '#6A5E51' }}>
              {category.toUpperCase()}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: serif,
              fontSize: name.length > 22 ? 70 : 88,
              lineHeight: 1.02,
              letterSpacing: -1,
            }}
          >
            {name}
          </div>
          {price ? (
            <div style={{ fontFamily: serif, fontSize: 54, color: '#4A3426' }}>
              {`${currency}${price}`}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 28 }}>
          <div style={{ width: 44, height: 2, background: '#E3A857' }} />
          <div style={{ color: '#4A3426' }}>{promise}</div>
        </div>
      </div>
    </div>,
    { ...SIZE, fonts: fonts.length ? fonts : undefined },
  );
}
