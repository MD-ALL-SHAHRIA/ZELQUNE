'use client';

import { ExternalLink, Info } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/field';
import { SaveBar } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { DEFAULT_HOME } from '@/features/content/defaults';
import { api, errorCode, errorMessage, type Schemas } from '@/lib/api';

type Content = Schemas['UpdateHomeContentDto']['content'];
type Contact = Required<{ [K in keyof Content['contact']]-?: string }>;

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100';
const EMPTY: Contact = { phone: '', whatsapp: '', email: '', facebook: '', instagram: '' };

/**
 * The store's public contact details (footer, WhatsApp button). They live in the home page
 * document (ADR 0015), so saving here and in the Website content editor is the same version check.
 */
export function StoreDetails({ readOnly }: { readOnly: boolean }) {
  const toast = useToast();
  const [doc, setDoc] = useState<{ version: number; content: Content } | null>(null);
  const [draft, setDraft] = useState<Contact>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.GET('/v1/admin/content/home').then(({ data, error }) => {
      if (error) return toast('error', errorMessage(error));
      const home = data?.home ?? null;
      const content = (home?.content ?? DEFAULT_HOME) as Content;
      setDoc({ version: home?.version ?? 0, content });
      setDraft({ ...EMPTY, ...content.contact });
    });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() awaits the API before setting state
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  const dirty =
    !!doc && JSON.stringify({ ...EMPTY, ...doc.content.contact }) !== JSON.stringify(draft);
  const whatsappOk = /^(\d{8,15})?$/.test(draft.whatsapp);
  const emailOk = !draft.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email);
  const urlOk = (u: string) => !u || /^https:\/\/\S+$/.test(u);
  const valid = whatsappOk && emailOk && urlOk(draft.facebook) && urlOk(draft.instagram);

  const save = async () => {
    if (!doc) return;
    setSaving(true);
    const { data, error } = await api.PUT('/v1/admin/content/home', {
      body: { expectedVersion: doc.version, content: { ...doc.content, contact: draft } },
    });
    setSaving(false);
    if (!data) {
      if (errorCode(error) === 'CONTENT_VERSION_CONFLICT') {
        toast(
          'error',
          'Someone saved the home page meanwhile. Loaded the latest; please check and save again.',
        );
        void load();
        return;
      }
      return toast('error', errorMessage(error));
    }
    setDoc({ version: data.version, content: { ...doc.content, contact: draft } });
    toast('success', 'Store details saved. The website shows them within a minute.');
  };

  const field = (
    key: keyof Contact,
    label: string,
    props: React.ComponentProps<typeof Input>,
    error?: string | null,
    hint?: string,
  ) => (
    <Field label={label} error={error} hint={hint}>
      <Input
        value={draft[key]}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value.trim() })}
        {...props}
      />
    </Field>
  );

  return (
    <Card>
      <CardHeader
        title="Store details"
        description="Shown in the website footer and used by the WhatsApp button."
        action={
          <a
            href={site}
            target="_blank"
            rel="noreferrer"
            className={buttonClass('secondary', 'sm')}
          >
            <ExternalLink /> View store
          </a>
        }
      />
      <CardBody>
        {readOnly ? (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2 text-[0.8125rem] text-stone">
            <Info className="size-4" aria-hidden /> Only the owner can change these.
          </p>
        ) : null}
        {doc ? (
          <fieldset disabled={readOnly} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {field('phone', 'Phone for customers', {
                inputMode: 'tel',
                placeholder: '01XXXXXXXXX',
              })}
              {field(
                'whatsapp',
                'WhatsApp number',
                { inputMode: 'numeric', placeholder: '8801711000000' },
                whatsappOk ? null : 'Digits only, with the country code: 8801711000000',
                'International digits, e.g. 8801711000000',
              )}
            </div>
            {field(
              'email',
              'Email',
              { type: 'email', placeholder: 'hello@zelqune.com' },
              emailOk ? null : 'Not a valid email',
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {field(
                'facebook',
                'Facebook page',
                { placeholder: 'https://facebook.com/zelqune' },
                urlOk(draft.facebook) ? null : 'Start with https://',
              )}
              {field(
                'instagram',
                'Instagram',
                { placeholder: 'https://instagram.com/zelqune' },
                urlOk(draft.instagram) ? null : 'Start with https://',
              )}
            </div>
            <p className="text-[0.8125rem] text-stone">
              The hero, trust strip, collections, projects, clients and policies are in{' '}
              <Link href="/content" className="font-medium text-ink underline underline-offset-2">
                Website content
              </Link>
              .
            </p>
          </fieldset>
        ) : (
          <Skeleton className="h-48" />
        )}
      </CardBody>
      <SaveBar
        dirty={dirty && valid && !readOnly}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => doc && setDraft({ ...EMPTY, ...doc.content.contact })}
        message="Unsaved changes to store details"
      />
    </Card>
  );
}
