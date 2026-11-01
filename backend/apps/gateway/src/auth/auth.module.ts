import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CustomerAuthController } from '../customer-auth/customer-auth.controller';
import { OAuthService } from '../customer-auth/oauth.service';
import { turnstileVerifierProvider, TurnstileGuard } from '../turnstile/turnstile';
import { AdminAuthController } from './admin-auth.controller';
import { JwtAuthGuard, RolesGuard } from './guards';
import { JwtVerifierService } from './jwt-verifier.service';
import { LoginAttemptsService } from './login-attempts.service';

@Module({
  controllers: [AdminAuthController, CustomerAuthController],
  providers: [
    JwtVerifierService,
    LoginAttemptsService,
    OAuthService,
    turnstileVerifierProvider,
    TurnstileGuard,
    // Order matters: authenticate, then authorise.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
