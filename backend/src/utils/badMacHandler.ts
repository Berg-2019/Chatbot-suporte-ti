/**
 * Bad MAC Error Handler
 * Tratamento de erros de autenticação do WhatsApp
 */

import fs from 'node:fs';
import path from 'node:path';
import { warningLog, errorLog, infoLog } from './logger.js';

const AUTH_DIR = path.resolve(process.cwd(), 'auth_info_baileys');

class BadMacHandler {
  private errorCount = 0;
  private maxRetries = 5;

  isBadMacError(error: any): boolean {
    if (!error) return false;
    const errorString = error.toString?.() || '';
    const errorMessage = error.message || '';
    return (
      errorString.includes('Bad MAC') ||
      errorMessage.includes('Bad MAC') ||
      errorString.includes('HMAC') ||
      errorMessage.includes('HMAC')
    );
  }

  isSessionError(error: any): boolean {
    if (!error) return false;
    const errorString = error.toString?.() || '';
    const errorMessage = error.message || '';
    return (
      this.isBadMacError(error) ||
      errorString.includes('Session') ||
      errorMessage.includes('session') ||
      errorString.includes('Decryption') ||
      errorMessage.includes('decrypt')
    );
  }

  handleError(error: any, context = 'unknown'): boolean {
    if (!this.isBadMacError(error) && !this.isSessionError(error)) {
      return false;
    }

    this.errorCount++;
    warningLog(`Bad MAC/Session error detectado (${this.errorCount}/${this.maxRetries}) em: ${context}`);
    return true;
  }

  hasReachedLimit(): boolean {
    return this.errorCount >= this.maxRetries;
  }

  resetErrorCount(): void {
    this.errorCount = 0;
    infoLog('Contador de erros Bad MAC resetado');
  }

  clearProblematicSessionFiles(): void {
    try {
      if (!fs.existsSync(AUTH_DIR)) return;

      const files = fs.readdirSync(AUTH_DIR);
      const patterns = ['sender-key', 'session-', 'pre-key'];
      let removed = 0;

      for (const file of files) {
        if (patterns.some(p => file.toLowerCase().includes(p.toLowerCase()))) {
          try {
            fs.unlinkSync(path.join(AUTH_DIR, file));
            removed++;
          } catch (err) {
            // Ignora
          }
        }
      }

      if (removed > 0) {
        warningLog(`${removed} arquivo(s) de sessão problemático(s) removido(s)`);
      }
    } catch (error) {
      errorLog('Erro ao limpar arquivos de sessão');
    }
  }

  clearAllSessionFiles(): void {
    try {
      if (!fs.existsSync(AUTH_DIR)) return;
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      fs.mkdirSync(AUTH_DIR, { recursive: true });
      warningLog('Todos os arquivos de sessão foram removidos');
    } catch (error) {
      errorLog('Erro ao limpar sessão completa');
    }
  }

  getStats(): object {
    return {
      errorCount: this.errorCount,
      maxRetries: this.maxRetries,
      hasReachedLimit: this.hasReachedLimit(),
    };
  }
}

export const badMacHandler = new BadMacHandler();
