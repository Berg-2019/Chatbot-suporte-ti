import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ===========================================================================
  // ROLES PADRÃO DO SISTEMA
  // ===========================================================================

  console.log('📝 Creating default system roles...');

  const roles = [
    {
      name: 'Administrador',
      description: 'Acesso total ao sistema',
      permissions: ['*'], // Wildcard para todas as permissões
      isSystem: true,
    },
    {
      name: 'Técnico N1',
      description: 'Atendimento básico - Primeiro nível',
      permissions: [
        'tickets:read',
        'tickets:write',
        'tickets:assign',
        'stock:read',
        'reports:read',
        'bot:messages',
      ],
      isSystem: true,
    },
    {
      name: 'Técnico N2',
      description: 'Suporte intermediário - Segundo nível',
      permissions: [
        'tickets:read',
        'tickets:write',
        'tickets:assign',
        'tickets:close',
        'stock:read',
        'stock:write',
        'reports:read',
        'reports:export',
        'bot:messages',
      ],
      isSystem: true,
    },
    {
      name: 'Técnico N3',
      description: 'Especialista - Terceiro nível',
      permissions: [
        'tickets:*',
        'stock:*',
        'reports:*',
        'users:read',
        'bot:*',
      ],
      isSystem: true,
    },
    {
      name: 'Estoquista',
      description: 'Gerenciamento de estoque e patrimônio',
      permissions: [
        'stock:*',
        'reservations:*',
        'tickets:read',
        'reports:read',
        'reports:export',
      ],
      isSystem: true,
    },
    {
      name: 'Visualizador',
      description: 'Apenas visualização de dados',
      permissions: [
        'tickets:read',
        'stock:read',
        'reports:read',
      ],
      isSystem: true,
    },
    {
      name: 'Supervisor',
      description: 'Supervisor de equipe',
      permissions: [
        'tickets:*',
        'stock:read',
        'stock:write',
        'reports:*',
        'users:read',
        'bot:config',
      ],
      isSystem: true,
    },
  ];

  for (const roleData of roles) {
    const existing = await prisma.customRole.findUnique({
      where: { name: roleData.name },
    });

    if (!existing) {
      await prisma.customRole.create({
        data: roleData,
      });
      console.log(`✅ Created role: ${roleData.name}`);
    } else {
      console.log(`⏭️  Role already exists: ${roleData.name}`);
    }
  }

  // ===========================================================================
  // CANNED RESPONSES PADRÃO
  // ===========================================================================

  console.log('\n💬 Creating default canned responses...');

  // Buscar um usuário admin para ser o criador
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!adminUser) {
    console.log('⚠️  No admin user found. Skipping canned responses seed.');
  } else {
    const cannedResponses = [
      {
        shortcode: 'saudacao',
        content: 'Olá! Sou {{agent_name}}, técnico do suporte. Como posso ajudá-lo hoje?',
        category: 'Geral',
        createdBy: adminUser.id,
      },
      {
        shortcode: 'aguarde',
        content: 'Por favor, aguarde alguns instantes enquanto verifico a situação do seu chamado.',
        category: 'Geral',
        createdBy: adminUser.id,
      },
      {
        shortcode: 'resolvido',
        content: 'Seu chamado #{{ticket_id}} foi resolvido! Se o problema persistir, não hesite em nos contatar novamente.',
        category: 'Geral',
        createdBy: adminUser.id,
      },
      {
        shortcode: 'reiniciar_pc',
        content:
          'Por favor, tente reiniciar o computador:\n' +
          '1. Feche todos os programas abertos\n' +
          '2. Clique em Iniciar > Desligar > Reiniciar\n' +
          '3. Aguarde o computador reiniciar completamente\n' +
          '4. Tente novamente após reiniciar',
        category: 'TI',
        createdBy: adminUser.id,
      },
      {
        shortcode: 'senha_wifi',
        content: 'A senha da rede Wi-Fi corporativa é: [INSERIR_SENHA_AQUI]',
        category: 'TI',
        createdBy: adminUser.id,
      },
      {
        shortcode: 'reset_senha',
        content:
          'Para redefinir sua senha:\n' +
          '1. Acesse o portal: [URL_PORTAL]\n' +
          '2. Clique em "Esqueci minha senha"\n' +
          '3. Digite seu e-mail corporativo\n' +
          '4. Siga as instruções enviadas por e-mail',
        category: 'TI',
        createdBy: adminUser.id,
      },
      {
        shortcode: 'impressora_offline',
        content:
          'Vamos verificar a impressora:\n' +
          '1. Confira se está ligada e conectada à rede\n' +
          '2. Verifique se há papel e toner\n' +
          '3. Reinicie a impressora (desligar e ligar)\n' +
          '4. Se o problema persistir, informarei um técnico',
        category: 'TI',
        createdBy: adminUser.id,
      },
      {
        shortcode: 'energia',
        content: 'Equipe elétrica foi notificada. Previsão de atendimento: {{current_time}}. Manteremos você informado.',
        category: 'Elétrica',
        createdBy: adminUser.id,
      },
      {
        shortcode: 'ar_condicionado',
        content: 'Problema no ar-condicionado registrado. Técnico será enviado em breve. Local: {{contact_sector}}',
        category: 'Elétrica',
        createdBy: adminUser.id,
      },
      {
        shortcode: 'fora_horario',
        content:
          'Obrigado por entrar em contato! 🕐\n\n' +
          'No momento estamos fora do horário de atendimento.\n' +
          'Nosso horário: Segunda a Sexta, 8h às 18h\n\n' +
          'Seu chamado foi registrado e será atendido em breve.',
        category: 'Geral',
        createdBy: adminUser.id,
      },
    ];

    for (const cannedData of cannedResponses) {
      const existing = await prisma.cannedResponse.findUnique({
        where: { shortcode: cannedData.shortcode },
      });

      if (!existing) {
        await prisma.cannedResponse.create({
          data: cannedData,
        });
        console.log(`✅ Created canned response: /${cannedData.shortcode}`);
      } else {
        console.log(`⏭️  Canned response already exists: /${cannedData.shortcode}`);
      }
    }
  }

  // ===========================================================================
  // KNOWLEDGE BASE - ARTIGOS INICIAIS
  // ===========================================================================

  console.log('\n📚 Creating initial knowledge base articles...');

  if (!adminUser) {
    console.log('⚠️  No admin user found. Skipping knowledge articles seed.');
  } else {
    const articles = [
      {
        title: 'Como redefinir senha do sistema',
        content: `# Redefinição de Senha

## Passo a Passo

1. Acesse o portal corporativo
2. Clique em "Esqueci minha senha"
3. Digite seu e-mail corporativo
4. Verifique sua caixa de entrada
5. Clique no link recebido
6. Crie uma nova senha (mínimo 8 caracteres, com letras e números)

## Problemas Comuns

- **Não recebi o e-mail**: Verifique a caixa de spam
- **Link expirado**: Solicite novamente
- **Senha não aceita**: Certifique-se de usar letras maiúsculas e números

## Ainda com problemas?

Entre em contato com o suporte técnico.`,
        category: 'Tutoriais',
        tags: ['senha', 'acesso', 'login'],
        isInternal: false,
        isPublic: true,
        authorId: adminUser.id,
      },
      {
        title: 'Procedimento de Escalonamento de Tickets',
        content: `# Escalonamento de Tickets

## Quando Escalonar

- Problema além da competência do nível atual
- SLA próximo do vencimento
- Cliente VIP ou situação crítica

## Níveis

### N1 → N2
- Problemas de rede complexos
- Configurações avançadas
- Erros recorrentes

### N2 → N3
- Problemas arquiteturais
- Desenvolvimento/Scripts
- Integrações com sistemas externos

## Como Escalonar

1. Adicione nota interna explicando o motivo
2. Documente tudo que já foi tentado
3. Marque o ticket com prioridade adequada
4. Notifique o técnico do próximo nível

## Importante

⚠️ Sempre documente as tentativas de resolução antes de escalonar!`,
        category: 'Procedimentos',
        tags: ['escalonamento', 'sla', 'processo'],
        isInternal: true,
        isPublic: false,
        authorId: adminUser.id,
      },
      {
        title: 'Troubleshooting - Impressora Não Imprime',
        content: `# Impressora Não Imprime

## Checklist Rápido

- [ ] Impressora está ligada?
- [ ] Cabo de rede conectado? (LED aceso?)
- [ ] Tem papel na bandeja?
- [ ] Nível de toner adequado?
- [ ] Fila de impressão travada?

## Passos de Resolução

### 1. Verificações Físicas
- Ligar/desligar impressora
- Verificar cabos
- Imprimir página de teste direto na impressora

### 2. Verificações de Rede
\`\`\`bash
ping IP_DA_IMPRESSORA
\`\`\`

### 3. Driver
- Reinstalar driver se necessário
- Verificar se é o driver correto para o modelo

### 4. Fila de Impressão
- Windows: Limpar fila em "Dispositivos e Impressoras"
- Reiniciar serviço de spooler

## Ainda não resolveu?

Escalonar para N2 ou registrar chamado para técnico presencial.`,
        category: 'Troubleshooting',
        tags: ['impressora', 'hardware', 'rede'],
        isInternal: true,
        isPublic: false,
        authorId: adminUser.id,
      },
    ];

    for (const articleData of articles) {
      const existing = await prisma.knowledgeArticle.findFirst({
        where: { title: articleData.title },
      });

      if (!existing) {
        await prisma.knowledgeArticle.create({
          data: articleData,
        });
        console.log(`✅ Created article: ${articleData.title}`);
      } else {
        console.log(`⏭️  Article already exists: ${articleData.title}`);
      }
    }
  }

  console.log('\n✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
