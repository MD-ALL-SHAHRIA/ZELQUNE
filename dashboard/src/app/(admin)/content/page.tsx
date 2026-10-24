'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardTitle, Field, Input, Notice, PageHeader, Select } from '@/components/ui';
import {
  DEFAULT_HOME,
  type HomeContent,
  type Localized,
  TRUST_ICONS,
} from '@/features/content/defaults';
import { ImagePicker } from '@/features/content/image-picker';
import { api, errorCode, errorMessage, type Schemas } from '@/lib/api';
import { humanize } from '@/lib/format';

type Product = Schemas['AdminProductListDto_Output']['items'][number];
type Category = Schemas['AdminCategoryListDto_Output']['items'][number];
/** Image URLs for previews, by asset id (the document stores ids only). */
type Previews = Record<string, string>;

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item as T);
  return copy;
}

/** English + Bangla inputs for one text. */
function Bilingual({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: Localized;
  onChange: (v: Localized) => void;
  max: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={`${label} (English)`}>
        <Input
          value={value.en}
          maxLength={max}
          onChange={(e) => onChange({ ...value, en: e.target.value })}
        />
      </Field>
      <Field label={`${label} (Bangla)`}>
        <Input
          lang="bn"
          value={value.bn}
          maxLength={max}
          onChange={(e) => onChange({ ...value, bn: e.target.value })}
        />
      </Field>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-md border border-line text-ink hover:bg-sand disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** The home page editor: everything the storefront's home shows, in English and Bangla. */
export default function ContentPage() {
  const [content, setContent] = useState<HomeContent | null>(null);
  const [version, setVersion] = useState(0);
  const [previews, setPreviews] = useState<Previews>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [home, prods, cats] = await Promise.all([
      api.GET('/v1/admin/content/home'),
      api.GET('/v1/admin/products', { params: { query: { limit: 100 } } }),
      api.GET('/v1/admin/categories'),
    ]);
    if (prods.data) setProducts(prods.data.items);
    if (cats.data) setCategories(cats.data.items);
    if (!home.data) return setError(errorMessage(home.error));
    const view = home.data.home;
    if (!view) {
      setContent(structuredClone(DEFAULT_HOME));
      setVersion(0);
      return;
    }
    const next: Previews = {};
    for (const s of view.content.hero.scenes)
      if (s.assetId && s.imageUrl) next[s.assetId] = s.imageUrl;
    for (const c of view.content.collections)
      if (c.assetId && c.imageUrl) next[c.assetId] = c.imageUrl;
    setPreviews(next);
    setVersion(view.version);
    setContent({
      ...view.content,
      hero: {
        ...view.content.hero,
        scenes: view.content.hero.scenes.map(({ imageUrl: _, ...s }) => s),
      },
      collections: view.content.collections.map(({ imageUrl: _, ...c }) => c),
    });
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() awaits the API before setting state
    void load();
  }, [load]);

  const save = async () => {
    if (!content) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    const { data, error } = await api.PUT('/v1/admin/content/home', {
      body: { expectedVersion: version, content },
    });
    setBusy(false);
    if (data) {
      setVersion(data.version);
      setSaved('Saved. The site shows the new content within a minute.');
    } else if (errorCode(error) === 'CONTENT_VERSION_CONFLICT') {
      setError(
        'Someone else saved in the meantime. Reload the page to see their changes, then edit again.',
      );
    } else setError(errorMessage(error, 'Could not save. Check the fields and try again.'));
  };

  if (!content) {
    return error ? (
      <Notice tone="error">{error}</Notice>
    ) : (
      <p role="status" className="text-sm text-stone">
        Loading…
      </p>
    );
  }
  const hero = content.hero;
  const setHero = (patch: Partial<HomeContent['hero']>) =>
    setContent({ ...content, hero: { ...hero, ...patch } });
  const productName = (slug: string) => products.find((p) => p.slug === slug)?.nameEn ?? slug;
  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.nameEn ?? slug;

  return (
    <>
      <PageHeader
        title="Home page"
        description={
          version ? `Version ${version}` : 'Not saved yet: the site shows its built-in copy.'
        }
        actions={
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        }
      />
      <div className="mb-5 space-y-3">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {saved ? <Notice tone="ok">{saved}</Notice> : null}
      </div>

      <div className="space-y-5">
        <Card>
          <CardTitle>Announcement bar</CardTitle>
          <Bilingual
            label="Text"
            max={140}
            value={content.announcement}
            onChange={(announcement) => setContent({ ...content, announcement })}
          />
        </Card>

        <Card>
          <CardTitle>Hero words</CardTitle>
          <div className="space-y-4">
            <Bilingual
              label="Small top line"
              max={80}
              value={hero.eyebrow}
              onChange={(eyebrow) => setHero({ eyebrow })}
            />
            <Bilingual
              label="Headline"
              max={160}
              value={hero.heading}
              onChange={(heading) => setHero({ heading })}
            />
            <Bilingual
              label="Gold italic words (end of headline)"
              max={60}
              value={hero.accent}
              onChange={(accent) => setHero({ accent })}
            />
            <Bilingual
              label="Line under the headline"
              max={200}
              value={hero.subline}
              onChange={(subline) => setHero({ subline })}
            />
          </div>
        </Card>

        <Card>
          <CardTitle
            aside={
              <Button
                variant="secondary"
                size="sm"
                disabled={hero.scenes.length >= 8 || products.length === 0}
                onClick={() =>
                  setHero({
                    scenes: [
                      ...hero.scenes,
                      {
                        assetId: null,
                        productSlug: products[0]?.slug ?? '',
                        position: '76% 50%',
                        phonePosition: '95% 50%',
                      },
                    ],
                  })
                }
              >
                <Plus className="size-4" aria-hidden /> Add scene
              </Button>
            }
          >
            Hero scenes
          </CardTitle>
          <p className="mb-4 text-sm text-stone">
            Wide room photos (landscape, 2400px or more) with the piece on the right. The order here
            is the order on the site.
          </p>
          <ol className="space-y-4">
            {hero.scenes.map((s, i) => {
              const update = (patch: Partial<typeof s>) =>
                setHero({ scenes: hero.scenes.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <li key={i} className="rounded-lg border border-line p-4">
                  <div className="flex flex-wrap items-start gap-5">
                    <ImagePicker
                      label="Scene photo"
                      url={s.assetId ? (previews[s.assetId] ?? null) : null}
                      onChange={(asset) => {
                        if (asset) setPreviews({ ...previews, [asset.id]: asset.url });
                        update({ assetId: asset?.id ?? null });
                      }}
                    />
                    <div className="grid min-w-[16rem] flex-1 gap-3 sm:grid-cols-3">
                      <Field label="Piece shown" className="sm:col-span-3">
                        <Select
                          value={s.productSlug}
                          onChange={(e) => update({ productSlug: e.target.value })}
                        >
                          {!products.some((p) => p.slug === s.productSlug) ? (
                            <option value={s.productSlug}>{productName(s.productSlug)}</option>
                          ) : null}
                          {products.map((p) => (
                            <option key={p.id} value={p.slug}>
                              {p.nameEn}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Piece position (wide screens)" hint="Across %, down %">
                        <Input
                          value={s.position}
                          onChange={(e) => update({ position: e.target.value })}
                        />
                      </Field>
                      <Field label="Piece position (phones)">
                        <Input
                          value={s.phonePosition}
                          onChange={(e) => update({ phonePosition: e.target.value })}
                        />
                      </Field>
                      <div className="flex items-end gap-2">
                        <IconButton
                          label="Move up"
                          disabled={i === 0}
                          onClick={() => setHero({ scenes: move(hero.scenes, i, i - 1) })}
                        >
                          <ArrowUp className="size-4" aria-hidden />
                        </IconButton>
                        <IconButton
                          label="Move down"
                          disabled={i === hero.scenes.length - 1}
                          onClick={() => setHero({ scenes: move(hero.scenes, i, i + 1) })}
                        >
                          <ArrowDown className="size-4" aria-hidden />
                        </IconButton>
                        <IconButton
                          label="Remove scene"
                          disabled={hero.scenes.length <= 1}
                          onClick={() => setHero({ scenes: hero.scenes.filter((_, j) => j !== i) })}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </IconButton>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card>
          <CardTitle
            aside={
              <Button
                variant="secondary"
                size="sm"
                disabled={content.trust.length >= 6}
                onClick={() =>
                  setContent({
                    ...content,
                    trust: [
                      ...content.trust,
                      { icon: 'sparkles', title: { en: '', bn: '' }, text: { en: '', bn: '' } },
                    ],
                  })
                }
              >
                <Plus className="size-4" aria-hidden /> Add item
              </Button>
            }
          >
            Trust strip
          </CardTitle>
          <p className="mb-4 text-sm text-stone">Facts only (from your terms). 2 to 6 items.</p>
          <ol className="space-y-4">
            {content.trust.map((t, i) => {
              const update = (patch: Partial<typeof t>) =>
                setContent({
                  ...content,
                  trust: content.trust.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                });
              return (
                <li key={i} className="space-y-3 rounded-lg border border-line p-4">
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label="Icon" className="w-44">
                      <Select
                        value={t.icon}
                        onChange={(e) => update({ icon: e.target.value as typeof t.icon })}
                      >
                        {TRUST_ICONS.map((icon) => (
                          <option key={icon} value={icon}>
                            {humanize(icon)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <IconButton
                      label="Move up"
                      disabled={i === 0}
                      onClick={() =>
                        setContent({ ...content, trust: move(content.trust, i, i - 1) })
                      }
                    >
                      <ArrowUp className="size-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      label="Move down"
                      disabled={i === content.trust.length - 1}
                      onClick={() =>
                        setContent({ ...content, trust: move(content.trust, i, i + 1) })
                      }
                    >
                      <ArrowDown className="size-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      label="Remove item"
                      disabled={content.trust.length <= 2}
                      onClick={() =>
                        setContent({ ...content, trust: content.trust.filter((_, j) => j !== i) })
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </IconButton>
                  </div>
                  <Bilingual
                    label="Title"
                    max={40}
                    value={t.title}
                    onChange={(title) => update({ title })}
                  />
                  <Bilingual
                    label="Line"
                    max={80}
                    value={t.text}
                    onChange={(text) => update({ text })}
                  />
                </li>
              );
            })}
          </ol>
        </Card>

        <Card>
          <CardTitle
            aside={
              <Select
                aria-label="Add a collection"
                className="w-52"
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  setContent({
                    ...content,
                    collections: [
                      ...content.collections,
                      { categorySlug: e.target.value, assetId: null },
                    ],
                  });
                }}
              >
                <option value="">Add a collection…</option>
                {categories
                  .filter((c) => !content.collections.some((x) => x.categorySlug === c.slug))
                  .map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.nameEn}
                    </option>
                  ))}
              </Select>
            }
          >
            Collections row
          </CardTitle>
          <p className="mb-4 text-sm text-stone">
            Which categories show in “Find your perfect piece”, in this order, with an optional
            cover photo.
          </p>
          <ol className="space-y-3">
            {content.collections.map((c, i) => (
              <li
                key={c.categorySlug}
                className="flex flex-wrap items-center gap-5 rounded-lg border border-line p-4"
              >
                <p className="w-40 font-medium">{categoryName(c.categorySlug)}</p>
                <ImagePicker
                  label="Cover photo"
                  url={c.assetId ? (previews[c.assetId] ?? null) : null}
                  onChange={(asset) => {
                    if (asset) setPreviews({ ...previews, [asset.id]: asset.url });
                    setContent({
                      ...content,
                      collections: content.collections.map((x, j) =>
                        j === i ? { ...x, assetId: asset?.id ?? null } : x,
                      ),
                    });
                  }}
                />
                <div className="ml-auto flex gap-2">
                  <IconButton
                    label="Move up"
                    disabled={i === 0}
                    onClick={() =>
                      setContent({ ...content, collections: move(content.collections, i, i - 1) })
                    }
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={i === content.collections.length - 1}
                    onClick={() =>
                      setContent({ ...content, collections: move(content.collections, i, i + 1) })
                    }
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </IconButton>
                  <IconButton
                    label="Remove collection"
                    onClick={() =>
                      setContent({
                        ...content,
                        collections: content.collections.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </IconButton>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardTitle>Contact and social</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" hint="As shown on the site, e.g. 01711-000000">
              <Input
                value={content.contact.phone ?? ''}
                onChange={(e) =>
                  setContent({ ...content, contact: { ...content.contact, phone: e.target.value } })
                }
              />
            </Field>
            <Field label="WhatsApp number" hint="Digits only with country code, e.g. 8801711000000">
              <Input
                inputMode="numeric"
                value={content.contact.whatsapp ?? ''}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, whatsapp: e.target.value.replace(/\D/g, '') },
                  })
                }
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={content.contact.email ?? ''}
                onChange={(e) =>
                  setContent({ ...content, contact: { ...content.contact, email: e.target.value } })
                }
              />
            </Field>
            <Field label="Facebook page link">
              <Input
                type="url"
                value={content.contact.facebook ?? ''}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, facebook: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Instagram link">
              <Input
                type="url"
                value={content.contact.instagram ?? ''}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, instagram: e.target.value },
                  })
                }
              />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </>
  );
}
