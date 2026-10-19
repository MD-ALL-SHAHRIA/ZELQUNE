import { Module } from '@nestjs/common';
import { turnstileVerifierProvider, TurnstileGuard } from '../turnstile/turnstile';
import { ShopController } from './shop.controller';

@Module({ controllers: [ShopController], providers: [turnstileVerifierProvider, TurnstileGuard] })
export class ShopModule {}
