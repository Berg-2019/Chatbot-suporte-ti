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
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }
    return this.glpiService.getGroups();
  }

  @Post('glpi')
  async createGlpiUser(@Body() dto: CreateGlpiUserDto, @Request() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }

    if (!dto.login || !dto.password) {
      throw new BadRequestException('Login e senha são obrigatórios');
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

    // 3. Criar usuário local sincronizado
    const localUser = await this.usersService.createFromGlpi({
      glpiUserId: result.id!,
      name: [dto.firstName, dto.lastName].filter(Boolean).join(' ') || dto.login,
      email: dto.email || `${dto.login}@glpi.local`,
      phone: dto.phone,
    });

    return {
      success: true,
      glpiId: result.id,
      localUser,
    };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; role?: 'ADMIN' | 'AGENT'; active?: boolean },
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
}
