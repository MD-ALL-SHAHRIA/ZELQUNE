import { Injectable } from '@nestjs/common';
import { type Role } from '@zelqune/contracts';
import { PrismaService } from '../prisma/prisma.service';

export interface UserRecord {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  role: Role;
  passwordHash: string | null;
  isActive: boolean;
}

export interface UpsertAdminData {
  phone: string;
  name: string | null;
  role: Extract<Role, 'OWNER' | 'STAFF'>;
  passwordHash: string;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByPhone(phone: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async touchLastLogin(id: string, at: Date): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lastLoginAt: at } });
  }

  upsertAdmin(data: UpsertAdminData): Promise<UserRecord> {
    return this.prisma.user.upsert({
      where: { phone: data.phone },
      create: { ...data, isActive: true },
      update: { role: data.role, name: data.name, passwordHash: data.passwordHash, isActive: true },
    });
  }
}
