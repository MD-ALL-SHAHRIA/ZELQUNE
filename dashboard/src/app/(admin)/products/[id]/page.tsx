'use client';

import { ExternalLink, ImagePlus, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClass } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { PageHeader, SaveBar } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { cn } from '@/lib/cn';
import { humanize, timeAgo } from '@/lib/format';
import { checkImage, type ImageType, putFile } from '@/lib/upload';
import { Finishes } from '@/features/products/finishes';

type Product = Schemas['AdminProductDto_Output'];
type Draft = {
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  saleMode: Product['saleMode'];
  leadTimeDays: number;
};
const toDraft = (p: Product): Draft => ({
  nameEn: p.nameEn,
  nameBn: p.nameBn,
  descriptionEn: p.descriptionEn ?? '',
  descriptionBn: p.descriptionBn ?? '',
  saleMode: p.saleMode,
  leadTimeDays: p.leadTimeDays ?? 0,
});
const STATUS_TONE = { ACTIVE: 'success', DRAFT: 'warning', ARCHIVED: 'neutral' } as const;

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await api.GET('/v1/admin/products/{id}', { params: { path: { id } } });
    if (!data) return toast('error', errorMessage(error));
    setProduct(data);
    setDraft(toDraft(data));
  }, [id, toast]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() awaits the API before setting state
    void load();
  }, [load]);

  const act = async (fn: () => Promise<{ error?: unknown }>, done: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return toast('error', errorMessage(error));
    toast('success', done);
    await load();
  };

  const upload = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const problem = checkImage(file);
      if (problem) {
        toast('error', `${file.name}: ${problem}`);
        continue;
      }
      setUploading((n) => n + 1);
      const ticket = await api.POST('/v1/admin/products/{id}/media/uploads', {
        params: { path: { id } },
        body: {
          mimeType: file.type as ImageType,
          bytes: file.size,
          altEn: product?.nameEn ?? null,
          altBn: product?.nameBn ?? null,
        },
      });
      const ok =
        ticket.data &&
        (await putFile(ticket.data, file)) &&
        !(
          await api.POST('/v1/admin/media/{id}/confirm', {
            params: { path: { id: ticket.data.mediaId } },
          })
        ).error;
      setUploading((n) => n - 1);
      toast(ok ? 'success' : 'error', ok ? `${file.name} added.` : `${file.name}: upload failed.`);
    }
    await load();
  };

  if (!product || !draft) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Skeleton className="h-[28rem]" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }
  const saved = toDraft(product);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';

  const save = () =>
    void act(
      () =>
        api.PATCH('/v1/admin/products/{id}', {
          params: { path: { id } },
          body: {
            nameEn: draft.nameEn.trim(),
            nameBn: draft.nameBn.trim(),
            descriptionEn: draft.descriptionEn.trim() || null,
            descriptionBn: draft.descriptionBn.trim() || null,
            saleMode: draft.saleMode,
            leadTimeDays: draft.leadTimeDays,
          },
        }),
      'Product saved.',
    );

  return (
    <>
      <SaveBar
        dirty={dirty}
        saving={busy}
        onSave={save}
        onDiscard={() => setDraft(saved)}
        message="Unsaved product changes"
      />
      <PageHeader
        crumbs={[{ href: '/products', label: 'Products' }]}
        title={product.nameEn}
        meta={<Badge tone={STATUS_TONE[product.status]}>{humanize(product.status)}</Badge>}
        description={`/${product.slug} · updated ${timeAgo(product.updatedAt)}`}
        actions={
          product.status === 'ACTIVE' ? (
            <a
              href={`${site}/en/products/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              className={buttonClass('secondary')}
            >
              <ExternalLink /> View on store
            </a>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Title and description"
              action={
                <Tabs
                  label="Language"
                  value={lang}
                  onChange={setLang}
                  items={[
                    { value: 'en', label: 'English' },
                    { value: 'bn', label: 'বাংলা' },
                  ]}
                />
              }
            />
            <CardBody className="space-y-4">
              {lang === 'en' ? (
                <>
                  <Field label="Title">
                    <Input value={draft.nameEn} onChange={(e) => set('nameEn', e.target.value)} />
                  </Field>
                  <Field label="Description" hint="Shown on the product page.">
                    <Textarea
                      rows={6}
                      value={draft.descriptionEn}
                      onChange={(e) => set('descriptionEn', e.target.value)}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="শিরোনাম">
                    <Input
                      lang="bn"
                      value={draft.nameBn}
                      onChange={(e) => set('nameBn', e.target.value)}
                    />
                  </Field>
                  <Field label="বর্ণনা">
                    <Textarea
                      lang="bn"
                      rows={6}
                      value={draft.descriptionBn}
                      onChange={(e) => set('descriptionBn', e.target.value)}
                    />
                  </Field>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Photos"
              description="The first photo is the main one. Real photos replace the site's sample photos."
            />
            <CardBody>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void upload(e.dataTransfer.files);
                }}
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
              >
                {product.media.map((m, i) => (
                  <figure
                    key={m.id}
                    className={cn(
                      'group relative aspect-square overflow-hidden rounded-xl border border-line bg-sand',
                      i === 0 && 'sm:col-span-2 sm:row-span-2',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of the stored file */}
                    <img src={m.url} alt={m.altEn ?? ''} className="h-full w-full object-cover" />
                    {m.status === 'PENDING' ? (
                      <span className="absolute inset-x-2 bottom-2 rounded-md bg-surface/90 px-2 py-0.5 text-center text-[0.6875rem]">
                        Processing
                      </span>
                    ) : null}
                    <button
                      type="button"
                      aria-label="Remove photo"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          () =>
                            api.DELETE('/v1/admin/media/{id}', { params: { path: { id: m.id } } }),
                          'Photo removed.',
                        )
                      }
                      className="absolute top-2 right-2 grid size-8 place-items-center rounded-lg bg-surface/95 text-ink opacity-0 shadow-[var(--shadow-card)] transition-opacity group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </figure>
                ))}
                <label
                  className={cn(
                    'grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed text-center text-[0.8125rem] transition-colors',
                    dragging
                      ? 'border-walnut bg-walnut/8 text-ink'
                      : 'border-ink/20 text-stone hover:border-ink/40 hover:bg-ink/3',
                    product.media.length === 0 &&
                      'col-span-2 aspect-[2/1] sm:col-span-4 sm:aspect-[4/1]',
                  )}
                >
                  <span className="flex flex-col items-center gap-1.5 px-3">
                    <ImagePlus className="size-5" aria-hidden />
                    {uploading
                      ? `Uploading ${uploading}…`
                      : product.media.length
                        ? 'Add photos'
                        : 'Drop photos here, or click to choose'}
                    <span className="text-[0.6875rem] text-stone">
                      WebP, JPEG, PNG or AVIF · up to 10 MB
                    </span>
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/webp,image/jpeg,image/png,image/avif"
                    className="sr-only"
                    onChange={(e) => {
                      if (e.target.files?.length) void upload(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Finishes"
              description="Price is what customers pay; unit cost is what one piece costs you to make (only you see it, for profit and loss)."
            />
            <div className="overflow-x-auto border-t border-line">
              <Finishes product={product} onSaved={() => void load()} />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Status" />
            <CardBody className="space-y-3">
              <p className="text-[0.8125rem] text-stone">
                {product.status === 'ACTIVE'
                  ? 'Live on the store.'
                  : product.status === 'DRAFT'
                    ? 'Only you can see it. Publish to put it on the store.'
                    : 'Hidden from the store.'}
              </p>
              {product.status !== 'ACTIVE' ? (
                <Button
                  className="w-full"
                  disabled={busy || dirty}
                  onClick={() =>
                    void act(
                      () =>
                        api.POST('/v1/admin/products/{id}/publish', { params: { path: { id } } }),
                      'Published to the store.',
                    )
                  }
                >
                  Publish
                </Button>
              ) : (
                <Button
                  variant="danger"
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    void act(
                      () =>
                        api.POST('/v1/admin/products/{id}/archive', { params: { path: { id } } }),
                      'Archived.',
                    )
                  }
                >
                  Archive
                </Button>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="How it is sold" />
            <CardBody className="space-y-4">
              <Field label="Sale mode">
                <Select
                  value={draft.saleMode}
                  onChange={(e) => set('saleMode', e.target.value as Draft['saleMode'])}
                >
                  <option value="IN_STOCK">In stock</option>
                  <option value="MADE_TO_ORDER">Made to order</option>
                  <option value="PRE_ORDER">Pre-order</option>
                </Select>
              </Field>
              <Field label="Days to make" hint="Shown as “ships within N days”.">
                <Input
                  type="number"
                  min={0}
                  max={365}
                  value={draft.leadTimeDays}
                  onChange={(e) => set('leadTimeDays', Number(e.target.value))}
                />
              </Field>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
