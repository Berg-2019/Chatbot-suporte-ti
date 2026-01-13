/**
 * Carregador de eventos do socket
 * Baseado no takeshi-bot
 * 
 * @author Sistema de Atendimento Técnico
 */

import { TIMEOUT_IN_MILLISECONDS_BY_EVENT } from "./config.js";
import { onMessagesUpsert } from "./middlewares/onMessagesUpsert.js";
import { badMacHandler } from "./utils/badMacHandler.js";
import { errorLog } from "./utils/logger.js";

/**
 * Carrega os eventos no socket do WhatsApp
 */
export function load(socket) {
  /**
   * Handler seguro para eventos
   */
  const safeEventHandler = async (callback, data, eventName) => {
    try {
      await callback(data);
    } catch (error) {
      if (badMacHandler.handleError(error, eventName)) {
        return;
      }
      errorLog(`Erro ao processar evento ${eventName}: ${error.message}`);
      if (error.stack) {
        errorLog(`Stack trace: ${error.stack}`);
      }
    }
  };

  // Evento principal: mensagens recebidas
  socket.ev.on("messages.upsert", async (data) => {
    const startProcess = Date.now();
    
    setTimeout(() => {
      safeEventHandler(
        () => onMessagesUpsert({
          socket,
          messages: data.messages,
          startProcess,
        }),
        data,
        "messages.upsert"
      );
    }, TIMEOUT_IN_MILLISECONDS_BY_EVENT);
  });

  // Tratamento de erros globais para o evento
  process.on("uncaughtException", (error) => {
    if (badMacHandler.handleError(error, "uncaughtException")) {
      return;
    }
    errorLog(`Erro não capturado: ${error.message}`);
  });

  process.on("unhandledRejection", (reason) => {
    if (badMacHandler.handleError(reason, "unhandledRejection")) {
      return;
    }
    errorLog(`Promessa rejeitada não tratada: ${reason}`);
  });
}
