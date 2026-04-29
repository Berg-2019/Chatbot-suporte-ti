/**
 * Auth Service
 */

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ConfigService } from '@nestjs/config';


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
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    this.ensureAdminExists();
  }

  private async ensureAdminExists() {
    const adminEmail = this.config.get<string>('ADMIN_EMAIL') || 'admin@empresa.com';
    const exists = await this.prisma.user.findUnique({ where: { email: adminEmail } });

    if (!exists) {
      const adminPassword = this.config.get<string>('ADMIN_PASSWORD') || 'admin123';
      const adminName = this.config.get<string>('ADMIN_NAME') || 'Administrador';
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      await this.prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'ADMIN',
          sector: 'TI',
        },
      });
      console.log(`✅ Admin criado: ${adminEmail}`);
    }
  }

  /**
   * Login tradicional (usuário local) - SIMPLIFICADO
   */
  async login(dto: LoginDto) {
    console.log(`🔐 Login attempt for: ${dto.email}`);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      console.log(`❌ User not found: ${dto.email}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    console.log(`✅ User found: ${user.name}`);

    const validPassword = await bcrypt.compare(dto.password, user.password);
    if (!validPassword) {
      console.log(`❌ Invalid password for: ${dto.email}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    console.log(`✅ Password valid`);

    if (!user.active) {
      console.log(`❌ User inactive: ${dto.email}`);
      throw new UnauthorizedException('Usuário desativado');
    }

    console.log(`✅ User active, generating token...`);

    // Permissões baseadas no campo user.permissions
    let permissions: string[] = [];

    // Determinar perfil para o frontend
    const profile = user.role === 'ADMIN' ? 'admin' :
      user.sector === 'ELECTRIC' ? 'tech_elect' : 'tech_ti';

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      sector: user.sector,
    });

    console.log(`✅ Token generated successfully for ${user.name}`);

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
}

