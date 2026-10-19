import { Module } from '@nestjs/common';
import { turnstileVerifierProvider, TurnstileGuard } from '../turnstile/turnstile';
import { PublicB2bController } from './public-b2b.controller';
import { ShopController } from './shop.controller';

@Module({
  controllers: [ShopController, PublicB2bController],
  providers: [turnstileVerifierProvider, TurnstileGuard],
})
export class ShopModule {}
