/**
 * Email Config Controller
 */

import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { EmailConfigService } from './email-config.service';

@Controller('email-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailConfigController {
  constructor(private emailConfigService: EmailConfigService) {}

  @Get()
  @Roles('ADMIN')
  async getConfig() {
    return this.emailConfigService.getConfig();
  }

  @Post()
  @Roles('ADMIN')
  async createConfig(
    @Body()
    dto: {
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
    },
  ) {
    return this.emailConfigService.create(dto);
  }

  @Put()
  @Roles('ADMIN')
  async updateConfig(
    @Body()
    dto: {
      imapHost?: string;
      imapPort?: number;
      imapUser?: string;
      imapPassword?: string;
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
    },
  ) {
    return this.emailConfigService.update(dto);
  }

  @Post('test-connection')
  @Roles('ADMIN')
  async testConnection() {
    return this.emailConfigService.testConnection();
  }

  @Post('start')
  @Roles('ADMIN')
  async startIngestion() {
    return this.emailConfigService.startIngestion();
  }

  @Post('stop')
  @Roles('ADMIN')
  async stopIngestion() {
    return this.emailConfigService.stopIngestion();
  }
}
