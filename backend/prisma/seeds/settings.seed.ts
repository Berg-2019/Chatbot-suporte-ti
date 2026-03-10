import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSettings() {
  console.log('🔧 Seeding default settings...');

  const settings = [
    // Bot Settings
    {
      key: 'bot.greeting.message',
      value: 'Olá! 👋 Sou o assistente virtual. Como posso ajudar você hoje?',
      description: 'Mensagem de saudação do bot',
      category: 'bot',
      dataType: 'string',
    },
    {
      key: 'bot.business.hours.enabled',
      value: 'true',
      description: 'Ativar verificação de horário comercial',
      category: 'bot',
      dataType: 'boolean',
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
      dataType: 'json',
    },
    {
      key: 'bot.after.hours.message',
      value:
        'No momento estamos fora do horário de atendimento (8h às 18h). Sua mensagem será atendida no próximo dia útil.',
      description: 'Mensagem fora do horário comercial',
      category: 'bot',
      dataType: 'string',
    },

    // SLA Settings
    {
      key: 'sla.warning.threshold',
      value: '75',
      description: 'Porcentagem do SLA para enviar alerta (0-100)',
      category: 'sla',
      dataType: 'number',
    },
    {
      key: 'sla.default.hours.low',
      value: '48',
      description: 'SLA em horas para prioridade BAIXA',
      category: 'sla',
      dataType: 'number',
    },
    {
      key: 'sla.default.hours.normal',
      value: '24',
      description: 'SLA em horas para prioridade NORMAL',
      category: 'sla',
      dataType: 'number',
    },
    {
      key: 'sla.default.hours.high',
      value: '8',
      description: 'SLA em horas para prioridade ALTA',
      category: 'sla',
      dataType: 'number',
    },
    {
      key: 'sla.default.hours.urgent',
      value: '4',
      description: 'SLA em horas para prioridade URGENTE',
      category: 'sla',
      dataType: 'number',
    },

    // Email Settings
    {
      key: 'email.poll.interval',
      value: '60',
      description: 'Intervalo em segundos para verificar novos emails',
      category: 'email',
      dataType: 'number',
    },

    // Notifications Settings
    {
      key: 'notifications.sound.default',
      value: 'default',
      description: 'Som padrão de notificação',
      category: 'notifications',
      dataType: 'string',
    },
    {
      key: 'notifications.desktop.enabled',
      value: 'true',
      description: 'Habilitar notificações desktop',
      category: 'notifications',
      dataType: 'boolean',
    },

    // System Settings
    {
      key: 'system.auto.assignment.enabled',
      value: 'true',
      description: 'Habilitar atribuição automática de tickets',
      category: 'system',
      dataType: 'boolean',
    },
    {
      key: 'system.ticket.auto.close.days',
      value: '7',
      description: 'Dias para fechar ticket resolvido automaticamente',
      category: 'system',
      dataType: 'number',
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const setting of settings) {
    const existing = await prisma.setting.findUnique({
      where: { key: setting.key },
    });

    if (!existing) {
      await prisma.setting.create({ data: setting });
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`✅ Created ${created} settings, skipped ${skipped} existing`);
}

// Run if called directly
if (require.main === module) {
  seedSettings()
    .then(() => {
      console.log('✅ Settings seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Settings seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
