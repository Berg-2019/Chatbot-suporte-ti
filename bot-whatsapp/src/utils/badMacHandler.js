/**
 * Bad MAC Error Handler
 * Baseado no takeshi-bot
 * 
 * Trata erros de autenticação do WhatsApp Web
 * 
 * @author Sistema de Atendimento Técnico
 */

import fs from "node:fs";
import path from "node:path";
import { AUTH_DIR } from "../config.js";
import { errorLog, warningLog, infoLog } from "./logger.js";

class BadMacHandler {
  constructor() {
    this.errorCount = 0;
    this.maxRetries = 5;
    this.lastError = null;
  }

  /**
   * Verifica se o erro é relacionado a Bad MAC
   */
  isBadMacError(error) {
    if (!error) return false;
    
    const errorString = error.toString?.() || "";
    const errorMessage = error.message || "";
    
    return (
      errorString.includes("Bad MAC") ||
      errorMessage.includes("Bad MAC") ||
      errorString.includes("HMAC") ||
      errorMessage.includes("HMAC")
    );
  }

  /**
   * Verifica se é um erro de sessão
   */
  isSessionError(error) {
    if (!error) return false;
    
    const errorString = error.toString?.() || "";
    const errorMessage = error.message || "";
    
    return (
      this.isBadMacError(error) ||
      errorString.includes("Session") ||
      errorMessage.includes("session") ||
      errorString.includes("Decryption") ||
      errorMessage.includes("decrypt")
    );
  }

  /**
   * Trata o erro e retorna true se foi um erro de Bad MAC
   */
  handleError(error, context = "unknown") {
    if (!this.isBadMacError(error) && !this.isSessionError(error)) {
      return false;
    }

    this.errorCount++;
    this.lastError = {
      error,
      context,
      timestamp: new Date().toISOString(),
    };

    warningLog(`Bad MAC/Session error detectado (${this.errorCount}/${this.maxRetries}) em: ${context}`);
    
    return true;
  }

  /**
   * Verifica se atingiu o limite de erros
   */
  hasReachedLimit() {
    return this.errorCount >= this.maxRetries;
  }

  /**
   * Reseta o contador de erros
   */
  resetErrorCount() {
    this.errorCount = 0;
    this.lastError = null;
    infoLog("Contador de erros Bad MAC resetado");
  }

  /**
   * Remove arquivos de sessão problemáticos
   */
  clearProblematicSessionFiles() {
    try {
      if (!fs.existsSync(AUTH_DIR)) {
        return;
      }

      const files = fs.readdirSync(AUTH_DIR);
      const problematicPatterns = [
        "sender-key",
        "session-",
        "pre-key",
      ];

      let removedCount = 0;

      for (const file of files) {
        const shouldRemove = problematicPatterns.some(pattern => 
          file.toLowerCase().includes(pattern.toLowerCase())
        );

        if (shouldRemove) {
          const filePath = path.join(AUTH_DIR, file);
          try {
            fs.unlinkSync(filePath);
            removedCount++;
          } catch (err) {
            errorLog(`Erro ao remover arquivo de sessão: ${file}`, err);
          }
        }
      }

      if (removedCount > 0) {
        warningLog(`${removedCount} arquivo(s) de sessão problemático(s) removido(s)`);
      }
    } catch (error) {
      errorLog("Erro ao limpar arquivos de sessão", error);
    }
  }

  /**
   * Retorna estatísticas do handler
   */
  getStats() {
    return {
      errorCount: this.errorCount,
      maxRetries: this.maxRetries,
      lastError: this.lastError,
      hasReachedLimit: this.hasReachedLimit(),
    };
  }
}

export const badMacHandler = new BadMacHandler();
