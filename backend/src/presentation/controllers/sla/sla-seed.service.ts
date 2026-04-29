import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Sector, Priority } from '@prisma/client';

interface SlaPolicySeed {
  name: string;
  sector: Sector;
  priority: Priority;
  responseTimeMins: number;
  resolutionTimeMins: number;
}

@Injectable()
export class SlaSeedService implements OnModuleInit {
  private readonly logger = new Logger(SlaSeedService.name);

  private readonly defaultPolicies: SlaPolicySeed[] = [
    // TI Sector
    { name: 'TI - Prioridade Normal', sector: 'TI', priority: 'NORMAL', responseTimeMins: 120, resolutionTimeMins: 480 },
    { name: 'TI - Prioridade Alta', sector: 'TI', priority: 'HIGH', responseTimeMins: 60, resolutionTimeMins: 240 },
    { name: 'TI - Prioridade Urgente', sector: 'TI', priority: 'URGENT', responseTimeMins: 30, resolutionTimeMins: 120 },
    { name: 'TI - Prioridade Baixa', sector: 'TI', priority: 'LOW', responseTimeMins: 240, resolutionTimeMins: 1440 },
    // ELECTRIC Sector
    { name: 'Elétrica - Prioridade Normal', sector: 'ELECTRIC', priority: 'NORMAL', responseTimeMins: 120, resolutionTimeMins: 480 },
    { name: 'Elétrica - Prioridade Alta', sector: 'ELECTRIC', priority: 'HIGH', responseTimeMins: 60, resolutionTimeMins: 240 },
    { name: 'Elétrica - Prioridade Urgente', sector: 'ELECTRIC', priority: 'URGENT', responseTimeMins: 30, resolutionTimeMins: 120 },
    { name: 'Elétrica - Prioridade Baixa', sector: 'ELECTRIC', priority: 'LOW', responseTimeMins: 240, resolutionTimeMins: 1440 },
    // COMPRAS Sector
    { name: 'Compras - Prioridade Normal', sector: 'COMPRAS', priority: 'NORMAL', responseTimeMins: 180, resolutionTimeMins: 720 },
    { name: 'Compras - Prioridade Alta', sector: 'COMPRAS', priority: 'HIGH', responseTimeMins: 90, resolutionTimeMins: 360 },
    { name: 'Compras - Prioridade Urgente', sector: 'COMPRAS', priority: 'URGENT', responseTimeMins: 45, resolutionTimeMins: 180 },
    { name: 'Compras - Prioridade Baixa', sector: 'COMPRAS', priority: 'LOW', responseTimeMins: 480, resolutionTimeMins: 2880 },
  ];

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultPolicies();
  }

  async seedDefaultPolicies(): Promise<void> {
    this.logger.log('Seeding default SLA policies...');

    for (const policy of this.defaultPolicies) {
      const existing = await this.prisma.slaPolicy.findUnique({
        where: {
          sector_priority: {
            sector: policy.sector as Sector,
            priority: policy.priority as Priority,
          },
        },
      });

      if (!existing) {
        await this.prisma.slaPolicy.create({
          data: {
            name: policy.name,
            sector: policy.sector as Sector,
            priority: policy.priority as Priority,
            responseTimeMins: policy.responseTimeMins,
            resolutionTimeMins: policy.resolutionTimeMins,
            active: true,
          },
        });
        this.logger.log(`Created SLA policy: ${policy.name}`);
      } else {
        this.logger.log(`SLA policy already exists: ${policy.name}`);
      }
    }

    this.logger.log('SLA policies seeding completed.');
  }
}