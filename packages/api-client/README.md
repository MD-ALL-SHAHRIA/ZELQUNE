# @zelqune/api-client

Types and a typed `fetch` client for the gateway, generated from its OpenAPI spec.

```sh
pnpm gen:api   # from the repo root: exports backend OpenAPI -> openapi.json -> src/schema.d.ts
```

```ts
import { createApiClient } from '@zelqune/api-client';

const api = createApiClient(process.env.NEXT_PUBLIC_API_URL!);
const { data, error } = await api.GET('/health');
```

`openapi.json` and `src/schema.d.ts` are committed so consumers build without a running backend;
regenerate them in the same PR as any gateway API change.
