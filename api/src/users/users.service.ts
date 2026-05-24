import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true, phone: true, whatsapp: true, role: true, active: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, data: any) {
    const exists = await this.prisma.user.findUnique({
      where: { email_tenantId: { email: data.email, tenantId } },
    });
    if (exists) throw new ConflictException('E-mail já cadastrado neste estabelecimento');

    const hashed = await bcrypt.hash(data.password, 12);
    return this.prisma.user.create({
      data: { ...data, tenantId, password: hashed },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 12);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true },
    });
  }

  async deactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
  }
}
