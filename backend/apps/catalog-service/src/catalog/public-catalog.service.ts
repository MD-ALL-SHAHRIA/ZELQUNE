import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@zelqune/common';
import {
  type CategoryView,
  type ProductDetail,
  type ProductListQuery,
  type ProductListResponse,
  type ResolvePriceRpcResponse,
} from '@zelqune/contracts';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage.provider';
import { CatalogMapper, toCategoryView, variantPrice } from './catalog.mappers';
import { CatalogRepository } from './catalog.repository';

/** Storefront reads: only ACTIVE products, active variants and READY media are ever returned. */
@Injectable()
export class PublicCatalogService {
  private readonly mapper: CatalogMapper;

  constructor(
    private readonly repo: CatalogRepository,
    @Inject(STORAGE_PROVIDER) storage: StorageProvider,
  ) {
    this.mapper = new CatalogMapper(storage);
  }

  async listCategories(): Promise<{ items: CategoryView[] }> {
    return { items: (await this.repo.listActiveCategories()).map(toCategoryView) };
  }

  async listProducts(query: ProductListQuery): Promise<ProductListResponse> {
    const now = new Date();
    const { rows, total } = await this.repo.listPublicProducts({
      categorySlug: query.category,
      saleMode: query.saleMode,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      now,
    });
    return {
      items: rows.map((row) => this.mapper.summary(row, query.p, now)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async getBySlug(slug: string, p?: string): Promise<ProductDetail> {
    const now = new Date();
    const row = await this.repo.findPublicProductBySlug(slug, now);
    if (!row) throw new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404);
    return this.mapper.detail(row, p, now);
  }

  async resolvePrices(variantIds: string[], p?: string): Promise<ResolvePriceRpcResponse> {
    const now = new Date();
    const variants = await this.repo.findSellableVariants(variantIds, now);
    const byId = new Map(variants.map((v) => [v.id, v]));
    return Object.fromEntries(
      variantIds.map((id) => {
        const v = byId.get(id);
        return [id, v ? variantPrice({ ...v }, p, now) : null];
      }),
    );
  }
}
