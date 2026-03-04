/**
 * Email Config Service
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EmailIngestionService } from '../../../infrastructure/email/email-ingestion.service';

interface CreateEmailConfigDto {
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  imapTls?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpTls?: boolean;
  enabled?: boolean;
  pollInterval?: number;
  autoAssign?: boolean;
  defaultPriority?: string;
  defaultSector?: string;
}

@Injectable()
export class EmailConfigService {
  constructor(
    private prisma: PrismaService,
    private emailIngestion: EmailIngestionService,
  ) {}

  async getConfig() {
    const config = await this.prisma.emailConfig.findFirst();
    if (!config) {
      throw new NotFoundException('Email configuration not found');
    }
    return config;
  }

  async create(dto: CreateEmailConfigDto) {
    // Check if config already exists
    const existing = await this.prisma.emailConfig.findFirst();
    if (existing) {
      throw new Error('Email configuration already exists. Use update instead.');
    }

    const config = await this.prisma.emailConfig.create({
      data: dto,
    });

    // Start polling if enabled
    if (config.enabled) {
      await this.emailIngestion.startPolling();
    }

    return config;
  }

  async update(dto: Partial<CreateEmailConfigDto>) {
    const existing = await this.prisma.emailConfig.findFirst();
    if (!existing) {
      throw new NotFoundException('Email configuration not found');
    }

    const config = await this.prisma.emailConfig.update({
      where: { id: existing.id },
      data: dto,
    });

    // Restart polling if enabled status changed
    if (dto.enabled !== undefined) {
      if (dto.enabled) {
        await this.emailIngestion.startPolling();
      } else {
        await this.emailIngestion.stopPolling();
      }
    }

    return config;
  }

  async testConnection() {
    const config = await this.getConfig();

    // TODO: Implement actual IMAP connection test
    // For now, just return success
    return {
      success: true,
      message: 'Connection test not implemented yet',
    };
  }

  async startIngestion() {
    const config = await this.getConfig();

    if (!config.enabled) {
      // Enable it first
      await this.update({ enabled: true });
    }

    await this.emailIngestion.startPolling();

    return {
      success: true,
      message: 'Email ingestion started',
    };
  }

  async stopIngestion() {
    await this.emailIngestion.stopPolling();

    // Update config
    const existing = await this.prisma.emailConfig.findFirst();
    if (existing) {
      await this.prisma.emailConfig.update({
        where: { id: existing.id },
        data: { enabled: false },
      });
    }

    return {
      success: true,
      message: 'Email ingestion stopped',
    };
  }
}
