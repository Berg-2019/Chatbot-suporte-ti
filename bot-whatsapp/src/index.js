/**
 * Ponto de entrada do Bot de Atendimento Técnico
 * Baseado na arquitetura do takeshi-bot
 * 
 * @author Sistema de Atendimento Técnico
 * @version 3.0.0
 */

import { connect } from "./connection.js";
import { load } from "./loader.js";
import { database } from "./services/database.js";
import { badMacHandler } from "./utils/badMacHandler.js";
import {
  bannerLog,
  errorLog,
  infoLog,
  successLog,
  warningLog,
} from "./utils/logger.js";

// Tratamento de erros não capturados
process.on("uncaughtException", (error) => {
  if (badMacHandler.handleError(error, "uncaughtException")) {
    return;
  }

  errorLog(`Erro crítico não capturado: ${error.message}`);
  errorLog(error.stack);

  if (
    !error.message.includes("ENOTFOUND") &&
    !error.message.includes("timeout")
  ) {
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason) => {
  if (badMacHandler.handleError(reason, "unhandledRejection")) {
    return;
  }

  errorLog(`Promessa rejeitada não tratada:`, reason);
});

// Tratamento de sinais de término
process.on("SIGINT", () => {
  infoLog("Recebido SIGINT. Encerrando bot...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  infoLog("Recebido SIGTERM. Encerrando bot...");
  process.exit(0);
});

/**
 * Inicia o bot
 */
async function startBot() {
  try {
    // Aumentar limite de listeners
    process.setMaxListeners(1500);

    // Exibir banner
    bannerLog();

    // Inicializar banco de dados
    infoLog("Inicializando banco de dados...");
    await database.initialize();
    successLog("Banco de dados pronto!");

    // Verificar estatísticas do handler de erro
    const stats = badMacHandler.getStats();
    if (stats.errorCount > 0) {
      warningLog(
        `BadMacHandler: ${stats.errorCount}/${stats.maxRetries} erros`
      );
    }

    // Conectar ao WhatsApp
    infoLog("Conectando ao WhatsApp...");
    const socket = await connect();

    // Carregar eventos
    load(socket);

    successLog("✅ Bot iniciado com sucesso!");

    // Monitoramento periódico
    setInterval(() => {
      const currentStats = badMacHandler.getStats();
      if (currentStats.errorCount > 0) {
        warningLog(
          `BadMacHandler: ${currentStats.errorCount}/${currentStats.maxRetries} erros`
        );
      }
    }, 300_000); // A cada 5 minutos

  } catch (error) {
    if (badMacHandler.handleError(error, "bot-startup")) {
      warningLog("Erro de sessão durante inicialização. Tentando novamente...");

      setTimeout(() => {
        startBot();
      }, 5000);
      return;
    }

    errorLog(`Erro ao iniciar o bot: ${error.message}`);
    errorLog(error.stack);
    process.exit(1);
  }
}

// Iniciar o bot
startBot();
