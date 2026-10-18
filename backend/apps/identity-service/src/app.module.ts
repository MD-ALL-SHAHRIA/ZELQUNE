import { Module } from '@nestjs/common';
import { ServiceCoreModule } from '@zelqune/common';
import { AuthRpcController } from './auth/auth.rpc.controller';
import { AuthService } from './auth/auth.service';
import { PasswordService } from './auth/password.service';
import { RefreshTokenRepository } from './auth/refresh-token.repository';
import { TokenService } from './auth/token.service';
import { identityEnvSchema } from './config/identity-env';
import { PrismaService } from './prisma/prisma.service';
import { UserRepository } from './users/user.repository';

@Module({
  imports: [
    ServiceCoreModule.forRoot({
      name: 'identity-service',
      prisma: PrismaService,
      envSchema: identityEnvSchema,
    }),
  ],
  controllers: [AuthRpcController],
  providers: [AuthService, PasswordService, TokenService, UserRepository, RefreshTokenRepository],
})
export class AppModule {}
