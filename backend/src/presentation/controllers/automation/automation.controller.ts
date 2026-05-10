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
import { AutomationService } from './automation.service';
import {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  AutomationRuleQueryDto,
} from './automation.dto';

@Controller('automation')
@UseGuards(AuthGuard('jwt'))
export class AutomationController {
  constructor(private readonly service: AutomationService) {}

  @Post()
  async create(@Body() dto: CreateAutomationRuleDto, @Request() req: any) {
    const rule = await this.service.create(dto, req.user.userId);
    return { success: true, rule, message: `Regra "${rule.name}" criada com sucesso` };
  }

  @Get()
  async findAll(@Query() query: AutomationRuleQueryDto) {
    const rules = await this.service.findAll(query);
    return { success: true, rules, total: rules.length };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const rule = await this.service.findOne(id);
    if (!rule) return { success: false, message: 'Regra não encontrada' };
    return { success: true, rule };
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    const rule = await this.service.getStats(id);
    if (!rule) return { success: false, message: 'Regra não encontrada' };

    const daysSinceCreated = Math.max(1, Math.floor((Date.now() - rule.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const executionsPerDay = rule.executionCount / daysSinceCreated;

    return {
      success: true,
      stats: { ...rule, executionsPerDay: Math.round(executionsPerDay * 100) / 100, daysSinceCreated },
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAutomationRuleDto) {
    const rule = await this.service.update(id, dto);
    return { success: true, rule, message: `Regra "${rule.name}" atualizada com sucesso` };
  }

  @Patch(':id/toggle')
  async toggle(@Param('id') id: string) {
    const updated = await this.service.toggle(id);
    if (!updated) return { success: false, message: 'Regra não encontrada' };
    return { success: true, rule: updated, message: `Regra "${updated.name}" ${updated.active ? 'ativada' : 'desativada'}` };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const rule = await this.service.remove(id);
    if (!rule) return { success: false, message: 'Regra não encontrada' };
    return { success: true, message: `Regra "${rule.name}" deletada com sucesso` };
  }

  @Get('events/available')
  async getAvailableEvents() {
    return {
      success: true,
      events: [
        { value: 'ticket_created', label: 'Ticket Criado', description: 'Quando um novo ticket é criado' },
        { value: 'ticket_updated', label: 'Ticket Atualizado', description: 'Quando um ticket é atualizado' },
        { value: 'ticket_assigned', label: 'Ticket Atribuído', description: 'Quando um ticket é atribuído a um técnico' },
        { value: 'ticket_resolved', label: 'Ticket Resolvido', description: 'Quando um ticket é marcado como resolvido' },
        { value: 'ticket_closed', label: 'Ticket Fechado', description: 'Quando um ticket é fechado' },
        { value: 'message_received', label: 'Mensagem Recebida', description: 'Quando uma nova mensagem é recebida' },
        { value: 'message_sent', label: 'Mensagem Enviada', description: 'Quando uma mensagem é enviada' },
        { value: 'csat_received', label: 'CSAT Recebido', description: 'Quando uma avaliação CSAT é recebida' },
      ],
    };
  }

  @Get('actions/available')
  async getAvailableActions() {
    return {
      success: true,
      actions: [
        { value: 'assign_agent', label: 'Atribuir Agente', description: 'Atribuir ticket a um agente específico', requiresValue: true, valueType: 'user_id' },
        { value: 'set_priority', label: 'Definir Prioridade', description: 'Alterar prioridade do ticket', requiresValue: true, valueType: 'priority', options: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
        { value: 'add_label', label: 'Adicionar Label', description: 'Adicionar tag ao ticket', requiresValue: true, valueType: 'string' },
        { value: 'change_status', label: 'Mudar Status', description: 'Alterar status do ticket', requiresValue: true, valueType: 'status', options: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'] },
        { value: 'send_message', label: 'Enviar Mensagem', description: 'Enviar mensagem automática', requiresValue: true, valueType: 'text' },
        { value: 'send_notification', label: 'Enviar Notificação', description: 'Notificar técnicos', requiresValue: true, valueType: 'text' },
        { value: 'send_webhook', label: 'Disparar Webhook', description: 'Chamar URL externa', requiresValue: true, valueType: 'url' },
        { value: 'escalate', label: 'Escalonar', description: 'Escalonar para nível superior (N1→N2→N3)', requiresValue: false },
      ],
    };
  }
}
