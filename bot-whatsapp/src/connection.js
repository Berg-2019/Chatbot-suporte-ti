/**
 * Conexão com WhatsApp via Baileys
 * Baseado no takeshi-bot com pairing code
 * 
 * @author Sistema de Atendimento Técnico
 */

import makeWASocket, {
  DisconnectReason,
  isJidBroadcast,
  isJidStatusBroadcast,
  useMultiFileAuthState,
} from "baileys";
import NodeCache from "node-cache";
import fs from "node:fs";
import path from "node:path";
import pino from "pino";

import {
  AUTH_DIR,
  TEMP_DIR,
  WAWEB_VERSION,
  PREFIX,
} from "./config.js";
import { load } from "./loader.js";
import { badMacHandler } from "./utils/badMacHandler.js";
import { onlyNumbers, question } from "./utils/index.js";
import {
  errorLog,
  infoLog,
  sayLog,
  successLog,
  warningLog,
} from "./utils/logger.js";

// Garantir que os diretórios existam
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

// Logger do Pino (silencioso por padrão)
const logger = pino(
  { timestamp: () => `,"time":"${new Date().toJSON()}"` },
  pino.destination(path.join(TEMP_DIR, "wa-logs.txt"))
);
logger.level = "error";

// Cache para retry de mensagens
const msgRetryCounterCache = new NodeCache();

/**
 * Conecta ao WhatsApp
 */
export async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const socket = makeWASocket({
    version: WAWEB_VERSION,
    logger,
    defaultQueryTimeoutMs: undefined,
    retryRequestDelayMs: 5000,
    auth: state,
    shouldIgnoreJid: (jid) =>
      isJidBroadcast(jid) || isJidStatusBroadcast(jid),
    connectTimeoutMs: 20_000,
    keepAliveIntervalMs: 30_000,
    maxMsgRetryCount: 5,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    emitOwnEvents: false,
    msgRetryCounterCache,
    shouldSyncHistoryMessage: () => false,
  });

  // Se não está registrado, solicitar código de pareamento
  if (!socket.authState.creds.registered) {
    warningLog("Credenciais ainda não configuradas!");
    infoLog('Informe o número de telefone do bot (exemplo: "5569981170027"):');

    const phoneNumber = await question("Número de telefone: ");

    if (!phoneNumber) {
      errorLog('Número de telefone inválido! Reinicie com "npm start".');
      process.exit(1);
    }

    try {
      const code = await socket.requestPairingCode(onlyNumbers(phoneNumber));
      sayLog(`🔑 Código de pareamento: ${code}`);
      infoLog("Digite este código no WhatsApp > Dispositivos Conectados > Conectar Dispositivo");
    } catch (error) {
      errorLog("Erro ao solicitar código de pareamento", error);
      process.exit(1);
    }
  }

  // Evento de atualização de conexão
  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const error = lastDisconnect?.error;
      const statusCode = error?.output?.statusCode;

      // Verificar se é erro de Bad MAC
      if (
        error?.message?.includes("Bad MAC") ||
        error?.toString()?.includes("Bad MAC")
      ) {
        errorLog("Bad MAC error detectado na conexão");

        if (badMacHandler.handleError(error, "connection.update")) {
          if (badMacHandler.hasReachedLimit()) {
            warningLog("Limite de erros Bad MAC atingido. Limpando sessão...");
            badMacHandler.clearProblematicSessionFiles();
            badMacHandler.resetErrorCount();

            const newSocket = await connect();
            load(newSocket);
            return;
          }
        }
      }

      // Tratar desconexões
      if (statusCode === DisconnectReason.loggedOut) {
        errorLog("Bot foi deslogado do WhatsApp!");
        warningLog("Delete a pasta auth_info_baileys e reinicie o bot.");
        process.exit(1);
      } else {
        // Mapear razões de desconexão
        const reasons = {
          [DisconnectReason.badSession]: "Sessão inválida",
          [DisconnectReason.connectionClosed]: "Conexão fechada",
          [DisconnectReason.connectionLost]: "Conexão perdida",
          [DisconnectReason.connectionReplaced]: "Conexão substituída",
          [DisconnectReason.multideviceMismatch]: "Dispositivo incompatível",
          [DisconnectReason.forbidden]: "Conexão proibida",
          [DisconnectReason.restartRequired]: "Reinício necessário",
          [DisconnectReason.unavailableService]: "Serviço indisponível",
        };

        const reason = reasons[statusCode] || `Código: ${statusCode}`;
        warningLog(`Desconectado: ${reason}. Reconectando...`);

        // Tratar sessão inválida
        if (statusCode === DisconnectReason.badSession) {
          const sessionError = new Error("Bad session");
          if (badMacHandler.handleError(sessionError, "badSession")) {
            if (badMacHandler.hasReachedLimit()) {
              badMacHandler.clearProblematicSessionFiles();
              badMacHandler.resetErrorCount();
            }
          }
        }

        // Reconectar
        const newSocket = await connect();
        load(newSocket);
      }
    } else if (connection === "open") {
      successLog("✅ Conectado ao WhatsApp com sucesso!");
      infoLog(`Versão do WhatsApp Web: ${WAWEB_VERSION.join(".")}`);
      successLog(`Prefixo de comandos: ${PREFIX}`);
      successLog("Bot pronto para uso!");
      badMacHandler.resetErrorCount();
    } else {
      infoLog("Atualizando conexão...");
    }
  });

  // Salvar credenciais quando atualizadas
  socket.ev.on("creds.update", saveCreds);

  return socket;
}
