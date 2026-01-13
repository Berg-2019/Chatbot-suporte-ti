/**
 * Middleware de processamento de mensagens
 * 
 * @author Sistema de Atendimento Técnico
 */

import { DEVELOPER_MODE } from "../config.js";
import { badMacHandler } from "../utils/badMacHandler.js";
import { isAtLeastMinutesInPast, extractJid, isGroupJid } from "../utils/index.js";
import { errorLog, infoLog, debugLog } from "../utils/logger.js";
import { flowHandler } from "./flowHandler.js";
import { commandHandler } from "./commandHandler.js";

/**
 * Processa mensagens recebidas
 */
export async function onMessagesUpsert({ socket, messages, startProcess }) {
  if (!messages.length) {
    return;
  }

  for (const webMessage of messages) {
    try {
      // Log de debug em desenvolvimento
      if (DEVELOPER_MODE) {
        debugLog("Mensagem recebida", webMessage);
      }

      const timestamp = webMessage.messageTimestamp;

      // Ignorar mensagens antigas (mais de 3 minutos)
      if (isAtLeastMinutesInPast(timestamp)) {
        continue;
      }

      // Verificar se tem conteúdo de mensagem
      if (!webMessage?.message) {
        continue;
      }

      // Ignorar mensagens do próprio bot
      if (webMessage.key?.fromMe) {
        continue;
      }

      // Extrair informações da mensagem
      const messageInfo = extractMessageInfo(webMessage);
      
      if (!messageInfo) {
        continue;
      }

      const { remoteJid, participant, text, pushName } = messageInfo;

      // Determinar o remetente (em grupo usa participant, privado usa remoteJid)
      const senderJid = isGroupJid(remoteJid) ? participant : remoteJid;
      const senderPhone = extractJid(senderJid);

      if (!senderPhone) {
        continue;
      }

      // Criar função de envio de mensagem
      const sendMessage = async (content, options = {}) => {
        try {
          if (typeof content === "string") {
            await socket.sendMessage(remoteJid, { text: content }, options);
          } else {
            await socket.sendMessage(remoteJid, content, options);
          }
        } catch (error) {
          errorLog(`Erro ao enviar mensagem: ${error.message}`);
        }
      };

      // Criar contexto da mensagem
      const context = {
        socket,
        webMessage,
        remoteJid,
        senderJid,
        senderPhone,
        pushName: pushName || "Usuário",
        text,
        isGroup: isGroupJid(remoteJid),
        sendMessage,
        startProcess,
      };

      // Processar a mensagem
      await processMessage(context);

    } catch (error) {
      if (badMacHandler.handleError(error, "message-processing")) {
        continue;
      }

      if (badMacHandler.isSessionError(error)) {
        errorLog(`Erro de sessão: ${error.message}`);
        continue;
      }

      errorLog(`Erro ao processar mensagem: ${error.message}`, error);
      continue;
    }
  }
}

/**
 * Extrai informações relevantes da mensagem
 */
function extractMessageInfo(webMessage) {
  const { key, message, pushName } = webMessage;
  const remoteJid = key?.remoteJid;
  const participant = key?.participant;

  if (!remoteJid || !message) {
    return null;
  }

  // Extrair texto da mensagem (suporta diferentes tipos)
  let text = "";

  if (message.conversation) {
    text = message.conversation;
  } else if (message.extendedTextMessage?.text) {
    text = message.extendedTextMessage.text;
  } else if (message.buttonsResponseMessage?.selectedButtonId) {
    text = message.buttonsResponseMessage.selectedButtonId;
  } else if (message.listResponseMessage?.singleSelectReply?.selectedRowId) {
    text = message.listResponseMessage.singleSelectReply.selectedRowId;
  } else if (message.templateButtonReplyMessage?.selectedId) {
    text = message.templateButtonReplyMessage.selectedId;
  } else if (message.imageMessage?.caption) {
    text = message.imageMessage.caption;
  } else if (message.videoMessage?.caption) {
    text = message.videoMessage.caption;
  } else if (message.documentMessage?.caption) {
    text = message.documentMessage.caption;
  }

  return {
    remoteJid,
    participant,
    text: text.trim(),
    pushName,
  };
}

/**
 * Processa a mensagem (comando ou fluxo de atendimento)
 */
async function processMessage(context) {
  const { text, isGroup, senderPhone } = context;

  // Se não tem texto, ignorar
  if (!text) {
    return;
  }

  // Verificar se é um comando (começa com prefixo)
  const isCommand = await commandHandler.handle(context);

  // Se não foi um comando, processar pelo fluxo de atendimento
  if (!isCommand && !isGroup) {
    await flowHandler.handle(context);
  }
}
