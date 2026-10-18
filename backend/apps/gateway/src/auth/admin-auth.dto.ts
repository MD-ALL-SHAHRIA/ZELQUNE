import { createZodDto } from '@zelqune/common';
import {
  accessTokenResponseSchema,
  adminLoginRequestSchema,
  authUserSchema,
} from '@zelqune/contracts';

export class AdminLoginDto extends createZodDto(adminLoginRequestSchema) {}
export class AccessTokenResponseDto extends createZodDto(accessTokenResponseSchema) {}
export class AuthUserDto extends createZodDto(authUserSchema) {}
