/** Every backend service and the Postgres schema it owns. Gateway owns no schema. */
export const SERVICES = {
  identity: { name: 'identity-service', schema: 'identity' },
  catalog: { name: 'catalog-service', schema: 'catalog' },
  inventory: { name: 'inventory-service', schema: 'inventory' },
  order: { name: 'order-service', schema: 'orders' },
  payment: { name: 'payment-service', schema: 'payments' },
  shipping: { name: 'shipping-service', schema: 'shipping' },
  notification: { name: 'notification-service', schema: 'notifications' },
  analytics: { name: 'analytics-service', schema: 'analytics' },
} as const;

export type ServiceKey = keyof typeof SERVICES;
export type ServiceName = (typeof SERVICES)[ServiceKey]['name'];

export const SERVICE_KEYS = Object.keys(SERVICES) as ServiceKey[];
