import { Body, Controller, Get, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { ServiceRegistry, ZodResponse } from '@zelqune/common';
import {
  type AdminOrderDetail,
  type CustomerAccount,
  type AdminOrderDetailCore,
  type AdminOrderList,
  type AdminOrderSummary,
  type PaymentSummary,
  RPC_PATTERNS,
  type ShipmentSummary,
} from '@zelqune/contracts';
import { type Response } from 'express';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/guards';
import {
  AddOrderNoteDto,
  AdminOrderDetailDto,
  AdminOrderExportQueryDto,
  AdminOrderListDto,
  AdminOrderListQueryDto,
  CreateShipmentDto,
  FriendDto,
  IdDto,
  IdParamDto,
  PaymentDto,
  PhoneParamDto,
  RejectPaymentDto,
  SetFriendDto,
  ShipmentDto,
  StatusDto,
  TransitionRequestDto,
  UpdateShipmentDto,
  VerifyPaymentDto,
} from './admin.dto';
import { toCsv } from './csv';

const O = RPC_PATTERNS.order.admin;

const CSV_COLUMNS: { key: keyof AdminOrderSummary; header: string }[] = [
  { key: 'code', header: 'Order code' },
  { key: 'placedAt', header: 'Placed at (UTC)' },
  { key: 'channel', header: 'Channel' },
  { key: 'status', header: 'Status' },
  { key: 'saleMode', header: 'Sale mode' },
  { key: 'customerName', header: 'Customer' },
  { key: 'customerPhone', header: 'Phone' },
  { key: 'isFriend', header: 'Friend' },
  { key: 'district', header: 'District' },
  { key: 'paymentMethod', header: 'Payment method' },
  { key: 'subtotalPaisa', header: 'Subtotal (paisa)' },
  { key: 'shippingFeePaisa', header: 'Shipping (paisa)' },
  { key: 'totalPaisa', header: 'Total (paisa)' },
  { key: 'advanceRequiredPaisa', header: 'Advance (paisa)' },
  { key: 'experimentKey', header: 'Price experiment' },
];

/** Orders, payments, customers and shipments for OWNER/STAFF. Every change is audited. */
@ApiTags('admin: orders')
@ApiBearerAuth()
@Roles('OWNER', 'STAFF')
@Controller('admin')
export class AdminOrdersController {
  constructor(private readonly services: ServiceRegistry) {}

  @Get('orders')
  @ApiOperation({
    summary:
      'List orders (filters: status, channel, saleMode, paymentMethod, from/to, q, isFriend).',
  })
  @ZodResponse({ type: AdminOrderListDto })
  list(@Query() query: AdminOrderListQueryDto): Promise<AdminOrderList> {
    return this.services.get('order').send(O.list, query);
  }

  @Get('orders.csv')
  @ApiProduces('text/csv')
  @ApiOperation({
    summary: 'CSV export (same filters, up to 10 000 rows, formula-injection safe).',
  })
  async exportCsv(@Query() query: AdminOrderExportQueryDto, @Res() res: Response): Promise<void> {
    const rows = await this.services
      .get('order')
      .send<AdminOrderSummary[]>(O.export, query, { timeoutMs: 30_000 });
    const stamp = new Date().toISOString().slice(0, 10);
    res
      .status(200)
      .type('text/csv; charset=utf-8')
      .setHeader('Content-Disposition', `attachment; filename="zelqune-orders-${stamp}.csv"`)
      .send(toCsv(CSV_COLUMNS, rows));
  }

  @Get('orders/:id')
  @ZodResponse({ type: AdminOrderDetailDto })
  async detail(@Param() { id }: IdParamDto): Promise<AdminOrderDetail> {
    const order = await this.services
      .get('order')
      .send<AdminOrderDetailCore>(O.detail, { orderId: id });
    const [payment, shipment, accounts] = await Promise.all([
      this.services
        .get('payment')
        .send<PaymentSummary | null>(RPC_PATTERNS.payment.summaryByOrder, { orderId: id }),
      this.services
        .get('shipping')
        .send<ShipmentSummary | null>(RPC_PATTERNS.shipping.shipmentByOrder, { orderId: id }),
      order.customerUserId
        ? this.services
            .get('identity')
            .send<CustomerAccount[]>(RPC_PATTERNS.identity.accounts.byIds, {
              ids: [order.customerUserId],
            })
        : Promise.resolve([]),
    ]);
    return { ...order, payment, shipment, account: accounts[0] ?? null };
  }

  @Post('orders/:id/transitions')
  @ApiOperation({ summary: 'Change the order status (state machine enforced).' })
  @ZodResponse({ status: 200, type: StatusDto })
  transition(
    @Param() { id }: IdParamDto,
    @Body() body: TransitionRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.services.get('order').send<{ status: string }>(O.transition, {
      orderId: id,
      to: body.to,
      reason: body.reason,
      actor: user.id,
    });
  }

  @Post('orders/:id/notes')
  @ZodResponse({ status: 201, type: IdDto })
  addNote(@Param() { id }: IdParamDto, @Body() body: AddOrderNoteDto) {
    return this.services
      .get('order')
      .send<{ id: string }>(O.addNote, { orderId: id, text: body.text });
  }

  @Post('orders/:id/shipment')
  @ApiOperation({ summary: 'Create the shipment (MANUAL: record the courier consignment id).' })
  @ZodResponse({ status: 201, type: ShipmentDto })
  createShipment(@Param() { id }: IdParamDto, @Body() body: CreateShipmentDto) {
    return this.services
      .get('shipping')
      .send<ShipmentSummary>(RPC_PATTERNS.shipping.admin.createShipment, { orderId: id, ...body });
  }

  @Patch('orders/:id/shipment')
  @ZodResponse({ type: ShipmentDto })
  updateShipment(@Param() { id }: IdParamDto, @Body() body: UpdateShipmentDto) {
    return this.services
      .get('shipping')
      .send<ShipmentSummary>(RPC_PATTERNS.shipping.admin.updateStatus, {
        orderId: id,
        status: body.status,
      });
  }

  @Post('payments/:id/verify')
  @ApiOperation({
    summary: 'bKash/Nagad trxId received with this amount -> VERIFIED (confirms the order).',
  })
  @ZodResponse({ status: 200, type: PaymentDto })
  verify(
    @Param() { id }: IdParamDto,
    @Body() body: VerifyPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.services.get('payment').send<PaymentSummary>(RPC_PATTERNS.payment.admin.verify, {
      paymentId: id,
      verifiedBy: user.id,
      amountReceivedPaisa: body.amountReceivedPaisa,
    });
  }

  @Post('payments/:id/reject')
  @ZodResponse({ status: 200, type: PaymentDto })
  reject(
    @Param() { id }: IdParamDto,
    @Body() body: RejectPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.services.get('payment').send<PaymentSummary>(RPC_PATTERNS.payment.admin.reject, {
      paymentId: id,
      rejectedBy: user.id,
      reason: body.reason,
    });
  }

  @Post('payments/:id/confirm-cod')
  @ApiOperation({ summary: 'COD confirmed with the customer by phone -> order CONFIRMED.' })
  @ZodResponse({ status: 200, type: PaymentDto })
  confirmCod(@Param() { id }: IdParamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.services
      .get('payment')
      .send<PaymentSummary>(RPC_PATTERNS.payment.admin.confirmCod, {
        paymentId: id,
        confirmedBy: user.id,
      });
  }

  @Put('customers/:phone/friend')
  @ApiOperation({
    summary: 'Mark a customer (by phone) as friend/family: their orders never count for GO.',
  })
  @ZodResponse({ type: FriendDto })
  setFriend(@Param() { phone }: PhoneParamDto, @Body() body: SetFriendDto) {
    return this.services
      .get('order')
      .send<{ phone: string; isFriend: boolean }>(O.setFriend, { phone, isFriend: body.isFriend });
  }
}
