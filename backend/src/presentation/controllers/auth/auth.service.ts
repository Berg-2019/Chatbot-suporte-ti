/**
 * Auth Service
 */

import { Injectable, UnauthorizedException, BadRequestException, GoneException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { redactEmail, redactName } from '../../../infrastructure/logger/redact';
import { hashToken } from '../onboarding/user-onboarding.service';


interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  email: string;
  password: string;
  name: string;
  role?: 'ADMIN' | 'AGENT';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.ensureAdminExists();
  }

  private async ensureAdminExists() {
    const isDev = this.config.get<string>('NODE_ENV') !== 'production';
    const adminEmail = this.config.get<string>('ADMIN_EMAIL') || 'admin@helpdesk.com';
    const exists = await this.prisma.user.findUnique({ where: { email: adminEmail } });

    if (!exists) {
      const adminPassword = this.config.get<string>('ADMIN_PASSWORD');
      if (!adminPassword) {
        if (!isDev) {
          throw new Error(
            `❌ ADMIN_PASSWORD não está configurado. ` +
            `Defina a variável ADMIN_PASSWORD no ambiente de produção.`
          );
        }
        this.logger.warn(`⚠️ ADMIN_PASSWORD não configurado — usando senha temporária em dev`);
      }
      const adminName = this.config.get<string>('ADMIN_NAME') || 'Administrador';
      const hashedPassword = await bcrypt.hash(adminPassword || `dev_temp_${Date.now()}`, 12);

      await this.prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'ADMIN',
          sector: 'TI',
        },
      });
      this.logger.log(`✅ Admin criado: ${redactEmail(adminEmail)}`);
    }
  }

  /**
   * Login tradicional (usuário local) - SIMPLIFICADO
   */
  async login(dto: LoginDto) {
    const redactedEmail = dto.email.replace(/(.{2}).*(@.*)/, '$1***$2');
    this.logger.debug(`🔐 Login attempt for: ${redactedEmail}`);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      this.logger.debug(`❌ User not found: ${redactedEmail}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    this.logger.debug(`✅ User found: ${redactName(user.name)}`);

    const validPassword = await bcrypt.compare(dto.password, user.password);
    if (!validPassword) {
      this.logger.debug(`❌ Invalid password for: ${redactedEmail}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.active) {
      this.logger.debug(`❌ User inactive: ${redactedEmail}`);
      throw new UnauthorizedException('Usuário desativado');
    }

    this.logger.debug(`✅ User active, generating token...`);

    let permissions: string[] = [];

    const profile = user.role === 'ADMIN' ? 'admin' :
      user.sector === 'ELECTRIC' ? 'tech_elect' : 'tech_ti';

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      sector: user.sector,
    });

    this.logger.debug(`✅ Token generated successfully for uid:${user.id.slice(0, 8)}`);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile,
        permissions,
        sector: user.sector,
      },
    };
  }

  async register(dto: RegisterDto, requestingUserId?: string) {
    // Verificar se já existe
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Email já cadastrado');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role || 'AGENT',
        activatedAt: new Date(), // cadastro direto via admin auth => já ativo
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Usuário inválido');
    }

    // Determinar perfil baseado no setor/role para o frontend
    const profile = user.role === 'ADMIN' ? 'admin' : user.sector === 'ELECTRIC' ? 'tech_elect' : 'tech_ti';

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profile,
      permissions: [],
      sector: user.sector,
    };
  }

  /**
   * C5 — LGPD Art. 18 II: direito de acesso (exportação de dados)
   */
  async dataExport(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    const [tickets, messages, csatResponses, pushSubscriptions] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { assignedToId: userId },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      this.prisma.message.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      this.prisma.csatResponse.findMany({
        where: { assignedToId: userId },
        orderBy: { respondedAt: 'desc' },
      }),
      this.prisma.pushSubscription.findMany({
        where: { userId },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        sector: user.sector,
        createdAt: user.createdAt,
      },
      tickets,
      messages,
      csatResponses,
      pushSubscriptions,
    };
  }

  /**
   * C6 — LGPD Art. 18 IX: direito ao esquecimento (pseudonimização).
   * Preserva integridade referencial das mensagens (senderId continua válido
   * mas não identifica mais a pessoa).
   */
  async eraseAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    const anonId = `anon_${userId.replace(/-/g, '')}`;
    const erasedEmail = `deleted_${anonId}@anon.local`;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: `[ANONIMIZADO-${anonId}]`,
        email: erasedEmail,
        phoneNumber: null,
        password: '[ERASED]',
        active: false,
      },
    });

    await this.prisma.pushSubscription.deleteMany({ where: { userId } });

    return { success: true, message: 'Conta pseudonimizada com sucesso' };
  }

  // --------------------------------------------------------------------------
  // Ativação de agente (link por email/WhatsApp)
  // --------------------------------------------------------------------------

  /**
   * Valida um token cru sem consumi-lo (GET /auth/activation/:token).
   * - Token válido: retorna {name, email} para a página renderizar.
   * - Token inválido/usado/expirado: lança GoneException com mensagem PT-BR.
   */
  async validateActivationToken(rawToken: string): Promise<{ name: string; email: string }> {
    const token = await this.prisma.userActivationToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      throw new GoneException('Link inválido ou expirado. Peça ao admin para reenviar.');
    }
    return { name: token.user.name, email: token.user.email };
  }

  /**
   * Define a senha do agente e consome o token (POST /auth/activation/:token).
   * - Revalida o token ( Race condition: entre GET e POST pode ter expirado).
   * - Atualiza senha + activatedAt + token.usedAt numa transação.
   */
  async activateUser(rawToken: string, password: string): Promise<{ ok: true }> {
    const tokenHash = hashToken(rawToken);
    const token = await this.prisma.userActivationToken.findUnique({
      where: { tokenHash },
    });
    if (!token || token.usedAt || token.expiresAt < new Date()) {
      throw new GoneException('Link inválido ou expirado. Peça ao admin para reenviar.');
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: { password: hashedPassword, activatedAt: now },
      }),
      this.prisma.userActivationToken.update({
        where: { id: token.id },
        data: { usedAt: now },
      }),
    ]);
    this.logger.log(`Usuário ativado: ${token.userId.slice(0, 8)}…`);
    return { ok: true };
  }
}

