import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServiceRegistry, ZodResponse } from '@zelqune/common';
import {
  type AdminQuote,
  adminQuoteListSchema,
  type AuditLogPage,
  type DashboardStats,
  RPC_PATTERNS,
} from '@zelqune/contracts';
import { type z } from 'zod';
import { Roles } from '../auth/guards';
import {
  AdminQuoteDto,
  AdminQuoteListDto,
  AdminQuoteListQueryDto,
  AuditLogPageDto,
  AuditLogQueryDto,
  ConvertedQuoteDto,
  ConvertQuoteDto,
  DashboardQueryDto,
  DashboardStatsDto,
  DecideQuoteDto,
  IdParamDto,
  PriceQuoteDto,
} from './admin.dto';

const Q = RPC_PATTERNS.order.quotes.admin;

@ApiTags('admin: insights & B2B')
@ApiBearerAuth()
@Roles('OWNER', 'STAFF')
@Controller('admin')
export class AdminInsightsController {
  constructor(private readonly services: ServiceRegistry) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Funnel, revenue, GO counter, price-experiment conversion (BD calendar days).',
  })
  @ZodResponse({ type: DashboardStatsDto })
  dashboard(@Query() query: DashboardQueryDto) {
    return this.services
      .get('analytics')
      .send<DashboardStats>(RPC_PATTERNS.analytics.dashboard, query);
  }

  @Get('audit-log')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Who changed what (OWNER only).' })
  @ZodResponse({ type: AuditLogPageDto })
  auditLog(@Query() query: AuditLogQueryDto) {
    return this.services
      .get('analytics')
      .send<AuditLogPage>(RPC_PATTERNS.analytics.auditLog, query);
  }

  @Get('quotes')
  @ZodResponse({ type: AdminQuoteListDto })
  quotes(@Query() query: AdminQuoteListQueryDto) {
    return this.services.get('order').send<z.infer<typeof adminQuoteListSchema>>(Q.list, query);
  }

  @Get('quotes/:id')
  @ZodResponse({ type: AdminQuoteDto })
  quote(@Param() { id }: IdParamDto) {
    return this.services.get('order').send<AdminQuote>(Q.get, { quoteId: id });
  }

  @Put('quotes/:id/pricing')
  @ApiOperation({
    summary:
      'Price a quote: variant + unit price per line, shipping, advance, validUntil (default 7 days).',
  })
  @ZodResponse({ type: AdminQuoteDto })
  price(@Param() { id }: IdParamDto, @Body() body: PriceQuoteDto) {
    return this.services.get('order').send<AdminQuote>(Q.price, { quoteId: id, pricing: body });
  }

  @Post('quotes/:id/accept')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: AdminQuoteDto })
  accept(@Param() { id }: IdParamDto) {
    return this.services.get('order').send<AdminQuote>(Q.accept, { quoteId: id });
  }

  @Post('quotes/:id/reject')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: AdminQuoteDto })
  reject(@Param() { id }: IdParamDto, @Body() body: DecideQuoteDto) {
    return this.services
      .get('order')
      .send<AdminQuote>(Q.reject, { quoteId: id, reason: body.reason });
  }

  @Post('quotes/:id/convert')
  @ApiOperation({
    summary: 'Accepted quote -> B2B order at the quoted prices (advance 0 / COD: OWNER only).',
  })
  @ZodResponse({ status: 201, type: ConvertedQuoteDto })
  convert(@Param() { id }: IdParamDto, @Body() body: ConvertQuoteDto) {
    return this.services
      .get('order')
      .send<{ orderCode: string; orderId: string }>(
        Q.convert,
        { quoteId: id, conversion: body },
        { timeoutMs: 20_000 },
      );
  }
}
