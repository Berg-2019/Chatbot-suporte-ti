/**
 * Conexão com WhatsApp via Baileys
 * Baseado no Portal-Comunidade-Vista-Alegre e takeshi-bot
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
  BOT_NAME,
} from "./config.js";
import { load } from "./loader.js";
import { badMacHandler } from "./utils/badMacHandler.js";
import { onlyNumbers } from "./utils/index.js";
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

// Estado global de conexão
let isConnected = false;
let isConnecting = false;
let currentPairingCode = null;
let phoneNumber = null;

/**
 * Obtém status da conexão
 */
export function getConnectionStatus() {
  return {
    connected: isConnected,
    connecting: isConnecting,
    pairingCode: currentPairingCode,
    phoneNumber,
  };
}

/**
 * Conecta ao WhatsApp
 */
export async function connect() {
  if (isConnecting) {
    warningLog("Já conectando, aguarde...");
    return null;
  }

  isConnecting = true;
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const socket = makeWASocket({
    version: WAWEB_VERSION,
    logger,
    defaultQueryTimeoutMs: undefined,
    retryRequestDelayMs: 5000,
    auth: state,
    shouldIgnoreJid: (jid) => isJidBroadcast(jid) || isJidStatusBroadcast(jid),
    connectTimeoutMs: 20_000,
    keepAliveIntervalMs: 30_000,
    maxMsgRetryCount: 5,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    emitOwnEvents: false,
    msgRetryCounterCache,
    shouldSyncHistoryMessage: () => false,
  });

  // Flag para controlar pairing em progresso
  let pairingInProgress = false;

  // Salvar credenciais
  socket.ev.on("creds.update", saveCreds);

  // Se não está registrado, solicitar código de pareamento
  if (!socket.authState.creds.registered) {
    // Tentar obter número do telefone via variável de ambiente
    const botPhoneNumber = process.env.BOT_PHONE_NUMBER;

    if (botPhoneNumber) {
      warningLog("Credenciais ainda não configuradas!");
      pairingInProgress = true;

      // Aguardar socket WebSocket estar pronto
      infoLog("Aguardando socket ficar pronto (5 segundos)...");
      await new Promise((r) => setTimeout(r, 5000));

      infoLog(`Solicitando código de pareamento para: ${botPhoneNumber}`);

      try {
        const code = await socket.requestPairingCode(
          onlyNumbers(botPhoneNumber)
        );
        currentPairingCode = code;
        sayLog(`🔑 Código de pareamento: ${code}`);
        infoLog(
          "Digite este código no WhatsApp > Dispositivos Conectados > Conectar Dispositivo"
        );
        infoLog("Aguardando confirmação no WhatsApp...");
      } catch (error) {
        errorLog("Erro ao solicitar código de pareamento", error);
        pairingInProgress = false;
        isConnecting = false;
        throw new Error(
          "Falha ao gerar código de pareamento. Verifique o número."
        );
      }
    } else {
      errorLog("BOT_PHONE_NUMBER não configurado!");
      errorLog("Configure a variável de ambiente BOT_PHONE_NUMBER no .env");
      errorLog("Exemplo: BOT_PHONE_NUMBER=5569981170027");
      isConnecting = false;

      // Aguardar 10 segundos e tentar novamente (para dar tempo de configurar)
      infoLog("Tentando novamente em 10 segundos...");
      await new Promise((r) => setTimeout(r, 10000));

      const newSocket = await connect();
      load(newSocket);
      return newSocket;
    }
  }

  // Evento de atualização de conexão
  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const error = lastDisconnect?.error;
      const statusCode = error?.output?.statusCode;

      // SE PAIRING EM PROGRESSO, IGNORAR EVENTOS DE CLOSE NORMAIS DO HANDSHAKE
      if (pairingInProgress) {
        // 428 = Precondition Required (normal durante pairing)
        // 401 = Unauthorized (normal durante handshake)
        // undefined = Sem código (normal durante pairing)
        if (
          statusCode === 428 ||
          statusCode === 401 ||
          statusCode === undefined
        ) {
          infoLog(
            "Pareamento em progresso, aguardando confirmação no WhatsApp..."
          );
          return; // NÃO RECONECTAR - aguardar usuário digitar código
        }
      }

      isConnected = false;
      isConnecting = false;
      pairingInProgress = false;

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
        currentPairingCode = null;
        badMacHandler.clearProblematicSessionFiles();
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
      successLog(`✅ ${BOT_NAME} está pronto para uso!`);

      isConnected = true;
      isConnecting = false;
      pairingInProgress = false;
      currentPairingCode = null;
      phoneNumber = socket.user?.id?.split(":")[0] || null;

      successLog(`Prefixo de comandos: ${PREFIX}`);
      infoLog(`Número conectado: ${phoneNumber}`);

      badMacHandler.resetErrorCount();
    } else {
      infoLog("Atualizando conexão...");
    }
  });

  return socket;
}
