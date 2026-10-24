import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@zelqune/common';
import {
  type ActiveSale,
  type CategoryView,
  type ProductDetail,
  type ProductListQuery,
  type ProductListResponse,
  type CheckoutSnapshotResponse,
  type ResolvePriceRpcResponse,
} from '@zelqune/contracts';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage.provider';
import { CatalogMapper, toCategoryView, toOptions, variantPrice } from './catalog.mappers';
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
    const sales = await this.repo.liveSales(now);
    const { rows, total } = await this.repo.listPublicProducts({
      categorySlug: query.category,
      saleMode: query.saleMode,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      now,
    });
    return {
      items: rows.map((row) => this.mapper.summary(row, query.p, now, sales)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async getBySlug(slug: string, p?: string): Promise<ProductDetail> {
    const now = new Date();
    const [row, sales] = await Promise.all([
      this.repo.findPublicProductBySlug(slug, now),
      this.repo.liveSales(now),
    ]);
    if (!row) throw new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404);
    return this.mapper.detail(row, p, now, sales);
  }

  /** The flash/seasonal sale running now (longest-running first), for the storefront banner. */
  async activeSale(): Promise<ActiveSale> {
    const [sale] = await this.repo.liveSales(new Date());
    return {
      sale: sale
        ? {
            id: sale.id,
            nameEn: sale.nameEn,
            nameBn: sale.nameBn,
            kind: sale.kind,
            value: sale.value,
            endsAt: sale.endsAt.toISOString(),
            flash: sale.flash,
            productIds: sale.productIds ? [...sale.productIds] : [],
          }
        : null,
    };
  }

  async resolvePrices(variantIds: string[], p?: string): Promise<ResolvePriceRpcResponse> {
    const now = new Date();
    const [variants, sales] = await Promise.all([
      this.repo.findSellableVariants(variantIds, now),
      this.repo.liveSales(now),
    ]);
    const byId = new Map(variants.map((v) => [v.id, v]));
    return Object.fromEntries(
      variantIds.map((id) => {
        const v = byId.get(id);
        return [id, v ? variantPrice(v, p, now, sales) : null];
      }),
    );
  }

  /** Price + snapshot data for checkout; variants that aren't sellable are left out. */
  async checkoutSnapshot(variantIds: string[], p?: string): Promise<CheckoutSnapshotResponse> {
    const now = new Date();
    const [variants, sales] = await Promise.all([
      this.repo.findCheckoutVariants(variantIds, now),
      this.repo.liveSales(now),
    ]);
    return Object.fromEntries(
      variants.map((v) => [
        v.id,
        {
          variantId: v.id,
          productId: v.productId,
          productSlug: v.product.slug,
          sku: v.sku,
          nameBn: v.product.nameBn,
          nameEn: v.product.nameEn,
          options: toOptions(v.options),
          saleMode: v.product.saleMode,
          leadTimeDays: v.product.leadTimeDays,
          packageWeightGrams: v.packageWeightGrams,
          packageLengthMm: v.packageLengthMm,
          packageWidthMm: v.packageWidthMm,
          packageHeightMm: v.packageHeightMm,
          price: variantPrice(v, p, now, sales),
        },
      ]),
    );
  }
}
