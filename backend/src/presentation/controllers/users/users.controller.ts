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

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(
    private usersService: UsersService,
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

  @Post()
  async createLocalUser(
    @Body() data: {
      name: string;
      email: string;
      password?: string;
      role?: 'ADMIN' | 'AGENT' | 'ADMIN_TI' | 'ADMIN_ELECTRIC' | 'ADMIN_COMPRAS';
      sector?: 'TI' | 'ELECTRIC' | 'COMPRAS';
      active?: boolean;
    },
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

  // --- Agent Status Endpoints (MUST be before :id routes) ---

  @Get('agents/status')
  async getAgentsStatus() {
    return this.usersService.getAgentsStatus();
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() data: { status: 'ONLINE' | 'BUSY' | 'IN_SERVICE' | 'IDLE' | 'OFFLINE' },
  ) {
    console.log(`📊 Atualizando status do usuário ${id} para ${data.status}`);
    const result = await this.usersService.updateStatus(id, data.status);
    console.log(`✅ Status atualizado com sucesso:`, result);
    return result;
  }

  @Get('mentionable')
  async getMentionableUsers(@Request() req: any) {
    return this.usersService.getMentionableUsers();
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
}
