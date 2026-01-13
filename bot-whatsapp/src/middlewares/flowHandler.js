/**
 * Handler do Fluxo de Atendimento
 * Implementa o fluxo conforme diagrama
 * 
 * @author Sistema de Atendimento Técnico
 */

import {
  SETORES,
  TIPOS_CHAMADO,
  ETAPAS_FLUXO,
  MENSAGENS,
  GRUPO_TECNICO_ID,
} from "../config.js";
import { database } from "../services/database.js";
import { osLog, userLog, infoLog } from "../utils/logger.js";
import { formatDateTime } from "../utils/index.js";

/**
 * Gerenciador de fluxo de conversação
 */
class FlowHandler {
  constructor() {
    // Cache de sessões ativas (em produção, usar Redis)
    this.sessions = new Map();
  }

  /**
   * Obtém ou cria sessão do usuário
   */
  async getSession(phone) {
    // Verificar cache primeiro
    if (this.sessions.has(phone)) {
      return this.sessions.get(phone);
    }

    // Buscar no banco de dados
    try {
      const session = await database.getFluxo(phone);
      if (session) {
        this.sessions.set(phone, session);
        return session;
      }
    } catch (error) {
      // Sessão não existe, criar nova
    }

    // Criar nova sessão
    const newSession = {
      usuario_telefone: phone,
      etapa_atual: ETAPAS_FLUXO.INICIO,
      dados_coletados: {},
    };

    this.sessions.set(phone, newSession);
    return newSession;
  }

  /**
   * Salva sessão do usuário
   */
  async saveSession(phone, session) {
    this.sessions.set(phone, session);
    await database.saveFluxo(phone, session.etapa_atual, session.dados_coletados);
  }

  /**
   * Limpa sessão do usuário
   */
  async clearSession(phone) {
    this.sessions.delete(phone);
    await database.deleteFluxo(phone);
  }

  /**
   * Handler principal do fluxo
   */
  async handle(context) {
    const { senderPhone, text, pushName, sendMessage, socket } = context;

    // Verificar se é comando de cancelamento
    if (this.isCancelCommand(text)) {
      await this.clearSession(senderPhone);
      await sendMessage(MENSAGENS.CANCELADO);
      return;
    }

    // Obter sessão do usuário
    const session = await this.getSession(senderPhone);

    // Processar de acordo com a etapa atual
    switch (session.etapa_atual) {
      case ETAPAS_FLUXO.INICIO:
        await this.handleInicio(context, session);
        break;

      case ETAPAS_FLUXO.SELECAO_SETOR:
        await this.handleSelecaoSetor(context, session);
        break;

      case ETAPAS_FLUXO.SELECAO_TIPO:
        await this.handleSelecaoTipo(context, session);
        break;

      case ETAPAS_FLUXO.COLETA_LOCAL:
        await this.handleColetaLocal(context, session);
        break;

      case ETAPAS_FLUXO.COLETA_EQUIPAMENTO:
        await this.handleColetaEquipamento(context, session);
        break;

      case ETAPAS_FLUXO.COLETA_PATRIMONIO:
        await this.handleColetaPatrimonio(context, session);
        break;

      case ETAPAS_FLUXO.COLETA_PROBLEMA:
        await this.handleColetaProblema(context, session);
        break;

      case ETAPAS_FLUXO.CONFIRMACAO:
        await this.handleConfirmacao(context, session);
        break;

      default:
        // Se tem OS em aberto, mostrar status
        await this.handleDefault(context, session);
    }
  }

  /**
   * Verifica se é comando de cancelamento
   */
  isCancelCommand(text) {
    const cancelCommands = ["cancelar", "sair", "voltar", "parar", "0"];
    return cancelCommands.includes(text.toLowerCase());
  }

  /**
   * Verifica se é saudação inicial
   */
  isGreeting(text) {
    const greetings = [
      "oi", "olá", "ola", "hello", "hi", "bom dia", "boa tarde", 
      "boa noite", "e aí", "eai", "ei", "hey", "oie", "oii",
      "começar", "iniciar", "ajuda", "help", "menu"
    ];
    return greetings.includes(text.toLowerCase());
  }

  /**
   * Etapa: Início
   */
  async handleInicio(context, session) {
    const { senderPhone, text, pushName, sendMessage } = context;

    // Verificar se é saudação ou primeira mensagem
    if (this.isGreeting(text) || session.dados_coletados.firstContact !== false) {
      userLog(senderPhone, `Iniciou atendimento: ${pushName}`);

      // Registrar/atualizar usuário
      await database.upsertUsuario(senderPhone, pushName);

      // Atualizar sessão
      session.dados_coletados = {
        nome: pushName,
        firstContact: false,
      };
      session.etapa_atual = ETAPAS_FLUXO.SELECAO_SETOR;
      await this.saveSession(senderPhone, session);

      // Enviar saudação e lista de setores
      await sendMessage(MENSAGENS.SAUDACAO);
      await sendMessage(MENSAGENS.SELECIONE_SETOR);
    } else {
      // Não é saudação, mostrar menu inicial
      session.etapa_atual = ETAPAS_FLUXO.SELECAO_SETOR;
      await this.saveSession(senderPhone, session);
      await sendMessage(MENSAGENS.SELECIONE_SETOR);
    }
  }

  /**
   * Etapa: Seleção de Setor
   */
  async handleSelecaoSetor(context, session) {
    const { senderPhone, text, sendMessage } = context;

    const setorId = parseInt(text);
    const setor = SETORES.find(s => s.id === setorId);

    if (!setor) {
      await sendMessage(MENSAGENS.OPCAO_INVALIDA);
      await sendMessage(MENSAGENS.SELECIONE_SETOR);
      return;
    }

    // Salvar setor selecionado
    session.dados_coletados.setor = setor.nome;
    session.dados_coletados.setor_id = setor.id;
    session.etapa_atual = ETAPAS_FLUXO.SELECAO_TIPO;
    await this.saveSession(senderPhone, session);

    infoLog(`Usuário ${senderPhone} selecionou setor: ${setor.nome}`);

    // Solicitar tipo de chamado
    await sendMessage(`✅ Setor: *${setor.nome}*\n\n${MENSAGENS.SELECIONE_TIPO}`);
  }

  /**
   * Etapa: Seleção de Tipo de Chamado
   */
  async handleSelecaoTipo(context, session) {
    const { senderPhone, text, sendMessage } = context;

    const tipoId = parseInt(text);
    const tipo = TIPOS_CHAMADO.find(t => t.id === tipoId);

    if (!tipo) {
      await sendMessage(MENSAGENS.OPCAO_INVALIDA);
      await sendMessage(MENSAGENS.SELECIONE_TIPO);
      return;
    }

    // Salvar tipo selecionado
    session.dados_coletados.tipo_chamado = tipo.nome;
    session.dados_coletados.tipo_id = tipo.id;
    session.etapa_atual = ETAPAS_FLUXO.COLETA_LOCAL;
    await this.saveSession(senderPhone, session);

    infoLog(`Usuário ${senderPhone} selecionou tipo: ${tipo.nome}`);

    // Solicitar local
    await sendMessage(`✅ Tipo: *${tipo.nome}*\n\n${MENSAGENS.SOLICITE_LOCAL}`);
  }

  /**
   * Etapa: Coleta de Local
   */
  async handleColetaLocal(context, session) {
    const { senderPhone, text, sendMessage } = context;

    if (text.length < 2) {
      await sendMessage("⚠️ Por favor, informe um local válido.");
      await sendMessage(MENSAGENS.SOLICITE_LOCAL);
      return;
    }

    // Salvar local
    session.dados_coletados.local = text;
    session.etapa_atual = ETAPAS_FLUXO.COLETA_EQUIPAMENTO;
    await this.saveSession(senderPhone, session);

    // Solicitar equipamento
    await sendMessage(MENSAGENS.SOLICITE_EQUIPAMENTO);
  }

  /**
   * Etapa: Coleta de Equipamento
   */
  async handleColetaEquipamento(context, session) {
    const { senderPhone, text, sendMessage } = context;

    if (text.length < 2) {
      await sendMessage("⚠️ Por favor, informe o equipamento.");
      await sendMessage(MENSAGENS.SOLICITE_EQUIPAMENTO);
      return;
    }

    // Salvar equipamento
    session.dados_coletados.equipamento = text;
    session.etapa_atual = ETAPAS_FLUXO.COLETA_PATRIMONIO;
    await this.saveSession(senderPhone, session);

    // Solicitar patrimônio
    await sendMessage(MENSAGENS.SOLICITE_PATRIMONIO);
  }

  /**
   * Etapa: Coleta de Patrimônio
   */
  async handleColetaPatrimonio(context, session) {
    const { senderPhone, text, sendMessage } = context;

    // Aceitar "não tem", "nao tem", "n/a", etc.
    const semPatrimonio = ["não tem", "nao tem", "n/a", "na", "-", "nenhum", "não sei", "nao sei"];
    const patrimonio = semPatrimonio.includes(text.toLowerCase()) ? null : text;

    // Salvar patrimônio
    session.dados_coletados.patrimonio = patrimonio;
    session.etapa_atual = ETAPAS_FLUXO.COLETA_PROBLEMA;
    await this.saveSession(senderPhone, session);

    // Solicitar descrição do problema
    await sendMessage(MENSAGENS.SOLICITE_PROBLEMA);
  }

  /**
   * Etapa: Coleta do Problema
   */
  async handleColetaProblema(context, session) {
    const { senderPhone, text, sendMessage } = context;

    if (text.length < 10) {
      await sendMessage("⚠️ Por favor, descreva o problema com mais detalhes (mínimo 10 caracteres).");
      return;
    }

    // Salvar problema
    session.dados_coletados.problema = text;
    session.etapa_atual = ETAPAS_FLUXO.CONFIRMACAO;
    await this.saveSession(senderPhone, session);

    // Mostrar resumo para confirmação
    const dados = session.dados_coletados;
    const resumo = `📋 *CONFIRME OS DADOS DO CHAMADO:*

👤 *Solicitante:* ${dados.nome}
🏢 *Setor:* ${dados.setor}
🔧 *Tipo:* ${dados.tipo_chamado}
📍 *Local:* ${dados.local}
💻 *Equipamento:* ${dados.equipamento}
🏷️ *Patrimônio:* ${dados.patrimonio || "Não informado"}

📝 *Problema:*
${dados.problema}

━━━━━━━━━━━━━━━━━━━━━
*1* - ✅ Confirmar e abrir chamado
*2* - 🔄 Recomeçar
*0* - ❌ Cancelar
━━━━━━━━━━━━━━━━━━━━━`;

    await sendMessage(resumo);
  }

  /**
   * Etapa: Confirmação
   */
  async handleConfirmacao(context, session) {
    const { senderPhone, text, sendMessage, socket } = context;

    switch (text) {
      case "1":
        // Confirmar e criar OS
        await this.criarOrdemServico(context, session);
        break;

      case "2":
        // Recomeçar
        session.dados_coletados = { nome: session.dados_coletados.nome };
        session.etapa_atual = ETAPAS_FLUXO.SELECAO_SETOR;
        await this.saveSession(senderPhone, session);
        await sendMessage("🔄 Ok, vamos recomeçar.\n\n" + MENSAGENS.SELECIONE_SETOR);
        break;

      case "0":
        // Cancelar
        await this.clearSession(senderPhone);
        await sendMessage(MENSAGENS.CANCELADO);
        break;

      default:
        await sendMessage(MENSAGENS.OPCAO_INVALIDA);
        await sendMessage("Digite *1* para confirmar, *2* para recomeçar ou *0* para cancelar.");
    }
  }

  /**
   * Cria a Ordem de Serviço no banco de dados
   */
  async criarOrdemServico(context, session) {
    const { senderPhone, sendMessage, socket } = context;
    const dados = session.dados_coletados;

    try {
      // Criar OS no banco
      const osData = {
        usuario_nome: dados.nome,
        usuario_telefone: senderPhone,
        local_atendimento: dados.local,
        equipamento: dados.equipamento,
        patrimonio: dados.patrimonio,
        problema: dados.problema,
        setor: dados.setor,
        tipo_chamado: dados.tipo_chamado,
        status: "aberta",
        nivel_escalacao: 1,
      };

      const osId = await database.createOS(osData);

      osLog(osId, "CRIADA", `Setor: ${dados.setor} | Tipo: ${dados.tipo_chamado}`);

      // Limpar sessão
      await this.clearSession(senderPhone);

      // Notificar usuário
      await sendMessage(MENSAGENS.OS_CRIADA(osId));

      // Notificar grupo técnico
      if (GRUPO_TECNICO_ID) {
        const notificacao = `🔔 *NOVA OS #${osId}*

👤 *Solicitante:* ${dados.nome}
📞 *Telefone:* ${senderPhone}
🏢 *Setor:* ${dados.setor}
🔧 *Tipo:* ${dados.tipo_chamado}
📍 *Local:* ${dados.local}
💻 *Equipamento:* ${dados.equipamento}
🏷️ *Patrimônio:* ${dados.patrimonio || "N/A"}

📝 *Problema:*
${dados.problema}

⏰ *Aberta em:* ${formatDateTime(new Date())}

_Para assumir, digite:_ *!atender ${osId}*`;

        try {
          await socket.sendMessage(GRUPO_TECNICO_ID, { text: notificacao });
        } catch (error) {
          infoLog(`Não foi possível notificar grupo técnico: ${error.message}`);
        }
      }

    } catch (error) {
      await sendMessage(MENSAGENS.ERRO_SISTEMA);
      throw error;
    }
  }

  /**
   * Handler padrão para etapas não mapeadas
   */
  async handleDefault(context, session) {
    const { senderPhone, sendMessage } = context;

    // Verificar se tem OS em aberto
    const osAberta = await database.getOSAbertaUsuario(senderPhone);

    if (osAberta) {
      await sendMessage(`ℹ️ Você já possui um chamado em aberto:

📋 *OS #${osAberta.id}*
🔧 *Status:* ${osAberta.status}
📅 *Aberta em:* ${formatDateTime(osAberta.created_at)}

Para consultar o status, digite: *!status ${osAberta.id}*
Para abrir um novo chamado, digite: *oi*`);
    } else {
      // Reiniciar fluxo
      session.etapa_atual = ETAPAS_FLUXO.INICIO;
      await this.saveSession(senderPhone, session);
      await this.handleInicio(context, session);
    }
  }
}

export const flowHandler = new FlowHandler();
