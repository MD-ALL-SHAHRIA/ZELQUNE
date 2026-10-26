'use client';

import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  ExternalLink,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, buttonClass } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { PageHeader, SaveBar } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import {
  DEFAULT_HOME,
  type HomeContent,
  type Localized,
  sampleCover,
  sampleScene,
  TRUST_ICONS,
} from '@/features/content/defaults';
import { SITE_TEXTS } from '@/features/content/site-texts';
import { ImagePicker } from '@/features/content/image-picker';
import { api, errorCode, errorMessage, type Schemas } from '@/lib/api';
import { cn } from '@/lib/cn';
import { humanize, timeAgo } from '@/lib/format';

type Product = Schemas['AdminProductListDto_Output']['items'][number];
type Category = Schemas['AdminCategoryListDto_Output']['items'][number];
type Lang = 'en' | 'bn';
type Previews = Record<string, string>;

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item as T);
  return copy;
}

/** Stripe-style settings row: what it is on the left, the fields on the right. */
function Section({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-b border-line py-8 first:pt-2 last:border-b-0 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-stone">{description}</p>
        {aside ? <div className="mt-3">{aside}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** One text field in the language being edited; flags a missing translation. */
function Text({
  label,
  value,
  lang,
  max,
  onChange,
  placeholder,
}: {
  label: string;
  value: Localized;
  lang: Lang;
  max: number;
  onChange: (v: Localized) => void;
  placeholder?: string;
}) {
  const other: Lang = lang === 'en' ? 'bn' : 'en';
  const missing = !value[lang].trim() && value[other].trim();
  return (
    <Field
      label={
        <span className="flex items-center justify-between gap-2">
          {label}
          <span className="text-[0.6875rem] font-normal text-stone tabular">
            {value[lang].length}/{max}
          </span>
        </span>
      }
      hint={
        missing
          ? `Empty: the site shows the built-in ${lang === 'en' ? 'English' : 'Bangla'} text.`
          : undefined
      }
    >
      <Input
        lang={lang}
        value={value[lang]}
        maxLength={max}
        placeholder={placeholder ?? (lang === 'bn' ? value.en : value.bn)}
        onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
        className={cn(missing && 'border-warning/60')}
      />
    </Field>
  );
}

function RowTools({
  index,
  count,
  onMove,
  onRemove,
  minCount = 0,
  label,
}: {
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  minCount?: number;
  label: string;
}) {
  const tool =
    'grid size-8 place-items-center rounded-lg text-stone hover:bg-ink/6 hover:text-ink disabled:opacity-30';
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label={`Move ${label} up`}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
        className={tool}
      >
        <ArrowUp className="size-4" />
      </button>
      <button
        type="button"
        aria-label={`Move ${label} down`}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
        className={tool}
      >
        <ArrowDown className="size-4" />
      </button>
      <button
        type="button"
        aria-label={`Remove ${label}`}
        disabled={count <= minCount}
        onClick={onRemove}
        className={cn(tool, 'hover:text-danger')}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

/** Small live preview of the hero as the site will show it. */
function HeroPreview({
  content,
  lang,
  image,
}: {
  content: HomeContent;
  lang: Lang;
  image?: string;
}) {
  const h = content.hero;
  const pick = (v: Localized) => v[lang] || v.en;
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <div className="bg-espresso px-3 py-1 text-center text-[0.5625rem] tracking-[0.18em] text-ivory/80 uppercase">
        {pick(content.announcement)}
      </div>
      <div className="relative aspect-[16/7] bg-espresso">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview of the stored file
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[76%_50%]"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(43,30,25,.8)_0%,rgba(43,30,25,.45)_38%,transparent_62%)]" />
        <div className="absolute inset-y-0 left-0 flex w-[58%] flex-col justify-center gap-1.5 p-4 text-ivory">
          <p className="text-[0.5rem] tracking-[0.25em] uppercase opacity-85">{pick(h.eyebrow)}</p>
          <p className="font-wordmark text-[1.05rem] leading-tight font-medium">
            {pick(h.heading)} <em className="text-glow">{pick(h.accent)}</em>
          </p>
          <p className="text-[0.625rem] opacity-85">{pick(h.subline)}</p>
        </div>
      </div>
    </div>
  );
}

/** The home page editor: everything the storefront's home shows, in English and Bangla. */
export default function ContentPage() {
  const toast = useToast();
  const [content, setContent] = useState<HomeContent | null>(null);
  const [saved, setSaved] = useState<string>('');
  const [version, setVersion] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Previews>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lang, setLang] = useState<Lang>('en');
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);

  const load = useCallback(async () => {
    const [home, prods, cats] = await Promise.all([
      api.GET('/v1/admin/content/home'),
      api.GET('/v1/admin/products', { params: { query: { limit: 100 } } }),
      api.GET('/v1/admin/categories'),
    ]);
    if (prods.data) setProducts(prods.data.items);
    if (cats.data) setCategories(cats.data.items);
    if (!home.data) return toast('error', errorMessage(home.error));
    setConflict(false);
    const view = home.data.home;
    const next: HomeContent = view
      ? {
          ...view.content,
          hero: {
            ...view.content.hero,
            scenes: view.content.hero.scenes.map(({ imageUrl: _, ...s }) => s),
          },
          collections: view.content.collections.map(({ imageUrl: _, ...c }) => c),
        }
      : structuredClone(DEFAULT_HOME);
    if (view) {
      const p: Previews = {};
      for (const s of view.content.hero.scenes)
        if (s.assetId && s.imageUrl) p[s.assetId] = s.imageUrl;
      for (const c of view.content.collections)
        if (c.assetId && c.imageUrl) p[c.assetId] = c.imageUrl;
      setPreviews(p);
    }
    setVersion(view?.version ?? 0);
    setUpdatedAt(view?.updatedAt ?? null);
    setContent(next);
    setSaved(JSON.stringify(next));
  }, [toast]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() awaits the API before setting state
    void load();
  }, [load]);

  const dirty = useMemo(
    () => content !== null && JSON.stringify(content) !== saved,
    [content, saved],
  );

  const save = async () => {
    if (!content) return;
    setBusy(true);
    const { data, error } = await api.PUT('/v1/admin/content/home', {
      body: { expectedVersion: version, content },
    });
    setBusy(false);
    if (data) {
      setVersion(data.version);
      setUpdatedAt(data.updatedAt);
      setSaved(JSON.stringify(content));
      toast('success', 'Saved. The store shows it within a minute.');
    } else if (errorCode(error) === 'CONTENT_VERSION_CONFLICT') {
      setConflict(true);
      toast('error', 'Someone else saved in the meantime.');
    } else toast('error', errorMessage(error, 'Could not save. Check the fields and try again.'));
  };

  if (!content) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  const hero = content.hero;
  const setHero = (patch: Partial<HomeContent['hero']>) =>
    setContent({ ...content, hero: { ...hero, ...patch } });
  const categoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.nameEn ?? humanize(slug);
  const firstScene = hero.scenes[0];
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';

  return (
    <>
      <SaveBar
        dirty={dirty}
        saving={busy}
        onSave={() => void save()}
        onDiscard={() => setContent(JSON.parse(saved) as HomeContent)}
        message="Unsaved changes to the home page"
      />
      <PageHeader
        title="Home page"
        description={
          version
            ? `Version ${version}${updatedAt ? ` · saved ${timeAgo(updatedAt)}` : ''}`
            : 'Not saved yet: the store shows its built-in text. Edit and save to take over.'
        }
        actions={
          <>
            <Tabs
              label="Language"
              value={lang}
              onChange={setLang}
              items={[
                { value: 'en', label: 'English' },
                { value: 'bn', label: 'বাংলা' },
              ]}
            />
            <a
              href={`${site}/${lang}`}
              target="_blank"
              rel="noreferrer"
              className={buttonClass('secondary')}
            >
              <ExternalLink /> View store
            </a>
          </>
        }
      />
      {conflict ? (
        <div
          role="alert"
          className="mb-4 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-sm"
        >
          <CircleAlert className="size-4 shrink-0 text-warning" aria-hidden />
          <p className="flex-1">
            Someone else saved the home page while you were editing. Reload to see their version,
            then make your changes again.
          </p>
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Reload
          </Button>
        </div>
      ) : null}

      <Card className="px-5 sm:px-8">
        <Section
          title="Preview"
          description="How the top of the home page will look in the language you are editing."
        >
          <HeroPreview
            content={content}
            lang={lang}
            image={
              firstScene
                ? firstScene.assetId
                  ? previews[firstScene.assetId]
                  : sampleScene(firstScene.productSlug)
                : undefined
            }
          />
        </Section>

        <Section
          title="Announcement bar"
          description="The thin line above the header on every page."
        >
          <Text
            label="Text"
            lang={lang}
            max={140}
            value={content.announcement}
            onChange={(announcement) => setContent({ ...content, announcement })}
          />
        </Section>

        <Section
          title="Hero words"
          description="The headline over the hero. The gold italic words come last, after the headline."
        >
          <div className="space-y-4">
            <Text
              label="Small top line"
              lang={lang}
              max={80}
              value={hero.eyebrow}
              onChange={(eyebrow) => setHero({ eyebrow })}
            />
            <Text
              label="Headline"
              lang={lang}
              max={160}
              value={hero.heading}
              onChange={(heading) => setHero({ heading })}
            />
            <Text
              label="Gold italic words"
              lang={lang}
              max={60}
              value={hero.accent}
              onChange={(accent) => setHero({ accent })}
            />
            <Text
              label="Line under the headline"
              lang={lang}
              max={200}
              value={hero.subline}
              onChange={(subline) => setHero({ subline })}
            />
          </div>
        </Section>

        <Section
          title="Hero scenes"
          description="Wide room photos (landscape, 2400px or more) with the piece on the right. They change every 6 seconds, in this order."
          aside={
            <Button
              variant="secondary"
              size="sm"
              disabled={hero.scenes.length >= 8 || !products.length}
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
              <Plus /> Add scene
            </Button>
          }
        >
          <ol className="space-y-3">
            {hero.scenes.map((s, i) => {
              const update = (patch: Partial<typeof s>) =>
                setHero({ scenes: hero.scenes.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <li key={i} className="rounded-xl border border-line bg-paper/50 p-3">
                  <div className="grid gap-4 sm:grid-cols-[14rem_minmax(0,1fr)]">
                    <ImagePicker
                      label={`Scene ${i + 1} photo`}
                      url={s.assetId ? (previews[s.assetId] ?? null) : null}
                      fallback={sampleScene(s.productSlug)}
                      onChange={(asset) => {
                        if (asset) setPreviews({ ...previews, [asset.id]: asset.url });
                        update({ assetId: asset?.id ?? null });
                      }}
                    />
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-8 size-4 shrink-0 text-stone/50" aria-hidden />
                        <Field label="Piece in this scene" className="flex-1">
                          <Select
                            value={s.productSlug}
                            onChange={(e) => update({ productSlug: e.target.value })}
                          >
                            {!products.some((p) => p.slug === s.productSlug) ? (
                              <option value={s.productSlug}>{humanize(s.productSlug)}</option>
                            ) : null}
                            {products.map((p) => (
                              <option key={p.id} value={p.slug}>
                                {p.nameEn}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <div className="mt-6">
                          <RowTools
                            label="scene"
                            index={i}
                            count={hero.scenes.length}
                            minCount={1}
                            onMove={(to) => setHero({ scenes: move(hero.scenes, i, to) })}
                            onRemove={() =>
                              setHero({ scenes: hero.scenes.filter((_, j) => j !== i) })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Piece position, wide screens" hint="Across %, down %">
                          <Input
                            value={s.position}
                            onChange={(e) => update({ position: e.target.value })}
                          />
                        </Field>
                        <Field label="Piece position, phones" hint="Across %, down %">
                          <Input
                            value={s.phonePosition}
                            onChange={(e) => update({ phonePosition: e.target.value })}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>

        <Section
          title="Trust strip"
          description="Short facts under the hero. Facts only, from your terms. Two to six items."
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
              <Plus /> Add item
            </Button>
          }
        >
          <ol className="space-y-3">
            {content.trust.map((t, i) => {
              const update = (patch: Partial<typeof t>) =>
                setContent({
                  ...content,
                  trust: content.trust.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                });
              return (
                <li
                  key={i}
                  className="grid gap-3 rounded-xl border border-line bg-paper/50 p-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
                >
                  <Field label="Icon">
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
                  <Text
                    label="Title"
                    lang={lang}
                    max={40}
                    value={t.title}
                    onChange={(title) => update({ title })}
                  />
                  <Text
                    label="Line"
                    lang={lang}
                    max={80}
                    value={t.text}
                    onChange={(text) => update({ text })}
                  />
                  <RowTools
                    label="item"
                    index={i}
                    count={content.trust.length}
                    minCount={2}
                    onMove={(to) => setContent({ ...content, trust: move(content.trust, i, to) })}
                    onRemove={() =>
                      setContent({ ...content, trust: content.trust.filter((_, j) => j !== i) })
                    }
                  />
                </li>
              );
            })}
          </ol>
        </Section>

        <Section
          title="Collections row"
          description="Which categories show in “Find your perfect piece”, in this order, each with an optional cover photo."
          aside={
            <Select
              aria-label="Add a collection"
              value=""
              onChange={(e) =>
                e.target.value &&
                setContent({
                  ...content,
                  collections: [
                    ...content.collections,
                    { categorySlug: e.target.value, assetId: null },
                  ],
                })
              }
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
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {content.collections.map((c, i) => (
              <li key={c.categorySlug} className="rounded-xl border border-line bg-paper/50 p-3">
                <ImagePicker
                  label={`${categoryName(c.categorySlug)} cover photo`}
                  aspect="aspect-[16/10]"
                  url={c.assetId ? (previews[c.assetId] ?? null) : null}
                  fallback={sampleCover(c.categorySlug)}
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
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-medium">{categoryName(c.categorySlug)}</p>
                  <RowTools
                    label="collection"
                    index={i}
                    count={content.collections.length}
                    onMove={(to) =>
                      setContent({ ...content, collections: move(content.collections, i, to) })
                    }
                    onRemove={() =>
                      setContent({
                        ...content,
                        collections: content.collections.filter((_, j) => j !== i),
                      })
                    }
                  />
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          title="Contact and social"
          description="Shown in the footer. The WhatsApp number also turns on the chat button on every page."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" hint="As shown, e.g. 01711-000000">
              <Input
                value={content.contact.phone ?? ''}
                onChange={(e) =>
                  setContent({ ...content, contact: { ...content.contact, phone: e.target.value } })
                }
              />
            </Field>
            <Field label="WhatsApp" hint="Digits with country code, e.g. 8801711000000">
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
            <Field label="Facebook page">
              <Input
                type="url"
                placeholder="https://facebook.com/…"
                value={content.contact.facebook ?? ''}
                onChange={(e) =>
                  setContent({
                    ...content,
                    contact: { ...content.contact, facebook: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Instagram">
              <Input
                type="url"
                placeholder="https://instagram.com/…"
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
        </Section>
        <Section
          title="Pages and policies"
          description="Your story, privacy policy, terms, FAQ answers and promises. The faded text is what the site shows now; leave a field empty to keep it. Switch English/Bangla at the top."
        >
          <div className="grid gap-6">
            {[...new Set(SITE_TEXTS.map((t) => t.group))].map((group) => (
              <fieldset key={group} className="grid gap-4">
                <legend className="mb-1 font-mono text-[0.75rem] tracking-[0.12em] text-stone uppercase">
                  {group}
                </legend>
                {SITE_TEXTS.filter((t) => t.group === group).map((t) => {
                  const value = content.texts?.[t.key] ?? { en: '', bn: '' };
                  return (
                    <Field key={t.key} label={t.label}>
                      <Textarea
                        lang={lang}
                        rows={t.long ? 4 : 2}
                        maxLength={3000}
                        value={value[lang]}
                        placeholder={t[lang]}
                        onChange={(e) => {
                          const next = { ...value, [lang]: e.target.value };
                          const texts = { ...content.texts };
                          if (next.en.trim() || next.bn.trim()) texts[t.key] = next;
                          else delete texts[t.key];
                          setContent({ ...content, texts });
                        }}
                      />
                    </Field>
                  );
                })}
              </fieldset>
            ))}
          </div>
        </Section>
      </Card>
    </>
  );
}
