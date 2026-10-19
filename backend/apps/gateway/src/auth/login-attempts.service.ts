import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, AppError } from '@zelqune/common';
import { type Redis } from 'ioredis';
import { createHash } from 'node:crypto';
import { type GatewayEnv } from '../config/gateway-env';
import { REDIS } from '../redis/redis.module';

/**
 * Per-phone lock that counts FAILED logins only; a successful login resets it.
 * After LOGIN_MAX_FAILED_PER_PHONE failures the phone is locked for LOGIN_LOCK_SECONDS
 * (window starts at the first failure). Keys hold a hash, not the phone number.
 */
@Injectable()
export class LoginAttemptsService {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(APP_CONFIG) private readonly config: GatewayEnv,
  ) {}

  async assertNotLocked(phone: string): Promise<void> {
    const key = this.key(phone);
    const failures = Number((await this.redis.get(key)) ?? 0);
    if (failures >= this.config.LOGIN_MAX_FAILED_PER_PHONE) {
      const ttl = await this.redis.ttl(key);
      throw new AppError(
        'LOGIN_LOCKED',
        'Too many failed sign-in attempts. Try again later.',
        429,
        {
          retryAfterSeconds: ttl > 0 ? ttl : this.config.LOGIN_LOCK_SECONDS,
        },
      );
    }
  }

  async recordFailure(phone: string): Promise<void> {
    const key = this.key(phone);
    await this.redis.incr(key);
    await this.redis.expire(key, this.config.LOGIN_LOCK_SECONDS, 'NX');
  }

  async reset(phone: string): Promise<void> {
    await this.redis.del(this.key(phone));
  }

  private key(phone: string): string {
    return `login:failed:${createHash('sha256').update(phone).digest('hex').slice(0, 32)}`;
  }
}
