import {
  type BaseQueryFn,
  createApi,
  type FetchArgs,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { env } from '@/config/env';
import { currentToken, refresh } from '@/features/account/session';

const raw = fetchBaseQuery({
  baseUrl: env.NEXT_PUBLIC_API_URL,
  // Orders and requests need the signed-in customer (ADR 0021); public calls ignore it.
  prepareHeaders: async (headers) => {
    const token = await currentToken();
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

/** An expired access token is refreshed once and the call retried. */
const withRefresh: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extra,
) => {
  const first = await raw(args, api, extra);
  if (first.error?.status !== 401 || !(await currentToken())) return first;
  return (await refresh()) ? raw(args, api, extra) : first;
};

/**
 * The single RTK Query API for the browser. Endpoints are injected from the generated file
 * (typed from the gateway OpenAPI spec) and enhanced with cache tags in ./index.ts.
 */
export const baseApi = createApi({
  reducerPath: 'gateway',
  baseQuery: withRefresh,
  tagTypes: ['Cart'],
  endpoints: () => ({}),
});
