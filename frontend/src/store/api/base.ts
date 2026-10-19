import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { env } from '@/config/env';

/**
 * The single RTK Query API for the browser. Endpoints are injected from the generated file
 * (typed from the gateway OpenAPI spec) and enhanced with cache tags in ./index.ts.
 */
export const baseApi = createApi({
  reducerPath: 'gateway',
  baseQuery: fetchBaseQuery({ baseUrl: env.NEXT_PUBLIC_API_URL }),
  tagTypes: ['Cart'],
  endpoints: () => ({}),
});
