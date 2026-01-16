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

  async update(id: string, data: { name?: string; role?: 'ADMIN' | 'AGENT'; active?: boolean }) {
    return this.prisma.user.update({
      where: { id },
      data,
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
  }) {
    // Verificar se já existe
    const existing = await this.prisma.user.findFirst({
      where: { glpiUserId: data.glpiUserId },
    });

    if (existing) {
      return existing;
    }

    // Criar novo usuário
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: '', // Não usado - login via GLPI
        name: data.name,
        role: 'AGENT',
        glpiUserId: data.glpiUserId,
        phoneNumber: data.phone,
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        glpiUserId: true,
        active: true,
      },
    });
  }
}
