'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage, type Schemas } from '@/lib/api';

type Views = {
  payments: Schemas['PaymentSettingsViewDto_Output'];
  checkout: Schemas['CheckoutSettingsViewDto_Output'];
  shipping: Schemas['ShippingSettingsViewDto_Output'];
  notifications: Schemas['NotificationSettingsViewDto_Output'];
};
export type SettingKey = keyof Views;
export type SettingValue<K extends SettingKey> = Views[K]['value'];

/**
 * One settings group: the saved value, a draft the form edits, and save/discard. `dirty` drives
 * the save bar; saving returns the server's normalized value.
 */
export function useSetting<K extends SettingKey>(key: K) {
  const toast = useToast();
  const [saved, setSaved] = useState<Views[K] | null>(null);
  const [draft, setDraft] = useState<SettingValue<K> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    void get(key).then(({ data, error }) => {
      if (!live) return;
      if (data) {
        setSaved(data as Views[K]);
        setDraft(structuredClone((data as Views[K]).value) as SettingValue<K>);
      } else toast('error', errorMessage(error));
    });
    return () => {
      live = false;
    };
  }, [key, toast]);

  const dirty = saved !== null && JSON.stringify(saved.value) !== JSON.stringify(draft);

  const save = useCallback(async () => {
    if (!draft) return false;
    setSaving(true);
    const { data, error } = await put(key, draft);
    setSaving(false);
    if (!data) {
      toast('error', errorMessage(error));
      return false;
    }
    setSaved(data as Views[K]);
    setDraft(structuredClone((data as Views[K]).value) as SettingValue<K>);
    toast('success', 'Settings saved. The store uses them from now on.');
    return true;
  }, [draft, key, toast]);

  const discard = useCallback(() => {
    if (saved) setDraft(structuredClone(saved.value) as SettingValue<K>);
  }, [saved]);

  return { saved, draft, setDraft, dirty, saving, save, discard };
}

function get(key: SettingKey) {
  switch (key) {
    case 'payments':
      return api.GET('/v1/admin/settings/payments');
    case 'checkout':
      return api.GET('/v1/admin/settings/checkout');
    case 'shipping':
      return api.GET('/v1/admin/settings/shipping');
    case 'notifications':
      return api.GET('/v1/admin/settings/notifications');
  }
}

function put(key: SettingKey, body: unknown) {
  switch (key) {
    case 'payments':
      return api.PUT('/v1/admin/settings/payments', {
        body: body as Schemas['PaymentSettingsDto'],
      });
    case 'checkout':
      return api.PUT('/v1/admin/settings/checkout', {
        body: body as Schemas['CheckoutSettingsDto'],
      });
    case 'shipping':
      return api.PUT('/v1/admin/settings/shipping', {
        body: body as Schemas['ShippingSettingsDto'],
      });
    case 'notifications':
      return api.PUT('/v1/admin/settings/notifications', {
        body: body as Schemas['NotificationSettingsDto'],
      });
  }
}
