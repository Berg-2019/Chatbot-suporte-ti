/**
 * Users Service
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { UserOnboardingService } from '../onboarding/user-onboarding.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private readonly onboarding: UserOnboardingService,
  ) { }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        role: true,
        sector: true,
        active: true,
        createdAt: true,
        phoneNumber: true,
        creaNumber: true,
        activatedAt: true,
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
        nickname: true,
        role: true,
        sector: true,
        active: true,
        createdAt: true,
        phoneNumber: true,
        creaNumber: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  /**
   * Autoatendimento: usuário edita só o próprio apelido. Escopo mínimo de
   * propósito — não passa por aqui role/active/email/senha.
   */
  async updateOwnProfile(userId: string, data: { nickname?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.nickname !== undefined ? { nickname: data.nickname || null } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
      },
    });
  }

  async update(id: string, data: { name?: string; email?: string; password?: string; role?: 'ADMIN' | 'AGENT'; active?: boolean; phone?: string; department?: string; permissions?: string[]; creaNumber?: string }) {
    // Prepare data for update
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.phone !== undefined) updateData.phoneNumber = data.phone;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.creaNumber !== undefined) updateData.creaNumber = data.creaNumber;

    // Hash password if provided
    if (data.password) {
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
        phoneNumber: true,
        sector: true,
        creaNumber: true,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'Usuário deletado' };
  }

  async resetPassword(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const newPassword = Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 6).toUpperCase();

    const hashed = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashed },
    });

    return { password: newPassword };
  }

  /**
   * Reenvio de ativação (admin).
   * - Usuário já ativado → 409 (não há o que reenviar)
   * - Caso contrário → invalida tokens anteriores e dispara novo onboarding
   */
  async resendActivation(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.activatedAt) {
      throw new BadRequestException('Usuário já está ativado');
    }
    await this.onboarding.generateAndSend({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
    });
    return { ok: true };
  }

  async createLocal(data: {
    name: string;
    email: string;
    password?: string;
    role?: 'ADMIN' | 'AGENT' | 'ADMIN_TI' | 'ADMIN_ELECTRIC' | 'ADMIN_COMPRAS';
    sector?: 'TI' | 'ELECTRIC' | 'COMPRAS';
    active?: boolean;
    phoneNumber?: string;
    creaNumber?: string;
  }) {
    // 1. Verify email uniqueness
    const existing = await this.prisma.user.findFirst({
      where: { email: data.email },
    });

    if (existing) {
      throw new BadRequestException('E-mail já está em uso');
    }

    // 2. Senha: se não informada, gerar hash aleatório inutilizável
    //    (agente precisa usar o link de ativação para definir a própria senha)
    const usesActivation = !data.password;
    const rawPassword = data.password ?? randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    // 3. Create user (sector default = TI quando não informado)
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || 'AGENT',
        sector: data.sector || 'TI',
        active: data.active ?? true,
        phoneNumber: data.phoneNumber,
        creaNumber: data.creaNumber,
        // Sem senha => ativação pendente; com senha => já ativo
        activatedAt: usesActivation ? null : new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        sector: true,
        active: true,
        phoneNumber: true,
        creaNumber: true,
        activatedAt: true,
        createdAt: true,
      },
    });

    // 4. Se entrou no fluxo de ativação, dispara onboarding (best-effort)
    if (usesActivation) {
      try {
        await this.onboarding.generateAndSend({
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
        });
      } catch (err: unknown) {
        // Onboarding já é best-effort internamente; este catch é belt-and-suspenders.
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Falha no onboarding de ${user.email}: ${msg} — agente pode ser reenviado pelo admin`,
        );
      }
    }

    return user;
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

