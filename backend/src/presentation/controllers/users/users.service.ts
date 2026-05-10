/**
 * Users Service
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

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

  async update(id: string, data: { name?: string; email?: string; password?: string; role?: 'ADMIN' | 'AGENT'; active?: boolean; phone?: string; department?: string; permissions?: string[] }) {
    // Prepare data for update
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.phone !== undefined) updateData.phoneNumber = data.phone;
    if (data.department !== undefined) updateData.department = data.department;

    // Hash password if provided
    if (data.password) {
       
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

  async createLocal(data: {
    name: string;
    email: string;
    password?: string;
    role?: 'ADMIN' | 'AGENT' | 'ADMIN_TI' | 'ADMIN_ELECTRIC' | 'ADMIN_COMPRAS';
    sector?: 'TI' | 'ELECTRIC' | 'COMPRAS';
    active?: boolean;
  }) {
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

      const bcrypt = require('bcryptjs');
      hashedPassword = await bcrypt.hash(data.password, 12);
    }

    // 3. Create user (sector default = TI quando não informado)
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || 'AGENT',
        sector: data.sector || 'TI',
        active: data.active ?? true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        sector: true,
        active: true,
        createdAt: true,
      },
    });
  }

  /**
   * Buscar usuários que podem ser mencionados (@mentions)
   * Retorna apenas usuários ativos, ordenados por nome
   */
  async getMentionableUsers() {
    return this.prisma.user.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        sector: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // --- Agent Status Methods ---

  async updateStatus(userId: string, status: 'ONLINE' | 'BUSY' | 'IN_SERVICE' | 'IDLE' | 'OFFLINE') {
    this.logger.debug(`🔄 UsersService.updateStatus - userId: ${userId}, status: ${status}`);

    const result = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: status as any,
        lastStatusChange: new Date(),
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        lastStatusChange: true,
        lastSeenAt: true,
        sector: true,
        role: true,
      },
    });

    this.logger.debug(`✅ Status atualizado no banco`);
    return result;
  }

  async getAgentsStatus() {
    return this.prisma.user.findMany({
      where: {
        active: true,
        role: 'AGENT',
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        lastStatusChange: true,
        lastSeenAt: true,
        sector: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}

