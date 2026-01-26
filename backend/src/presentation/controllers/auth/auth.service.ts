/**
 * Auth Service
 */

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GlpiService } from '../../../infrastructure/external/glpi.service';
import { TechnicianLevel } from '@prisma/client';

interface LoginDto {
  email: string;
  password: string;
}

interface GlpiLoginDto {
  login: string;
  password: string;
}

interface RegisterDto {
  email: string;
  password: string;
  name: string;
  role?: 'ADMIN' | 'AGENT';
}

// Grupos do GLPI que definem o role ADMIN
// Usuários em qualquer destes grupos terão acesso administrativo completo
const ADMIN_GROUPS = ['admin', 'administradores', 'administrators', 'gestores', 'ti', 'estoque'];

// Grupos de técnicos (qualquer usuário técnico)
const TECH_GROUPS = ['tecnico', 'tecnicos', 'técnicos', 'suporte', 'support', 'l1', 'l2', 'l3', 'n1', 'n2', 'n3'];

// Mapeamento de nível técnico baseado em subgrupos do GLPI
// Estrutura: Tecnicos > Tecnico L1, Tecnicos > Tecnico L2, Tecnicos > Tecnico L3
const LEVEL_MAPPING = {
  L3: ['l3', 'n3', 'tecnico l3', 'nivel 3', 'nível 3'],
  L2: ['l2', 'n2', 'tecnico l2', 'nivel 2', 'nível 2'],
  L1: ['l1', 'n1', 'tecnico l1', 'nivel 1', 'nível 1', 'tecnico', 'tecnicos', 'técnicos'],
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private glpi: GlpiService,
  ) {
    // Criar admin padrão se não existir
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
        },
      });
      console.log(`✅ Admin criado: ${adminEmail}`);
    }
  }

  /**
   * Login tradicional (usuário local)
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const validPassword = await bcrypt.compare(dto.password, user.password);
    if (!validPassword) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.active) {
      throw new UnauthorizedException('Usuário desativado');
    }

    const token = this.jwt.sign({ sub: user.id, email: user.email });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Login via GLPI (SSO)
   * Autentica no GLPI, cria usuário local se não existir, define role pelos grupos
   */
  async loginWithGlpi(dto: GlpiLoginDto) {
    console.log(`Step 1: Authenticating with GLPI for user ${dto.login}`);
    // 1. Autenticar no GLPI
    const authResult = await this.glpi.authenticateWithCredentials(dto.login, dto.password);

    if (!authResult.success || !authResult.user) {
      console.log('Step 1 failed: Invalid credentials');
      throw new UnauthorizedException(authResult.error || 'Credenciais inválidas');
    }
    console.log('Step 1 success: GLPI session started');

    // 2. Buscar grupos do usuário no GLPI
    console.log('Step 2: Fetching user groups');
    const groups = await this.glpi.getUserGroups(authResult.user.id);
    console.log(`Step 2 success: Found ${groups.length} groups`);
    const groupNames = groups.map(g => g.name.toLowerCase());

    // 3. Determinar role baseado nos grupos, login ou nome
    console.log('Step 3: Determining role');
    let role: 'ADMIN' | 'AGENT' = 'AGENT';
    let technicianLevel: TechnicianLevel = TechnicianLevel.N1;

    const userLogin = dto.login.toLowerCase();
    const userName = authResult.user.name?.toLowerCase() || '';

    // Verifica se é ADMIN por grupos, login ou nome
    const isAdminByGroups = groupNames.some(g => ADMIN_GROUPS.some(ag => g.includes(ag)));
    const isAdminByLogin = ADMIN_GROUPS.some(ag => userLogin.includes(ag));
    const isAdminByName = ADMIN_GROUPS.some(ag => userName.includes(ag));

    if (isAdminByGroups || isAdminByLogin || isAdminByName) {
      role = 'ADMIN';
    }

    // Determinar nível técnico usando LEVEL_MAPPING
    // Verifica L3 primeiro (maior prioridade), depois L2, senão L1
    if (groupNames.some(g => LEVEL_MAPPING.L3.some(l => g.includes(l)))) {
      technicianLevel = TechnicianLevel.N3;
    } else if (groupNames.some(g => LEVEL_MAPPING.L2.some(l => g.includes(l)))) {
      technicianLevel = TechnicianLevel.N2;
    } else {
      technicianLevel = TechnicianLevel.N1;
    }
    console.log(`Step 3 success: Role=${role}, Level=${technicianLevel}`);

    // 4. Buscar ou criar usuário local
    console.log('Step 4: Syncing local user');
    let user = await this.prisma.user.findFirst({
      where: { glpiUserId: authResult.user.id },
    });

    const fullName = [authResult.user.firstname, authResult.user.realname]
      .filter(Boolean)
      .join(' ') || authResult.user.name;

    if (!user) {
      // Criar novo usuário
      console.log('Creating new user');
      const randomPassword = await bcrypt.hash(Math.random().toString(36), 12);

      user = await this.prisma.user.create({
        data: {
          email: authResult.user.email || `${dto.login}@glpi.local`,
          password: randomPassword, // Senha aleatória (não usada para login)
          name: fullName,
          role,
          glpiUserId: authResult.user.id,
          technicianLevel,
          phoneNumber: authResult.user.phone || null,
        },
      });
      console.log(`✅ Usuário GLPI sincronizado: ${user.name} (${role})`);
    } else {
      // Atualizar dados se mudaram
      console.log('Updating existing user');
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: fullName,
          role,
          technicianLevel,
          phoneNumber: authResult.user.phone || user.phoneNumber,
        },
      });
    }
    console.log('Step 4 success: User synced');

    // 5. Encerrar sessão GLPI (limpeza)
    if (authResult.sessionToken) {
      console.log('Step 5: Killing GLPI session');
      await this.glpi.killSession(authResult.sessionToken);
      console.log('Step 5 success: Session killed');
    }

    // 6. Gerar token JWT local
    console.log('Step 6: Generating JWT');
    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      glpiId: user.glpiUserId,
    });
    console.log('Step 6 success: Token generated');

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        technicianLevel: user.technicianLevel,
        groups: groupNames,
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

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      technicianLevel: user.technicianLevel,
    };
  }
}

