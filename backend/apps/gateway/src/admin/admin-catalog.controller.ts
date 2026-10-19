import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppError, ServiceRegistry, ZodResponse } from '@zelqune/common';
import {
  adminCategorySchema,
  type AdminProduct,
  type AdminProductList,
  type MediaUploadTicket,
  RPC_PATTERNS,
  type StockLevelView,
} from '@zelqune/contracts';
import { z } from 'zod';
import { Roles } from '../auth/guards';
import {
  AdjustStockDto,
  AdminCategoryListDto,
  AdminProductDto,
  AdminProductListDto,
  AdminProductListQueryDto,
  ChangedDto,
  ChangedFlagDto,
  CreateCategoryDto,
  CreateProductDto,
  IdDto,
  IdParamDto,
  MediaTicketDto,
  RequestMediaUploadDto,
  SetExperimentDto,
  SetPriceDto,
  StatusDto,
  StockAdjustedDto,
  StockListDto,
  StockQueryDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpsertVariantDto,
  VariantKeyParamDto,
  VariantSkuParamDto,
} from './admin.dto';

const C = RPC_PATTERNS.catalog.admin;

/** Catalog and stock management for OWNER/STAFF. Every change is audited. */
@ApiTags('admin: catalog')
@ApiBearerAuth()
@Roles('OWNER', 'STAFF')
@Controller('admin')
export class AdminCatalogController {
  constructor(private readonly services: ServiceRegistry) {}

  private catalog<T>(pattern: string, data: unknown): Promise<T> {
    return this.services.get('catalog').send<T>(pattern, data);
  }

  @Get('categories')
  @ZodResponse({ type: AdminCategoryListDto })
  categories() {
    return this.catalog<{ items: z.infer<typeof adminCategorySchema>[] }>(C.listCategories, {});
  }

  @Post('categories')
  @ZodResponse({ status: 201, type: IdDto })
  createCategory(@Body() body: CreateCategoryDto) {
    return this.catalog<{ id: string }>(C.createCategory, body);
  }

  @Patch('categories/:id')
  @ZodResponse({ type: ChangedDto })
  updateCategory(@Param() { id }: IdParamDto, @Body() body: UpdateCategoryDto) {
    return this.catalog<{ id: string; changedFields: string[] }>(C.updateCategory, {
      categoryId: id,
      changes: body,
    });
  }

  @Get('products')
  @ApiOperation({ summary: 'All products in every status (search by name, slug or SKU).' })
  @ZodResponse({ type: AdminProductListDto })
  products(@Query() query: AdminProductListQueryDto) {
    return this.catalog<AdminProductList>(C.listProducts, query);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a DRAFT product.' })
  @ZodResponse({ status: 201, type: IdDto })
  createProduct(@Body() body: CreateProductDto) {
    return this.catalog<{ id: string }>(C.createProduct, body);
  }

  @Get('products/:id')
  @ApiOperation({
    summary: 'Product with all variants, current RETAIL prices, experiments and media.',
  })
  @ZodResponse({ type: AdminProductDto })
  product(@Param() { id }: IdParamDto) {
    return this.catalog<AdminProduct>(C.getProduct, { productId: id });
  }

  @Patch('products/:id')
  @ZodResponse({ type: ChangedDto })
  updateProduct(@Param() { id }: IdParamDto, @Body() body: UpdateProductDto) {
    return this.catalog<{ id: string; changedFields: string[] }>(C.updateProduct, {
      productId: id,
      changes: body,
    });
  }

  @Post('products/:id/publish')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: StatusDto })
  publish(@Param() { id }: IdParamDto) {
    return this.catalog<{ status: string }>(C.publishProduct, { productId: id });
  }

  @Post('products/:id/archive')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: StatusDto })
  archive(@Param() { id }: IdParamDto) {
    return this.catalog<{ status: string }>(C.archiveProduct, { productId: id });
  }

  @Put('products/:id/variants/:sku')
  @ApiOperation({
    summary: 'Create or update a variant by SKU (incl. packaged size/weight for shipping).',
  })
  @ZodResponse({ type: IdDto })
  upsertVariant(@Param() { id, sku }: VariantSkuParamDto, @Body() body: UpsertVariantDto) {
    return this.catalog<{ id: string }>(C.upsertVariant, { productId: id, sku, ...body });
  }

  @Put('variants/:id/price')
  @ApiOperation({ summary: 'Set the base price (integer paisa; RETAIL list).' })
  @ZodResponse({ type: ChangedFlagDto })
  setPrice(@Param() { id }: IdParamDto, @Body() body: SetPriceDto) {
    return this.catalog<{ changed: boolean }>(C.setBasePrice, { variantId: id, ...body });
  }

  @Put('variants/:id/experiments/:key')
  @ApiOperation({ summary: 'Set a price experiment arm (?p=a|b).' })
  @ZodResponse({ type: ChangedFlagDto })
  setExperiment(@Param() { id, key }: VariantKeyParamDto, @Body() body: SetExperimentDto) {
    return this.catalog<{ changed: boolean }>(C.setExperimentPrice, {
      variantId: id,
      key,
      ...body,
    });
  }

  @Post('products/:id/media/uploads')
  @ApiOperation({ summary: 'Get a presigned upload URL; PUT the file there, then confirm.' })
  @ZodResponse({ status: 201, type: MediaTicketDto })
  requestUpload(@Param() { id }: IdParamDto, @Body() body: RequestMediaUploadDto) {
    return this.catalog<MediaUploadTicket>(C.requestMediaUpload, { productId: id, ...body });
  }

  @Post('media/:id/confirm')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: StatusDto })
  confirmMedia(@Param() { id }: IdParamDto) {
    return this.catalog<{ status: string }>(C.confirmMediaUpload, { mediaId: id });
  }

  @Delete('media/:id')
  @HttpCode(204)
  async removeMedia(@Param() { id }: IdParamDto): Promise<void> {
    await this.catalog(C.removeMedia, { mediaId: id });
  }

  @Get('stock')
  @ApiOperation({ summary: 'Stock levels (optionally ?variantIds=id1,id2).' })
  @ZodResponse({ type: StockListDto })
  async stock(@Query() query: StockQueryDto) {
    const ids = query.variantIds
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids && !ids.every((v) => z.uuid().safeParse(v).success)) {
      throw new AppError('VALIDATION_FAILED', 'variantIds must be comma-separated UUIDs', 400);
    }
    const items = await this.services
      .get('inventory')
      .send<StockLevelView[]>(RPC_PATTERNS.inventory.admin.list, { variantIds: ids });
    return { items };
  }

  @Post('stock/:id/adjustments')
  @ApiOperation({ summary: 'Receipt / correction / return for a variant (never below reserved).' })
  @ZodResponse({ status: 201, type: StockAdjustedDto })
  adjust(@Param() { id }: IdParamDto, @Body() body: AdjustStockDto) {
    return this.services
      .get('inventory')
      .send<{ onHand: number; reserved: number }>(RPC_PATTERNS.inventory.admin.adjust, {
        variantId: id,
        ...body,
      });
  }
}
