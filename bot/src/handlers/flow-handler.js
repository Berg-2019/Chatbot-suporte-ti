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
  DESCRIBE_PROBLEM: 'describe_problem',
  CHECK_FAQ: 'check_faq',
  ASK_LOCATION: 'ask_location',
  CONFIRM: 'confirm',
  WAITING_TECHNICIAN: 'waiting_technician',
};

class FlowHandler {
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

    // Obter sessão atual
    let session = await redisService.getSession(phone);

    // Reset com comandos especiais
    if (['oi', 'olá', 'ola', 'menu', 'inicio', 'iniciar'].includes(normalizedText)) {
      session = { state: STATES.MENU, data: {} };
      await redisService.setSession(phone, session);
      await this.sendMessage(sock, from, config.messages.welcome);
      return;
    }

    // Se não tem sessão, iniciar
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

      case STATES.SELECT_SECTOR:
        await this.handleSelectSector(sock, from, normalizedText, session);
        break;

      case STATES.DESCRIBE_PROBLEM:
        await this.handleDescribeProblem(sock, from, text, session);
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
        await this.handleWaitingTechnician(sock, from, text, session);
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
        session.state = STATES.SELECT_SECTOR;
        await redisService.setSession(phone, session);
        await this.sendMessage(sock, from, config.messages.askSector);
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
        title: `[${session.data.sector}] Chamado via WhatsApp`,
        description: session.data.problem,
        sector: session.data.sector,
        location: session.data.location,
        category: session.data.sector,
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

  async handleWaitingTechnician(sock, from, text, session) {
    // Cliente já está aguardando técnico, encaminhar mensagem
    const phone = from.split('@')[0];

    await rabbitmqService.publishIncomingMessage(from, text);

    // Não responder automaticamente, técnico vai responder
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
