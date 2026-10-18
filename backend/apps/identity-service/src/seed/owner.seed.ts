import { type INestApplicationContext, Logger } from '@nestjs/common';
import { APP_CONFIG } from '@zelqune/common';
import { normalizeBdPhone } from '@zelqune/contracts';
import { MIN_ADMIN_PASSWORD_LENGTH, PasswordService } from '../auth/password.service';
import { type IdentityEnv } from '../config/identity-env';
import { UserRepository } from '../users/user.repository';

/** Creates or updates the OWNER admin from OWNER_PHONE / OWNER_PASSWORD / OWNER_NAME. Idempotent. */
export async function seedOwner(app: INestApplicationContext): Promise<void> {
  const logger = new Logger('Seed');
  const config = app.get<IdentityEnv>(APP_CONFIG);
  const phone = normalizeBdPhone(config.OWNER_PHONE ?? '');
  const password = config.OWNER_PASSWORD ?? '';
  if (!phone) throw new Error('OWNER_PHONE must be set to a Bangladeshi mobile number');
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(`OWNER_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`);
  }

  const users = app.get(UserRepository);
  const passwords = app.get(PasswordService);
  const existing = await users.findByPhone(phone);
  const keepHash =
    existing?.passwordHash &&
    !passwords.needsRehash(existing.passwordHash) &&
    (await passwords.verify(existing.passwordHash, password));

  await users.upsertAdmin({
    phone,
    name: config.OWNER_NAME?.trim() || null,
    role: 'OWNER',
    passwordHash:
      keepHash && existing.passwordHash ? existing.passwordHash : await passwords.hash(password),
  });
  logger.log(`OWNER ${existing ? 'updated' : 'created'} (${phone.slice(0, 7)}******)`);
}
