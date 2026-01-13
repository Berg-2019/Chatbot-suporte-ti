/**
 * Handler de Comandos
 * Processa comandos com prefixo (ex: !status, !ajuda)
 * 
 * @author Sistema de Atendimento Técnico
 */

import { PREFIX, ROLES, GRUPO_TECNICO_ID } from "../config.js";
import { database } from "../services/database.js";
import { reportService } from "../services/reportService.js";
import { infoLog, osLog, userLog } from "../utils/logger.js";
import { formatDateTime, timeDiff, extractJid } from "../utils/index.js";

/**
 * Handler de comandos
 */
class CommandHandler {
  constructor() {
    // Mapear comandos para funções
    this.commands = new Map();
    this.registerCommands();
  }

  /**
   * Registra todos os comandos disponíveis
   */
  registerCommands() {
    // Comandos gerais
    this.commands.set("ajuda", this.cmdAjuda.bind(this));
    this.commands.set("help", this.cmdAjuda.bind(this));
    this.commands.set("menu", this.cmdMenu.bind(this));
    this.commands.set("status", this.cmdStatus.bind(this));
    this.commands.set("cancelar", this.cmdCancelar.bind(this));

    // Comandos de técnico
    this.commands.set("atender", this.cmdAtender.bind(this));
    this.commands.set("finalizar", this.cmdFinalizar.bind(this));
    this.commands.set("escalar", this.cmdEscalar.bind(this));
    this.commands.set("listar", this.cmdListar.bind(this));
    this.commands.set("lista", this.cmdListar.bind(this));
    this.commands.set("pendentes", this.cmdPendentes.bind(this));

    // Comandos de admin
    this.commands.set("relatorio", this.cmdRelatorio.bind(this));
    this.commands.set("promover", this.cmdPromover.bind(this));
    this.commands.set("tecnicos", this.cmdTecnicos.bind(this));
    this.commands.set("config", this.cmdConfig.bind(this));

    // Comandos de root
    this.commands.set("backup", this.cmdBackup.bind(this));
    this.commands.set("grupoid", this.cmdGrupoId.bind(this));
  }

  /**
   * Verifica e processa comandos
   * @returns {boolean} true se foi um comando, false caso contrário
   */
  async handle(context) {
    const { text, senderPhone } = context;

    // Verificar se começa com prefixo
    if (!text.startsWith(PREFIX)) {
      return false;
    }

    // Extrair comando e argumentos
    const args = text.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    // Verificar se o comando existe
    const command = this.commands.get(commandName);
    if (!command) {
      return false;
    }

    // Obter informações do usuário
    const user = await database.getUsuario(senderPhone);
    const userRole = user?.role || ROLES.USER;

    // Executar comando
    try {
      userLog(senderPhone, `Executando comando: ${PREFIX}${commandName}`);
      await command(context, args, userRole);
    } catch (error) {
      await context.sendMessage(`❌ Erro ao executar comando: ${error.message}`);
    }

    return true;
  }

  /**
   * Verifica se usuário tem permissão
   */
  hasPermission(userRole, requiredRole) {
    const hierarchy = [ROLES.USER, ROLES.ALMOXARIFADO, ROLES.TECNICO, ROLES.ADMIN, ROLES.ROOT];
    const userLevel = hierarchy.indexOf(userRole);
    const requiredLevel = hierarchy.indexOf(requiredRole);
    return userLevel >= requiredLevel;
  }

  // ============================================================================
  // COMANDOS GERAIS
  // ============================================================================

  /**
   * Comando: !ajuda
   */
  async cmdAjuda(context, args, userRole) {
    const { sendMessage } = context;

    let msg = `📖 *COMANDOS DISPONÍVEIS*

*Geral:*
${PREFIX}ajuda - Mostra esta ajuda
${PREFIX}menu - Menu principal
${PREFIX}status <id> - Status de um chamado
${PREFIX}cancelar <id> - Cancelar chamado`;

    if (this.hasPermission(userRole, ROLES.TECNICO)) {
      msg += `

*Técnico:*
${PREFIX}atender <id> - Assumir chamado
${PREFIX}finalizar <id> - Concluir chamado
${PREFIX}escalar <id> - Escalar para nível 2
${PREFIX}listar - Listar chamados abertos
${PREFIX}pendentes - Chamados sem técnico`;
    }

    if (this.hasPermission(userRole, ROLES.ADMIN)) {
      msg += `

*Admin:*
${PREFIX}relatorio <semana|mes> - Relatório
${PREFIX}promover <telefone> <cargo>
${PREFIX}tecnicos - Lista de técnicos`;
    }

    if (this.hasPermission(userRole, ROLES.ROOT)) {
      msg += `

*Root:*
${PREFIX}backup - Criar backup
${PREFIX}grupoid - Mostrar ID do grupo
${PREFIX}config - Configurações`;
    }

    await sendMessage(msg);
  }

  /**
   * Comando: !menu
   */
  async cmdMenu(context, args, userRole) {
    const { sendMessage, pushName } = context;

    await sendMessage(`👋 Olá, *${pushName}*!

Para abrir um novo chamado de suporte, digite *oi*.

Para ver seus chamados, digite *${PREFIX}status*.

Para mais comandos, digite *${PREFIX}ajuda*.`);
  }

  /**
   * Comando: !status
   */
  async cmdStatus(context, args, userRole) {
    const { sendMessage, senderPhone } = context;

    if (args.length > 0) {
      // Status de uma OS específica
      const osId = parseInt(args[0]);
      if (isNaN(osId)) {
        await sendMessage("❌ ID inválido. Use: !status <id>");
        return;
      }

      const os = await database.getOS(osId);
      if (!os) {
        await sendMessage(`❌ OS #${osId} não encontrada.`);
        return;
      }

      // Verificar permissão (dono da OS ou técnico+)
      if (os.usuario_telefone !== senderPhone && !this.hasPermission(userRole, ROLES.TECNICO)) {
        await sendMessage("❌ Você não tem permissão para ver esta OS.");
        return;
      }

      const statusEmoji = {
        aberta: "🔵",
        em_andamento: "🟡",
        aguardando_pecas: "🟠",
        escalada: "🔴",
        finalizada: "🟢",
        cancelada: "⚫",
      };

      await sendMessage(`📋 *OS #${os.id}*

${statusEmoji[os.status] || "⚪"} *Status:* ${os.status.replace("_", " ")}
👤 *Solicitante:* ${os.usuario_nome}
🏢 *Setor:* ${os.setor}
🔧 *Tipo:* ${os.tipo_chamado || "N/A"}
📍 *Local:* ${os.local_atendimento}
💻 *Equipamento:* ${os.equipamento}
👨‍🔧 *Técnico:* ${os.tecnico_responsavel || "Aguardando"}

📝 *Problema:*
${os.problema}

⏰ *Aberta em:* ${formatDateTime(os.created_at)}
${os.finalizada_at ? `✅ *Finalizada em:* ${formatDateTime(os.finalizada_at)}` : `⏳ *Tempo aberta:* ${timeDiff(os.created_at)}`}`);

    } else {
      // Listar OS do usuário
      const ordens = await database.getOSUsuario(senderPhone);

      if (ordens.length === 0) {
        await sendMessage("ℹ️ Você não possui chamados registrados.\n\nPara abrir um novo chamado, digite *oi*.");
        return;
      }

      let msg = `📋 *SEUS CHAMADOS*\n\n`;
      for (const os of ordens.slice(0, 10)) {
        const emoji = os.status === "finalizada" ? "✅" : os.status === "em_andamento" ? "🔧" : "🔵";
        msg += `${emoji} *#${os.id}* - ${os.status.replace("_", " ")}\n   ${os.problema.slice(0, 40)}...\n\n`;
      }

      msg += `_Digite ${PREFIX}status <id> para mais detalhes_`;
      await sendMessage(msg);
    }
  }

  /**
   * Comando: !cancelar
   */
  async cmdCancelar(context, args, userRole) {
    const { sendMessage, senderPhone } = context;

    if (args.length === 0) {
      await sendMessage(`❌ Uso: ${PREFIX}cancelar <id>\n\nExemplo: ${PREFIX}cancelar 123`);
      return;
    }

    const osId = parseInt(args[0]);
    const os = await database.getOS(osId);

    if (!os) {
      await sendMessage(`❌ OS #${osId} não encontrada.`);
      return;
    }

    // Verificar permissão
    if (os.usuario_telefone !== senderPhone && !this.hasPermission(userRole, ROLES.ADMIN)) {
      await sendMessage("❌ Você não tem permissão para cancelar esta OS.");
      return;
    }

    if (os.status === "finalizada" || os.status === "cancelada") {
      await sendMessage(`❌ OS #${osId} já está ${os.status}.`);
      return;
    }

    await database.updateOS(osId, { status: "cancelada" });
    osLog(osId, "CANCELADA", `Por: ${senderPhone}`);
    await sendMessage(`✅ OS #${osId} cancelada com sucesso.`);
  }

  // ============================================================================
  // COMANDOS DE TÉCNICO
  // ============================================================================

  /**
   * Comando: !atender
   */
  async cmdAtender(context, args, userRole) {
    const { sendMessage, senderPhone, socket } = context;

    if (!this.hasPermission(userRole, ROLES.TECNICO)) {
      await sendMessage("❌ Apenas técnicos podem usar este comando.");
      return;
    }

    if (args.length === 0) {
      await sendMessage(`❌ Uso: ${PREFIX}atender <id>\n\nExemplo: ${PREFIX}atender 123`);
      return;
    }

    const osId = parseInt(args[0]);
    const os = await database.getOS(osId);

    if (!os) {
      await sendMessage(`❌ OS #${osId} não encontrada.`);
      return;
    }

    if (os.status !== "aberta" && os.status !== "escalada") {
      await sendMessage(`❌ OS #${osId} não está disponível para atendimento (status: ${os.status}).`);
      return;
    }

    // Obter nome do técnico
    const tecnico = await database.getUsuario(senderPhone);
    const tecnicoNome = tecnico?.nome || senderPhone;

    await database.updateOS(osId, {
      status: "em_andamento",
      tecnico_responsavel: tecnicoNome,
      primeiro_contato_at: new Date().toISOString(),
    });

    osLog(osId, "ATENDENDO", `Técnico: ${tecnicoNome}`);
    await sendMessage(`✅ Você assumiu a OS #${osId}.\n\nCliente: ${os.usuario_nome}\nProblema: ${os.problema.slice(0, 100)}...`);

    // Notificar usuário
    try {
      const userJid = `${os.usuario_telefone}@s.whatsapp.net`;
      await socket.sendMessage(userJid, {
        text: `🔔 *Chamado #${osId} em atendimento!*\n\nO técnico *${tecnicoNome}* assumiu seu chamado e entrará em contato em breve.`,
      });
    } catch (error) {
      infoLog(`Erro ao notificar usuário: ${error.message}`);
    }
  }

  /**
   * Comando: !finalizar
   */
  async cmdFinalizar(context, args, userRole) {
    const { sendMessage, senderPhone, socket } = context;

    if (!this.hasPermission(userRole, ROLES.TECNICO)) {
      await sendMessage("❌ Apenas técnicos podem usar este comando.");
      return;
    }

    if (args.length === 0) {
      await sendMessage(`❌ Uso: ${PREFIX}finalizar <id> [observação]\n\nExemplo: ${PREFIX}finalizar 123 Problema resolvido`);
      return;
    }

    const osId = parseInt(args[0]);
    const observacao = args.slice(1).join(" ") || "Chamado finalizado";

    const os = await database.getOS(osId);

    if (!os) {
      await sendMessage(`❌ OS #${osId} não encontrada.`);
      return;
    }

    if (os.status === "finalizada" || os.status === "cancelada") {
      await sendMessage(`❌ OS #${osId} já está ${os.status}.`);
      return;
    }

    await database.updateOS(osId, {
      status: "finalizada",
      finalizada_at: new Date().toISOString(),
    });

    // Registrar no histórico
    await database.addHistorico(osId, senderPhone, `Finalizado: ${observacao}`, "sistema");

    osLog(osId, "FINALIZADA", observacao);
    await sendMessage(`✅ OS #${osId} finalizada com sucesso!`);

    // Notificar usuário
    try {
      const userJid = `${os.usuario_telefone}@s.whatsapp.net`;
      await socket.sendMessage(userJid, {
        text: `✅ *Chamado #${osId} finalizado!*\n\nSeu atendimento foi concluído.\n\n*Observação:* ${observacao}\n\n_Obrigado por utilizar nosso suporte técnico!_`,
      });
    } catch (error) {
      infoLog(`Erro ao notificar usuário: ${error.message}`);
    }
  }

  /**
   * Comando: !escalar
   */
  async cmdEscalar(context, args, userRole) {
    const { sendMessage, senderPhone, socket } = context;

    if (!this.hasPermission(userRole, ROLES.TECNICO)) {
      await sendMessage("❌ Apenas técnicos podem usar este comando.");
      return;
    }

    if (args.length === 0) {
      await sendMessage(`❌ Uso: ${PREFIX}escalar <id> [motivo]\n\nExemplo: ${PREFIX}escalar 123 Problema de hardware`);
      return;
    }

    const osId = parseInt(args[0]);
    const motivo = args.slice(1).join(" ") || "Necessita suporte especializado";

    const os = await database.getOS(osId);

    if (!os) {
      await sendMessage(`❌ OS #${osId} não encontrada.`);
      return;
    }

    const novoNivel = (os.nivel_escalacao || 1) + 1;

    await database.updateOS(osId, {
      status: "escalada",
      nivel_escalacao: novoNivel,
      escalado_at: new Date().toISOString(),
      tecnico_responsavel: null,
    });

    await database.addHistorico(osId, senderPhone, `Escalada para nível ${novoNivel}: ${motivo}`, "sistema");

    osLog(osId, "ESCALADA", `Nível ${novoNivel} - ${motivo}`);
    await sendMessage(`⬆️ OS #${osId} escalada para nível ${novoNivel}.\n\nMotivo: ${motivo}`);

    // Notificar grupo técnico
    if (GRUPO_TECNICO_ID) {
      try {
        await socket.sendMessage(GRUPO_TECNICO_ID, {
          text: `⚠️ *OS #${osId} ESCALADA - NÍVEL ${novoNivel}*\n\n📝 *Motivo:* ${motivo}\n\n👤 *Cliente:* ${os.usuario_nome}\n🏢 *Setor:* ${os.setor}\n📍 *Local:* ${os.local_atendimento}\n\n💻 *Problema:*\n${os.problema}\n\n_Esta OS precisa de atenção especializada!_`,
        });
      } catch (error) {
        infoLog(`Erro ao notificar grupo: ${error.message}`);
      }
    }
  }

  /**
   * Comando: !listar
   */
  async cmdListar(context, args, userRole) {
    const { sendMessage } = context;

    if (!this.hasPermission(userRole, ROLES.TECNICO)) {
      await sendMessage("❌ Apenas técnicos podem usar este comando.");
      return;
    }

    const ordens = await database.getOSAbertas();

    if (ordens.length === 0) {
      await sendMessage("ℹ️ Não há chamados abertos no momento. 🎉");
      return;
    }

    let msg = `📋 *CHAMADOS ABERTOS (${ordens.length})*\n\n`;

    for (const os of ordens.slice(0, 15)) {
      const statusEmoji = os.status === "escalada" ? "🔴" : os.status === "em_andamento" ? "🟡" : "🔵";
      const nivelText = os.nivel_escalacao > 1 ? ` [N${os.nivel_escalacao}]` : "";
      
      msg += `${statusEmoji} *#${os.id}*${nivelText} - ${os.setor}\n`;
      msg += `   ${os.problema.slice(0, 35)}...\n`;
      msg += `   👨‍🔧 ${os.tecnico_responsavel || "Sem técnico"} | ⏰ ${timeDiff(os.created_at)}\n\n`;
    }

    if (ordens.length > 15) {
      msg += `_... e mais ${ordens.length - 15} chamados_`;
    }

    await sendMessage(msg);
  }

  /**
   * Comando: !pendentes
   */
  async cmdPendentes(context, args, userRole) {
    const { sendMessage } = context;

    if (!this.hasPermission(userRole, ROLES.TECNICO)) {
      await sendMessage("❌ Apenas técnicos podem usar este comando.");
      return;
    }

    const ordens = await database.getOSPendentes();

    if (ordens.length === 0) {
      await sendMessage("✅ Não há chamados aguardando técnico!");
      return;
    }

    let msg = `⏳ *CHAMADOS AGUARDANDO TÉCNICO (${ordens.length})*\n\n`;

    for (const os of ordens.slice(0, 10)) {
      const nivelEmoji = os.nivel_escalacao > 1 ? "🔴" : "🔵";
      msg += `${nivelEmoji} *#${os.id}* - ${os.setor}\n`;
      msg += `   ${os.tipo_chamado || "Geral"}\n`;
      msg += `   ⏰ Aguardando há ${timeDiff(os.created_at)}\n\n`;
    }

    msg += `\n_Use ${PREFIX}atender <id> para assumir_`;
    await sendMessage(msg);
  }

  // ============================================================================
  // COMANDOS DE ADMIN
  // ============================================================================

  /**
   * Comando: !relatorio
   */
  async cmdRelatorio(context, args, userRole) {
    const { sendMessage } = context;

    if (!this.hasPermission(userRole, ROLES.ADMIN)) {
      await sendMessage("❌ Apenas administradores podem usar este comando.");
      return;
    }

    const tipo = args[0]?.toLowerCase() || "semana";

    await sendMessage("⏳ Gerando relatório...");

    let relatorio;
    if (tipo === "mes" || tipo === "mensal") {
      relatorio = await reportService.generateMonthlyReport();
    } else {
      relatorio = await reportService.generateWeeklyReport();
    }

    await sendMessage(relatorio);
  }

  /**
   * Comando: !promover
   */
  async cmdPromover(context, args, userRole) {
    const { sendMessage } = context;

    if (!this.hasPermission(userRole, ROLES.ADMIN)) {
      await sendMessage("❌ Apenas administradores podem usar este comando.");
      return;
    }

    if (args.length < 2) {
      await sendMessage(`❌ Uso: ${PREFIX}promover <telefone> <cargo>\n\nCargos: tecnico, admin, almoxarifado, user\n\nExemplo: ${PREFIX}promover 69999888777 tecnico`);
      return;
    }

    const telefone = args[0].replace(/\D/g, "");
    const cargo = args[1].toLowerCase();

    const cargosValidos = [ROLES.TECNICO, ROLES.ADMIN, ROLES.ALMOXARIFADO, ROLES.USER];
    if (!cargosValidos.includes(cargo)) {
      await sendMessage(`❌ Cargo inválido. Opções: ${cargosValidos.join(", ")}`);
      return;
    }

    // Não permitir promover a root
    if (cargo === ROLES.ROOT) {
      await sendMessage("❌ Não é possível promover a root.");
      return;
    }

    await database.updateUsuarioRole(telefone, cargo);
    await sendMessage(`✅ Usuário ${telefone} promovido a *${cargo}*.`);
  }

  /**
   * Comando: !tecnicos
   */
  async cmdTecnicos(context, args, userRole) {
    const { sendMessage } = context;

    if (!this.hasPermission(userRole, ROLES.ADMIN)) {
      await sendMessage("❌ Apenas administradores podem usar este comando.");
      return;
    }

    const tecnicos = await database.getTecnicos();

    if (tecnicos.length === 0) {
      await sendMessage("ℹ️ Nenhum técnico cadastrado.");
      return;
    }

    let msg = `👨‍🔧 *TÉCNICOS CADASTRADOS*\n\n`;
    for (const t of tecnicos) {
      const emoji = t.role === ROLES.ROOT ? "👑" : t.role === ROLES.ADMIN ? "⭐" : "🔧";
      msg += `${emoji} *${t.nome || "Sem nome"}*\n   📞 ${t.telefone}\n   🏷️ ${t.role}\n\n`;
    }

    await sendMessage(msg);
  }

  /**
   * Comando: !config
   */
  async cmdConfig(context, args, userRole) {
    const { sendMessage } = context;

    if (!this.hasPermission(userRole, ROLES.ROOT)) {
      await sendMessage("❌ Apenas root pode usar este comando.");
      return;
    }

    const configs = await database.getConfigs();

    let msg = `⚙️ *CONFIGURAÇÕES DO SISTEMA*\n\n`;
    for (const [key, value] of Object.entries(configs)) {
      msg += `*${key}:* ${value}\n`;
    }

    await sendMessage(msg);
  }

  // ============================================================================
  // COMANDOS DE ROOT
  // ============================================================================

  /**
   * Comando: !backup
   */
  async cmdBackup(context, args, userRole) {
    const { sendMessage } = context;

    if (!this.hasPermission(userRole, ROLES.ROOT)) {
      await sendMessage("❌ Apenas root pode usar este comando.");
      return;
    }

    await sendMessage("⏳ Criando backup do banco de dados...");

    try {
      const backupPath = await database.createBackup();
      await sendMessage(`✅ Backup criado com sucesso!\n\n📁 ${backupPath}`);
    } catch (error) {
      await sendMessage(`❌ Erro ao criar backup: ${error.message}`);
    }
  }

  /**
   * Comando: !grupoid
   */
  async cmdGrupoId(context, args, userRole) {
    const { sendMessage, remoteJid, isGroup } = context;

    if (!this.hasPermission(userRole, ROLES.ROOT)) {
      await sendMessage("❌ Apenas root pode usar este comando.");
      return;
    }

    if (!isGroup) {
      await sendMessage("❌ Este comando deve ser usado em um grupo.");
      return;
    }

    await sendMessage(`📋 *ID deste grupo:*\n\n\`${remoteJid}\`\n\n_Configure como GRUPO_TECNICO_ID no .env_`);
  }
}

export const commandHandler = new CommandHandler();
