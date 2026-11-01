import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppError, createZodDto, ServiceRegistry, ZodResponse } from '@zelqune/common';
import {
  type CustomerAccountList,
  customerAccountListQuerySchema,
  customerAccountListSchema,
  type Coupon,
  type CustomerList,
  type Expense,
  type ExpenseList,
  previousRange,
  type ProfitLoss,
  type Promotion,
  resolveReportRange,
  RPC_PATTERNS,
  type SalesReport,
  type UnitsSold,
} from '@zelqune/contracts';
import { Roles } from '../auth/guards';
import { IdParamDto } from './admin.dto';
import {
  CouponDto,
  CouponListDto,
  CustomerListDto,
  CustomerListQueryDto,
  DeletedDto,
  ExpenseDto,
  ExpenseListDto,
  ExpenseListQueryDto,
  ProfitLossDto,
  PromotionDto,
  PromotionListDto,
  ReportRangeQueryDto,
  SalesReportDto,
  UpsertCouponDto,
  UpsertExpenseDto,
  UpsertPromotionDto,
} from './business.dto';
import { buildProfitLoss } from './profit-loss';

const O = RPC_PATTERNS.order.admin;
const C = RPC_PATTERNS.catalog.admin;
const A = RPC_PATTERNS.analytics;

/** Marketing (coupons, sales), reports, customers and finance (ADR 0016). Changes are audited. */
class CustomerAccountListDto extends createZodDto(customerAccountListSchema) {}
class CustomerAccountListQueryDto extends createZodDto(customerAccountListQuerySchema) {}

@ApiTags('admin: business')
@ApiBearerAuth()
@Roles('OWNER', 'STAFF')
@Controller('admin')
export class AdminBusinessController {
  constructor(private readonly services: ServiceRegistry) {}

  // ---------- coupons (order-service) ----------

  @Get('coupons')
  @ZodResponse({ type: CouponListDto })
  coupons() {
    return this.services.get('order').send<{ items: Coupon[] }>(O.listCoupons, {});
  }

  @Post('coupons')
  @ZodResponse({ status: 201, type: CouponDto })
  createCoupon(@Body() body: UpsertCouponDto) {
    return this.services.get('order').send<Coupon>(O.createCoupon, body);
  }

  @Put('coupons/:id')
  @ZodResponse({ type: CouponDto })
  updateCoupon(@Param() { id }: IdParamDto, @Body() body: UpsertCouponDto) {
    return this.services.get('order').send<Coupon>(O.updateCoupon, { id, coupon: body });
  }

  @Delete('coupons/:id')
  @ApiOperation({ summary: 'Deletes an unused coupon; a redeemed one is deactivated instead.' })
  @ZodResponse({ type: DeletedDto })
  removeCoupon(@Param() { id }: IdParamDto) {
    return this.services.get('order').send<{ deleted: boolean }>(O.removeCoupon, { id });
  }

  // ---------- sales / flash sales (catalog-service) ----------

  @Get('promotions')
  @ZodResponse({ type: PromotionListDto })
  promotions() {
    return this.services.get('catalog').send<{ items: Promotion[] }>(C.listPromotions, {});
  }

  @Post('promotions')
  @ApiOperation({ summary: 'A sale lowers storefront and checkout prices while it runs.' })
  @ZodResponse({ status: 201, type: PromotionDto })
  createPromotion(@Body() body: UpsertPromotionDto) {
    return this.services.get('catalog').send<Promotion>(C.createPromotion, body);
  }

  @Put('promotions/:id')
  @ZodResponse({ type: PromotionDto })
  updatePromotion(@Param() { id }: IdParamDto, @Body() body: UpsertPromotionDto) {
    return this.services.get('catalog').send<Promotion>(C.updatePromotion, { id, promotion: body });
  }

  @Delete('promotions/:id')
  @ZodResponse({ type: DeletedDto })
  removePromotion(@Param() { id }: IdParamDto) {
    return this.services.get('catalog').send<{ deleted: boolean }>(C.removePromotion, { id });
  }

  // ---------- reports and customers (order-service) ----------

  @Get('reports/sales')
  @ApiOperation({
    summary: 'Sales by day, product, variant, district, payment, channel and coupon (BD days).',
  })
  @ZodResponse({ type: SalesReportDto })
  sales(@Query() query: ReportRangeQueryDto) {
    return this.services.get('order').send<SalesReport>(O.salesReport, query);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Everyone who has ordered, grouped by phone, with lifetime spend.' })
  @ZodResponse({ type: CustomerListDto })
  customers(@Query() query: CustomerListQueryDto) {
    return this.services.get('order').send<CustomerList>(O.listCustomers, query);
  }

  // ---------- finance (OWNER only) ----------

  @Get('customer-accounts')
  @ApiOperation({ summary: 'Customer accounts: name, verified email, phone, sign-in method.' })
  @ZodResponse({ type: CustomerAccountListDto })
  customerAccounts(@Query() query: CustomerAccountListQueryDto) {
    return this.services
      .get('identity')
      .send<CustomerAccountList>(RPC_PATTERNS.identity.accounts.list, query);
  }

  @Get('expenses')
  @Roles('OWNER')
  @ZodResponse({ type: ExpenseListDto })
  expenses(@Query() query: ExpenseListQueryDto) {
    return this.services.get('analytics').send<ExpenseList>(A.listExpenses, query);
  }

  @Post('expenses')
  @Roles('OWNER')
  @ZodResponse({ status: 201, type: ExpenseDto })
  createExpense(@Body() body: UpsertExpenseDto) {
    return this.services.get('analytics').send<Expense>(A.createExpense, body);
  }

  @Put('expenses/:id')
  @Roles('OWNER')
  @ZodResponse({ type: ExpenseDto })
  updateExpense(@Param() { id }: IdParamDto, @Body() body: UpsertExpenseDto) {
    return this.services.get('analytics').send<Expense>(A.updateExpense, { id, expense: body });
  }

  @Delete('expenses/:id')
  @Roles('OWNER')
  @ZodResponse({ type: DeletedDto })
  removeExpense(@Param() { id }: IdParamDto) {
    return this.services.get('analytics').send<{ deleted: boolean }>(A.removeExpense, { id });
  }

  @Get('reports/profit-loss')
  @Roles('OWNER')
  @ApiOperation({
    summary:
      'Revenue - cost of goods (variant unit costs) - expenses, with the previous period and months.',
  })
  @ZodResponse({ type: ProfitLossDto })
  async profitLoss(@Query() query: ReportRangeQueryDto): Promise<ProfitLoss> {
    const range = resolveReportRange(query);
    if (!range)
      throw new AppError('INVALID_RANGE', 'from must be on or before to, at most 366 days', 422);
    const prev = previousRange(range);
    const [sold, expenses, prevSold, prevExpenses] = await Promise.all([
      this.services.get('order').send<UnitsSold>(O.unitsSold, range),
      this.services.get('analytics').send<ExpenseList>(A.listExpenses, range),
      this.services.get('order').send<UnitsSold>(O.unitsSold, prev),
      this.services.get('analytics').send<ExpenseList>(A.listExpenses, prev),
    ]);
    const variantIds = [...new Set([...sold.items, ...prevSold.items].map((i) => i.variantId))];
    const costs = variantIds.length
      ? await this.services
          .get('catalog')
          .send<Record<string, number | null>>(C.variantCosts, { variantIds })
      : {};
    return buildProfitLoss({
      range,
      sold,
      costs,
      expenses,
      previous: { sold: prevSold, expenses: prevExpenses, costs },
    });
  }
}
