import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.user.findMany({
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
  }

  async createUser(dto: { email: string; password: string; name: string; role?: string; sector?: string; phoneNumber?: string }) {
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
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
  }

  async updateUser(id: string, dto: { name?: string; role?: string; sector?: string; phoneNumber?: string; active?: boolean }) {
    const data: any = { ...dto };
    if (dto.role) data.role = dto.role as any;
    if (dto.sector) data.sector = dto.sector as any;
    return this.prisma.user.update({
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
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }

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
      tickets: { total: totalTickets, open: openTickets, resolved: resolvedTickets },
      users: { total: totalUsers, active: activeUsers },
      ticketsBySector: ticketsBySector.map(s => ({ sector: s.sector || 'TI', count: s._count.id })),
      ticketsByStatus: ticketsByStatus.map(s => ({ status: s.status, count: s._count.id })),
    };
  }

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
}
