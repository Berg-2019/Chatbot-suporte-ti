import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CreateSettingDto, UpdateSettingDto, SettingDataType } from './settings.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all settings, optionally filtered by category
   */
  async findAll(category?: string) {
    const where = category ? { category } : {};

    return this.prisma.setting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  /**
   * Get a single setting by key
   */
  async findOne(key: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }

    return setting;
  }

  /**
   * Get setting value with type parsing
   */
  async getValue<T = any>(key: string, defaultValue?: T): Promise<T> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key },
      });

      if (!setting) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw new NotFoundException(`Setting "${key}" not found`);
      }

      return this.parseValue(setting.value, setting.dataType) as T;
    } catch (error) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw error;
    }
  }

  /**
   * Create or update a setting
   */
  async upsert(createSettingDto: CreateSettingDto) {
    const { key, value, description, category, dataType } = createSettingDto;

    return this.prisma.setting.upsert({
      where: { key },
      create: {
        key,
        value,
        description,
        category: category || 'general',
        dataType: dataType || SettingDataType.STRING,
      },
      update: {
        value,
        description,
        category,
        dataType,
      },
    });
  }

  /**
   * Update an existing setting
   */
  async update(key: string, updateSettingDto: UpdateSettingDto) {
    const existing = await this.findOne(key);

    return this.prisma.setting.update({
      where: { key },
      data: {
        value: updateSettingDto.value,
        description: updateSettingDto.description ?? existing.description,
        category: updateSettingDto.category ?? existing.category,
        dataType: updateSettingDto.dataType ?? existing.dataType,
      },
    });
  }

  /**
   * Delete a setting
   */
  async remove(key: string) {
    await this.findOne(key); // Check if exists

    return this.prisma.setting.delete({
      where: { key },
    });
  }

  /**
   * Bulk update settings
   */
  async bulkUpdate(settings: Record<string, string>) {
    const updates = Object.entries(settings).map(([key, value]) =>
      this.prisma.setting.upsert({
        where: { key },
        create: {
          key,
          value,
          category: this.inferCategory(key),
          dataType: this.inferDataType(value),
        },
        update: { value },
      }),
    );

    await Promise.all(updates);

    return { updated: updates.length };
  }

  /**
   * Get all settings as a key-value object
   */
  async getAsObject(category?: string): Promise<Record<string, any>> {
    const settings = await this.findAll(category);

    return settings.reduce(
      (acc, setting) => {
        acc[setting.key] = this.parseValue(setting.value, setting.dataType);
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  /**
   * Initialize default settings if they don't exist
   */
  async initializeDefaults() {
    const defaults = [
      // Bot Settings
      {
        key: 'bot.greeting.message',
        value: 'Olá! 👋 Sou o assistente virtual. Como posso ajudar você hoje?',
        description: 'Mensagem de saudação do bot',
        category: 'bot',
        dataType: SettingDataType.STRING,
      },
      {
        key: 'bot.business.hours.enabled',
        value: 'true',
        description: 'Ativar verificação de horário comercial',
        category: 'bot',
        dataType: SettingDataType.BOOLEAN,
      },
      {
        key: 'bot.business.hours.schedule',
        value: JSON.stringify({
          start: '08:00',
          end: '18:00',
          timezone: 'America/Sao_Paulo',
        }),
        description: 'Horário de funcionamento do bot',
        category: 'bot',
        dataType: SettingDataType.JSON,
      },
      {
        key: 'bot.after.hours.message',
        value:
          'No momento estamos fora do horário de atendimento (8h às 18h). Sua mensagem será atendida no próximo dia útil.',
        description: 'Mensagem fora do horário comercial',
        category: 'bot',
        dataType: SettingDataType.STRING,
      },

      // SLA Settings
      {
        key: 'sla.warning.threshold',
        value: '75',
        description: 'Porcentagem do SLA para enviar alerta (0-100)',
        category: 'sla',
        dataType: SettingDataType.NUMBER,
      },
      {
        key: 'sla.default.hours.low',
        value: '48',
        description: 'SLA em horas para prioridade BAIXA',
        category: 'sla',
        dataType: SettingDataType.NUMBER,
      },
      {
        key: 'sla.default.hours.normal',
        value: '24',
        description: 'SLA em horas para prioridade NORMAL',
        category: 'sla',
        dataType: SettingDataType.NUMBER,
      },
      {
        key: 'sla.default.hours.high',
        value: '8',
        description: 'SLA em horas para prioridade ALTA',
        category: 'sla',
        dataType: SettingDataType.NUMBER,
      },
      {
        key: 'sla.default.hours.urgent',
        value: '4',
        description: 'SLA em horas para prioridade URGENTE',
        category: 'sla',
        dataType: SettingDataType.NUMBER,
      },

      // Email Settings
      {
        key: 'email.poll.interval',
        value: '60',
        description: 'Intervalo em segundos para verificar novos emails',
        category: 'email',
        dataType: SettingDataType.NUMBER,
      },

      // Notifications Settings
      {
        key: 'notifications.sound.default',
        value: 'default',
        description: 'Som padrão de notificação',
        category: 'notifications',
        dataType: SettingDataType.STRING,
      },
      {
        key: 'notifications.desktop.enabled',
        value: 'true',
        description: 'Habilitar notificações desktop',
        category: 'notifications',
        dataType: SettingDataType.BOOLEAN,
      },

      // System Settings
      {
        key: 'system.auto.assignment.enabled',
        value: 'true',
        description: 'Habilitar atribuição automática de tickets',
        category: 'system',
        dataType: SettingDataType.BOOLEAN,
      },
      {
        key: 'system.ticket.auto.close.days',
        value: '7',
        description: 'Dias para fechar ticket resolvido automaticamente',
        category: 'system',
        dataType: SettingDataType.NUMBER,
      },
    ];

    const created = [];
    for (const setting of defaults) {
      const existing = await this.prisma.setting.findUnique({
        where: { key: setting.key },
      });

      if (!existing) {
        const newSetting = await this.prisma.setting.create({
          data: setting,
        });
        created.push(newSetting);
      }
    }

    this.logger.log(`Initialized ${created.length} default settings`);
    return created;
  }

  /**
   * Parse setting value based on dataType
   */
  private parseValue(value: string, dataType: string): any {
    try {
      switch (dataType) {
        case SettingDataType.NUMBER:
          return Number(value);
        case SettingDataType.BOOLEAN:
          return value.toLowerCase() === 'true';
        case SettingDataType.JSON:
          return JSON.parse(value);
        default:
          return value;
      }
    } catch (error) {
      this.logger.warn(`Failed to parse value "${value}" as ${dataType}`);
      return value;
    }
  }

  /**
   * Infer category from key (e.g., "bot.greeting.message" -> "bot")
   */
  private inferCategory(key: string): string {
    const parts = key.split('.');
    return parts.length > 1 ? parts[0] : 'general';
  }

  /**
   * Infer data type from value
   */
  private inferDataType(value: string): SettingDataType {
    if (value === 'true' || value === 'false') {
      return SettingDataType.BOOLEAN;
    }
    if (!isNaN(Number(value))) {
      return SettingDataType.NUMBER;
    }
    if (value.startsWith('{') || value.startsWith('[')) {
      return SettingDataType.JSON;
    }
    return SettingDataType.STRING;
  }
}
