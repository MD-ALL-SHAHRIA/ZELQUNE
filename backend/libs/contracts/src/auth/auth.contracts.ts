import { z } from 'zod';
import { bdPhoneSchema } from '../phone';

export const ROLES = ['CUSTOMER', 'STAFF', 'OWNER'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;
/** Roles that may sign in to the admin dashboard. */
export const ADMIN_ROLES: readonly Role[] = ['OWNER', 'STAFF'];

export const adminLoginRequestSchema = z.object({
  phone: bdPhoneSchema,
  password: z.string().min(1).max(256),
});
export type AdminLoginRequest = z.output<typeof adminLoginRequestSchema>;

export const authUserSchema = z.object({
  id: z.uuid(),
  phone: z.string().meta({ example: '+8801712345678' }),
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: roleSchema,
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const accessTokenResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  /** Seconds until the access token expires. */
  expiresIn: z.number().int().positive(),
  user: authUserSchema,
});
export type AccessTokenResponse = z.infer<typeof accessTokenResponseSchema>;

/** Claims of the ES256 access token issued by identity-service and verified by the gateway. */
export interface AccessTokenClaims {
  sub: string;
  role: Role;
  typ: 'access';
  jti: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

/** Client metadata recorded with each refresh token. */
export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

/** identity-service result of login/refresh; the gateway puts the refresh token in a cookie. */
export interface SessionTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: string;
  user: AuthUser;
}

export type LoginRpcRequest = AdminLoginRequest & SessionMeta;
export type RefreshRpcRequest = { refreshToken: string } & SessionMeta;
export interface LogoutRpcRequest {
  refreshToken: string;
}
export interface MeRpcRequest {
  userId: string;
}
