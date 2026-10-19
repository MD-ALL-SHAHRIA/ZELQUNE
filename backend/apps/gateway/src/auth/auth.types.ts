import { type Role } from '@zelqune/contracts';
import { type Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };
