/**
 * Automation Controller
 * Gerencia regras de automação (evento → condição → ação)
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  AutomationRuleQueryDto,
} from './automation.dto';

@Controller('automation')
@UseGuards(AuthGuard('jwt'))
export class AutomationController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /automation
   * Criar nova regra de automação
   */
  @Post()
  @RequirePermissions('admin:automation')
  async create(@Body() dto: CreateAutomationRuleDto, @Request() req: any) {
    const rule = await this.prisma.automationRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        event: dto.event,
        conditions: dto.conditions as any,
        conditionOperator: dto.conditionOperator || 'AND',
        actions: dto.actions as any,
        active: dto.active ?? true,
        createdBy: req.user.userId,
      },
    });

    return {
      success: true,
      rule,
      message: `Regra "${rule.name}" criada com sucesso`,
    };
  }

  /**
   * GET /automation
   * Listar todas as regras de automação
   */
  @Get()
  @RequirePermissions('admin:automation', 'automation:read')
  async findAll(@Query() query: AutomationRuleQueryDto) {
    const where: any = {};

    if (query.event) {
      where.event = query.event;
    }

    if (query.active !== undefined) {
      where.active = query.active;
    }

    const rules = await this.prisma.automationRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      rules,
      total: rules.length,
    };
  }

  /**
   * GET /automation/:id
   * Buscar regra específica
   */
  @Get(':id')
  @RequirePermissions('admin:automation', 'automation:read')
  async findOne(@Param('id') id: string) {
    const rule = await this.prisma.automationRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return {
        success: false,
        message: 'Regra não encontrada',
      };
    }

    return {
      success: true,
      rule,
    };
  }

  /**
   * GET /automation/:id/stats
   * Estatísticas de execução da regra
   */
  @Get(':id/stats')
  @RequirePermissions('admin:automation', 'reports:read')
  async getStats(@Param('id') id: string) {
    const rule = await this.prisma.automationRule.findUnique({
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

    if (!rule) {
      return {
        success: false,
        message: 'Regra não encontrada',
      };
    }

    // Calcular taxa de execução
    const daysSinceCreated = Math.max(
      1,
      Math.floor((Date.now() - rule.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    const executionsPerDay = rule.executionCount / daysSinceCreated;

    return {
      success: true,
      stats: {
        ...rule,
        executionsPerDay: Math.round(executionsPerDay * 100) / 100,
        daysSinceCreated,
      },
    };
  }

  /**
   * PATCH /automation/:id
   * Atualizar regra
   */
  @Patch(':id')
  @RequirePermissions('admin:automation')
  async update(@Param('id') id: string, @Body() dto: UpdateAutomationRuleDto) {
    const rule = await this.prisma.automationRule.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.event && { event: dto.event }),
        ...(dto.conditions && { conditions: dto.conditions as any }),
        ...(dto.conditionOperator && { conditionOperator: dto.conditionOperator }),
        ...(dto.actions && { actions: dto.actions as any }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });

    return {
      success: true,
      rule,
      message: `Regra "${rule.name}" atualizada com sucesso`,
    };
  }

  /**
   * PATCH /automation/:id/toggle
   * Ativar/desativar regra rapidamente
   */
  @Patch(':id/toggle')
  @RequirePermissions('admin:automation')
  async toggle(@Param('id') id: string) {
    const rule = await this.prisma.automationRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return {
        success: false,
        message: 'Regra não encontrada',
      };
    }

    const updated = await this.prisma.automationRule.update({
      where: { id },
      data: { active: !rule.active },
    });

    return {
      success: true,
      rule: updated,
      message: `Regra "${updated.name}" ${updated.active ? 'ativada' : 'desativada'}`,
    };
  }

  /**
   * DELETE /automation/:id
   * Deletar regra
   */
  @Delete(':id')
  @RequirePermissions('admin:automation')
  async remove(@Param('id') id: string) {
    const rule = await this.prisma.automationRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return {
        success: false,
        message: 'Regra não encontrada',
      };
    }

    await this.prisma.automationRule.delete({
      where: { id },
    });

    return {
      success: true,
      message: `Regra "${rule.name}" deletada com sucesso`,
    };
  }

  /**
   * GET /automation/events/available
   * Listar eventos disponíveis para automação
   */
  @Get('events/available')
  @RequirePermissions('admin:automation', 'automation:read')
  async getAvailableEvents() {
    return {
      success: true,
      events: [
        {
          value: 'ticket_created',
          label: 'Ticket Criado',
          description: 'Quando um novo ticket é criado',
        },
        {
          value: 'ticket_updated',
          label: 'Ticket Atualizado',
          description: 'Quando um ticket é atualizado',
        },
        {
          value: 'ticket_assigned',
          label: 'Ticket Atribuído',
          description: 'Quando um ticket é atribuído a um técnico',
        },
        {
          value: 'ticket_resolved',
          label: 'Ticket Resolvido',
          description: 'Quando um ticket é marcado como resolvido',
        },
        {
          value: 'ticket_closed',
          label: 'Ticket Fechado',
          description: 'Quando um ticket é fechado',
        },
        {
          value: 'message_received',
          label: 'Mensagem Recebida',
          description: 'Quando uma nova mensagem é recebida',
        },
        {
          value: 'message_sent',
          label: 'Mensagem Enviada',
          description: 'Quando uma mensagem é enviada',
        },
        {
          value: 'csat_received',
          label: 'CSAT Recebido',
          description: 'Quando uma avaliação CSAT é recebida',
        },
      ],
    };
  }

  /**
   * GET /automation/actions/available
   * Listar ações disponíveis
   */
  @Get('actions/available')
  @RequirePermissions('admin:automation', 'automation:read')
  async getAvailableActions() {
    return {
      success: true,
      actions: [
        {
          value: 'assign_agent',
          label: 'Atribuir Agente',
          description: 'Atribuir ticket a um agente específico',
          requiresValue: true,
          valueType: 'user_id',
        },
        {
          value: 'set_priority',
          label: 'Definir Prioridade',
          description: 'Alterar prioridade do ticket',
          requiresValue: true,
          valueType: 'priority',
          options: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
        },
        {
          value: 'add_label',
          label: 'Adicionar Label',
          description: 'Adicionar tag ao ticket',
          requiresValue: true,
          valueType: 'string',
        },
        {
          value: 'change_status',
          label: 'Mudar Status',
          description: 'Alterar status do ticket',
          requiresValue: true,
          valueType: 'status',
          options: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'],
        },
        {
          value: 'send_message',
          label: 'Enviar Mensagem',
          description: 'Enviar mensagem automática',
          requiresValue: true,
          valueType: 'text',
        },
        {
          value: 'send_notification',
          label: 'Enviar Notificação',
          description: 'Notificar técnicos',
          requiresValue: true,
          valueType: 'text',
        },
        {
          value: 'send_webhook',
          label: 'Disparar Webhook',
          description: 'Chamar URL externa',
          requiresValue: true,
          valueType: 'url',
        },
        {
          value: 'escalate',
          label: 'Escalonar',
          description: 'Escalonar para nível superior (N1→N2→N3)',
          requiresValue: false,
        },
      ],
    };
  }
}
