/**
 * Bot Variables Service
 * Gerencia variáveis dinâmicas usadas no bot (templates, mensagens, configurações)
 */

import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

interface CreateVariableDto {
  key: string;
  value: string;
  description?: string;
  category?: string;
}

interface UpdateVariableDto {
  value?: string;
  description?: string;
  category?: string;
}

@Injectable()
export class BotVariablesService {
  private readonly logger = new Logger(BotVariablesService.name);
  private variablesCache = new Map<string, string>();

  constructor(private prisma: PrismaService) {
    this.loadVariablesIntoCache();
  }

  /**
   * Carrega variáveis do banco para cache (performance)
   */
  private async loadVariablesIntoCache() {
    const variables = await this.prisma.botVariable.findMany();

    for (const v of variables) {
      this.variablesCache.set(v.key, v.value);
    }

    this.logger.log(`✅ ${variables.length} variáveis carregadas no cache`);
  }

  /**
   * Cria nova variável
   */
  async create(dto: CreateVariableDto) {
    // Verificar se já existe
    const existing = await this.prisma.botVariable.findUnique({
      where: { key: dto.key },
    });

    if (existing) {
      throw new ConflictException(`Variável "${dto.key}" já existe`);
    }

    const variable = await this.prisma.botVariable.create({
      data: {
        key: dto.key,
        value: dto.value,
        description: dto.description,
        category: dto.category || 'general',
        isSystem: false,
      },
    });

    // Atualizar cache
    this.variablesCache.set(variable.key, variable.value);

    this.logger.log(`✅ Variável "${dto.key}" criada`);

    return variable;
  }

  /**
   * Atualiza variável existente
   */
  async update(key: string, dto: UpdateVariableDto) {
    const existing = await this.prisma.botVariable.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new NotFoundException(`Variável "${key}" não encontrada`);
    }

    const updated = await this.prisma.botVariable.update({
      where: { key },
      data: dto,
    });

    // Atualizar cache se valor mudou
    if (dto.value !== undefined) {
      this.variablesCache.set(key, dto.value);
    }

    this.logger.log(`✅ Variável "${key}" atualizada`);

    return updated;
  }

  /**
   * Deleta variável (apenas não-sistema)
   */
  async delete(key: string) {
    const existing = await this.prisma.botVariable.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new NotFoundException(`Variável "${key}" não encontrada`);
    }

    if (existing.isSystem) {
      throw new ConflictException('Variáveis do sistema não podem ser deletadas');
    }

    await this.prisma.botVariable.delete({
      where: { key },
    });

    // Remover do cache
    this.variablesCache.delete(key);

    this.logger.log(`🗑️ Variável "${key}" deletada`);

    return { message: 'Variável deletada com sucesso' };
  }

  /**
   * Busca todas as variáveis
   */
  async findAll(category?: string) {
    const where: any = {};

    if (category) {
      where.category = category;
    }

    return this.prisma.botVariable.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  /**
   * Busca variável por key
   */
  async findOne(key: string) {
    const variable = await this.prisma.botVariable.findUnique({
      where: { key },
    });

    if (!variable) {
      throw new NotFoundException(`Variável "${key}" não encontrada`);
    }

    return variable;
  }

  /**
   * Retorna valor de uma variável (do cache)
   */
  getValue(key: string, defaultValue?: string): string {
    return this.variablesCache.get(key) || defaultValue || '';
  }

  /**
   * Interpola template com variáveis
   * Exemplo: "Olá {{contact_name}}, seu ticket {{ticket_id}} foi criado"
   */
  interpolate(template: string, customVars?: Record<string, string>): string {
    let result = template;

    // Substituir variáveis do sistema
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      // Primeiro tentar variáveis customizadas
      if (customVars && customVars[key] !== undefined) {
        return customVars[key];
      }

      // Depois variáveis do banco
      return this.getValue(key, match);
    });

    return result;
  }

  /**
   * Cria variáveis padrão do sistema (seed)
   */
  async seedDefaultVariables() {
    const defaults = [
      {
        key: 'company_name',
        value: 'Empresa',
        description: 'Nome da empresa',
        category: 'general',
        isSystem: true,
      },
      {
        key: 'support_phone',
        value: '(11) 9999-9999',
        description: 'Telefone do suporte',
        category: 'contact',
        isSystem: true,
      },
      {
        key: 'support_email',
        value: 'suporte@empresa.com',
        description: 'Email do suporte',
        category: 'contact',
        isSystem: true,
      },
      {
        key: 'working_hours',
        value: '08:00 às 18:00',
        description: 'Horário de atendimento',
        category: 'general',
        isSystem: true,
      },
      {
        key: 'working_days',
        value: 'Segunda a Sexta',
        description: 'Dias de funcionamento',
        category: 'general',
        isSystem: true,
      },
      {
        key: 'sla_normal',
        value: '4 horas',
        description: 'SLA para tickets normais',
        category: 'sla',
        isSystem: true,
      },
      {
        key: 'sla_urgent',
        value: '1 hora',
        description: 'SLA para tickets urgentes',
        category: 'sla',
        isSystem: true,
      },
      {
        key: 'greeting_message',
        value: 'Olá! Bem-vindo ao suporte {{company_name}}. Como posso ajudar?',
        description: 'Mensagem de saudação do bot',
        category: 'messages',
        isSystem: true,
      },
      {
        key: 'ticket_created_message',
        value: 'Seu chamado #{{ticket_id}} foi criado com sucesso! Aguarde o atendimento.',
        description: 'Mensagem ao criar ticket',
        category: 'messages',
        isSystem: true,
      },
      {
        key: 'out_of_hours_message',
        value: 'Nosso horário de atendimento é {{working_hours}}, {{working_days}}. Seu chamado será atendido no próximo dia útil.',
        description: 'Mensagem fora do horário',
        category: 'messages',
        isSystem: true,
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const variable of defaults) {
      const existing = await this.prisma.botVariable.findUnique({
        where: { key: variable.key },
      });

      if (!existing) {
        await this.prisma.botVariable.create({ data: variable });
        this.variablesCache.set(variable.key, variable.value);
        created++;
      } else {
        skipped++;
      }
    }

    this.logger.log(`✅ Seed: ${created} variáveis criadas, ${skipped} já existiam`);

    return { created, skipped, total: defaults.length };
  }

  /**
   * Retorna categorias disponíveis
   */
  async getCategories() {
    const categories = await this.prisma.botVariable.findMany({
      distinct: ['category'],
      select: { category: true },
    });

    return categories.map((c) => c.category);
  }
}
