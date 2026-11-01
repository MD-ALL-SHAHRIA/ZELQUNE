import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createZodDto, ServiceRegistry, ZodResponse } from '@zelqune/common';
import {
  type MyOrders,
  myOrdersSchema,
  type MyRequests,
  myRequestsSchema,
  RPC_PATTERNS,
} from '@zelqune/contracts';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/guards';

class MyOrdersDto extends createZodDto(myOrdersSchema) {}
class MyRequestsDto extends createZodDto(myRequestsSchema) {}

/** The signed-in customer's own orders and requests (ADR 0021). The id comes from the token. */
@ApiTags('customer auth')
@ApiBearerAuth()
@Roles('CUSTOMER')
@Controller('me')
export class MeController {
  constructor(private readonly services: ServiceRegistry) {}

  @Get('orders')
  @ZodResponse({ type: MyOrdersDto })
  orders(@CurrentUser() user: AuthenticatedUser) {
    return this.services
      .get('order')
      .send<MyOrders>(RPC_PATTERNS.order.mine.orders, { userId: user.id });
  }

  @Get('requests')
  @ZodResponse({ type: MyRequestsDto })
  requests(@CurrentUser() user: AuthenticatedUser) {
    return this.services
      .get('order')
      .send<MyRequests>(RPC_PATTERNS.order.mine.requests, { userId: user.id });
  }
}
