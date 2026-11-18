import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createZodDto, ServiceRegistry, ZodResponse } from '@zelqune/common';
import {
  type MyOrders,
  myOrdersSchema,
  type MyRequests,
  myRequestsSchema,
  RPC_PATTERNS,
  savedAddressInputSchema,
  type SavedAddressList,
  savedAddressListSchema,
} from '@zelqune/contracts';
import { z } from 'zod';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/guards';

class MyOrdersDto extends createZodDto(myOrdersSchema) {}
class MyRequestsDto extends createZodDto(myRequestsSchema) {}
class SavedAddressInputDto extends createZodDto(savedAddressInputSchema) {}
class SavedAddressListDto extends createZodDto(savedAddressListSchema) {}

const A = RPC_PATTERNS.identity.customer.addresses;

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

  /** The address book: every change answers with the whole list (default first). */
  @Get('addresses')
  @ZodResponse({ type: SavedAddressListDto })
  addresses(@CurrentUser() user: AuthenticatedUser) {
    return this.services.get('identity').send<SavedAddressList>(A.list, { userId: user.id });
  }

  @Post('addresses')
  @ZodResponse({ type: SavedAddressListDto })
  addAddress(@CurrentUser() user: AuthenticatedUser, @Body() body: SavedAddressInputDto) {
    return this.services
      .get('identity')
      .send<SavedAddressList>(A.save, { userId: user.id, id: null, input: body });
  }

  @Put('addresses/:id')
  @ZodResponse({ type: SavedAddressListDto })
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SavedAddressInputDto,
  ) {
    return this.services
      .get('identity')
      .send<SavedAddressList>(A.save, { userId: user.id, id: z.uuid().parse(id), input: body });
  }

  @Delete('addresses/:id')
  @ZodResponse({ type: SavedAddressListDto })
  removeAddress(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.services
      .get('identity')
      .send<SavedAddressList>(A.remove, { userId: user.id, id: z.uuid().parse(id) });
  }
}
