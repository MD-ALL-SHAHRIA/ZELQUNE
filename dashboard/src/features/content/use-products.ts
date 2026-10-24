'use client';

import { useEffect, useState } from 'react';
import { api, type Schemas } from '@/lib/api';

export type ProductRow = Schemas['AdminProductListDto_Output']['items'][number];

/** Every product (admin list, up to 100), for pickers. */
export function useAllProducts() {
  const [items, setItems] = useState<ProductRow[] | null>(null);
  useEffect(() => {
    void api
      .GET('/v1/admin/products', { params: { query: { limit: 100 } } })
      .then(({ data }) => setItems(data?.items ?? []));
  }, []);
  return items;
}
