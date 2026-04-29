/**
 * Admin Controller - Users, Dashboard, Groups Management
 */

import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import * as bcrypt from 'bcryptjs';

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

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
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  constructor(private prisma: PrismaService) {}

  // Users
  @Get('users')
  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        sector: true,
        active: true,
        phoneNumber: true,
        createdAt: true,
        lastSeenAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  }

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: (dto.role || 'AGENT') as any,
        sector: (dto.sector || 'TI') as any,
        phoneNumber: dto.phoneNumber,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        sector: true,
        active: true,
      },
    });
    return user;
  }

  @Patch('users/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const data: any = { ...dto };
    if (dto.role) data.role = dto.role as any;
    if (dto.sector) data.sector = dto.sector as any;
    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        sector: true,
        active: true,
      },
    });
    return user;
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  // Dashboard
  @Get('dashboard')
  async getDashboard() {
    const [
      totalTickets,
      openTickets,
      resolvedTickets,
      totalUsers,
      activeUsers,
    ] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.ticket.count({ where: { status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS'] } } }),
      this.prisma.ticket.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { active: true } }),
    ]);

    const ticketsBySector = await this.prisma.ticket.groupBy({
      by: ['sector'],
      _count: { id: true },
    });

    const ticketsByStatus = await this.prisma.ticket.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return {
      tickets: {
        total: totalTickets,
        open: openTickets,
        resolved: resolvedTickets,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      ticketsBySector: ticketsBySector.map(s => ({ sector: s.sector || 'TI', count: s._count.id })),
      ticketsByStatus: ticketsByStatus.map(s => ({ status: s.status, count: s._count.id })),
    };
  }

  // Groups (from Users table - sectors/roles)
  @Get('groups')
  async getGroups() {
    const groups = await this.prisma.user.groupBy({
      by: ['sector', 'role'],
      _count: { id: true },
    });

    return groups.map(g => ({
      sector: g.sector || 'TI',
      role: g.role,
      count: g._count.id,
    }));
  }

  @Post('groups')
  async createGroup(@Body() body: { name: string; description?: string }) {
    return { id: Date.now().toString(), name: body.name, description: body.description };
  }
}