import { createZodDto } from '@zelqune/common';
import {
  authUserSchema,
  changePasswordSchema,
  checkoutSettingsSchema,
  createTeamMemberSchema,
  notificationSettingsSchema,
  notificationSettingsViewSchema,
  paymentSettingsSchema,
  paymentSettingsViewSchema,
  resetPasswordSchema,
  settingsViewSchema,
  shippingSettingsSchema,
  teamListSchema,
  teamMemberSchema,
  updateProfileSchema,
  updateTeamMemberSchema,
} from '@zelqune/contracts';
import { z } from 'zod';

export class PaymentSettingsDto extends createZodDto(paymentSettingsSchema) {}
export class PaymentSettingsViewDto extends createZodDto(
  settingsViewSchema(paymentSettingsViewSchema),
) {}
export class CheckoutSettingsDto extends createZodDto(checkoutSettingsSchema) {}
export class CheckoutSettingsViewDto extends createZodDto(
  settingsViewSchema(checkoutSettingsSchema),
) {}
export class ShippingSettingsDto extends createZodDto(shippingSettingsSchema) {}
export class ShippingSettingsViewDto extends createZodDto(
  settingsViewSchema(shippingSettingsSchema),
) {}
export class NotificationSettingsDto extends createZodDto(notificationSettingsSchema) {}
export class NotificationSettingsViewDto extends createZodDto(
  settingsViewSchema(notificationSettingsViewSchema),
) {}

export class TeamListDto extends createZodDto(teamListSchema) {}
export class TeamMemberDto extends createZodDto(teamMemberSchema) {}
export class CreateTeamMemberDto extends createZodDto(createTeamMemberSchema) {}
export class UpdateTeamMemberDto extends createZodDto(updateTeamMemberSchema) {}
export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
export class AccountDto extends createZodDto(authUserSchema) {}
export class OkDto extends createZodDto(z.object({ ok: z.literal(true) })) {}
