import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServiceRegistry, ZodResponse } from '@zelqune/common';
import {
  type AuthUser,
  type CheckoutSettings,
  type NotificationSettings,
  type PaymentSettings,
  RPC_PATTERNS,
  type SettingsView,
  type ShippingSettings,
  type TeamMember,
} from '@zelqune/contracts';
import { type AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/guards';
import { IdParamDto } from './admin.dto';
import {
  AccountDto,
  ChangePasswordDto,
  CheckoutSettingsDto,
  CheckoutSettingsViewDto,
  CreateTeamMemberDto,
  NotificationSettingsDto,
  NotificationSettingsViewDto,
  OkDto,
  PaymentSettingsDto,
  PaymentSettingsViewDto,
  ResetPasswordDto,
  ShippingSettingsDto,
  ShippingSettingsViewDto,
  TeamListDto,
  TeamMemberDto,
  UpdateProfileDto,
  UpdateTeamMemberDto,
} from './settings.dto';

const P = RPC_PATTERNS;

/**
 * Store settings, the team and the signed-in account (ADR 0017). Reading settings is open to
 * staff; changing them and managing the team is for the owner. Every change is audited.
 */
@ApiTags('admin: settings')
@ApiBearerAuth()
@Roles('OWNER', 'STAFF')
@Controller('admin')
export class AdminSettingsController {
  constructor(private readonly services: ServiceRegistry) {}

  @Get('settings/payments')
  @ZodResponse({ type: PaymentSettingsViewDto })
  payments() {
    return this.services
      .get('payment')
      .send<SettingsView<PaymentSettings>>(P.payment.settings.get, {});
  }

  @Put('settings/payments')
  @Roles('OWNER')
  @ApiOperation({ summary: 'bKash/Nagad receiving numbers (a method without a number is hidden).' })
  @ZodResponse({ type: PaymentSettingsViewDto })
  setPayments(@Body() body: PaymentSettingsDto) {
    return this.services
      .get('payment')
      .send<SettingsView<PaymentSettings>>(P.payment.settings.update, body);
  }

  @Get('settings/checkout')
  @ZodResponse({ type: CheckoutSettingsViewDto })
  checkout() {
    return this.services
      .get('order')
      .send<SettingsView<CheckoutSettings>>(P.order.settings.get, {});
  }

  @Put('settings/checkout')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Advance for pre-order and made-to-order items (fixed or percent).' })
  @ZodResponse({ type: CheckoutSettingsViewDto })
  setCheckout(@Body() body: CheckoutSettingsDto) {
    return this.services
      .get('order')
      .send<SettingsView<CheckoutSettings>>(P.order.settings.update, body);
  }

  @Get('settings/shipping')
  @ZodResponse({ type: ShippingSettingsViewDto })
  shipping() {
    return this.services
      .get('shipping')
      .send<SettingsView<ShippingSettings>>(P.shipping.settings.get, {});
  }

  @Put('settings/shipping')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Delivery fee per zone and per extra kg.' })
  @ZodResponse({ type: ShippingSettingsViewDto })
  setShipping(@Body() body: ShippingSettingsDto) {
    return this.services
      .get('shipping')
      .send<SettingsView<ShippingSettings>>(P.shipping.settings.update, body);
  }

  @Get('settings/notifications')
  @ZodResponse({ type: NotificationSettingsViewDto })
  notifications() {
    return this.services
      .get('notification')
      .send<SettingsView<NotificationSettings>>(P.notification.settings.get, {});
  }

  @Put('settings/notifications')
  @Roles('OWNER')
  @ZodResponse({ type: NotificationSettingsViewDto })
  setNotifications(@Body() body: NotificationSettingsDto) {
    return this.services
      .get('notification')
      .send<SettingsView<NotificationSettings>>(P.notification.settings.update, body);
  }

  // ---------- team (OWNER) ----------

  @Get('team')
  @Roles('OWNER')
  @ZodResponse({ type: TeamListDto })
  team() {
    return this.services.get('identity').send<{ items: TeamMember[] }>(P.identity.team.list, {});
  }

  @Post('team')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Give someone dashboard access (owner or staff) with a password.' })
  @ZodResponse({ status: 201, type: TeamMemberDto })
  addMember(@Body() body: CreateTeamMemberDto) {
    return this.services.get('identity').send<TeamMember>(P.identity.team.create, body);
  }

  @Patch('team/:id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Name, email, role or access; role/access changes sign them out.' })
  @ZodResponse({ type: TeamMemberDto })
  updateMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param() { id }: IdParamDto,
    @Body() body: UpdateTeamMemberDto,
  ) {
    return this.services
      .get('identity')
      .send<TeamMember>(P.identity.team.update, { actorId: user.id, id, changes: body });
  }

  @Post('team/:id/password')
  @Roles('OWNER')
  @HttpCode(200)
  @ZodResponse({ status: 200, type: OkDto })
  resetPassword(@Param() { id }: IdParamDto, @Body() body: ResetPasswordDto) {
    return this.services
      .get('identity')
      .send<{ ok: true }>(P.identity.team.resetPassword, { id, ...body });
  }

  // ---------- the signed-in account ----------

  @Put('account/profile')
  @ZodResponse({ type: AccountDto })
  profile(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateProfileDto) {
    return this.services
      .get('identity')
      .send<AuthUser>(P.identity.team.updateProfile, { userId: user.id, ...body });
  }

  @Put('account/password')
  @ZodResponse({ type: OkDto })
  password(@CurrentUser() user: AuthenticatedUser, @Body() body: ChangePasswordDto) {
    return this.services
      .get('identity')
      .send<{ ok: true }>(P.identity.team.changePassword, { userId: user.id, ...body });
  }
}
