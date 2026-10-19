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
    checkoutSnapshot: 'catalog.variants.checkoutSnapshot',
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
  inventory: {
    reserve: 'inventory.reservations.reserve',
    release: 'inventory.reservations.release',
    levels: 'inventory.stock.levels',
    admin: { adjust: 'inventory.admin.stock.adjust' },
  },
  payment: {
    create: 'payment.payments.create',
    void: 'payment.payments.void',
    summaryByOrder: 'payment.payments.summaryByOrder',
    instructions: 'payment.instructions.get',
    admin: {
      verify: 'payment.admin.payments.verify',
      reject: 'payment.admin.payments.reject',
      confirmCod: 'payment.admin.payments.confirmCod',
    },
  },
  shipping: {
    districts: 'shipping.districts.list',
    quote: 'shipping.quotes.quote',
    shipmentByOrder: 'shipping.shipments.byOrder',
    admin: {
      createShipment: 'shipping.admin.shipments.create',
      updateStatus: 'shipping.admin.shipments.updateStatus',
    },
  },
  order: {
    createCart: 'order.carts.create',
    getCart: 'order.carts.get',
    setCartItem: 'order.carts.setItem',
    quote: 'order.carts.quote',
    checkout: 'order.checkout.checkout',
    track: 'order.orders.track',
    admin: { transition: 'order.admin.orders.transition' },
  },
} as const;

export interface HealthPingResponse {
  service: ServiceName;
  status: 'ok';
  uptimeSeconds: number;
}
