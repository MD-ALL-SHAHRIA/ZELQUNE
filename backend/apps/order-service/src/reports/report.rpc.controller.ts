import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type Coupon,
  type CustomerList,
  customerListQuerySchema,
  reportRangeQuerySchema,
  RPC_PATTERNS,
  type RpcRequest,
  type SalesReport,
  type UnitsSold,
  type UpsertCouponInput,
} from '@zelqune/contracts';
import { z } from 'zod';
import { CouponService } from '../marketing/coupon.service';
import { ReportService } from './report.service';

const P = RPC_PATTERNS.order.admin;

@Controller()
export class ReportRpcController {
  constructor(
    private readonly reports: ReportService,
    private readonly coupons: CouponService,
  ) {}

  @MessagePattern(P.salesReport)
  sales(@Payload() req: RpcRequest<unknown>): Promise<SalesReport> {
    return this.reports.sales(reportRangeQuerySchema.parse(req.data));
  }

  @MessagePattern(P.unitsSold)
  unitsSold(@Payload() req: RpcRequest<unknown>): Promise<UnitsSold> {
    return this.reports.unitsSold(reportRangeQuerySchema.parse(req.data));
  }

  @MessagePattern(P.listCustomers)
  customers(@Payload() req: RpcRequest<unknown>): Promise<CustomerList> {
    return this.reports.customers(customerListQuerySchema.parse(req.data));
  }

  @MessagePattern(P.listCoupons)
  listCoupons(): Promise<{ items: Coupon[] }> {
    return this.coupons.list();
  }

  @MessagePattern(P.createCoupon)
  createCoupon(@Payload() req: RpcRequest<UpsertCouponInput>): Promise<Coupon> {
    return this.coupons.create(req.data);
  }

  @MessagePattern(P.updateCoupon)
  updateCoupon(
    @Payload() req: RpcRequest<{ id: string; coupon: UpsertCouponInput }>,
  ): Promise<Coupon> {
    return this.coupons.update(z.uuid().parse(req.data.id), req.data.coupon);
  }

  @MessagePattern(P.removeCoupon)
  removeCoupon(@Payload() req: RpcRequest<{ id: string }>): Promise<{ deleted: boolean }> {
    return this.coupons.remove(z.uuid().parse(req.data.id));
  }
}
