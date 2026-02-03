/**
 * Users Service
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        department: true,
        permissions: true,
        phoneNumber: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findTechnicians() {
    return this.prisma.user.findMany({
      where: { active: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(id: string, data: { name?: string; email?: string; password?: string; role?: 'ADMIN' | 'AGENT'; active?: boolean; phone?: string; department?: string; permissions?: string[] }) {
    // Prepare data for update
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.phone !== undefined) updateData.phoneNumber = data.phone;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.permissions !== undefined) updateData.permissions = data.permissions;

    // Hash password if provided
    if (data.password) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bcrypt = require('bcryptjs');
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Usuário deletado' };
  }

  async createFromGlpi(data: {
    glpiUserId: number;
    name: string;
    email: string;
    phone?: string;
    department?: string;
    permissions?: string[];
    password?: string;
  }) {
    // Verificar se já existe
    const existing = await this.prisma.user.findFirst({
      where: { glpiUserId: data.glpiUserId },
    });

    if (existing) {
      return existing;
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = data.password ? await bcrypt.hash(data.password, 12) : '';

    // Criar novo usuário
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: 'AGENT',
        glpiUserId: data.glpiUserId,
        phoneNumber: data.phone,
        department: data.department,
        permissions: data.permissions || [],
        active: true,
      } as any,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        glpiUserId: true,
        active: true,
        department: true,
        permissions: true,
      } as any,
    });
  }
}
