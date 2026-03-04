/**
 * Users Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { GlpiService } from '../../../infrastructure/external/glpi.service';

interface CreateGlpiUserDto {
  login: string;
  password: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  groupId?: number;
  // Local fields
  department?: string;
  permissions?: string[];
  role?: 'ADMIN' | 'AGENT';
}

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(
    private usersService: UsersService,
    private glpiService: GlpiService,
  ) { }

  @Get()
  async findAll(@Request() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }
    return this.usersService.findAll();
  }

  @Get('technicians')
  async findTechnicians() {
    return this.usersService.findTechnicians();
  }

  @Get('groups')
  async getGroups(@Request() req: any) {
    // Allow all authenticated users to view groups
    return this.glpiService.getGroups();
  }

  @Post()
  async createLocalUser(
    @Body() data: { name: string; email: string; password?: string; role?: 'ADMIN' | 'AGENT'; active?: boolean },
    @Request() req: any,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }

    if (!data.name || !data.email || !data.password) {
      throw new BadRequestException('Nome, e-mail e senha são obrigatórios');
    }

    return this.usersService.createLocal(data);
  }

  @Get('glpi')
  async getGlpiUsers(@Request() req: any) {
    // Fetch both GLPI users and local users
    const glpiUsers = await this.glpiService.getUsers();
    const localUsers = await this.usersService.findAll();

    // Create a map of local users by glpiUserId
    const localUserMap = new Map();
    for (const user of localUsers as any[]) {
      if (user.glpiUserId) {
        localUserMap.set(user.glpiUserId, user);
      }
    }

    // Merge local data into GLPI users
    return glpiUsers.map(glpiUser => {
      const localUser = localUserMap.get(glpiUser.id);
      return {
        ...glpiUser,
        department: localUser?.department || '',
        permissions: localUser?.permissions || [],
        groups: [], // Will be populated if needed
        localUserId: localUser?.id || null,
      };
    });
  }

  @Post('glpi')
  async createGlpiUser(@Body() dto: CreateGlpiUserDto, @Request() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }

    if (!dto.login || !dto.password) {
      throw new BadRequestException('Login e senha são obrigatórios');
    }

    console.log(`\n========== CRIANDO USUÁRIO GLPI ==========`);
    console.log(`📥 Login recebido: "${dto.login}"`);
    console.log(`📥 Dados:`, JSON.stringify(dto, null, 2));

    // 0. Verificar se usuário já existe (incluindo deletados)
    const existingUser = await this.glpiService.findUserByLogin(dto.login);
    if (existingUser) {
      console.log(`⚠️ Usuário "${dto.login}" já existe no GLPI:`, existingUser);
      if (existingUser.is_deleted) {
        throw new BadRequestException(`Usuário "${dto.login}" existe no GLPI mas está na lixeira. Restaure-o no painel do GLPI ou use outro login.`);
      } else {
        throw new BadRequestException(`Usuário "${dto.login}" já existe no GLPI. Use outro login.`);
      }
    }

    // 1. Criar usuário no GLPI
    const result = await this.glpiService.createUser({
      name: dto.login,
      realname: dto.lastName,
      firstname: dto.firstName,
      password: dto.password,
      email: dto.email,
      phone: dto.phone,
      is_active: true,
    });

    if (!result.success) {
      throw new BadRequestException(result.error || 'Falha ao criar usuário no GLPI');
    }

    // 2. Adicionar ao grupo se especificado
    if (dto.groupId && result.id) {
      await this.glpiService.addUserToGroup(result.id, dto.groupId);
    }

    // 3. Criar usuário local sincronizado com TODOS os campos
    const localUser = await this.usersService.createFromGlpi({
      glpiUserId: result.id!,
      name: [dto.firstName, dto.lastName].filter(Boolean).join(' ') || dto.login,
      email: dto.email || `${dto.login}@glpi.local`,
      phone: dto.phone,
      department: dto.department,
      role: dto.role,
      password: dto.password, // Pass password to hash and store locally
    });

    console.log(`✅ Usuário criado:`, { glpiId: result.id, localUser });

    return {
      success: true,
      glpiId: result.id,
      localUser,
    };
  }

  @Put('glpi/:id')
  async updateGlpiUser(
    @Param('id') id: string,
    @Body() data: {
      firstname?: string;
      realname?: string;
      phone?: string;
      is_active?: boolean;
      department?: string;
      role?: 'ADMIN' | 'AGENT';
      permissions?: string[];
      password?: string;
      email?: string;
    },
    @Request() req: any,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }

    console.log(`\n========== ATUALIZANDO USUÁRIO GLPI ==========`);
    console.log(`📥 ID: ${id}`);
    console.log(`📥 Dados recebidos do frontend:`, JSON.stringify(data, null, 2));

    const glpiId = parseInt(id, 10);

    // 1. Update GLPI
    console.log(`\n📤 Enviando para GLPI Service...`);
    const success = await this.glpiService.updateUser(glpiId, {
      firstname: data.firstname,
      realname: data.realname,
      phone: data.phone,
      is_active: data.is_active,
      password: data.password,
    });

    console.log(`📤 Resultado GLPI: ${success ? 'SUCESSO' : 'FALHA'}`);

    if (!success) {
      console.log(`❌ Falha ao atualizar no GLPI`);
      throw new BadRequestException('Falha ao atualizar usuário no GLPI');
    }

    // 2. Update Local User (se existir)
    const name = [data.firstname, data.realname].filter(Boolean).join(' ');
    console.log(`\n📤 Atualizando usuário local com glpiId: ${glpiId}`);

    try {
      await this.usersService.updateByGlpiId(glpiId, {
        name: name || undefined,
        phone: data.phone,
        department: data.department,
        role: data.role,
        password: data.password,
        email: data.email,
      });
      console.log(`✅ Usuário local atualizado`);
    } catch (err) {
      console.log(`⚠️ Erro ao atualizar usuário local (pode não existir):`, err);
    }

    console.log(`========== FIM DA ATUALIZAÇÃO ==========\n`);
    return { success: true };
  }

  @Delete('glpi/:id')
  async deleteGlpiUser(@Param('id') id: string, @Request() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }

    const result = await this.glpiService.deleteUser(parseInt(id, 10));

    if (!result.success) {
      throw new BadRequestException(result.error || 'Falha ao excluir usuário do GLPI');
    }

    return { success: true };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; role?: 'ADMIN' | 'AGENT'; active?: boolean; phone?: string; email?: string; department?: string; permissions?: string[] },
    @Request() req: any,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }
    return this.usersService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }
    if (req.user.id === id) {
      throw new ForbiddenException('Não pode deletar a si mesmo');
    }
    return this.usersService.delete(id);
  }

  @Get('mentionable')
  async getMentionableUsers(@Request() req: any) {
    // Retorna usuários que podem ser mencionados em notas internas
    return this.usersService.getMentionableUsers();
  }
}
