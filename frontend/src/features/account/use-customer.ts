'use client';

import { useSyncExternalStore } from 'react';
import { SERVER_STATE, snapshot, subscribe } from './session';

export function useCustomer() {
  return useSyncExternalStore(subscribe, snapshot, () => SERVER_STATE);
}
