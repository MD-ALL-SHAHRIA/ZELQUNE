/**
 * RTK Query endpoints generated from the gateway OpenAPI spec (`pnpm gen:store`; `pnpm gen:api`
 * at the repo root regenerates the spec first). Never edit src/store/api/generated.ts by hand.
 * Admin routes are excluded: the storefront only uses public endpoints.
 */
module.exports = {
  schemaFile: '../packages/api-client/openapi.json',
  apiFile: './src/store/api/base.ts',
  apiImport: 'baseApi',
  outputFile: './src/store/api/generated.ts',
  exportName: 'gatewayApi',
  hooks: { queries: true, lazyQueries: true, mutations: true },
  filterEndpoints: (_name, def) => !def.path.startsWith('/v1/admin') && def.path !== '/health',
  tag: false,
};
