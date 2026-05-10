import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  AutomationRuleQueryDto,
} from './automation.dto';

@Injectable()
export class AutomationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAutomationRuleDto, userId: string) {
    return this.prisma.automationRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        event: dto.event,
        conditions: dto.conditions as any,
        conditionOperator: dto.conditionOperator || 'AND',
        actions: dto.actions as any,
        active: dto.active ?? true,
        createdBy: userId,
      },
    });
  }

  async findAll(query: AutomationRuleQueryDto) {
    const where: any = {};
    if (query.event) where.event = query.event;
    if (query.active !== undefined) where.active = query.active;

    return this.prisma.automationRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.automationRule.findUnique({ where: { id } });
  }

  async getStats(id: string) {
    return this.prisma.automationRule.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        executionCount: true,
        lastExecutedAt: true,
        createdAt: true,
        active: true,
      },
    });
  }

  async update(id: string, dto: UpdateAutomationRuleDto) {
    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.event) data.event = dto.event;
    if (dto.conditions) data.conditions = dto.conditions as any;
    if (dto.conditionOperator) data.conditionOperator = dto.conditionOperator;
    if (dto.actions) data.actions = dto.actions as any;
    if (dto.active !== undefined) data.active = dto.active;

    return this.prisma.automationRule.update({ where: { id }, data });
  }

  async toggle(id: string) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) return null;
    return this.prisma.automationRule.update({
      where: { id },
      data: { active: !rule.active },
    });
  }

  async remove(id: string) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    if (!rule) return null;
    await this.prisma.automationRule.delete({ where: { id } });
    return rule;
  }
}
