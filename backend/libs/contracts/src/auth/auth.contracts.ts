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

/* ---------------------------------------------------------------------------------------------
 * Customer accounts (ADR 0021). Email is the sign-in name and must be verified; name and phone
 * are always required (social sign-in asks for them before the account is created).
 * ------------------------------------------------------------------------------------------- */

export const OAUTH_PROVIDERS = ['GOOGLE', 'FACEBOOK'] as const;
export const oauthProviderSchema = z.enum(OAUTH_PROVIDERS);
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;

export const LOCALES = ['en', 'bn'] as const;
const localeSchema = z.enum(LOCALES).default('en');

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
/** NIST SP 800-63B: length over composition rules; 10+ characters, checked against common lists. */
export const newPasswordSchema = z.string().min(10).max(128);

export const customerRegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  phone: bdPhoneSchema,
  password: newPasswordSchema,
  lang: localeSchema,
});
export type CustomerRegister = z.output<typeof customerRegisterSchema>;

export const customerLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(256),
});
export const emailOnlySchema = z.object({ email: emailSchema, lang: localeSchema });
export const tokenOnlySchema = z.object({ token: z.string().min(20).max(200) });
export const customerResetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: newPasswordSchema,
});
export const customerChangePasswordSchema = z.object({
  currentPassword: z.string().max(256).default(''),
  newPassword: newPasswordSchema,
});
export const customerProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: bdPhoneSchema,
});

export const customerSchema = z.object({
  id: z.uuid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  emailVerified: z.boolean(),
  phone: z.string(),
  hasPassword: z.boolean(),
  providers: z.array(oauthProviderSchema),
  createdAt: z.string(),
});
export type Customer = z.infer<typeof customerSchema>;

export const customerSessionSchema = z.object({
  id: z.uuid(),
  userAgent: z.string().nullable(),
  ip: z.string().nullable(),
  createdAt: z.string(),
  lastUsedAt: z.string(),
  current: z.boolean(),
});
export const customerSessionListSchema = z.object({ items: z.array(customerSessionSchema) });

/** Public answer for register / forgot / resend: identical whether or not the email exists. */
export const acceptedSchema = z.object({ accepted: z.literal(true) });

/**
 * Internal (identity -> gateway): what email, if any, to send. The raw token travels only in
 * this RPC reply and the email; the database keeps its hash.
 */
export type AuthMail =
  | { kind: 'verify'; to: string; name: string; token: string; lang: 'en' | 'bn' }
  | { kind: 'reset'; to: string; name: string; token: string; lang: 'en' | 'bn' }
  | { kind: 'exists'; to: string; name: string; lang: 'en' | 'bn' }
  | { kind: 'phoneTaken'; to: string; name: string; lang: 'en' | 'bn' };
export interface AuthMailResult {
  mail: AuthMail | null;
}

export interface OAuthProfile {
  provider: OAuthProvider;
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

/** Second step of a first social sign-in: the details Google/Facebook do not give us. */
export const completeSignupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: bdPhoneSchema,
});
export interface PendingSignup extends OAuthProfile {
  email: string;
}
