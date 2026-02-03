/**
 * Flow Handler - Orquestração do fluxo de conversa
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { config } from '../config/index.js';
import { redisService } from '../services/redis.js';
import { rabbitmqService } from '../services/rabbitmq.js';
import { intentService } from '../services/intent.js';

// Estados do fluxo
const STATES = {
  IDLE: 'idle',
  MENU: 'menu',
  SELECT_AREA: 'select_area', // TI ou Elétrica
  SELECT_SECTOR_TI: 'select_sector_ti',
  SELECT_SECTOR_ELECTRIC: 'select_sector_electric',
  SELECT_SECTOR_GENERIC: 'select_sector_generic', // Para fluxos genéricos (técnico, reserva)
  ASK_NAME: 'ask_name',
  DESCRIBE_PROBLEM: 'describe_problem',
  CHECK_FAQ: 'check_faq',
  ASK_LOCATION: 'ask_location',
  CONFIRM: 'confirm',
  WAITING_TECHNICIAN: 'waiting_technician',
  RATING_TICKET: 'rating_ticket',  // Aguardando avaliação 1-5
  // Reservation states
  SELECT_EQUIPMENT: 'select_equipment',
  ASK_RESERVATION_START: 'ask_reservation_start',
  ASK_RESERVATION_END: 'ask_reservation_end',
  ASK_RESERVATION_REASON: 'ask_reservation_reason',
  CONFIRM_RESERVATION: 'confirm_reservation',
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
   * Garante que dados do usuário (nome e setor) estão disponíveis
   * @param {object} sock - Socket do WhatsApp
   * @param {string} from - JID do remetente
   * @param {object} session - Sessão atual
   * @param {string} nextState - Próximo estado após coletar dados
   * @returns {Promise<boolean>} - true se dados existem, false se precisa coletar
   */
  async ensureUserData(sock, from, session, nextState) {
    const phone = from.split('@')[0];

    // 1. Verificar se já tem dados na sessão
    if (session.data.contactName && session.data.sector) {
      return true;
    }

    // 2. Verificar se contato existe no backend
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const contactRes = await axios.get(
        `${backendUrl}/api/contacts/by-jid/${encodeURIComponent(from)}`,
        { timeout: 3000 }
      );

      if (contactRes?.data) {
        const contact = contactRes.data;
        session.data.contactName = contact.name;
        session.data.sector = contact.sector;
        await redisService.setSession(phone, session);
        return true;
      }
    } catch (e) {
      // Contato não encontrado, continua para coletar
    }

    // 3. Precisa coletar dados - salvar próximo estado e ir para ASK_NAME
    session.data.afterUserData = nextState;
    session.state = STATES.ASK_NAME;
    await redisService.setSession(phone, session);
    await this.sendMessage(sock, from, 'Olá! Para continuar, preciso de algumas informações.\n\nQual é o seu *nome completo*?');
    return false;
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

    // === VERIFICAÇÃO ROBUSTA COM CLASSIFICAÇÃO DE INTENÇÃO ===
    const isMenuCommand = ['menu', 'inicio', 'iniciar'].includes(normalizedText);

    if (!isMenuCommand) {
      const activeTicket = await this.checkActiveTicketInBackend(phone);

      if (activeTicket) {
        // Usar serviço de classificação de intenção para decidir
        const intent = await intentService.classify(text, true);
        console.log(`🧠 Intenção classificada: ${intent.intent} (${(intent.confidence * 100).toFixed(0)}%) - Encaminhar: ${intent.shouldRouteToTech}`);

        if (intent.shouldRouteToTech || intent.intent === 'chat_with_tech') {
          console.log(`🔒 Ticket ativo #${activeTicket.glpiId || activeTicket.id} - Encaminhando mensagem ao técnico`);

          const session = {
            state: STATES.WAITING_TECHNICIAN,
            data: { ticketId: activeTicket.glpiId || activeTicket.id }
          };
          await redisService.setSession(phone, session);
          await redisService.linkTicketToPhone(phone, activeTicket.glpiId || activeTicket.id);

          await this.handleWaitingTechnician(sock, from, text, session, msg);
          return;
        } else {
          console.log(`🆕 Intent '${intent.intent}' com ticket ativo - mostrando menu`);
          // Usuário quer novo chamado ou consultar status, continuar para menu
        }
      }
    }

    // Obter sessão atual (agora só chega aqui se não tem ticket ativo ou quer ação diferente)
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

      case STATES.SELECT_SECTOR_TI:
        await this.handleSelectSectorTI(sock, from, normalizedText, session);
        break;

      case STATES.SELECT_SECTOR_ELECTRIC:
        await this.handleSelectSectorElectric(sock, from, normalizedText, session);
        break;

      case STATES.SELECT_SECTOR_GENERIC:
        await this.handleSelectSectorGeneric(sock, from, text, session);
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

      // Reservation flow states
      case STATES.SELECT_EQUIPMENT:
        await this.handleSelectEquipment(sock, from, normalizedText, session);
        break;

      case STATES.ASK_RESERVATION_START:
        await this.handleReservationStart(sock, from, text, session);
        break;

      case STATES.ASK_RESERVATION_END:
        await this.handleReservationEnd(sock, from, text, session);
        break;

      case STATES.ASK_RESERVATION_REASON:
        await this.handleReservationReason(sock, from, text, session);
        break;

      case STATES.CONFIRM_RESERVATION:
        await this.handleConfirmReservation(sock, from, normalizedText, session);
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


        session.data.ticketType = 'ti';
        session.state = STATES.ASK_NAME;
        await redisService.setSession(phone, session);
        await this.sendMessage(sock, from, 'Olá! Antes de começarmos, qual é o seu *nome*?');
        break;


      case '4': // Falar com técnico
        session.data.requestedHuman = true;
        const hasData = await this.ensureUserData(sock, from, session, STATES.WAITING_TECHNICIAN);

        if (!hasData) {
          // Dados sendo coletados, fluxo continua em handleAskName
          return;
        }

        // Dados já disponíveis, continuar para técnico
        session.state = STATES.WAITING_TECHNICIAN;
        await redisService.setSession(phone, session);
        await this.sendMessage(sock, from, config.messages.transferToHuman);

        // Criar ticket com dados reais
        await rabbitmqService.publishCreateTicket({
          phoneNumber: from,
          title: "Falar com Técnico",
          description: "Solicitação direta de atendimento humano via menu do bot.",
          sector: session.data.sector,
          category: "Suporte",
          customerName: session.data.contactName,
          priority: "HIGH"
        });

        // Notificar painel
        await rabbitmqService.publishNotification(
          'human_requested',
          null,
          { phone, message: `${session.data.contactName} (${session.data.sector}) solicitou atendimento humano` }
        );
        break;

      case '2': // Abrir chamado de Elétrica (NOVA OPÇÃO)
        // Verificar contato existente
        try {
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
          const contactRes = await axios.get(`${backendUrl}/api/contacts/by-jid/${encodeURIComponent(from)}`, {
            timeout: 3000,
          }).catch(() => null);

          if (contactRes?.data) {
            const contact = contactRes.data;
            session.data.contactName = contact.name;
            session.data.ticketType = 'electric';
            session.state = STATES.SELECT_SECTOR_ELECTRIC;
            await redisService.setSession(phone, session);
            await this.sendMessage(sock, from, `👋 Olá *${contact.name}*!\n\n${config.messages.askSectorElectric}`);
            break;
          }
        } catch (e) {
          // Contato não encontrado
        }

        session.data.ticketType = 'electric';
        session.state = STATES.ASK_NAME;
        await redisService.setSession(phone, session);
        await this.sendMessage(sock, from, 'Olá! Antes de começarmos, qual é o seu *nome*?');
        break;

      case '5': // Reservar equipamento
        const hasDataReserv = await this.ensureUserData(sock, from, session, STATES.SELECT_EQUIPMENT);

        if (!hasDataReserv) {
          // Dados sendo coletados, salvar contexto
          session.data.reservationFlow = true;
          await redisService.setSession(phone, session);
          return;
        }

        // Dados já disponíveis, buscar equipamentos
        try {
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
          const equipRes = await axios.get(`${backendUrl}/api/stock?category=ASSET&assetStatus=AVAILABLE`, {
            timeout: 5000,
          });

          const availableItems = equipRes.data.items || equipRes.data || [];

          if (availableItems.length === 0) {
            await this.sendMessage(sock, from, config.messages.noEquipmentsAvailable);
            break;
          }

          session.data.availableEquipments = availableItems;
          session.state = STATES.SELECT_EQUIPMENT;
          await redisService.setSession(phone, session);
          await this.sendMessage(sock, from, config.messages.askEquipmentList(availableItems));
        } catch (e) {
          console.error('Erro ao buscar equipamentos:', e.message);
          await this.sendMessage(sock, from, '❌ Erro ao buscar equipamentos. Tente novamente mais tarde.');
        }
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

    // Se tem afterUserData, está em fluxo genérico (técnico, reserva)
    if (session.data.afterUserData) {
      session.state = STATES.SELECT_SECTOR_GENERIC;
      await redisService.setSession(phone, session);
      await this.sendMessage(sock, from, `Obrigado, ${name}!\n\nAgora, informe seu *setor/departamento*:`);
      return;
    }

    // Fluxo normal de ticket (TI ou Elétrica)
    if (session.data.ticketType === 'electric') {
      session.state = STATES.SELECT_SECTOR_ELECTRIC;
      await redisService.setSession(phone, session);
      await this.sendMessage(sock, from, `Obrigado, ${name}!\n\n${config.messages.askSectorElectric}`);
    } else {
      session.state = STATES.SELECT_SECTOR_TI;
      await redisService.setSession(phone, session);
      await this.sendMessage(sock, from, `Obrigado, ${name}!\n\n${config.messages.askSectorTI}`);
    }
  }

  async handleSelectSectorTI(sock, from, text, session) {
    const phone = from.split('@')[0];
    const sectorIndex = parseInt(text) - 1;

    if (isNaN(sectorIndex) || sectorIndex < 0 || sectorIndex >= config.sectorsTI.length) {
      await this.sendMessage(sock, from, config.messages.invalidOption);
      return;
    }

    session.data.sector = config.sectorsTI[sectorIndex].name;
    session.data.sectorId = config.sectorsTI[sectorIndex].id;
    session.state = STATES.DESCRIBE_PROBLEM;
    await redisService.setSession(phone, session);
    await this.sendMessage(sock, from, config.messages.askProblem);
  }

  async handleSelectSectorElectric(sock, from, text, session) {
    const phone = from.split('@')[0];
    const sectorIndex = parseInt(text) - 1;

    if (isNaN(sectorIndex) || sectorIndex < 0 || sectorIndex >= config.sectorsElectric.length) {
      await this.sendMessage(sock, from, config.messages.invalidOption);
      return;
    }

    session.data.sector = config.sectorsElectric[sectorIndex].name;
    session.data.sectorId = config.sectorsElectric[sectorIndex].id;
    session.state = STATES.DESCRIBE_PROBLEM;
    await redisService.setSession(phone, session);
    await this.sendMessage(sock, from, config.messages.askProblem);
  }

  async handleSelectSectorGeneric(sock, from, text, session) {
    const phone = from.split('@')[0];
    const sector = text.trim();

    if (sector.length < 2) {
      await this.sendMessage(sock, from, 'Por favor, informe seu setor (ex: TI, RH, Financeiro, etc.):');
      return;
    }

    session.data.sector = sector;

    // Ir para o estado de destino
    const nextState = session.data.afterUserData || STATES.MENU;
    delete session.data.afterUserData;

    session.state = nextState;
    await redisService.setSession(phone, session);

    // Executar ação do estado de destino
    if (nextState === STATES.WAITING_TECHNICIAN) {
      // Criar ticket de falar com técnico
      await this.sendMessage(sock, from, config.messages.transferToHuman);

      await rabbitmqService.publishCreateTicket({
        phoneNumber: from,
        title: "Falar com Técnico",
        description: "Solicitação direta de atendimento humano via menu do bot.",
        sector: session.data.sector,
        category: "Suporte",
        customerName: session.data.contactName,
        priority: "HIGH"
      });

      await rabbitmqService.publishNotification(
        'human_requested',
        null,
        { phone, message: `${session.data.contactName} (${session.data.sector}) solicitou atendimento humano` }
      );
    } else if (nextState === STATES.SELECT_EQUIPMENT) {
      // Buscar equipamentos para reserva
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        const equipRes = await axios.get(`${backendUrl}/api/stock?category=ASSET&assetStatus=AVAILABLE`, {
          timeout: 5000,
        });

        const availableItems = equipRes.data.items || equipRes.data || [];

        if (availableItems.length === 0) {
          await this.sendMessage(sock, from, config.messages.noEquipmentsAvailable || '❌ Nenhum equipamento disponível.');
          return;
        }

        session.data.availableEquipments = availableItems;
        await redisService.setSession(phone, session);
        await this.sendMessage(sock, from, config.messages.askEquipmentList(availableItems));
      } catch (e) {
        console.error('Erro ao buscar equipamentos:', e.message);
        await this.sendMessage(sock, from, '❌ Erro ao buscar equipamentos. Tente novamente mais tarde.');
      }
    }
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

    // Verificar se é mídia
    const messageType = Object.keys(msg.message || {})[0];
    if (['imageMessage', 'audioMessage', 'videoMessage', 'documentMessage'].includes(messageType)) {
      await this.handleMediaReceived(sock, from, msg, session, messageType);
      return;
    }

    await rabbitmqService.publishIncomingMessage(from, text, msg.key?.id);
    // Não responder automaticamente, técnico vai responder
  }

  async handleMediaReceived(sock, from, msg, session, messageType) {
    try {
      // 1. Download da mídia
      const buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {},
        {
          logger: console,
          reuploadRequest: sock.updateMediaMessage
        }
      );

      // 2. Determinar extensão e tipo
      let ext = 'bin';
      let type = 'DOCUMENT';
      let mime = '';

      if (messageType === 'imageMessage') {
        ext = 'jpg';
        type = 'IMAGE';
        mime = msg.message.imageMessage?.mimetype;
      } else if (messageType === 'audioMessage') {
        ext = 'mp3'; // WhatsApp costuma ser ogg, mas mp3 é mais seguro pra player genérico, ou manter original
        // Na verdade melhor salvar como ogg se for ogg
        mime = msg.message.audioMessage?.mimetype;
        if (mime?.includes('ogg')) ext = 'ogg';
        else if (mime?.includes('mp4')) ext = 'm4a';
        else if (mime?.includes('mpeg')) ext = 'mp3';
        type = 'AUDIO';
      } else if (messageType === 'videoMessage') {
        ext = 'mp4';
        type = 'VIDEO'; // Backend needs mapping for VIDEO or treat as DOCUMENT/FILE
        // Backend MessageType has DOCUMENT. Let's map VIDEO to DOCUMENT for now, or add VIDEO later.
        // Current API MessageType: TEXT, IMAGE, AUDIO, DOCUMENT.
        // Let's us DOCUMENT for video for now.
        type = 'DOCUMENT';
        mime = msg.message.videoMessage?.mimetype;
      } else if (messageType === 'documentMessage') {
        type = 'DOCUMENT';
        mime = msg.message.documentMessage?.mimetype;
        const fileName = msg.message.documentMessage?.fileName;
        if (fileName) {
          ext = fileName.split('.').pop();
        } else {
          if (mime?.includes('pdf')) ext = 'pdf';
          else if (mime?.includes('spreadsheet')) ext = 'xlsx';
          else if (mime?.includes('word')) ext = 'docx';
        }
      }

      // 3. Salvar arquivo
      const filename = `${Date.now()}_${msg.key.id}.${ext}`;
      const uploadsDir = path.join(process.cwd(), 'uploads');

      // Ensure dir exists (should be done on start but safe check)
      // await fs.mkdir(uploadsDir, { recursive: true }); 

      await fs.writeFile(path.join(uploadsDir, filename), buffer);
      console.log(`✅ Mídia salva: ${filename} (${type})`);

      // 4. URL Pública (Proxy via Backend)
      // O backend deve ter um endpoint /api/bot/media/:filename que faz proxy para o bot
      const mediaUrl = `/api/bot/media/${filename}`;

      // 5. Publicar mensagem
      // Caption handling
      let caption = '';
      if (messageType === 'imageMessage') caption = msg.message.imageMessage?.caption;
      else if (messageType === 'videoMessage') caption = msg.message.videoMessage?.caption;
      else if (messageType === 'documentMessage') caption = msg.message.documentMessage?.caption;

      await rabbitmqService.publishIncomingMessage(from, caption || '', msg.key?.id, {
        type: type,
        mediaUrl: mediaUrl,
        mimeType: mime
      });

      // Feedback visual (tick azul ou msg) - opcional
      await this.sendMessage(sock, from, '✅ Arquivo recebido.');

    } catch (error) {
      console.error('❌ Erro ao baixar/salvar mídia:', error);
      await this.sendMessage(sock, from, '❌ Falha ao receber arquivo. Tente novamente.');
    }
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

  // ============================================
  // RESERVATION FLOW HANDLERS
  // ============================================

  /**
   * Valida se uma data é válida (não é auto-corrigida)
   */
  isValidDate(day, month, year) {
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === parseInt(year) &&
      date.getMonth() === parseInt(month) - 1 &&
      date.getDate() === parseInt(day)
    );
  }

  /**
   * Handle equipment selection
   */
  async handleSelectEquipment(sock, from, text, session) {
    const phone = from.split('@')[0];
    const equipments = session.data.availableEquipments || [];
    const choice = parseInt(text);

    if (isNaN(choice) || choice < 1 || choice > equipments.length) {
      await this.sendMessage(sock, from, `❌ Opção inválida. Digite um número de 1 a ${equipments.length}:`);
      return;
    }

    const selectedEquip = equipments[choice - 1];
    session.data.selectedEquipment = selectedEquip;
    session.state = STATES.ASK_RESERVATION_START;
    await redisService.setSession(phone, session);

    await this.sendMessage(sock, from, `✅ Você selecionou: *${selectedEquip.name}*\n\n${config.messages.askReservationDate}`);
  }

  /**
   * Handle reservation start date
   */
  async handleReservationStart(sock, from, text, session) {
    const phone = from.split('@')[0];

    // Parse date format: DD/MM/YYYY HH:MM
    const dateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);

    if (!dateMatch) {
      await this.sendMessage(sock, from, '❌ Formato inválido. Use: DD/MM/AAAA HH:MM\n\nExemplo: 30/01/2026 14:00');
      return;
    }

    const [, day, month, year, hour, minute] = dateMatch;

    // Validate date components
    if (!this.isValidDate(day, month, year)) {
      await this.sendMessage(sock, from, '❌ Data inválida. Verifique se o dia e mês existem.\n\nExemplo: 30/02 não existe.\n\nDigite novamente:');
      return;
    }

    // Validate time components
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);
    if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      await this.sendMessage(sock, from, '❌ Hora inválida. Use formato 24h (00:00 - 23:59).\n\nDigite novamente:');
      return;
    }

    const startDate = new Date(year, parseInt(month) - 1, day, hour, minute);

    if (startDate < new Date()) {
      await this.sendMessage(sock, from, '❌ A data não pode ser no passado. Digite uma data futura:');
      return;
    }

    session.data.startDate = startDate.toISOString();
    session.data.startDateFormatted = text;
    session.state = STATES.ASK_RESERVATION_END;
    await redisService.setSession(phone, session);

    await this.sendMessage(sock, from, config.messages.askReservationEnd);
  }

  /**
   * Handle reservation end date
   */
  async handleReservationEnd(sock, from, text, session) {
    const phone = from.split('@')[0];

    // Parse date format: DD/MM/YYYY HH:MM
    const dateMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);

    if (!dateMatch) {
      await this.sendMessage(sock, from, '❌ Formato inválido. Use: DD/MM/AAAA HH:MM\n\nExemplo: 30/01/2026 18:00');
      return;
    }

    const [, day, month, year, hour, minute] = dateMatch;

    // Validate date components
    if (!this.isValidDate(day, month, year)) {
      await this.sendMessage(sock, from, '❌ Data inválida. Verifique se o dia e mês existem.\n\nExemplo: 30/02 não existe.\n\nDigite novamente:');
      return;
    }

    // Validate time components
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute);
    if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
      await this.sendMessage(sock, from, '❌ Hora inválida. Use formato 24h (00:00 - 23:59).\n\nDigite novamente:');
      return;
    }

    const endDate = new Date(year, parseInt(month) - 1, day, hour, minute);
    const startDate = new Date(session.data.startDate);

    if (endDate <= startDate) {
      await this.sendMessage(sock, from, '❌ A data de devolução deve ser após a data de início. Digite novamente:');
      return;
    }

    // Validate minimum duration (1 hour)
    const durationMs = endDate - startDate;
    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours < 1) {
      await this.sendMessage(sock, from, '❌ A reserva deve ter duração mínima de 1 hora. Digite novamente:');
      return;
    }

    // Validate maximum duration (30 days)
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    if (durationDays > 30) {
      await this.sendMessage(sock, from, '❌ A reserva não pode exceder 30 dias. Digite novamente:');
      return;
    }

    session.data.endDate = endDate.toISOString();
    session.data.endDateFormatted = text;
    session.state = STATES.ASK_RESERVATION_REASON;
    await redisService.setSession(phone, session);

    await this.sendMessage(sock, from, config.messages.askReservationReason);
  }

  /**
   * Handle reservation reason
   */
  async handleReservationReason(sock, from, text, session) {
    const phone = from.split('@')[0];

    if (text.toLowerCase() !== 'pular' && text.trim()) {
      session.data.reservationReason = text;
    }

    session.state = STATES.CONFIRM_RESERVATION;
    await redisService.setSession(phone, session);

    const confirmMsg = config.messages.confirmReservation({
      equipmentName: session.data.selectedEquipment.name,
      startDate: session.data.startDateFormatted,
      endDate: session.data.endDateFormatted,
      reason: session.data.reservationReason || null
    });

    await this.sendMessage(sock, from, confirmMsg);
  }

  /**
   * Handle reservation confirmation
   */
  async handleConfirmReservation(sock, from, text, session) {
    const phone = from.split('@')[0];

    if (text === 'sim' || text === 's') {
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

        // Create reservation via API
        const response = await axios.post(`${backendUrl}/api/reservations`, {
          stockItemId: session.data.selectedEquipment.id,
          userName: session.data.contactName || 'Cliente WhatsApp',
          userPhone: phone,
          startTime: session.data.startDate,
          endTime: session.data.endDate,
          notes: session.data.reservationReason || 'Reserva via WhatsApp',
        }, { timeout: 10000 });

        await this.sendMessage(sock, from, config.messages.reservationCreated);

        // Notify panel about new reservation
        await rabbitmqService.publishNotification(
          'reservation_created',
          null,
          {
            phone,
            equipmentName: session.data.selectedEquipment.name,
            reservationId: response.data.id
          }
        );

      } catch (error) {
        console.error('❌ Erro ao criar reserva:', error.message);

        if (error.response?.data?.message?.includes('conflict')) {
          await this.sendMessage(sock, from, '⚠️ Esse equipamento já está reservado para o horário solicitado.\n\nDigite *menu* para tentar novamente com outro horário.');
        } else {
          await this.sendMessage(sock, from, '❌ Erro ao criar reserva. Tente novamente mais tarde.\n\nDigite *menu* para voltar ao início.');
        }
      }
    } else if (text === 'nao' || text === 'não' || text === 'n') {
      await this.sendMessage(sock, from, '❌ Reserva cancelada.\n\nDigite *menu* para voltar ao início.');
    } else {
      await this.sendMessage(sock, from, '❓ Digite *sim* para confirmar ou *não* para cancelar:');
      return;
    }

    // Clear session after completion
    await redisService.deleteSession(phone);
  }
}

export const flowHandler = new FlowHandler();
