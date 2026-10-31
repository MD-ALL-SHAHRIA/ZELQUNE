'use client';

import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { SaveBar } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { DEFAULT_HOME } from '@/features/content/defaults';
import { api, errorCode, errorMessage, type Schemas } from '@/lib/api';
import { type Business, EMPTY_BUSINESS, LICENCE_PATTERN, missingBusiness } from './business';

type Content = Schemas['UpdateHomeContentDto']['content'];

/**
 * The legal identity on the footer and the policy pages (stored in the home document, ADR 0015).
 * Nothing goes public until the owner confirms it matches the trade licence; until then the
 * website keeps its "to be confirmed" marks.
 */
export function BusinessDetails({ readOnly }: { readOnly: boolean }) {
  const toast = useToast();
  const [doc, setDoc] = useState<{ version: number; content: Content } | null>(null);
  const [draft, setDraft] = useState<Business>(EMPTY_BUSINESS);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.GET('/v1/admin/content/home').then(({ data, error }) => {
      if (error) return toast('error', errorMessage(error));
      const home = data?.home ?? null;
      const content = (home?.content ?? DEFAULT_HOME) as Content;
      setDoc({ version: home?.version ?? 0, content });
      setDraft({ ...EMPTY_BUSINESS, ...(content.business as Business | undefined) });
    });
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  const saved = { ...EMPTY_BUSINESS, ...(doc?.content.business as Business | undefined) };
  const dirty = !!doc && JSON.stringify(saved) !== JSON.stringify(draft);
  const missing = missingBusiness(draft);
  const licenceOk = LICENCE_PATTERN.test(draft.tradeLicence);
  const valid = licenceOk && (!draft.confirmed || missing.length === 0);

  const save = async () => {
    if (!doc) return;
    setSaving(true);
    const { data, error } = await api.PUT('/v1/admin/content/home', {
      body: { expectedVersion: doc.version, content: { ...doc.content, business: draft } },
    });
    setSaving(false);
    if (!data) {
      if (errorCode(error) === 'CONTENT_VERSION_CONFLICT') {
        toast(
          'error',
          'Someone saved the website meanwhile. Loaded the latest; check and save again.',
        );
        void load();
        return;
      }
      return toast('error', errorMessage(error));
    }
    setDoc({ version: data.version, content: { ...doc.content, business: draft } });
    toast(
      'success',
      draft.confirmed
        ? 'Saved. The footer and policy pages show these details within a minute.'
        : 'Saved as a draft. The website keeps showing "to be confirmed" until you confirm.',
    );
  };

  const set = (patch: Partial<Business>) => setDraft({ ...draft, ...patch, confirmed: false });
  const pair = (key: 'legalName' | 'address', label: string, max: number) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={`${label} (English)`} hint="As written on the trade licence">
        <Input
          value={draft[key].en}
          maxLength={max}
          onChange={(e) => set({ [key]: { ...draft[key], en: e.target.value } })}
        />
      </Field>
      <Field label={`${label} (বাংলা)`} hint="Optional. Empty shows the English text">
        <Input
          lang="bn"
          value={draft[key].bn}
          maxLength={max}
          onChange={(e) => set({ [key]: { ...draft[key], bn: e.target.value } })}
        />
      </Field>
    </div>
  );

  const status = !doc ? null : saved.confirmed ? (
    <Badge tone="success" icon={<CheckCircle2 />}>
      Published
    </Badge>
  ) : (
    <Badge tone="warning" icon={<AlertTriangle />}>
      Incomplete
    </Badge>
  );

  return (
    <Card>
      <CardHeader
        title="Legal business details"
        description="Shown in the footer, Privacy Policy and Terms once you confirm them."
        action={status}
      />
      <CardBody>
        {readOnly ? (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2 text-[0.8125rem] text-stone">
            <Info className="size-4" aria-hidden /> Only the owner can change these.
          </p>
        ) : null}
        {doc ? (
          <fieldset disabled={readOnly} className="space-y-4">
            {!saved.confirmed ? (
              <p
                role="status"
                className="flex items-start gap-2 rounded-lg bg-warning/[0.08] px-3 py-2.5 text-[0.8125rem] text-ink"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                <span>
                  Not published. The website shows “to be confirmed” in the footer and policy pages.
                  {missing.length ? ` Still missing: ${missing.join(', ')}.` : null}
                </span>
              </p>
            ) : null}
            {pair('legalName', 'Legal business name', 160)}
            {pair('address', 'Registered address', 300)}
            <Field
              label="Trade licence number"
              error={licenceOk ? null : 'Use letters, digits, spaces and . / - only'}
              hint="Exactly as on the licence"
            >
              <Input
                value={draft.tradeLicence}
                maxLength={40}
                onChange={(e) => set({ tradeLicence: e.target.value })}
              />
            </Field>
            <label className="flex items-start gap-3 rounded-lg border border-line px-3 py-3 text-[0.875rem]">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--color-accent)]"
                checked={draft.confirmed}
                disabled={missing.length > 0 || !licenceOk}
                onChange={(e) => setDraft({ ...draft, confirmed: e.target.checked })}
              />
              <span>
                <span className="font-medium">
                  These details match our trade licence; publish them on the website.
                </span>
                <span className="mt-0.5 block text-xs text-stone">
                  {missing.length
                    ? 'Fill all three fields first.'
                    : 'Editing any field un-ticks this, so a change is never published unchecked.'}
                </span>
              </span>
            </label>
          </fieldset>
        ) : (
          <Skeleton className="h-64" />
        )}
      </CardBody>
      <SaveBar
        dirty={dirty && valid && !readOnly}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => setDraft(saved)}
        message="Unsaved changes to legal business details"
      />
    </Card>
  );
}
