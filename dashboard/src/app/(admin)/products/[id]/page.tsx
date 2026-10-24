'use client';

import { ArrowLeft, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Field,
  Input,
  Notice,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';
import { api, errorMessage, type Schemas } from '@/lib/api';
import { humanize } from '@/lib/format';
import { checkImage, type ImageType, putFile } from '@/lib/upload';

type Product = Schemas['AdminProductDto_Output'];
type Draft = Pick<
  Product,
  'nameEn' | 'nameBn' | 'descriptionEn' | 'descriptionBn' | 'saleMode' | 'leadTimeDays'
>;

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await api.GET('/v1/admin/products/{id}', { params: { path: { id } } });
    if (!data) return setError(errorMessage(error));
    setProduct(data);
    setDraft({
      nameEn: data.nameEn,
      nameBn: data.nameBn,
      descriptionEn: data.descriptionEn,
      descriptionBn: data.descriptionBn,
      saleMode: data.saleMode,
      leadTimeDays: data.leadTimeDays,
    });
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() awaits the API before setting state
    void load();
  }, [load]);

  const act = async (fn: () => Promise<{ error?: unknown }>, done: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const { error } = await fn();
    setBusy(false);
    if (error) setError(errorMessage(error));
    else {
      setMessage(done);
      await load();
    }
  };

  const upload = async (file: File) => {
    const problem = checkImage(file);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    const ticket = await api.POST('/v1/admin/products/{id}/media/uploads', {
      params: { path: { id } },
      body: {
        mimeType: file.type as ImageType,
        bytes: file.size,
        altEn: product?.nameEn ?? null,
        altBn: product?.nameBn ?? null,
      },
    });
    if (!ticket.data) {
      setBusy(false);
      return setError(errorMessage(ticket.error));
    }
    if (!(await putFile(ticket.data, file))) {
      setBusy(false);
      return setError('The upload failed. Try again.');
    }
    await act(
      () =>
        api.POST('/v1/admin/media/{id}/confirm', { params: { path: { id: ticket.data.mediaId } } }),
      'Photo added. It replaces the sample photos on the site.',
    );
  };

  if (!product || !draft) {
    return error ? (
      <Notice tone="error">{error}</Notice>
    ) : (
      <p role="status" className="text-sm text-stone">
        Loading…
      </p>
    );
  }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });

  return (
    <>
      <Link
        href="/products"
        className="mb-4 inline-flex items-center gap-2 text-sm text-stone hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Products
      </Link>
      <PageHeader
        title={product.nameEn}
        description={`/${product.slug}`}
        actions={
          <>
            <Badge tone={product.status === 'ACTIVE' ? 'green' : 'amber'}>
              {humanize(product.status)}
            </Badge>
            {product.status !== 'ACTIVE' ? (
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  void act(
                    () => api.POST('/v1/admin/products/{id}/publish', { params: { path: { id } } }),
                    'Published.',
                  )
                }
              >
                Publish
              </Button>
            ) : (
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() =>
                  void act(
                    () => api.POST('/v1/admin/products/{id}/archive', { params: { path: { id } } }),
                    'Archived.',
                  )
                }
              >
                Archive
              </Button>
            )}
          </>
        }
      />
      <div className="mb-5 space-y-3">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {message ? <Notice tone="ok">{message}</Notice> : null}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardTitle>Details</CardTitle>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void act(
                () =>
                  api.PATCH('/v1/admin/products/{id}', {
                    params: { path: { id } },
                    body: {
                      nameEn: draft.nameEn.trim(),
                      nameBn: draft.nameBn.trim(),
                      descriptionEn: draft.descriptionEn?.trim() || null,
                      descriptionBn: draft.descriptionBn?.trim() || null,
                      saleMode: draft.saleMode,
                      leadTimeDays: draft.leadTimeDays,
                    },
                  }),
                'Saved.',
              );
            }}
          >
            <Field label="Name (English)">
              <Input
                value={draft.nameEn}
                onChange={(e) => set('nameEn', e.target.value)}
                required
              />
            </Field>
            <Field label="Name (Bangla)">
              <Input
                value={draft.nameBn}
                onChange={(e) => set('nameBn', e.target.value)}
                required
              />
            </Field>
            <Field label="Description (English)" className="sm:col-span-2">
              <Textarea
                value={draft.descriptionEn ?? ''}
                onChange={(e) => set('descriptionEn', e.target.value)}
              />
            </Field>
            <Field label="Description (Bangla)" className="sm:col-span-2">
              <Textarea
                value={draft.descriptionBn ?? ''}
                onChange={(e) => set('descriptionBn', e.target.value)}
              />
            </Field>
            <Field label="How it is sold">
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
                value={draft.leadTimeDays ?? 0}
                onChange={(e) => set('leadTimeDays', Number(e.target.value))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                Save details
              </Button>
            </div>
          </form>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardTitle
              aside={
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-sand">
                  <Upload className="size-4" aria-hidden /> Add photo
                  <input
                    type="file"
                    accept="image/webp,image/jpeg,image/png,image/avif"
                    className="sr-only"
                    disabled={busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void upload(file);
                    }}
                  />
                </label>
              }
            >
              Photos
            </CardTitle>
            {product.media.length === 0 ? (
              <p className="text-sm text-stone">
                No photos yet: the site shows sample photos until you add some.
              </p>
            ) : (
              <ul className="grid grid-cols-3 gap-3">
                {product.media.map((m) => (
                  <li
                    key={m.id}
                    className="group relative aspect-square overflow-hidden rounded-md bg-sand"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of the stored file */}
                    <img src={m.url} alt={m.altEn ?? ''} className="h-full w-full object-cover" />
                    {m.status === 'PENDING' ? (
                      <span className="absolute inset-x-1 bottom-1 rounded bg-paper/90 px-1 text-center text-[0.65rem]">
                        Pending
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
                      className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-paper/90 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardTitle>Finishes</CardTitle>
            <ul className="space-y-1 text-sm">
              {product.variants.map((v) => (
                <li key={v.id} className="flex justify-between gap-3">
                  <span>{v.sku}</span>
                  <span className="text-stone">{v.isActive ? 'Active' : 'Hidden'}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
