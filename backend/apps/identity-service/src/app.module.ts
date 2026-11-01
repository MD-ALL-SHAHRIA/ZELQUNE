import { Module } from '@nestjs/common';
import { ServiceCoreModule } from '@zelqune/common';
import { AccountsRpcController } from './auth/accounts.rpc.controller';
import { AuthRpcController } from './auth/auth.rpc.controller';
import { AuthService } from './auth/auth.service';
import { CustomerRpcController } from './auth/customer.rpc.controller';
import { CustomerService } from './auth/customer.service';
import { PasswordService } from './auth/password.service';
import { RefreshTokenRepository } from './auth/refresh-token.repository';
import { TokenService } from './auth/token.service';
import { identityEnvSchema } from './config/identity-env';
import { PrismaService } from './prisma/prisma.service';
import { TeamRpcController } from './team/team.rpc.controller';
import { TeamService } from './team/team.service';
import { UserRepository } from './users/user.repository';

@Module({
  imports: [
    ServiceCoreModule.forRoot({
      name: 'identity-service',
      prisma: PrismaService,
      envSchema: identityEnvSchema,
    }),
  ],
  controllers: [AuthRpcController, CustomerRpcController, AccountsRpcController, TeamRpcController],
  providers: [
    AuthService,
    CustomerService,
    PasswordService,
    TokenService,
    UserRepository,
    RefreshTokenRepository,
    TeamService,
  ],
})
export class AppModule {}
