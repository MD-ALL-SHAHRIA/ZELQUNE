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
    contentHome: 'catalog.content.home',
    admin: {
      listCategories: 'catalog.admin.categories.list',
      updateCategory: 'catalog.admin.categories.update',
      listProducts: 'catalog.admin.products.list',
      getProduct: 'catalog.admin.products.get',
      archiveProduct: 'catalog.admin.products.archive',
      removeMedia: 'catalog.admin.media.remove',
      createCategory: 'catalog.admin.categories.create',
      createProduct: 'catalog.admin.products.create',
      updateProduct: 'catalog.admin.products.update',
      publishProduct: 'catalog.admin.products.publish',
      upsertVariant: 'catalog.admin.variants.upsert',
      setBasePrice: 'catalog.admin.prices.setBase',
      setExperimentPrice: 'catalog.admin.prices.setExperiment',
      requestMediaUpload: 'catalog.admin.media.requestUpload',
      confirmMediaUpload: 'catalog.admin.media.confirmUpload',
      getHomeContent: 'catalog.admin.content.home.get',
      updateHomeContent: 'catalog.admin.content.home.update',
      requestContentAsset: 'catalog.admin.content.assets.requestUpload',
      confirmContentAsset: 'catalog.admin.content.assets.confirmUpload',
    },
  },
  inventory: {
    reserve: 'inventory.reservations.reserve',
    release: 'inventory.reservations.release',
    levels: 'inventory.stock.levels',
    admin: { adjust: 'inventory.admin.stock.adjust', list: 'inventory.admin.stock.list' },
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
    admin: {
      transition: 'order.admin.orders.transition',
      list: 'order.admin.orders.list',
      detail: 'order.admin.orders.detail',
      export: 'order.admin.orders.export',
      addNote: 'order.admin.orders.addNote',
      setFriend: 'order.admin.customers.setFriend',
      orderIdByCode: 'order.admin.orders.idByCode',
    },
    quotes: {
      request: 'order.quotes.request',
      track: 'order.quotes.track',
      admin: {
        list: 'order.admin.quotes.list',
        get: 'order.admin.quotes.get',
        price: 'order.admin.quotes.price',
        accept: 'order.admin.quotes.accept',
        reject: 'order.admin.quotes.reject',
        convert: 'order.admin.quotes.convert',
      },
    },
  },
  analytics: {
    track: 'analytics.events.track',
    dashboard: 'analytics.stats.dashboard',
    auditLog: 'analytics.audit.list',
  },
} as const;

export interface HealthPingResponse {
  service: ServiceName;
  status: 'ok';
  uptimeSeconds: number;
}
