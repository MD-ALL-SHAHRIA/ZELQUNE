import { AsyncLocalStorage } from 'node:async_hooks';

import { type Actor } from '@zelqune/contracts';

export interface RequestContextStore {
  requestId: string;
  /** Authenticated admin (set by the gateway JWT guard, carried in RPC meta). */
  actor?: Actor;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

/** Per-request context (HTTP request, TCP message or consumed event) carried across async calls. */
export const requestContext = {
  run<T>(store: RequestContextStore, fn: () => T): T {
    return storage.run(store, fn);
  },
  get(): RequestContextStore | undefined {
    return storage.getStore();
  },
  requestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
  actor(): Actor | undefined {
    return storage.getStore()?.actor;
  },
  /** Attaches the authenticated actor to the current request (gateway). */
  setActor(actor: Actor): void {
    const store = storage.getStore();
    if (store) store.actor = actor;
  },
};
