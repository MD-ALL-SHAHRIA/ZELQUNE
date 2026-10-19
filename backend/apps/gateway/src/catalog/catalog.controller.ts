import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, ZodResponse, ServiceRegistry } from '@zelqune/common';
import {
  type CategoryView,
  type ProductDetail,
  type ProductListResponse,
  RPC_PATTERNS,
} from '@zelqune/contracts';
import {
  CategoryListResponseDto,
  ProductDetailDto,
  ProductDetailQueryDto,
  ProductListQueryDto,
  ProductListResponseDto,
  ProductSlugParamDto,
} from './catalog.dto';

/** Public storefront catalog. Prices honour the price experiment bucket `?p=a|b`. */
@ApiTags('catalog')
@Public()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly services: ServiceRegistry) {}

  @Get('categories')
  @ApiOperation({ summary: 'Active categories (flat; build the tree from parentId).' })
  @ZodResponse({ type: CategoryListResponseDto })
  categories(): Promise<{ items: CategoryView[] }> {
    return this.services.get('catalog').send(RPC_PATTERNS.catalog.categoriesList, {});
  }

  @Get('products')
  @ApiOperation({ summary: 'Active products with their lowest resolved price.' })
  @ZodResponse({ type: ProductListResponseDto })
  products(@Query() query: ProductListQueryDto): Promise<ProductListResponse> {
    return this.services.get('catalog').send(RPC_PATTERNS.catalog.productsList, query);
  }

  @Get('products/:slug')
  @ApiOperation({
    summary: 'Product detail: active variants with resolved prices and READY media only.',
  })
  @ZodResponse({ type: ProductDetailDto })
  product(
    @Param() params: ProductSlugParamDto,
    @Query() query: ProductDetailQueryDto,
  ): Promise<ProductDetail> {
    return this.services
      .get('catalog')
      .send(RPC_PATTERNS.catalog.productBySlug, { slug: params.slug, p: query.p });
  }
}
