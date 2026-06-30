/**
 * Users Controller
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  Request,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private usersService: UsersService,
  ) { }

  @Get()
  @Roles('ADMIN')
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
  @Roles('ADMIN')
  async createLocalUser(
    @Body() data: {
      name: string;
      email: string;
      password?: string;
      role?: 'ADMIN' | 'AGENT' | 'ADMIN_TI' | 'ADMIN_ELECTRIC' | 'ADMIN_COMPRAS';
      sector?: 'TI' | 'ELECTRIC' | 'COMPRAS';
      active?: boolean;
      phoneNumber?: string;
      creaNumber?: string;
    },
    @Request() req: any,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }

    // Senha é opcional: se omitida, agente recebe link de ativação por email/WhatsApp.
    if (!data.name || !data.email) {
      throw new BadRequestException('Nome e e-mail são obrigatórios');
    }

    return this.usersService.createLocal(data);
  }

  // --- Autoatendimento (qualquer usuário autenticado edita só a si mesmo;
  //     escopo deliberadamente mínimo — não passa por role/active/email) ---

  @Patch('me')
  async updateMe(@Body() data: { nickname?: string }, @Request() req: any) {
    return this.usersService.updateOwnProfile(req.user.id, data);
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
    this.logger.debug(`📊 Atualizando status do usuário ${id} para ${data.status}`);
    const result = await this.usersService.updateStatus(id, data.status);
    this.logger.debug(`✅ Status atualizado com sucesso`);
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
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; role?: 'ADMIN' | 'AGENT'; active?: boolean; phone?: string; email?: string; department?: string; permissions?: string[]; creaNumber?: string },
    @Request() req: any,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }
    return this.usersService.update(id, data);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async delete(@Param('id') id: string, @Request() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }
    if (req.user.id === id) {
      throw new ForbiddenException('Não pode deletar a si mesmo');
    }
    return this.usersService.delete(id);
  }

  @Post(':id/reset-password')
  @Roles('ADMIN')
  async resetPassword(@Param('id') id: string, @Request() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }
    return this.usersService.resetPassword(id);
  }

  @Post(':id/resend-activation')
  @Roles('ADMIN')
  async resendActivation(@Param('id') id: string, @Request() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Apenas admins');
    }
    return this.usersService.resendActivation(id);
  }
}
