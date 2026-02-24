/**
 * Users Service
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
      } as any,
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
        active: true,
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

  async update(id: string, data: { name?: string; email?: string; password?: string; role?: 'ADMIN' | 'AGENT' | 'STOCK_MANAGER'; active?: boolean; phone?: string; department?: string; permissions?: string[] }) {
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

  async createLocal(data: { name: string; email: string; password?: string; role?: 'ADMIN' | 'AGENT' | 'STOCK_MANAGER'; active?: boolean }) {
    // 1. Verify email uniqueness
    const existing = await this.prisma.user.findFirst({
      where: { email: data.email },
    });

    if (existing) {
      throw new BadRequestException('E-mail já está em uso');
    }

    // 2. Hash password
    let hashedPassword = '';
    if (data.password) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bcrypt = require('bcryptjs');
      hashedPassword = await bcrypt.hash(data.password, 12);
    }

    // 3. Create user
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || 'AGENT',
        active: data.active ?? true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
  }

  async createFromGlpi(data: {
    glpiUserId: number;
    name: string;
    email: string;
    phone?: string;
    department?: string;
    permissions?: string[];
    password?: string;
    role?: 'ADMIN' | 'AGENT' | 'STOCK_MANAGER';
  }) {
    // Verificar se já existe por glpiUserId
    const existingByGlpi = await this.prisma.user.findFirst({
      where: { glpiUserId: data.glpiUserId },
    });

    if (existingByGlpi) {
      console.log(`✅ Usuário local já existe com glpiUserId ${data.glpiUserId}`);
      return existingByGlpi;
    }

    // Verificar se existe por email (e vincular ao GLPI)
    const existingByEmail = await this.prisma.user.findFirst({
      where: { email: data.email },
    });

    if (existingByEmail) {
      console.log(`🔗 Usuário com email ${data.email} já existe, vinculando ao GLPI ID ${data.glpiUserId}`);
      // Atualizar o usuário existente com o glpiUserId
      return this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          glpiUserId: data.glpiUserId,
          name: data.name || existingByEmail.name,
          phoneNumber: data.phone || (existingByEmail as any).phoneNumber,
          department: data.department || (existingByEmail as any).department,
          permissions: data.permissions || (existingByEmail as any).permissions || [],
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

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = data.password ? await bcrypt.hash(data.password, 12) : '';

    // Criar novo usuário
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || 'AGENT',
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
  async updateByGlpiId(glpiId: number, data: { name?: string; email?: string; password?: string; role?: 'ADMIN' | 'AGENT' | 'STOCK_MANAGER'; active?: boolean; phone?: string; department?: string; permissions?: string[] }) {
    // Find local user by glpiId
    let user = await this.prisma.user.findFirst({
      where: { glpiUserId: glpiId },
    });

    if (!user) {
      // If not found, create a new local user linked to GLPI
      console.log(`🟡 Usuário local não encontrado para GLPI ID ${glpiId}, criando...`);

      // We need at least email for creation
      if (!data.email) {
        console.warn(`⚠️ Não é possível criar usuário local sem email`);
        return null;
      }

      user = await this.createFromGlpi({
        glpiUserId: glpiId,
        name: data.name || 'Usuário GLPI',
        email: data.email,
        phone: data.phone,
        department: data.department,
        permissions: data.permissions,
        password: data.password,
        role: data.role,
      }) as any;

      return user;
    }

    return this.update(user.id, data);
  }
}

