/**
 * Flow Handler - Orquestração do fluxo de conversa
 */

import axios from 'axios';
import { config } from '../config/index.js';
import { redisService } from '../services/redis.js';
import { rabbitmqService } from '../services/rabbitmq.js';

// Estados do fluxo
const STATES = {
  IDLE: 'idle',
  MENU: 'menu',
  SELECT_SECTOR: 'select_sector',
  ASK_NAME: 'ask_name',
  DESCRIBE_PROBLEM: 'describe_problem',
  CHECK_FAQ: 'check_faq',
  ASK_LOCATION: 'ask_location',
  CONFIRM: 'confirm',
  WAITING_TECHNICIAN: 'waiting_technician',
  RATING_TICKET: 'rating_ticket',  // Aguardando avaliação 1-5
};

class FlowHandler {
  /**
   * Verifica se existe ticket ativo no backend para este telefone
   * @param {string} phone - Número do telefone
   * @returns {Promise<object|null>} - Ticket ativo ou null
   */
  async checkActiveTicketInBackend(phone) {
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const res = await axios.get(
        `${backendUrl}/api/bot/tickets/by-phone/${encodeURIComponent(phone)}`,
        { timeout: 3000 }
      );
      const ticket = res.data;

      if (ticket && !['CLOSED', 'RESOLVED'].includes(ticket.status)) {
        return ticket;
      }
      return null;
    } catch (e) {
      console.warn('⚠️ Falha ao verificar ticket no backend:', e.message);
      return null;
    }
  }

  /**
   * Processa mensagem recebida
   * @param {object} sock - Socket do WhatsApp
   * @param {string} from - JID do remetente
   * @param {string} text - Texto da mensagem
   * @param {object} msg - Mensagem completa
   */
  async handleMessage(sock, from, text, msg) {
    const phone = from.split('@')[0];
    const normalizedText = text.trim().toLowerCase();

    // === VERIFICAÇÃO ROBUSTA DE TICKET ATIVO ===
    // SEMPRE verificar no backend primeiro se NÃO for comando de menu
    const isMenuCommand = ['menu', 'inicio', 'iniciar'].includes(normalizedText);

    if (!isMenuCommand) {
      const activeTicket = await this.checkActiveTicketInBackend(phone);

      if (activeTicket) {
        console.log(`🔒 Ticket ativo #${activeTicket.glpiId || activeTicket.id} encontrado para ${phone}`);

        // Restaurar/atualizar sessão e encaminhar mensagem ao técnico
        const session = {
          state: STATES.WAITING_TECHNICIAN,
          data: { ticketId: activeTicket.glpiId || activeTicket.id }
        };
        await redisService.setSession(phone, session);
        await redisService.linkTicketToPhone(phone, activeTicket.glpiId || activeTicket.id);

        // Encaminhar mensagem (não é saudação então vai direto pro técnico)
        await this.handleWaitingTechnician(sock, from, text, session, msg);
        return;
      }
    }

    // Obter sessão atual (agora só chega aqui se não tem ticket ativo)
    let session = await redisService.getSession(phone);

    // === Comando STATUS ===
    // Formato: "status 12345" ou "status"
    const statusMatch = normalizedText.match(/^status\s*(\d+)?$/);
    if (statusMatch) {
      await this.handleStatusQuery(sock, from, statusMatch[1], phone);
      return;
    }

    // === Comando !ceo (Registrar Destinatário de Relatório) ===
    const ceoMatch = normalizedText.match(/^!ceo\s+(.+)$/);
    if (ceoMatch) {
      const name = ceoMatch[1].trim();
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        // Enviar JID completo
        await axios.post(`${backendUrl}/api/reports/recipients`, { name, jid: from });
        await this.sendMessage(sock, from, `✅ *Sucesso!* \n\nVocê (${name}) foi registrado como destinatário de relatórios.`);
      } catch (error) {
        console.error('❌ Erro ao registrar CEO:', error.message);
        await this.sendMessage(sock, from, '❌ Erro ao registrar. Tente novamente mais tarde.');
      }
      return;
    }

    // === Comando !relatorio (Gerar Relatório Sob Demanda) ===
    const reportMatch = normalizedText.match(/^!relatorio(\s+(.+))?$/);
    if (reportMatch) {
      const technicianName = reportMatch[2] ? reportMatch[2].trim() : null;
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

        // Enviar solicitação ao backend
        // Se technicianName for nulo, backend entende como "todos"
        await axios.post(`${backendUrl}/api/reports/recipients/adhoc`, {
          jid: from,
          technician: technicianName
        });

        await this.sendMessage(sock, from, '⏳ Gerando relatório, aguarde um momento...');
      } catch (error) {
        console.error('❌ Erro ao solicitar relatório:', error.message);
        await this.sendMessage(sock, from, '❌ Erro ao solicitar relatório. Verifique se você tem permissão (use !ceo primeiro).');
      }
      return;
    }

    // Reset com comandos especiais
    if (['oi', 'olá', 'ola', 'menu', 'inicio', 'iniciar'].includes(normalizedText)) {
      // Antes de resetar, verificar se já existe um ticket em andamento
      let lastTicketId = await redisService.getTicketByPhone(phone);

      // Se não encontrou no Redis, tentar buscar no backend
      if (!lastTicketId) {
        try {
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
          const res = await axios.get(`${backendUrl}/api/bot/tickets/by-phone/${phone}`, { timeout: 3000 });
          const ticket = res.data;

          if (ticket && !['CLOSED', 'RESOLVED'].includes(ticket.status)) {
            lastTicketId = ticket.glpiId || ticket.id;
            // Sincronizar Redis
            await redisService.linkTicketToPhone(phone, lastTicketId);
          }
        } catch (e) {
          // Silencioso aqui, continua para o menu
        }
      }

      if (lastTicketId) {
        try {
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
          const res = await axios.get(`${backendUrl}/api/bot/tickets/glpi/${lastTicketId}`);
          const ticket = res.data;

          if (ticket && !['CLOSED', 'RESOLVED'].includes(ticket.status)) {
            // Usuário tem ticket aberto. Se ele digitou "Menu", talvez queira sair, mas se digitou "Oi", pode ser só "Oi, técnico"
            // Vamos assumir que "Menu" força a saída, mas "Oi" mantém a conversa se estiver esperando técnico
            if (!['menu', 'inicio', 'iniciar'].includes(normalizedText)) {
              // É uma saudação, mantém no fluxo do ticket
              session = {
                state: STATES.WAITING_TECHNICIAN,
                data: { ticketId: ticket.glpiId || ticket.id }
              };
              await redisService.setSession(phone, session);
              await this.handleWaitingTechnician(sock, from, text, session, msg);
              return;
            }
          } else {
            // Ticket fechado, limpar Redis para garantir
            await redisService.linkTicketToPhone(phone, null);
          }
        } catch (e) { }
      }

      session = { state: STATES.MENU, data: {} };
      await redisService.setSession(phone, session);
      await this.sendMessage(sock, from, config.messages.welcome);
      return;
    }

    // Se não tem sessão, iniciar com menu (verificação de ticket ativo já foi feita acima)
    if (!session) {
      session = { state: STATES.MENU, data: {} };
      await redisService.setSession(phone, session);
      await this.sendMessage(sock, from, config.messages.welcome);
      return;
    }

    // Processar baseado no estado atual
    switch (session.state) {
      case STATES.MENU:
        await this.handleMenu(sock, from, normalizedText, session);
        break;

      case STATES.ASK_NAME:
        await this.handleAskName(sock, from, text, session);
        break;

      case STATES.SELECT_SECTOR:
        await this.handleSelectSector(sock, from, normalizedText, session);
        break;

      case STATES.DESCRIBE_PROBLEM:
        await this.handleDescribeProblem(sock, from, text, session, msg);
        break;

      case STATES.ASK_LOCATION:
        await this.handleAskLocation(sock, from, text, session);
        break;

      case STATES.CHECK_FAQ:
        await this.handleCheckFaq(sock, from, normalizedText, session);
        break;

      case STATES.CONFIRM:
        await this.handleConfirm(sock, from, normalizedText, session);
        break;

      case STATES.WAITING_TECHNICIAN:
        await this.handleWaitingTechnician(sock, from, text, session, msg);
        break;

      case STATES.RATING_TICKET:
        await this.handleRatingTicket(sock, from, normalizedText, session);
        break;

      default:
        session = { state: STATES.MENU, data: {} };
        await redisService.setSession(phone, session);
        await this.sendMessage(sock, from, config.messages.welcome);
    }
  }

  async handleMenu(sock, from, text, session) {
    const phone = from.split('@')[0];

    switch (text) {
      case '1': // Abrir chamado
        // Verificar se contato já está cadastrado
        try {
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
          const contactRes = await axios.get(`${backendUrl}/api/contacts/by-jid/${encodeURIComponent(from)}`, {
            timeout: 3000,
          }).catch(() => null);

          if (contactRes?.data) {
            const contact = contactRes.data;
            // Contato existe! Pular seleção de setor
            session.data.sector = contact.sector;
            session.data.contactName = contact.name;
            session.state = STATES.DESCRIBE_PROBLEM;
            await redisService.setSession(phone, session);
            await this.sendMessage(sock, from, `👋 Olá *${contact.name}*! (${contact.sector})\n\n${config.messages.askProblem}`);
            break;
          }
        } catch (e) {
          // Contato não encontrado, seguir fluxo normal
        }


        session.state = STATES.ASK_NAME;
        await redisService.setSession(phone, session);
        await this.sendMessage(sock, from, 'Olá! Antes de começarmos, qual é o seu *nome*?');
        break;

      case '2': // Consultar status
        const ticketId = await redisService.getTicketByPhone(phone);
        if (ticketId) {
          await this.sendMessage(sock, from, `🎫 Seu último chamado é o **#${ticketId}**.\n\nPara mais detalhes, aguarde contato do técnico.`);
        } else {
          await this.sendMessage(sock, from, '❓ Não encontrei chamados recentes para seu número.');
        }
        break;

      case '3': // Falar com técnico
        session.state = STATES.WAITING_TECHNICIAN;
        session.data.requestedHuman = true;
        await redisService.setSession(phone, session);
        await this.sendMessage(sock, from, config.messages.transferToHuman);

        // Criar ticket de solicitação de técnico
        await rabbitmqService.publishCreateTicket({
          phoneNumber: from,
          title: "Falar com Técnico",
          description: "Solicitação direta de atendimento humano via menu do bot.",
          sector: "Atendimento",
          category: "Suporte",
          customerName: session.data.contactName || "Cliente",
          priority: "HIGH"
        });

        // Notificar painel
        await rabbitmqService.publishNotification(
          'human_requested',
          null,
          { phone, message: 'Cliente solicitou atendimento humano' }
        );
        break;

      default:
        await this.sendMessage(sock, from, config.messages.invalidOption);
    }
  }

  async handleAskName(sock, from, text, session) {
    const phone = from.split('@')[0];
    const name = text.trim();

    if (name.length < 3) {
      await this.sendMessage(sock, from, 'Por favor, informe seu nome completo para que possamos te identificar.');
      return;
    }

    session.data.contactName = name;
    session.state = STATES.SELECT_SECTOR;
    await redisService.setSession(phone, session);
    await this.sendMessage(sock, from, `Obrigado, ${name}!\n\n${config.messages.askSector}`);
  }

  async handleSelectSector(sock, from, text, session) {
    const phone = from.split('@')[0];
    const sectorIndex = parseInt(text) - 1;

    if (isNaN(sectorIndex) || sectorIndex < 0 || sectorIndex >= config.sectors.length) {
      await this.sendMessage(sock, from, config.messages.invalidOption);
      return;
    }

    session.data.sector = config.sectors[sectorIndex].name;
    session.data.sectorId = config.sectors[sectorIndex].id;
    session.state = STATES.DESCRIBE_PROBLEM;
    await redisService.setSession(phone, session);
    await this.sendMessage(sock, from, config.messages.askProblem);
  }

  async handleDescribeProblem(sock, from, text, session) {
    const phone = from.split('@')[0];
    session.data.problem = text;

    // Buscar FAQs relacionadas
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const response = await axios.get(`${backendUrl}/api/faq/search`, {
        params: { q: text },
        timeout: 5000,
      });

      const faqs = response.data;

      if (faqs && faqs.length > 0) {
        // Armazenar FAQs encontradas na sessão
        session.data.foundFaqs = faqs;
        session.state = STATES.CHECK_FAQ;
        await redisService.setSession(phone, session);

        // Montar mensagem com sugestões
        let faqMessage = `💡 *Encontrei algumas soluções que podem ajudar:*\n\n`;

        faqs.forEach((faq, index) => {
          faqMessage += `*${index + 1}.* ${faq.question}\n`;
        });

        faqMessage += `\n✅ Responda com o *número* para ver a resposta`;
        faqMessage += `\n❌ Ou digite *0* para continuar abrindo o chamado`;

        await this.sendMessage(sock, from, faqMessage);
        return;
      }
    } catch (error) {
      console.warn('⚠️ FAQ search falhou:', error.message);
      // Continua o fluxo normal se falhar
    }

    // Se não encontrou FAQs, continua o fluxo normal
    session.state = STATES.ASK_LOCATION;
    await redisService.setSession(phone, session);
    await this.sendMessage(sock, from, config.messages.askLocation);
  }

  async handleCheckFaq(sock, from, text, session) {
    const phone = from.split('@')[0];
    const choice = parseInt(text);
    const faqs = session.data.foundFaqs || [];

    if (choice === 0 || text === 'não' || text === 'nao' || text === 'continuar') {
      // Usuário quer continuar com o chamado
      session.state = STATES.ASK_LOCATION;
      delete session.data.foundFaqs;
      await redisService.setSession(phone, session);
      await this.sendMessage(sock, from, config.messages.askLocation);
      return;
    }

    if (choice >= 1 && choice <= faqs.length) {
      const selectedFaq = faqs[choice - 1];

      // Incrementar visualizações
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        await axios.post(`${backendUrl}/api/faq/${selectedFaq.id}/view`);
      } catch (e) { /* ignore */ }

      // Enviar resposta
      let answerMessage = `📖 *${selectedFaq.question}*\n\n`;
      answerMessage += `${selectedFaq.answer}\n\n`;
      answerMessage += `——————————\n`;
      answerMessage += `✅ Isso resolveu seu problema? (sim/não)`;

      session.data.selectedFaqId = selectedFaq.id;
      await redisService.setSession(phone, session);
      await this.sendMessage(sock, from, answerMessage);
      return;
    }

    // Verifica se é resposta de "resolveu?"
    if (text === 'sim' || text === 's' || text === 'yes') {
      // Marcar como útil
      if (session.data.selectedFaqId) {
        try {
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
          await axios.post(`${backendUrl}/api/faq/${session.data.selectedFaqId}/helpful`);
        } catch (e) { /* ignore */ }
      }

      await this.sendMessage(sock, from, `🎉 Que ótimo! Fico feliz que tenha ajudado!\n\nSe precisar de mais ajuda, é só enviar *oi* a qualquer momento. 😊`);

      // Limpar sessão
      await redisService.deleteSession(phone);
      return;
    }

    // Opção inválida
    await this.sendMessage(sock, from, `Por favor, escolha uma opção válida:\n- Número de 1 a ${faqs.length} para ver a solução\n- *0* para continuar abrindo o chamado`);
  }

  async handleAskLocation(sock, from, text, session) {
    const phone = from.split('@')[0];

    session.data.location = text;
    session.state = STATES.CONFIRM;
    await redisService.setSession(phone, session);

    await this.sendMessage(sock, from, config.messages.confirmTicket(session.data));
  }

  async handleConfirm(sock, from, text, session) {
    const phone = from.split('@')[0];

    if (['sim', 's', 'yes', 'confirmar', 'confirmo'].includes(text)) {
      // Criar ticket via RabbitMQ
      // IMPORTANTE: usar 'from' completo (com @s.whatsapp.net) para envio funcionar
      const ticketData = {
        phoneNumber: from,  // JID completo para envio funcionar
        title: `[${session.data.sector}] ${session.data.contactName} - ${session.data.problem.substring(0, 30)}${session.data.problem.length > 30 ? '...' : ''}`,
        description: session.data.problem,
        sector: session.data.sector,
        location: session.data.location,
        category: session.data.sector,
        customerName: session.data.contactName,
      };

      await rabbitmqService.publishCreateTicket(ticketData);

      // Gerar ID temporário (o real virá do backend)
      const tempId = Date.now().toString().slice(-6);
      await redisService.linkTicketToPhone(phone, tempId);

      session.state = STATES.WAITING_TECHNICIAN;
      await redisService.setSession(phone, session);
      await this.sendMessage(sock, from, config.messages.ticketCreated(tempId));

    } else if (['nao', 'não', 'n', 'no', 'cancelar'].includes(text)) {
      session = { state: STATES.MENU, data: {} };
      await redisService.setSession(phone, session);
      await this.sendMessage(sock, from, '❌ Chamado cancelado.\n\n' + config.messages.welcome);

    } else {
      await this.sendMessage(sock, from, 'Por favor, responda **sim** ou **não**.');
    }
  }

  async handleWaitingTechnician(sock, from, text, session, msg) {
    const phone = from.split('@')[0];

    // Verificar se é uma imagem
    const imageMessage = msg?.message?.imageMessage;
    if (imageMessage) {
      await this.handleImageReceived(sock, from, msg, session);
      return;
    }

    await rabbitmqService.publishIncomingMessage(from, text, msg.key?.id);
    // Não responder automaticamente, técnico vai responder
  }

  /**
   * Consultar status de um chamado
   */
  async handleStatusQuery(sock, from, ticketId, phone) {
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

      let url;
      if (ticketId) {
        // Buscar por ID específico
        url = `${backendUrl}/api/bot/tickets/glpi/${ticketId}`;
      } else {
        // Buscar último ticket do telefone
        url = `${backendUrl}/api/bot/tickets/by-phone/${phone}`;
      }

      const response = await axios.get(url, { timeout: 5000 });
      const ticket = response.data;

      if (!ticket) {
        await this.sendMessage(sock, from, '❓ Chamado não encontrado.\n\nDigite *oi* para abrir um novo chamado.');
        return;
      }

      const statusEmoji = {
        'NEW': '🆕 Novo',
        'ASSIGNED': '👨‍💻 Atribuído',
        'IN_PROGRESS': '🔧 Em Atendimento',
        'WAITING_CLIENT': '⏳ Aguardando Resposta',
        'RESOLVED': '✅ Resolvido',
        'CLOSED': '🔒 Fechado',
      };

      let message = `📋 *Status do Chamado #${ticket.glpiId || ticket.id}*\n\n`;
      message += `Status: ${statusEmoji[ticket.status] || ticket.status}\n`;
      message += `Título: ${ticket.title}\n`;
      if (ticket.assignedTo) {
        message += `Técnico: ${ticket.assignedTo.name}\n`;
      }
      message += `Aberto em: ${new Date(ticket.createdAt).toLocaleString('pt-BR')}\n`;

      await this.sendMessage(sock, from, message);

    } catch (error) {
      console.error('❌ Erro ao buscar status:', error.message);
      await this.sendMessage(sock, from, '❓ Chamado não encontrado.\n\nDigite *oi* para abrir um novo chamado.');
    }
  }

  /**
   * Processar avaliação do chamado
   */
  async handleRatingTicket(sock, from, text, session) {
    const phone = from.split('@')[0];
    const rating = parseInt(text);

    if (isNaN(rating) || rating < 1 || rating > 5) {
      await this.sendMessage(sock, from, 'Por favor, responda com um número de *1 a 5*:\n_(1 = Ruim, 5 = Excelente)_');
      return;
    }

    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const ticketId = session.data.ticketId;

      await axios.post(`${backendUrl}/api/bot/tickets/${ticketId}/rate`, { rating }, { timeout: 5000 });

      const stars = '⭐'.repeat(rating);
      await this.sendMessage(sock, from, `${stars}\n\n🙏 Obrigado pela sua avaliação!\n\nSe precisar de ajuda novamente, é só enviar *oi*. 😊`);

      // Limpar sessão
      await redisService.deleteSession(phone);

    } catch (error) {
      console.error('❌ Erro ao salvar avaliação:', error.message);
      await this.sendMessage(sock, from, '🙏 Obrigado pela avaliação!\n\nSe precisar de ajuda, envie *oi*.');
      await redisService.deleteSession(phone);
    }
  }

  /**
   * Processar imagem recebida
   */
  async handleImageReceived(sock, from, msg, session) {
    const phone = from.split('@')[0];
    const imageMessage = msg.message.imageMessage;

    // Publicar no RabbitMQ para backend processar
    await rabbitmqService.publish('ticket.image', {
      from,
      phone,
      ticketId: session?.data?.ticketId,
      caption: imageMessage?.caption || '',
      mimetype: imageMessage?.mimetype,
      // Em produção, aqui baixaria a imagem e faria upload
    });

    await this.sendMessage(sock, from, '📷 Imagem recebida! O técnico poderá visualizá-la.');
  }

  async sendMessage(sock, to, text) {
    try {
      await sock.sendMessage(to, { text });
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.message);
    }
  }
}

export const flowHandler = new FlowHandler();
