import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { AdminService } from './admin.service';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

class CreateUserDto {
  @IsEmail()
  email: string;

  // Senha é opcional: se omitida, agente recebe link de ativação por email/WhatsApp.
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  active?: boolean;
}

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'ADMIN_TI', 'ADMIN_ELECTRIC', 'ADMIN_COMPRAS')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('users')
  async getUsers() {
    return this.service.getUsers();
  }

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    return this.service.createUser(dto);
  }

  @Patch('users/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.updateUser(id, dto);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    await this.service.deleteUser(id);
    return { success: true };
  }

  @Get('dashboard')
  async getDashboard() {
    return this.service.getDashboard();
  }

  @Get('groups')
  async getGroups() {
    return this.service.getGroups();
  }

  @Post('groups')
  async createGroup(@Body() body: { name: string; description?: string }) {
    return { id: Date.now().toString(), name: body.name, description: body.description };
  }
}
