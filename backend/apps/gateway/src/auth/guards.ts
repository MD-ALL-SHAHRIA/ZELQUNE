import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError, IS_PUBLIC_METADATA, requestContext } from '@zelqune/common';
import { type Role } from '@zelqune/contracts';
import { type AuthenticatedRequest, type AuthenticatedUser } from './auth.types';
import { JwtVerifierService } from './jwt-verifier.service';

const ROLES_METADATA = 'zelqune:roles';

/** Restricts a route to the given roles (after authentication). */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_METADATA, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

/** Global, default-deny: every route needs a valid Bearer access token unless `@Public()`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: JwtVerifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = /^Bearer ([A-Za-z0-9_\-.]+)$/.exec(req.headers.authorization ?? '');
    if (!match) throw new AppError('UNAUTHENTICATED', 'Authentication required', 401);
    try {
      req.user = await this.verifier.verify(match[1]);
    } catch {
      throw new AppError('INVALID_TOKEN', 'Invalid or expired access token', 401);
    }
    // Every downstream RPC of this request carries the admin for audit (ADR 0010).
    requestContext.setActor({ id: req.user.id, role: req.user.role });
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user || !roles.includes(user.role)) {
      throw new AppError('FORBIDDEN', 'You do not have access to this resource', 403);
    }
    return true;
  }
}
