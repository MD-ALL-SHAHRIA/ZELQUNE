import { Injectable, type OnModuleInit } from '@nestjs/common';
import * as argon2 from 'argon2';

/** OWASP Password Storage Cheat Sheet (2024+): argon2id, m=19 MiB, t=2, p=1. */
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const MIN_ADMIN_PASSWORD_LENGTH = 12;

@Injectable()
export class PasswordService implements OnModuleInit {
  private dummyHash = '';

  async onModuleInit(): Promise<void> {
    // Verified against when the user does not exist, so response time doesn't reveal accounts.
    this.dummyHash = await this.hash('not-a-real-password-placeholder');
  }

  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  /** Constant-ish time: always runs one argon2 verification, even without a stored hash. */
  async verify(storedHash: string | null | undefined, password: string): Promise<boolean> {
    const hash = storedHash ?? this.dummyHash;
    try {
      const ok = await argon2.verify(hash, password);
      return ok && storedHash !== null && storedHash !== undefined;
    } catch {
      return false;
    }
  }

  /** True when a stored hash uses weaker parameters than ARGON2_OPTIONS. */
  needsRehash(storedHash: string): boolean {
    return argon2.needsRehash(storedHash, ARGON2_OPTIONS);
  }
}
