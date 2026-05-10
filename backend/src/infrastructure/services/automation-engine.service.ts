/**
 * Automation Engine Service
 * Sistema de regras de automação (evento → condição → ação)
 * Helpdesk MSM
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WebhookService } from './webhook.service';
import { redactName } from '../logger/redact';

interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'is_empty' | 'is_not_empty';
  value: any;
}

interface AutomationAction {
  type: 'assign_agent' | 'set_priority' | 'add_label' | 'send_message' | 'send_notification' | 'send_webhook' | 'escalate' | 'change_status';
  value?: any;
  priority?: string;
  title?: string;
  message?: string;
  targetUsers?: string[];
  url?: string;
  method?: string;
}

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    private prisma: PrismaService,
    private webhookService: WebhookService,
  ) {}

  /**
   * Processar evento e executar regras que correspondem
   */
  async processEvent(event: string, context: Record<string, any>): Promise<void> {
    this.logger.debug(`Processing event: ${event}`);

    try {
      // Buscar regras ativas para este evento
      const rules = await this.prisma.automationRule.findMany({
        where: {
          event,
          active: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (rules.length === 0) {
        this.logger.debug(`No active rules found for event: ${event}`);
        return;
      }

      this.logger.log(`Found ${rules.length} active rules for event: ${event}`);

      // Processar cada regra
      for (const rule of rules) {
        try {
          const conditions = rule.conditions as unknown as AutomationCondition[];
          const conditionOperator = rule.conditionOperator as 'AND' | 'OR';

          // Avaliar condições
          const conditionsMet = this.evaluateConditions(
            conditions,
            conditionOperator,
            context
          );

          if (conditionsMet) {
            this.logger.log(`✓ Rule matched: "${rule.name}" (${rule.id})`);

            // Executar ações
            const actions = rule.actions as unknown as AutomationAction[];
            await this.executeActions(actions, context);

            // Atualizar estatísticas da regra
            await this.prisma.automationRule.update({
              where: { id: rule.id },
              data: {
                executionCount: { increment: 1 },
                lastExecutedAt: new Date(),
              },
            });

            this.logger.log(`✓ Rule executed successfully: "${rule.name}"`);
          } else {
            this.logger.debug(`✗ Rule conditions not met: "${rule.name}"`);
          }
        } catch (error) {
          this.logger.error(
            `Error processing rule "${rule.name}" (${rule.id}): ${error.message}`,
            error.stack
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error processing event "${event}": ${error.message}`, error.stack);
    }
  }

  /**
   * Avaliar se as condições são atendidas
   */
  private evaluateConditions(
    conditions: AutomationCondition[],
    operator: 'AND' | 'OR',
    context: Record<string, any>
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true; // Sem condições = sempre verdadeiro
    }

    const results = conditions.map((condition) => {
      const fieldValue = this.getNestedValue(context, condition.field);
      return this.evaluateSingleCondition(condition, fieldValue);
    });

    // AND: todas as condições devem ser verdadeiras
    // OR: pelo menos uma condição deve ser verdadeira
    return operator === 'AND'
      ? results.every((r) => r)
      : results.some((r) => r);
  }

  /**
   * Avaliar uma única condição
   */
  private evaluateSingleCondition(
    condition: AutomationCondition,
    fieldValue: any
  ): boolean {
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return fieldValue === value;

      case 'not_equals':
        return fieldValue !== value;

      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());

      case 'starts_with':
        return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());

      case 'greater_than':
        return Number(fieldValue) > Number(value);

      case 'less_than':
        return Number(fieldValue) < Number(value);

      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);

      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);

      case 'is_empty':
        return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);

      case 'is_not_empty':
        return !!fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);

      default:
        this.logger.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Executar ações da regra
   */
  private async executeActions(
    actions: AutomationAction[],
    context: Record<string, any>
  ): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeSingleAction(action, context);
      } catch (error) {
        this.logger.error(
          `Error executing action ${action.type}: ${error.message}`,
          error.stack
        );
      }
    }
  }

  /**
   * Executar uma única ação
   */
  private async executeSingleAction(
    action: AutomationAction,
    context: Record<string, any>
  ): Promise<void> {
    const { type } = action;

    switch (type) {
      case 'assign_agent':
        await this.actionAssignAgent(action, context);
        break;

      case 'set_priority':
        await this.actionSetPriority(action, context);
        break;

      case 'add_label':
        await this.actionAddLabel(action, context);
        break;

      case 'change_status':
        await this.actionChangeStatus(action, context);
        break;

      case 'send_message':
        await this.actionSendMessage(action, context);
        break;

      case 'send_notification':
        await this.actionSendNotification(action, context);
        break;

      case 'send_webhook':
        await this.actionSendWebhook(action, context);
        break;

      case 'escalate':
        await this.actionEscalate(action, context);
        break;

      default:
        this.logger.warn(`Unknown action type: ${type}`);
    }
  }

  /**
   * Ação: Atribuir agente
   */
  private async actionAssignAgent(
    action: AutomationAction,
    context: Record<string, any>
  ): Promise<void> {
    const ticketId = context.ticketId;
    const agentId = action.value;

    if (!ticketId || !agentId) {
      this.logger.warn('Missing ticketId or agentId for assign_agent action');
      return;
    }

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: agentId,
        status: 'ASSIGNED',
      },
    });

    this.logger.log(`✓ Assigned ticket ${ticketId} to agent ${agentId}`);
  }

  /**
   * Ação: Definir prioridade
   */
  private async actionSetPriority(
    action: AutomationAction,
    context: Record<string, any>
  ): Promise<void> {
    const ticketId = context.ticketId;
    const priority = action.value as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

    if (!ticketId || !priority) {
      this.logger.warn('Missing ticketId or priority for set_priority action');
      return;
    }

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { priority },
    });

    this.logger.log(`✓ Set ticket ${ticketId} priority to ${priority}`);
  }

  /**
   * Ação: Adicionar label/tag
   */
  private async actionAddLabel(
    action: AutomationAction,
    context: Record<string, any>
  ): Promise<void> {
    const ticketId = context.ticketId;
    const label = action.value;

    if (!ticketId || !label) {
      this.logger.warn('Missing ticketId or label for add_label action');
      return;
    }

    // Verificar se label já existe
    const existing = await this.prisma.ticketLabel.findFirst({
      where: { ticketId, label },
    });

    if (!existing) {
      await this.prisma.ticketLabel.create({
        data: {
          ticketId,
          label,
          color: this.getLabelColor(label),
        },
      });

      this.logger.log(`✓ Added label "${label}" to ticket ${ticketId}`);
    }
  }

  /**
   * Ação: Mudar status
   */
  private async actionChangeStatus(
    action: AutomationAction,
    context: Record<string, any>
  ): Promise<void> {
    const ticketId = context.ticketId;
    const status = action.value as 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';

    if (!ticketId || !status) {
      this.logger.warn('Missing ticketId or status for change_status action');
      return;
    }

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
    });

    this.logger.log(`✓ Changed ticket ${ticketId} status to ${status}`);
  }

  /**
   * Ação: Enviar mensagem (placeholder - será implementado na integração com bot)
   */
  private async actionSendMessage(
    action: AutomationAction,
    context: Record<string, any>
  ): Promise<void> {
    const message = this.interpolateTemplate(action.message || action.value, context);

    this.logger.log(`✓ Message queued: "${message.substring(0, 50)}..."`);

    // TODO: Integrar com bot/WhatsApp para enviar mensagem real
    // Exemplo: await this.whatsappService.sendMessage(context.phoneNumber, message);
  }

  /**
   * Ação: Enviar notificação
   */
  private async actionSendNotification(
    action: AutomationAction,
    context: Record<string, any>
  ): Promise<void> {
    const message = this.interpolateTemplate(action.message || action.value, context);

    this.logger.log(`✓ Notification sent: "${message.substring(0, 50)}..."`);

    // TODO: Integrar com sistema de notificações
    // Exemplo: await this.notificationService.send({ ... });
  }

  /**
   * Ação: Disparar webhook
   */
  private async actionSendWebhook(
    action: AutomationAction,
    context: Record<string, any>
  ): Promise<void> {
    const url = action.url;
    const method = action.method || 'POST';

    if (!url) {
      this.logger.warn('Missing URL for send_webhook action');
      return;
    }

    // TODO: Implementar chamada HTTP direta ao webhook
    // Por enquanto, apenas loga
    this.logger.log(`✓ Webhook action registered for ${url} (implementation pending)`);
  }

  /**
   * Ação: Escalonar ticket
   */
  private async actionEscalate(
    action: AutomationAction,
    context: Record<string, any>
  ): Promise<void> {
    const ticketId = context.ticketId;

    if (!ticketId) {
      this.logger.warn('Missing ticketId for escalate action');
      return;
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { assignedTo: true },
    });

    if (!ticket) {
      this.logger.warn(`Ticket ${ticketId} not found`);
      return;
    }

    // Lógica de escalonamento: N1 → N2 → N3
    const currentLevel = ticket.assignedTo?.technicianLevel || 'N1';
    let newLevel: 'N1' | 'N2' | 'N3' = 'N2';

    if (currentLevel === 'N1') newLevel = 'N2';
    else if (currentLevel === 'N2') newLevel = 'N3';
    else newLevel = 'N3'; // Já é N3, mantém

    // Buscar agente disponível do próximo nível
    const newAgent = await this.prisma.user.findFirst({
      where: {
        technicianLevel: newLevel,
        active: true,
        role: 'AGENT',
      },
      orderBy: { createdAt: 'asc' },
    });

    if (newAgent) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          assignedToId: newAgent.id,
          escalatedAt: new Date(),
        },
      });

      this.logger.log(`✓ Escalated ticket ${ticketId} to ${newLevel} (uid:${newAgent.id.slice(0, 8)})`);
    } else {
      this.logger.warn(`No available agent found for level ${newLevel}`);
    }
  }

  /**
   * Obter valor aninhado de objeto (ex: "ticket.priority")
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Interpolar template com variáveis do contexto
   */
  private interpolateTemplate(template: string, context: Record<string, any>): string {
    if (!template) return '';

    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => {
      return this.getNestedValue(context, key) || '';
    });
  }

  /**
   * Obter cor padrão para label
   */
  private getLabelColor(label: string): string {
    const colors: Record<string, string> = {
      urgente: '#dc2626',
      importante: '#f59e0b',
      bug: '#ef4444',
      melhoria: '#10b981',
      dúvida: '#3b82f6',
      vip: '#8b5cf6',
    };

    const normalizedLabel = label.toLowerCase();
    return colors[normalizedLabel] || '#6b7280'; // Cinza padrão
  }
}
