'use client';

import { ExternalLink, FolderTree, Pencil, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { EmptyState, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';

type Category = Schemas['AdminCategoryListDto_Output']['items'][number];
interface Form {
  slug: string;
  nameEn: string;
  nameBn: string;
  parentId: string | null;
  position: number;
  isActive: boolean;
}

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);

export default function CategoriesPage() {
  const toast = useToast();
  const [items, setItems] = useState<Category[] | null>(null);
  const [editing, setEditing] = useState<{
    id: string | null;
    form: Form;
    slugTouched: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    void api.GET('/v1/admin/categories').then(({ data, error }) => {
      if (data) setItems(data.items);
      else toast('error', errorMessage(error));
    });
  }, [toast]);
  useEffect(load, [load]);

  /** Parents first, each followed by its children, by position. */
  const tree = useMemo(() => {
    const all = [...(items ?? [])].sort(
      (a, b) => a.position - b.position || a.nameEn.localeCompare(b.nameEn),
    );
    const roots = all.filter((c) => !c.parentId || !all.some((p) => p.id === c.parentId));
    return roots.flatMap((r) => [
      { c: r, depth: 0 },
      ...all.filter((c) => c.parentId === r.id).map((c) => ({ c, depth: 1 })),
    ]);
  }, [items]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { id, form } = editing;
    const res = id
      ? await api.PATCH('/v1/admin/categories/{id}', { params: { path: { id } }, body: form })
      : await api.POST('/v1/admin/categories', {
          body: {
            slug: form.slug,
            nameEn: form.nameEn,
            nameBn: form.nameBn,
            parentId: form.parentId,
            position: form.position,
          },
        });
    setSaving(false);
    if (!res.data) return toast('error', errorMessage((res as { error?: unknown }).error));
    toast(
      'success',
      id ? 'Category saved' : 'Category created. It shows on the store once it has products.',
    );
    setEditing(null);
    load();
  };

  const f = editing?.form;
  const set = (patch: Partial<Form>) =>
    editing && setEditing({ ...editing, form: { ...editing.form, ...patch } });

  return (
    <>
      <PageHeader
        title="Categories"
        description="How the shop is organised. The storefront menu and collections row follow this order."
        actions={
          <Button
            onClick={() =>
              setEditing({
                id: null,
                slugTouched: false,
                form: {
                  slug: '',
                  nameEn: '',
                  nameBn: '',
                  parentId: null,
                  position: (items?.length ?? 0) * 10,
                  isActive: true,
                },
              })
            }
          >
            <Plus /> Add category
          </Button>
        }
      />
      <Card>
        {!items ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={<FolderTree />} title="No categories yet">
            Add wall panels, shelves, lighting and more.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {tree.map(({ c, depth }) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink/6 text-stone"
                  style={{ marginLeft: depth * 28 }}
                >
                  <FolderTree className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {c.nameEn} <span className="font-normal text-stone">· {c.nameBn}</span>
                  </p>
                  <p className="text-xs text-stone">
                    /category/{c.slug} · position {c.position}
                  </p>
                </div>
                {c.isActive ? <Badge tone="success">Visible</Badge> : <Badge>Hidden</Badge>}
                <a
                  href={`${site}/en/category/${c.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`View ${c.nameEn} on the store`}
                  className="rounded-md p-2 text-stone hover:bg-ink/6 hover:text-ink"
                >
                  <ExternalLink className="size-4" />
                </a>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Edit ${c.nameEn}`}
                  onClick={() =>
                    setEditing({
                      id: c.id,
                      slugTouched: true,
                      form: {
                        slug: c.slug,
                        nameEn: c.nameEn,
                        nameBn: c.nameBn,
                        parentId: c.parentId,
                        position: c.position,
                        isActive: c.isActive,
                      },
                    })
                  }
                >
                  <Pencil />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && f ? (
        <Dialog
          open
          onClose={() => setEditing(null)}
          title={editing.id ? `Edit ${f.nameEn || 'category'}` : 'Add a category'}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => void save()}
                disabled={saving || !f.nameEn.trim() || !f.nameBn.trim() || !f.slug}
              >
                {saving ? 'Saving…' : 'Save category'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name (English)">
                <Input
                  value={f.nameEn}
                  autoFocus
                  onChange={(e) =>
                    set({
                      nameEn: e.target.value,
                      ...(editing.slugTouched ? {} : { slug: slugify(e.target.value) }),
                    })
                  }
                  placeholder="Wall panels"
                />
              </Field>
              <Field label="Name (বাংলা)">
                <Input
                  lang="bn"
                  value={f.nameBn}
                  onChange={(e) => set({ nameBn: e.target.value })}
                  placeholder="ওয়াল প্যানেল"
                />
              </Field>
            </div>
            <Field
              label="Web address"
              hint={`${site.replace(/^https?:\/\//, '')}/en/category/${f.slug || '…'}`}
            >
              <Input
                value={f.slug}
                onChange={(e) => {
                  setEditing({
                    ...editing,
                    slugTouched: true,
                    form: { ...f, slug: slugify(e.target.value) },
                  });
                }}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Inside">
                <Select
                  value={f.parentId ?? ''}
                  onChange={(e) => set({ parentId: e.target.value || null })}
                >
                  <option value="">Top level</option>
                  {(items ?? [])
                    .filter((c) => c.id !== editing.id && !c.parentId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Position" hint="Lower numbers come first.">
                <Input
                  type="number"
                  value={f.position}
                  onChange={(e) => set({ position: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
            {editing.id ? (
              <Switch
                checked={f.isActive}
                onChange={(isActive) => set({ isActive })}
                label="Visible on the store"
                description="Hidden categories keep their products but leave the menu."
              />
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
