import { type ServiceName } from '../services';

/** TCP message patterns shared by gateway and services: `<service>.<resource>.<action>`. */
export const RPC_PATTERNS = {
  health: { ping: 'health.ping' },
  identity: {
    login: 'identity.auth.login',
    refresh: 'identity.auth.refresh',
    logout: 'identity.auth.logout',
    me: 'identity.users.me',
  },
  catalog: {
    categoriesList: 'catalog.categories.list',
    productsList: 'catalog.products.list',
    productBySlug: 'catalog.products.bySlug',
    pricesResolve: 'catalog.prices.resolve',
    admin: {
      createCategory: 'catalog.admin.categories.create',
      createProduct: 'catalog.admin.products.create',
      updateProduct: 'catalog.admin.products.update',
      publishProduct: 'catalog.admin.products.publish',
      upsertVariant: 'catalog.admin.variants.upsert',
      setBasePrice: 'catalog.admin.prices.setBase',
      setExperimentPrice: 'catalog.admin.prices.setExperiment',
      requestMediaUpload: 'catalog.admin.media.requestUpload',
      confirmMediaUpload: 'catalog.admin.media.confirmUpload',
    },
  },
} as const;

export interface HealthPingResponse {
  service: ServiceName;
  status: 'ok';
  uptimeSeconds: number;
}
