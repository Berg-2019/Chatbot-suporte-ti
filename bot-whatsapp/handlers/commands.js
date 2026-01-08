const database = require('../db/database');
const config = require('../config/config');
const { OllamaClient: ollamaClient } = require('../utils/ollama-fix');
const { sendAdminNotification, emailTemplates } = require('../config/email');

class CommandHandler {
  constructor() {
    this.awaitingData = new Map(); // Para armazenar usuários que estão fornecendo dados
    this.userSessions = new Map(); // Para rastrear sessões de usuários
  }

  async handleMessage(message, sendMessage, userPhone, isGrupoTecnico = false) {
    try {
      const text = message.body?.trim() || '';
      let user = await database.buscarUsuario(userPhone);
      
      // Criar usuário se não existir
      if (!user) {
        await database.criarOuAtualizarUsuario(userPhone);
        user = await database.buscarUsuario(userPhone);
      }

      // Verificar se o usuário é um root user e atualizar o papel se necessário
      if (config.whatsapp.rootNumbers.includes(userPhone) && user.role !== 'root') {
        await database.alterarRoleUsuario(userPhone, 'root');
        user = await database.buscarUsuario(userPhone);
      }

      // Verificar se o usuário tem acesso root temporário
      if (user.temporaryRootExpires && new Date() < new Date(user.temporaryRootExpires)) {
        user.role = 'root';
      } else if (user.temporaryRootExpires) {
        // Expirar o acesso root temporário
        await database.removerAcessoRootTemporario(userPhone);
        user.role = await database.buscarUsuario(userPhone).role;
      }

      // Se o usuário está fornecendo dados para uma OS ou peças
      if (this.awaitingData.has(userPhone)) {
        return await this.handleDataInput(text, sendMessage, userPhone);
      }

      // Processar comandos
      if (text.startsWith('!')) {
        return await this.processCommand(text, sendMessage, userPhone, user, isGrupoTecnico);
      }

      // Verificar se a mensagem começa com "chamado" para abrir automaticamente
      if (text.toLowerCase().startsWith('chamado')) {
        // Extrair o conteúdo após "chamado" para usar como descrição do problema
        const problema = text.substring(7).trim() || 'Chamado aberto automaticamente';
        return await this.createOrderFromProblem(problema, sendMessage, userPhone, user);
      }

      // Se não é um comando e não é do grupo técnico, processar com IA
      if (!isGrupoTecnico) {
        return await this.handleUserInteraction(text, sendMessage, userPhone, user);
      }

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      await sendMessage('❌ Ocorreu um erro interno. Tente novamente em alguns instantes.');
    }
  }

  async processCommand(text, sendMessage, userPhone, user, isGrupoTecnico = false) {
    const parts = text.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Verificação adicional para o comando !abrir
    if (command === '!abrir' || command === '!Abrir') {
      return await this.handleDados(sendMessage, userPhone, args);
    }

    const userRole = user?.role || 'user';

    switch (command) {
      // Comandos gerais
      case '!ajuda':
        return await this.handleAjuda(sendMessage, userRole);
      
      case '!status':
        return await this.handleStatus(args, sendMessage, userPhone);
      
      case '!cancelar':
        return await this.handleCancelar(args, sendMessage, userPhone);
      
      case '!abrir':
        return await this.handleDados(sendMessage, userPhone, args);

      // Comandos de técnicos
      case '!menu':
        return await this.handleMenu(sendMessage, userRole);
      
      case '!atendendo':
        return await this.handleAtendendo(args, sendMessage, userPhone, userRole);
      
      case '!prioridade':
        return await this.handlePrioridade(args, sendMessage, userRole);
      
      case '!setor':
        return await this.handleSetor(text, sendMessage, userRole);
      
      case '!mensagem':
        return await this.handleMensagem(text, sendMessage, userRole);
      
      case '!list':
        return await this.handleList(sendMessage, userRole);
      
      case '!finalizado':
        return await this.handleFinalizado(args, sendMessage, userRole);
      
      case '!adm':
        return await this.handleChamarAdmin(sendMessage, userRole);

      // Comandos de peças
      case '!listpeças':
        return await this.handleListPecas(args, sendMessage, userPhone, userRole);
      
      case '!pecas':
        return await this.handleVerPecas(sendMessage, userRole);
      
      case '!atender':
        return await this.handleAtenderPecas(args, sendMessage, userPhone, userRole);

      // Comandos administrativos
      case '!config':
        return await this.handleConfig(sendMessage, userRole);
      
      case '!listtc':
        return await this.handleListTecnicos(sendMessage, userRole);
      
      case '!listadm':
        return await this.handleListAdmins(sendMessage, userRole);
      
      case '!menss':
        return await this.handleAlterarSaudacao(text, sendMessage, userRole);
      
      case '!msfinal':
        return await this.handleAlterarMensagemFinal(text, sendMessage, userRole);
      
      case '!ping':
        return await this.handlePing(sendMessage, userRole);
      
      case '!tecnico':
        return await this.handlePromoverTecnico(text, sendMessage, userRole);
      
      case '!admin':
        return await this.handlePromoverAdmin(text, sendMessage, userRole);
      
      case '!almoxarifado':
        return await this.handlePromoverAlmoxarifado(text, sendMessage, userRole);
      
      case '!historico':
        return await this.handleHistorico(sendMessage, userRole);

      // Comandos do sistema
      case '!user':
        return await this.handleCriarUsuario(text, sendMessage, userPhone, userRole);
      
      case '!grafico':
        return await this.handleGrafico(sendMessage, userRole);
      
      case '!backup':
        return await this.handleBackup(sendMessage, userRole);
      
      case '!sistema':
        return await this.handleSistema(sendMessage, userRole);

      // Comandos de controle da IA
      case '!iaon':
        return await this.handleIAOn(sendMessage, userRole);
      
      case '!iaoff':
        return await this.handleIAOff(sendMessage, userRole);
      
      case '!iastatus':
        return await this.handleIAStatus(sendMessage, userRole);

      // Comando para promover usuário a root
      case '!root':
        return await this.handleMencionarRoot(sendMessage, userRole);

      // Comando para definir grupo técnico
      case '!tcgrupo':
        return await this.handleDefinirGrupoTecnico(sendMessage, userPhone, userRole, isGrupoTecnico);

      default:
        await sendMessage('❓ Comando não reconhecido. Digite !ajuda para ver os comandos disponíveis.');
    }
  }

  // Comandos Gerais
  async handleAjuda(sendMessage, userRole) {
    let helpText = config.messages.ajuda;
    
    if (userRole === 'user') {
      helpText = `
🤖 *COMANDOS DISPONÍVEIS*

*USUÁRIOS:*
• !ajuda - Lista de comandos
• !status [id] - Ver status da OS
• !cancelar [id] - Cancelar OS
• !abrir - Abrir um novo chamado

Para abrir um chamado, use !abrir, digite "chamado [descrição]" ou apenas descreva seu problema!
      `;
    }
    
    await sendMessage(helpText);
  }

  async handleStatus(args, sendMessage, userPhone) {
    if (args.length === 0) {
      return await sendMessage('❌ Use: !status [id da OS]');
    }

    const osId = args[0];
    const os = await database.buscarOS(osId);

    if (!os) {
      return await sendMessage(`❌ OS #${osId} não encontrada.`);
    }

    // Verificar se o usuário pode ver esta OS
    if (os.usuario_telefone !== userPhone) {
      const user = await database.buscarUsuario(userPhone);
      if (!user || !['tecnico', 'admin', 'root'].includes(user.role)) {
        return await sendMessage('❌ Você só pode consultar suas próprias OS.');
      }
    }

    const statusEmoji = {
      'aberta': '🔴',
      'em_andamento': '🟡',
      'finalizada': '🟢',
      'cancelada': '⚫'
    };

    const response = `
📋 *OS #${os.id}*
${statusEmoji[os.status]} Status: ${os.status.toUpperCase()}
👤 Usuário: ${os.usuario_nome}
📍 Local: ${os.local_atendimento || 'Não informado'}
💻 Equipamento: ${os.equipamento || 'Não informado'}
🔧 Técnico: ${os.tecnico_responsavel || 'Não atribuído'}
⚡ Prioridade: ${os.prioridade ? 'ALTA' : 'Normal'}
🏢 Setor: ${os.setor}
📅 Criada: ${new Date(os.created_at).toLocaleString('pt-BR')}
    `;

    await sendMessage(response);
  }

  async handleCancelar(args, sendMessage, userPhone) {
    if (args.length === 0) {
      return await sendMessage('❌ Use: !cancelar [id da OS]');
    }

    const osId = args[0];
    const os = await database.buscarOS(osId);

    if (!os) {
      return await sendMessage(`❌ OS #${osId} não encontrada.`);
    }

    if (os.usuario_telefone !== userPhone) {
      return await sendMessage('❌ Você só pode cancelar suas próprias OS.');
    }

    if (os.status === 'finalizada') {
      return await sendMessage('❌ Não é possível cancelar uma OS já finalizada.');
    }

    await database.atualizarStatusOS(osId, 'cancelada');
    await database.adicionarMensagemHistorico(osId, userPhone, 'OS cancelada pelo usuário', 'system');
    
    await sendMessage(`✅ OS #${osId} cancelada com sucesso.`);
  }

  async handleDados(sendMessage, userPhone, args) {
    // Se houver argumentos, significa que é para adicionar dados a uma OS existente
    if (args && args.length > 0) {
      const osId = args[0];
      // Verificar se a OS existe
      const os = await database.buscarOS(osId);
      if (!os) {
        return await sendMessage(`❌ OS #${osId} não encontrada.`);
      }
      
      // Verificar se o usuário tem permissão para adicionar dados
      const user = await database.buscarUsuario(userPhone);
      if (os.usuario_telefone !== userPhone && !['tecnico', 'admin', 'root'].includes(user?.role)) {
        return await sendMessage('❌ Você não tem permissão para adicionar dados a esta OS.');
      }
      
      // Iniciar processo de coleta de dados adicionais
      this.awaitingData.set(userPhone, { 
        step: 'dados_adicionais',
        osId: osId,
        type: 'additional_data'
      });
      
      return await sendMessage(`
📝 *ADICIONAR DADOS À OS #${osId}*

Por favor, forneça as informações adicionais:
      `);
    }
    
    // Se não houver argumentos, iniciar processo normal de criação de OS
    this.awaitingData.set(userPhone, { step: 'nome' });
    await sendMessage(`
📝 *COLETA DE DADOS PARA CHAMADO*

Por favor, forneça as seguintes informações:

1️⃣ Seu nome completo:
    `);
  }

  // Comandos de Técnicos
  async handleAtendendo(args, sendMessage, userPhone, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos.');
    }

    if (args.length === 0) {
      return await sendMessage('❌ Use: !atendendo [id da OS]');
    }

    const osId = args[0];
    const os = await database.buscarOS(osId);

    if (!os) {
      return await sendMessage(`❌ OS #${osId} não encontrada.`);
    }

    if (os.status !== 'aberta') {
      return await sendMessage(`❌ OS #${osId} não está disponível para atendimento.`);
    }

    const user = await database.buscarUsuario(userPhone);
    await database.atualizarStatusOS(osId, 'em_andamento', user.nome || userPhone);
    await database.adicionarMensagemHistorico(osId, userPhone, `Técnico assumiu o atendimento`, 'tecnico');

    await sendMessage(`✅ Você assumiu a OS #${osId}. Status alterado para EM ANDAMENTO.`);
  }

  async handleList(sendMessage, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos.');
    }

    const osAbertas = await database.listarOSAbertas();

    if (osAbertas.length === 0) {
      return await sendMessage('✅ Não há OS abertas no momento.');
    }

    let response = '📋 *ORDENS DE SERVIÇO ABERTAS*\n\n';
    
    osAbertas.forEach(os => {
      const prioridade = os.prioridade ? '⚡' : '';
      const status = os.status === 'aberta' ? '🔴' : '🟡';
      
      response += `${status}${prioridade} *OS #${os.id}*\n`;
      response += `👤 ${os.usuario_nome}\n`;
      response += `📍 ${os.local_atendimento || 'N/I'}\n`;
      response += `💻 ${os.equipamento || 'N/I'}\n`;
      response += `🔧 ${os.tecnico_responsavel || 'Não atribuído'}\n`;
      response += `📅 ${new Date(os.created_at).toLocaleString('pt-BR')}\n\n`;
    });

    await sendMessage(response);
  }

  // Novo tratamento de interação com usuário usando IA
  async handleUserInteraction(text, sendMessage, userPhone, user) {
    try {
      // Verificar se é a primeira interação do usuário
      const isFirstInteraction = !this.userSessions.has(userPhone);
      
      if (isFirstInteraction) {
        // Marcar que o usuário já interagiu
        this.userSessions.set(userPhone, {
          firstContact: new Date(),
          messageCount: 1
        });

        // Gerar mensagem de boas-vindas personalizada
        const welcomeMessage = await ollamaClient.generateWelcomeMessage(user?.nome || 'usuário');
        await sendMessage(welcomeMessage);
        return;
      }

      // Atualizar contador de mensagens
      const session = this.userSessions.get(userPhone);
      session.messageCount++;
      this.userSessions.set(userPhone, session);

      // Analisar a mensagem do usuário com IA
      const messageType = await ollamaClient.analyzeUserMessage(text);

      switch (messageType) {
        case 'SAUDACAO':
          await sendMessage(`👋 Olá! Como posso ajudá-lo hoje?

🔧 Descreva seu problema técnico para abrir um chamado
📋 Use !ajuda para ver todos os comandos disponíveis`);
          break;

        case 'DUVIDA':
          await sendMessage(`❓ Entendi que você tem uma dúvida sobre o sistema.

📋 Use !ajuda para ver todos os comandos disponíveis
🔧 Para abrir um chamado, descreva seu problema técnico
💬 Posso ajudar com questões de TI, impressoras, computadores, rede, etc.`);
          break;

        case 'PROBLEMA':
          // Criar OS para problemas técnicos
          await this.createOrderFromProblem(text, sendMessage, userPhone, user);
          break;

        default:
          await sendMessage(`💬 Entendi sua mensagem.

🔧 Se você tem um problema técnico, descreva-o detalhadamente
📋 Use !ajuda para ver todos os comandos disponíveis
💡 Posso ajudar com: computadores, impressoras, rede, sistemas, etc.`);
          break;
      }

    } catch (error) {
      console.error('Erro na interação com usuário:', error);
      await sendMessage('❌ Ocorreu um erro. Tente novamente ou use !ajuda para ver os comandos disponíveis.');
    }
  }

  // Criar OS a partir de problema identificado pela IA
  async createOrderFromProblem(text, sendMessage, userPhone, user) {
    try {
      // Analisar o problema com IA
      const analiseIA = await ollamaClient.analyzeProblem(text);

      // Criar OS
      const osData = {
        usuario_nome: user?.nome || 'Usuário',
        usuario_telefone: userPhone,
        problema: text,
        setor: 'TI'
      };

      const osId = await database.criarOS(osData);
      await database.adicionarMensagemHistorico(osId, userPhone, text, 'user');

      let response = `
✅ *CHAMADO CRIADO COM SUCESSO*

🎫 OS #${osId}
📝 Problema: ${text}
📅 Criado em: ${new Date().toLocaleString('pt-BR')}

🤖 *Análise Automática:*
📂 Categoria: ${analiseIA.categoria}
⚡ Prioridade: ${analiseIA.prioridade}
🔍 Análise: ${analiseIA.analise}

💡 *Próximos passos:*
• Use !abrir para adicionar mais informações
• Use !status ${osId} para consultar o andamento
• Nossa equipe técnica foi notificada
      `;

      await sendMessage(response);

      // Notificar grupo técnico
      await this.notifyTechnicalGroup(`
🆕 *NOVA OS CRIADA*

🎫 OS #${osId}
👤 Usuário: ${user?.nome || 'Usuário'}
📞 Telefone: ${userPhone}
📝 Problema: ${text}

🤖 *Análise IA:*
📂 ${analiseIA.categoria} | ⚡ ${analiseIA.prioridade}
🔍 ${analiseIA.analise}

📅 Criado em: ${new Date().toLocaleString('pt-BR')}
      `);

      // Enviar notificação por e-mail para administradores
      if (config.email.adminEmails.length > 0) {
        try {
          // Buscar OS completa do banco
          const osCompleta = await database.buscarOS(osId);
          
          // Enviar notificação por e-mail
          const emailData = emailTemplates.newOrder(osCompleta);
          await sendAdminNotification(emailData.subject, emailData.text, emailData.html);
        } catch (emailError) {
          console.error('Erro ao enviar notificação por e-mail:', emailError);
        }
      }

      return { osId, created: true };

    } catch (error) {
      console.error('Erro ao criar OS:', error);
      await sendMessage('❌ Erro ao criar chamado. Tente novamente ou entre em contato com o suporte.');
    }
  }

  // Tratamento de entrada de dados
  async handleDataInput(text, sendMessage, userPhone) {
    const userData = this.awaitingData.get(userPhone);
    
    // Verificar se é para autenticação de usuário root
    if (userData.step === 'login') {
      userData.login = text;
      userData.step = 'password';
      await sendMessage('🔐 *AUTENTICAÇÃO REQUERIDA*\n\nPor favor, informe a senha de acesso à interface web:');
      return;
    }
    
    if (userData.step === 'password') {
      // Verificar credenciais
      const systemUser = await database.buscarUsuarioSistema(userData.login);
      if (systemUser && systemUser.password === text) {
        // Credenciais válidas, pedir número do telefone para promover a root
        userData.step = 'telefone_root';
        await sendMessage('✅ Autenticado com sucesso!\n\nAgora informe o número do telefone do usuário que deseja promover a root:');
      } else {
        // Credenciais inválidas
        this.awaitingData.delete(userPhone);
        await sendMessage('❌ Credenciais inválidas. Comando cancelado.');
      }
      return;
    }
    
    if (userData.step === 'telefone_root') {
      // Promover usuário a root
      await database.alterarRoleUsuario(text, 'root');
      this.awaitingData.delete(userPhone);
      await sendMessage(`✅ Usuário ${text} promovido a root.`);
      return;
    }
    
    if (userData.type === 'parts_request') {
      // Processar solicitação de peças
      userData.step = 'observacoes';
      userData.pecas = text;
      await sendMessage('📝 Observações adicionais (ou digite "não" se não hiver):');
      return;
    }
    
    if (userData.type === 'additional_data') {
      // Adicionar dados a uma OS existente
      const osId = userData.osId;
      await database.adicionarMensagemHistorico(osId, userPhone, text, 'user');
      
      this.awaitingData.delete(userPhone);
      
      await sendMessage(`✅ Informações adicionais adicionadas à OS #${osId} com sucesso!`);
      
      // Notificar técnico responsável se houver
      const os = await database.buscarOS(osId);
      if (os.tecnico_responsavel) {
        // Aqui você pode implementar a notificação ao técnico se necessário
      }
      
      return;
    }

    switch (userData.step) {
      case 'nome':
        userData.nome = text;
        userData.step = 'local';
        await sendMessage('2️⃣ Local do atendimento (ex: Recepção, Sala 101):');
        break;
        
      case 'local':
        userData.local = text;
        userData.step = 'equipamento';
        await sendMessage('3️⃣ Equipamento com problema (ex: Impressora HP, Computador Dell):');
        break;
        
      case 'equipamento':
        userData.equipamento = text;
        userData.step = 'anydesk';
        await sendMessage('4️⃣ ID do AnyDesk (se aplicável, ou digite "não"):');
        break;
        
      case 'anydesk':
        userData.anydesk = text === 'não' ? null : text;
        userData.step = 'problema';
        await sendMessage('5️⃣ Descreva detalhadamente o problema:');
        break;
        
      case 'problema':
        userData.problema = text;
        
        // Criar OS com todos os dados
        const osData = {
          usuario_nome: userData.nome,
          usuario_telefone: userPhone,
          local_atendimento: userData.local,
          equipamento: userData.equipamento,
          anydesk: userData.anydesk,
          problema: userData.problema,
          setor: 'TI'
        };

        const osId = await database.criarOS(osData);
        await database.adicionarMensagemHistorico(osId, userPhone, userData.problema, 'user');
        
        // Atualizar nome do usuário
        await database.criarOuAtualizarUsuario(userPhone, userData.nome);

        this.awaitingData.delete(userPhone);

        const response = `✅ *CHAMADO CRIADO COM SUCESSO*

🎫 *OS #${osId}*
👤 Usuário: ${userData.nome}
📍 Local: ${userData.local}
💻 Equipamento: ${userData.equipamento}
${userData.anydesk ? `🖥️ AnyDesk: ${userData.anydesk}\n` : ''}📝 Problema: ${userData.problema}
📅 Criado em: ${new Date().toLocaleString('pt-BR')}

Seu chamado foi registrado e será atendido em breve!`;

        await sendMessage(response);

        // Notificar grupo técnico
        await this.notifyTechnicalGroup(`🆕 *NOVA OS CRIADA*

🎫 OS #${osId}
👤 Usuário: ${userData.nome}
📞 Telefone: ${userPhone}
📍 Local: ${userData.local}
💻 Equipamento: ${userData.equipamento}
${userData.anydesk ? `🖥️ AnyDesk: ${userData.anydesk}\n` : ''}📝 Problema: ${userData.problema}
📅 Criado em: ${new Date().toLocaleString('pt-BR')}`);
        
        // Enviar notificação por e-mail para administradores
        if (config.email.adminEmails.length > 0) {
          try {
            // Buscar OS completa do banco
            const osCompleta = await database.buscarOS(osId);
            
            // Enviar notificação por e-mail
            const emailData = emailTemplates.newOrder(osCompleta);
            await sendAdminNotification(emailData.subject, emailData.text, emailData.html);
          } catch (emailError) {
            console.error('Erro ao enviar notificação por e-mail:', emailError);
          }
        }
        break;

      case 'observacoes':
        // Finalizar solicitação de peças
        const observacoes = text === 'não' ? null : text;
        const user = await database.buscarUsuario(userPhone);
        
        const solicitacaoData = {
          ordem_id: userData.osId,
          tecnico_telefone: userPhone,
          tecnico_nome: user?.nome || 'Técnico',
          pecas_solicitadas: userData.pecas,
          observacoes: observacoes
        };

        const solicitacaoId = await database.criarSolicitacaoPecas(solicitacaoData);
        
        this.awaitingData.delete(userPhone);

        const responsePecas = `✅ *SOLICITAÇÃO DE PEÇAS CRIADA*

📦 Solicitação #${solicitacaoId}
📋 OS #${userData.osId}
👨‍🔧 Técnico: ${user?.nome || 'Técnico'}
📦 Peças solicitadas:
${userData.pecas}
${observacoes ? `📝 Observações: ${observacoes}\n` : ''}
📅 Solicitado em: ${new Date().toLocaleString('pt-BR')}

A solicitação foi enviada para o almoxarifado.`;

        await sendMessage(responsePecas);

        // Notificar grupo técnico
        await this.notifyTechnicalGroup(`📦 *NOVA SOLICITAÇÃO DE PEÇAS*

📦 Solicitação #${solicitacaoId}
📋 OS #${userData.osId}
👨‍🔧 Técnico: ${user?.nome || 'Técnico'}
📦 Peças: ${userData.pecas}
${observacoes ? `📝 Obs: ${observacoes}` : ''}`);
        break;
    }
  }

  // Métodos auxiliares
  async notifyTechnicalGroup(message) {
    const bot = require('../bot');
    await bot.notifyTechnicalGroup(message);
  }

  async sendDirectMessage(jid, message) {
    const bot = require('../bot');
    await bot.sendMessage(jid, message);
  }

  // Métodos auxiliares para outros comandos...
  async handlePing(sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    const startTime = Date.now();
    const stats = await database.obterEstatisticas();
    const endTime = Date.now();

    const response = `
🏓 *PING - STATUS DO SISTEMA*

⏱️ Tempo de resposta: ${endTime - startTime}ms
📊 Estatísticas:
${Object.entries(stats.porStatus || {}).map(([status, total]) => `• ${status}: ${total}`).join('\n')}

✅ Sistema operacional
    `;

    await sendMessage(response);
  }

  async handlePrioridade(args, sendMessage, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos.');
    }

    if (args.length === 0) {
      return await sendMessage('❌ Use: !prioridade [id da OS]');
    }

    const osId = args[0];
    const os = await database.buscarOS(osId);

    if (!os) {
      return await sendMessage(`❌ OS #${osId} não encontrada.`);
    }

    await database.definirPrioridadeOS(osId, 1);
    await sendMessage(`⚡ OS #${osId} marcada como ALTA PRIORIDADE!`);
  }

  async handleSetor(text, sendMessage, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos.');
    }

    const match = text.match(/!setor (\d+)=(.+)/);
    if (!match) {
      return await sendMessage('❌ Use: !setor [id]=[setor]');
    }

    const osId = match[1];
    const setor = match[2].trim();

    const os = await database.buscarOS(osId);
    if (!os) {
      return await sendMessage(`❌ OS #${osId} não encontrada.`);
    }

    await database.alterarSetorOS(osId, setor);
    await sendMessage(`✅ Setor da OS #${osId} alterado para: ${setor}`);
  }

  async handleMensagem(text, sendMessage, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos.');
    }

    const match = text.match(/!mensagem (\d+)=(.+)/);
    if (!match) {
      return await sendMessage('❌ Use: !mensagem [id]=[texto]');
    }

    const osId = match[1];
    const mensagem = match[2].trim();

    const os = await database.buscarOS(osId);
    if (!os) {
      return await sendMessage(`❌ OS #${osId} não encontrada.`);
    }

    // Adicionar mensagem ao histórico
    await database.adicionarMensagemHistorico(osId, '', mensagem, 'tecnico');

    // Enviar mensagem para o usuário
    const userJid = `${os.usuario_telefone}@s.whatsapp.net`;
    await this.sendDirectMessage(userJid, `
📨 *MENSAGEM DO TÉCNICO - OS #${osId}*

${mensagem}

Para responder, use !status ${osId}
    `);

    await sendMessage(`✅ Mensagem enviada para o usuário da OS #${osId}`);
  }

  async handleChamarAdmin(sendMessage, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos.');
    }

    // Notificar administradores
    const admins = await database.listarUsuariosPorRole('admin');
    const roots = await database.listarUsuariosPorRole('root');
    
    const allAdmins = [...admins, ...roots];
    
    for (const admin of allAdmins) {
      const adminJid = `${admin.telefone}@s.whatsapp.net`;
      await this.sendDirectMessage(adminJid, `
🚨 *CHAMADA DE ADMINISTRADOR*

Um técnico está solicitando ajuda administrativa.
Telefone: ${userRole}
Horário: ${new Date().toLocaleString('pt-BR')}
      `);
    }

    await sendMessage('✅ Administradores notificados!');
  }

  async handleConfig(sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    const config = `
⚙️ *MENU DE CONFIGURAÇÕES*

• !listtc - Listar técnicos
• !listadm - Listar administradores  
• !menss=[texto] - Alterar saudação
• !msfinal=[texto] - Alterar mensagem final
• !tecnico=[num] - Promover a técnico
• !admin=[num] - Promover a administrador
• !almoxarifado=[num] - Promover a almoxarifado
• !ping - Status do sistema
• !historico - Ver histórico
    `;

    await sendMessage(config);
  }

  async handleListTecnicos(sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    const tecnicos = await database.listarUsuariosPorRole('tecnico');
    
    if (tecnicos.length === 0) {
      return await sendMessage('📋 Nenhum técnico cadastrado.');
    }

    let response = '👨‍🔧 *TÉCNICOS CADASTRADOS*\n\n';
    tecnicos.forEach(tecnico => {
      response += `📞 ${tecnico.telefone}\n`;
      response += `👤 ${tecnico.nome || 'Nome não informado'}\n`;
      response += `📅 Desde: ${new Date(tecnico.created_at).toLocaleDateString('pt-BR')}\n\n`;
    });

    await sendMessage(response);
  }

  async handleListAdmins(sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    const admins = await database.listarUsuariosPorRole('admin');
    const roots = await database.listarUsuariosPorRole('root');
    
    let response = '👑 *ADMINISTRADORES*\n\n';
    
    if (roots.length > 0) {
      response += '*ROOT:*\n';
      roots.forEach(root => {
        response += `📞 ${root.telefone} - ${root.nome || 'Root User'}\n`;
      });
      response += '\n';
    }
    
    if (admins.length > 0) {
      response += '*ADMINS:*\n';
      admins.forEach(admin => {
        response += `📞 ${admin.telefone} - ${admin.nome || 'Admin'}\n`;
      });
    }

    if (roots.length === 0 && admins.length === 0) {
      response = '📋 Nenhum administrador cadastrado.';
    }

    await sendMessage(response);
  }


  async handleHistorico(sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    const stats = await database.obterEstatisticas();
    
    const response = `
📊 *HISTÓRICO E ESTATÍSTICAS*

*OS por Status:*
${Object.entries(stats.porStatus || {}).map(([status, total]) => `• ${status}: ${total}`).join('\n')}

*OS por Técnico:*
${Object.entries(stats.porTecnico || {}).map(([tecnico, total]) => `• ${tecnico}: ${total}`).join('\n')}

*Peças por Status:*
${Object.entries(stats.pecasPorStatus || {}).map(([status, total]) => `• ${status}: ${total}`).join('\n')}
    `;

    await sendMessage(response);
  }

  async handleAlterarSaudacao(text, sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    const match = text.match(/!menss=(.+)/);
    if (!match) {
      return await sendMessage('❌ Use: !menss=[nova mensagem de saudação]');
    }

    const novaSaudacao = match[1].trim();
    await database.salvarConfiguracao('mensagem_saudacao', novaSaudacao);
    
    await sendMessage(`✅ Mensagem de saudação alterada para:\n${novaSaudacao}`);
  }

  async handleAlterarMensagemFinal(text, sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    const match = text.match(/!msfinal=(.+)/);
    if (!match) {
      return await sendMessage('❌ Use: !msfinal=[nova mensagem final]');
    }

    const novaMensagemFinal = match[1].trim();
    await database.salvarConfiguracao('mensagem_final', novaMensagemFinal);
    
    await sendMessage(`✅ Mensagem final alterada para:\n${novaMensagemFinal}`);
  }

  // Comandos de Peças
  async handleListPecas(args, sendMessage, userPhone, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos.');
    }

    if (args.length === 0) {
      return await sendMessage('❌ Use: !listpeças [id da OS]');
    }

    const osId = args[0];
    const os = await database.buscarOS(osId);

    if (!os) {
      return await sendMessage(`❌ OS #${osId} não encontrada.`);
    }

    // Iniciar processo de coleta de peças
    this.awaitingData.set(userPhone, { 
      step: 'pecas', 
      osId: osId,
      type: 'parts_request'
    });

    await sendMessage(`
📦 *SOLICITAÇÃO DE PEÇAS - OS #${osId}*

Liste as peças necessárias (uma por linha):
Exemplo:
- Mouse óptico USB
- Cabo de rede CAT5e 2m
- Toner HP CF217A

Digite as peças necessárias:
    `);
  }

  async handleVerPecas(sendMessage, userRole) {
    if (!['almoxarifado', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para almoxarifado.');
    }

    const solicitacoes = await database.listarSolicitacoesPecas('pendente');

    if (solicitacoes.length === 0) {
      return await sendMessage('✅ Não há solicitações de peças pendentes.');
    }

    let response = '📦 *SOLICITAÇÕES DE PEÇAS PENDENTES*\n\n';
    
    solicitacoes.forEach(sol => {
      response += `🎫 *Solicitação #${sol.id}*\n`;
      response += `📋 OS #${sol.ordem_id} - ${sol.usuario_nome}\n`;
      response += `👨‍🔧 Técnico: ${sol.tecnico_nome}\n`;
      response += `📍 Local: ${sol.local_atendimento || 'N/I'}\n`;
      response += `💻 Equipamento: ${sol.equipamento || 'N/I'}\n`;
      response += `📦 Peças:\n${sol.pecas_solicitadas}\n`;
      if (sol.observacoes) {
        response += `📝 Obs: ${sol.observacoes}\n`;
      }
      response += `📅 Solicitado em: ${new Date(sol.created_at).toLocaleString('pt-BR')}\n\n`;
    });

    response += 'Para atender uma solicitação, use: !atender [id]';

    await sendMessage(response);
  }

  async handleAtenderPecas(args, sendMessage, userPhone, userRole) {
    if (!['almoxarifado', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para almoxarifado.');
    }

    if (args.length === 0) {
      return await sendMessage('❌ Use: !atender [id da solicitação]');
    }

    const solicitacaoId = args[0];
    const solicitacao = await database.buscarSolicitacaoPecas(solicitacaoId);

    if (!solicitacao) {
      return await sendMessage(`❌ Solicitação #${solicitacaoId} não encontrada.`);
    }

    const user = await database.buscarUsuario(userPhone);
    await database.atualizarStatusSolicitacaoPecas(solicitacaoId, 'atendida', user?.nome || userPhone);

    await sendMessage(`✅ Solicitação #${solicitacaoId} marcada como atendida!`);

    // Notificar técnico responsável
    const tecnicoJid = `${solicitacao.tecnico_telefone}@s.whatsapp.net`;
    await this.sendDirectMessage(tecnicoJid, `
✅ *PEÇAS DISPONIBILIZADAS*

📦 Solicitação #${solicitacaoId}
📋 OS #${solicitacao.ordem_id}
👨‍🔧 Técnico: ${solicitacao.tecnico_nome}
📦 Peças: ${solicitacao.pecas_solicitadas}
👤 Atendido por: ${user?.nome || userPhone}

As peças estão disponíveis para retirada no almoxarifado.
    `);

    // Notificar grupo técnico
    await this.notifyTechnicalGroup(`
✅ *PEÇAS DISPONIBILIZADAS*

📦 Solicitação #${solicitacaoId} - OS #${solicitacao.ordem_id}
👨‍🔧 Técnico: ${solicitacao.tecnico_nome}
👤 Atendido por: ${user?.nome || userPhone}
📦 Peças disponíveis para retirada
    `);
  }

  // Implementar outros métodos conforme necessário...
  async handleMenu(sendMessage, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos.');
    }

    const menu = `
🔧 *MENU TÉCNICO*

• !atendendo [id] - Assumir OS
• !prioridade [id] - Marcar como prioritário
• !setor [id]=[setor] - Alterar setor
• !mensagem [id]=[texto] - Enviar mensagem
• !list - Listar OS abertas
• !finalizado [id] - Finalizar OS
• !listpeças [id] - Solicitar peças para OS
• !adm - Chamar administrador
    `;

    await sendMessage(menu);
  }

  async handleFinalizado(args, sendMessage, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos.');
    }

    if (args.length === 0) {
      return await sendMessage('❌ Use: !finalizado [id da OS]');
    }

    const osId = args[0];
    const os = await database.buscarOS(osId);

    if (!os) {
      return await sendMessage(`❌ OS #${osId} não encontrada.`);
    }

    await database.atualizarStatusOS(osId, 'finalizada');
    await database.adicionarMensagemHistorico(osId, '', 'OS finalizada pelo técnico', 'system');

    await sendMessage(`✅ OS #${osId} finalizada com sucesso!`);

    // Notificar grupo técnico
    await this.notifyTechnicalGroup(`
✅ *OS FINALIZADA*

🎫 OS #${osId}
👤 Cliente: ${os.usuario_nome}
📝 Problema: ${os.problema}
🔧 Finalizada pelo técnico
    `);
    
    // Enviar notificação por e-mail para administradores
    if (config.email.adminEmails.length > 0) {
      try {
        // Buscar OS completa do banco (com dados atualizados)
        const osCompleta = await database.buscarOS(osId);
        
        // Enviar notificação por e-mail
        const emailData = emailTemplates.orderCompleted(osCompleta);
        await sendAdminNotification(emailData.subject, emailData.text, emailData.html);
      } catch (emailError) {
        console.error('Erro ao enviar notificação de OS finalizada por e-mail:', emailError);
      }
    }
  }

  async handlePromoverAlmoxarifado(text, sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    const match = text.match(/!almoxarifado=(.+)/);
    if (!match) {
      return await sendMessage('❌ Use: !almoxarifado=[número do telefone]');
    }

    const telefone = match[1].trim();
    await database.alterarRoleUsuario(telefone, 'almoxarifado');
    
    await sendMessage(`✅ Usuário ${telefone} promovido a almoxarifado.`);
  }

  // Comandos do Sistema
  async handleCriarUsuario(text, sendMessage, userPhone, userRole) {
    if (!['root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para usuários root.');
    }

    const match = text.match(/!user\s+(.+)\s+(.+)/);
    if (!match) {
      return await sendMessage('❌ Use: !user [username] [password]');
    }

    const [, username, password] = match;

    try {
      const userData = {
        username: username.trim(),
        password: password.trim(),
        telefone: userPhone,
        role: 'admin',
        created_by: userPhone
      };

      await database.criarUsuarioSistema(userData);
      
      await sendMessage(`✅ Usuário de sistema criado com sucesso!
      
👤 Username: ${username}
🔑 Password: ${password}
🌐 Acesso: Interface web de configurações

O usuário pode acessar as configurações do sistema através da interface web.`);

    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        await sendMessage('❌ Nome de usuário já existe. Escolha outro nome.');
      } else {
        await sendMessage('❌ Erro ao criar usuário. Tente novamente.');
      }
    }
  }

  async handleGrafico(sendMessage, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos e administradores.');
    }

    try {
      const stats = await database.obterEstatisticasGraficos();
      
      let response = '📊 *ESTATÍSTICAS DO SISTEMA*\n\n';
      
      // OS por mês
      if (stats.osPorMes && stats.osPorMes.length > 0) {
        response += '📈 *OS por Mês (Últimos 12 meses):*\n';
        stats.osPorMes.forEach(item => {
          const [ano, mes] = item.mes.split('-');
          const mesNome = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
          response += `• ${mesNome}: ${item.total} (${item.finalizadas} finalizadas)\n`;
        });
        response += '\n';
      }

      // OS por técnico
      if (stats.osPorTecnico && stats.osPorTecnico.length > 0) {
        response += '👨‍🔧 *OS por Técnico (Últimos 30 dias):*\n';
        stats.osPorTecnico.forEach(item => {
          const eficiencia = item.total > 0 ? Math.round((item.finalizadas / item.total) * 100) : 0;
          response += `• ${item.tecnico_responsavel}: ${item.total} OS (${eficiencia}% finalizadas)\n`;
        });
        response += '\n';
      }

      // Peças por status
      if (stats.pecasPorStatus && stats.pecasPorStatus.length > 0) {
        response += '📦 *Solicitações de Peças (Últimos 30 dias):*\n';
        stats.pecasPorStatus.forEach(item => {
          const statusEmoji = {
            'pendente': '🟡',
            'em_separacao': '🔵',
            'atendida': '🟢',
            'cancelada': '🔴'
          };
          response += `${statusEmoji[item.status] || '⚪'} ${item.status}: ${item.total}\n`;
        });
        response += '\n';
      }

      // Tempo médio de resolução
      if (stats.tempoMedioResolucao > 0) {
        const horas = Math.floor(stats.tempoMedioResolucao);
        const minutos = Math.round((stats.tempoMedioResolucao - horas) * 60);
        response += `⏱️ *Tempo Médio de Resolução:* ${horas}h ${minutos}min\n\n`;
      }

      response += '🌐 Para gráficos detalhados, acesse a interface web do sistema.';

      await sendMessage(response);

    } catch (error) {
      console.error('Erro ao gerar estatísticas:', error);
      await sendMessage('❌ Erro ao gerar estatísticas. Tente novamente.');
    }
  }

  async handleBackup(sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    try {
      const fs = require('fs');
      const path = require('path');
      
      // Criar diretório de backup se não existir
      const backupDir = './backups';
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup_${timestamp}.db`;
      const backupPath = path.join(backupDir, backupName);
      
      // Copiar arquivo do banco de dados
      fs.copyFileSync('./db/atendimento.db', backupPath);
      
      // Obter tamanho do arquivo
      const stats = fs.statSync(backupPath);
      const fileSizeInBytes = stats.size;
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);

      // Registrar backup no banco
      await database.criarRegistroBackup({
        backup_name: backupName,
        backup_path: backupPath,
        backup_size: fileSizeInBytes,
        backup_type: 'manual',
        status: 'completed'
      });

      await sendMessage(`✅ *BACKUP CRIADO COM SUCESSO*

📁 Nome: ${backupName}
📍 Local: ${backupPath}
📊 Tamanho: ${fileSizeInMB} MB
📅 Data: ${new Date().toLocaleString('pt-BR')}

O backup foi salvo com sucesso e pode ser usado para restaurar o sistema.`);

    } catch (error) {
      console.error('Erro ao criar backup:', error);
      await sendMessage('❌ Erro ao criar backup. Verifique as permissões do sistema.');
    }
  }

  async handleSistema(sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    try {
      const os = require('os');
      const fs = require('fs');
      
      // Informações do sistema
      const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
      const usedMemory = (totalMemory - freeMemory).toFixed(2);
      
      // Informações do processo Node.js
      const processMemory = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
      const uptime = Math.floor(process.uptime() / 3600);
      
      // Tamanho do banco de dados
      let dbSize = 0;
      try {
        const dbStats = fs.statSync('./db/atendimento.db');
        dbSize = (dbStats.size / 1024 / 1024).toFixed(2);
      } catch (e) {
        dbSize = 'N/A';
      }

      // Status da IA
      const iaStatus = ollamaClient.getStatus();

      // Estatísticas do banco
      const stats = await database.obterEstatisticas();
      const totalOS = Object.values(stats.porStatus || {}).reduce((a, b) => a + b, 0);
      const totalPecas = Object.values(stats.pecasPorStatus || {}).reduce((a, b) => a + b, 0);

      const response = `🖥️ *INFORMAÇÕES DO SISTEMA*

💾 *Memória:*
• Total: ${totalMemory} GB
• Usada: ${usedMemory} GB
• Livre: ${freeMemory} GB
• Bot: ${processMemory} MB

⏱️ *Tempo Ativo:* ${uptime} horas

🤖 *IA (Ollama):*
• Status: ${iaStatus.available ? '✅ Conectada' : '❌ Desconectada'}
• URL: ${iaStatus.baseUrl}
• Modelo: ${iaStatus.model}

🗄️ *Banco de Dados:*
• Tamanho: ${dbSize} MB
• Total OS: ${totalOS}
• Total Peças: ${totalPecas}

📊 *OS por Status:*
${Object.entries(stats.porStatus || {}).map(([status, total]) => `• ${status}: ${total}`).join('\n')}

🌐 Para configurações avançadas, acesse a interface web do sistema.`;

      await sendMessage(response);

    } catch (error) {
      console.error('Erro ao obter informações do sistema:', error);
      await sendMessage('❌ Erro ao obter informações do sistema.');
    }
  }

  // Comandos de controle da IA
  async handleIAOn(sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    try {
      // Salvar configuração no banco
      await database.salvarConfiguracao('ollama_enabled', 'true');
      
      // Reativar conexão
      await ollamaClient.checkConnection();
      
      const status = ollamaClient.getStatus();
      
      if (status.available) {
        await sendMessage(`✅ *IA ATIVADA COM SUCESSO*

🤖 Status: Conectada
🔗 URL: ${status.baseUrl}
📦 Modelo: ${status.model}

A IA agora analisará automaticamente as mensagens dos usuários.`);
      } else {
        await sendMessage(`⚠️ *IA ATIVADA MAS NÃO CONECTADA*

❌ Ollama não está disponível
🔗 URL: ${status.baseUrl}
📦 Modelo: ${status.model}

Verifique se o Ollama está rodando: \`ollama serve\``);
      }

    } catch (error) {
      console.error('Erro ao ativar IA:', error);
      await sendMessage('❌ Erro ao ativar IA. Verifique se o Ollama está instalado e rodando.');
    }
  }

  async handleIAOff(sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    try {
      // Salvar configuração no banco
      await database.salvarConfiguracao('ollama_enabled', 'false');
      
      await sendMessage(`❌ *IA DESATIVADA*

🤖 Status: Desconectada
📝 Modo: Fallback ativo

O bot continuará funcionando normalmente, mas sem análise inteligente de mensagens.
Para reativar, use: !iaon`);

    } catch (error) {
      console.error('Erro ao desativar IA:', error);
      await sendMessage('❌ Erro ao desativar IA.');
    }
  }

  async handleIAStatus(sendMessage, userRole) {
    if (!['tecnico', 'admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para técnicos e administradores.');
    }

    try {
      const status = ollamaClient.getStatus();
      const isEnabled = await database.buscarConfiguracao('ollama_enabled') !== 'false';
      
      let response = `🤖 *STATUS DA IA (OLLAMA)*\n\n`;
      
      response += `⚙️ *Configuração:*\n`;
      response += `• Habilitada: ${isEnabled ? '✅ Sim' : '❌ Não'}\n`;
      response += `• URL: ${status.baseUrl}\n`;
      response += `• Modelo: ${status.model}\n\n`;
      
      response += `🔗 *Conexão:*\n`;
      response += `• Status: ${status.available ? '✅ Conectada' : '❌ Desconectada'}\n\n`;
      
      if (status.available) {
        response += `✅ *IA Funcionando Normalmente*\n`;
        response += `• Análise automática de mensagens ativa\n`;
        response += `• Classificação inteligente funcionando\n`;
        response += `• Primeira interação personalizada ativa\n\n`;
      } else {
        response += `⚠️ *IA em Modo Fallback*\n`;
        response += `• Bot funciona sem análise inteligente\n`;
        response += `• Primeira mensagem cria OS automaticamente\n`;
        response += `• Para ativar: verifique se Ollama está rodando\n\n`;
      }
      
      response += `🔧 *Comandos de Controle:*\n`;
      response += `• !iaon - Ativar IA\n`;
      response += `• !iaoff - Desativar IA\n`;
      response += `• !iastatus - Ver este status`;

      await sendMessage(response);

    } catch (error) {
      console.error('Erro ao obter status da IA:', error);
      await sendMessage('❌ Erro ao obter status da IA.');
    }
  }

  // Comando para mencionar usuário root
  async handleMencionarRoot(sendMessage, userRole) {
    try {
      const rootUser = await database.buscarUsuarioRootPrincipal();
      
      if (!rootUser) {
        return await sendMessage('❌ Nenhum usuário root encontrado no sistema.');
      }

      const response = `👑 *ROOT DO SISTEMA*

📞 @${rootUser.telefone}
👤 ${rootUser.nome || 'Root User'}
📅 Cadastrado em: ${new Date(rootUser.created_at).toLocaleDateString('pt-BR')}

Para contato direto com o administrador principal do sistema.`;

      await sendMessage(response);
    } catch (error) {
      console.error('Erro ao buscar usuário root:', error);
      await sendMessage('❌ Erro ao buscar informações do usuário root.');
    }
  }

  // Comando para definir grupo técnico
  async handleDefinirGrupoTecnico(sendMessage, userPhone, userRole, isGrupoTecnico) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    if (!isGrupoTecnico) {
      return await sendMessage('❌ Este comando só pode ser usado em grupos.');
    }

    try {
      // Obter o ID do grupo atual (será passado pelo bot.js)
      const bot = require('../bot');
      const groupId = await this.getCurrentGroupId(userPhone);
      
      if (!groupId) {
        return await sendMessage('❌ Não foi possível identificar o grupo atual.');
      }

      // Definir este grupo como grupo técnico
      await database.definirGrupoTecnico(groupId, userPhone);

      const response = `✅ *GRUPO TÉCNICO DEFINIDO*

🏢 Este grupo foi configurado como o grupo técnico oficial.

📋 *Funcionalidades ativadas:*
• Recebimento de notificações de novas OS
• Comandos técnicos e administrativos
• Solicitações de peças
• Atualizações de status

👥 *Comandos disponíveis:*
• !adm @usuario - Promover a administrador
• !tecnico @usuario - Promover a técnico  
• !almoxarifado @usuario - Promover a almoxarifado
• !root - Mencionar root do sistema

📅 Configurado em: ${new Date().toLocaleString('pt-BR')}
👤 Por: ${userPhone}`;

      await sendMessage(response);

      // Notificar usuários root sobre a mudança
      const rootUsers = await database.listarUsuariosPorRole('root');
      for (const root of rootUsers) {
        if (root.telefone !== userPhone) {
          const rootJid = `${root.telefone}@s.whatsapp.net`;
          await this.sendDirectMessage(rootJid, `
🔄 *GRUPO TÉCNICO ALTERADO*

O grupo técnico foi redefinido por ${userPhone}.
Novo grupo: ${groupId}
Data: ${new Date().toLocaleString('pt-BR')}
          `);
        }
      }

    } catch (error) {
      console.error('Erro ao definir grupo técnico:', error);
      await sendMessage('❌ Erro ao definir grupo técnico. Tente novamente.');
    }
  }

  // Método auxiliar para obter ID do grupo atual
  async getCurrentGroupId(userPhone) {
    // Este método será implementado para obter o ID do grupo atual
    // Por enquanto, retornamos null - será implementado no bot.js
    return null;
  }

  // Atualizar métodos de promoção para suportar menções
  async handlePromoverTecnico(text, sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    // Verificar se há menções na mensagem
    const telefonesMencionados = database.extrairTelefonesDeMencoes(text);
    
    if (telefonesMencionados.length > 0) {
      // Usar o primeiro telefone mencionado
      const telefone = telefonesMencionados[0];
      await database.alterarRoleUsuario(telefone, 'tecnico');
      
      await sendMessage(`✅ Usuário @${telefone} promovido a técnico.`);
      return;
    }

    // Fallback para o formato antigo
    const match = text.match(/!tecnico=(.+)/);
    if (!match) {
      return await sendMessage('❌ Use: !tecnico @usuario ou !tecnico=[número do telefone]');
    }

    const telefone = match[1].trim();
    await database.alterarRoleUsuario(telefone, 'tecnico');
    
    await sendMessage(`✅ Usuário ${telefone} promovido a técnico.`);
  }

  async handlePromoverAdmin(text, sendMessage, userRole) {
    if (!['root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para usuários root.');
    }

    // Verificar se há menções na mensagem
    const telefonesMencionados = database.extrairTelefonesDeMencoes(text);
    
    if (telefonesMencionados.length > 0) {
      // Usar o primeiro telefone mencionado
      const telefone = telefonesMencionados[0];
      await database.alterarRoleUsuario(telefone, 'admin');
      
      await sendMessage(`✅ Usuário @${telefone} promovido a administrador.`);
      return;
    }

    // Fallback para o formato antigo
    const match = text.match(/!admin=(.+)/);
    if (!match) {
      return await sendMessage('❌ Use: !admin @usuario ou !admin=[número do telefone]');
    }

    const telefone = match[1].trim();
    await database.alterarRoleUsuario(telefone, 'admin');
    
    await sendMessage(`✅ Usuário ${telefone} promovido a administrador.`);
  }

  async handlePromoverAlmoxarifado(text, sendMessage, userRole) {
    if (!['admin', 'root'].includes(userRole)) {
      return await sendMessage('❌ Comando disponível apenas para administradores.');
    }

    // Verificar se há menções na mensagem
    const telefonesMencionados = database.extrairTelefonesDeMencoes(text);
    
    if (telefonesMencionados.length > 0) {
      // Usar o primeiro telefone mencionado
      const telefone = telefonesMencionados[0];
      await database.alterarRoleUsuario(telefone, 'almoxarifado');
      
      await sendMessage(`✅ Usuário @${telefone} promovido a almoxarifado.`);
      return;
    }

    // Fallback para o formato antigo
    const match = text.match(/!almoxarifado=(.+)/);
    if (!match) {
      return await sendMessage('❌ Use: !almoxarifado @usuario ou !almoxarifado=[número do telefone]');
    }

    const telefone = match[1].trim();
    await database.alterarRoleUsuario(telefone, 'almoxarifado');
    
    await sendMessage(`✅ Usuário ${telefone} promovido a almoxarifado.`);
  }
}

module.exports = new CommandHandler();
