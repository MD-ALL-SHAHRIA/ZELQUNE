import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_METADATA = 'zelqune:public';

/** Opts a route (or controller) out of the gateway's default-deny JwtAuthGuard. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_METADATA, true);
