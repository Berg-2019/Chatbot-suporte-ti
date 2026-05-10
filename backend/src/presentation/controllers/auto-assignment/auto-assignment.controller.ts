import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AutoAssignmentService } from './auto-assignment.service';

@Controller('auto-assignment')
@UseGuards(AuthGuard('jwt'))
export class AutoAssignmentController {
  constructor(private readonly service: AutoAssignmentService) {}

  @Get('config')
  async getConfig() {
    return this.service.getConfig();
  }

  @Patch('config')
  async updateConfig(@Body() data: {
    enabled?: boolean;
    strategy?: string;
    applyToSectors?: string[];
    applyToPriorities?: string[];
    applyToCategories?: string[];
    respectSector?: boolean;
    respectLevel?: boolean;
    maxTicketsPerAgent?: number;
    workingHoursStart?: string;
    workingHoursEnd?: string;
    workingDays?: string[];
  }) {
    return this.service.updateConfig(data);
  }

  @Get('stats')
  async getStats() {
    return this.service.getStats();
  }

  @Post('toggle')
  async toggle() {
    return this.service.toggle();
  }
}
