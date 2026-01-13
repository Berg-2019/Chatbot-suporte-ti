/**
 * Funções utilitárias gerais
 * 
 * @author Sistema de Atendimento Técnico
 */

import readline from "node:readline";

/**
 * Extrai apenas números de uma string
 */
export function onlyNumbers(text) {
  return text.replace(/\D/g, "");
}

/**
 * Faz uma pergunta no terminal e retorna a resposta
 */
export function question(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Verifica se um timestamp é de pelo menos X minutos no passado
 */
export function isAtLeastMinutesInPast(timestamp, minutes = 3) {
  const now = Date.now() / 1000;
  const messageTime = Number(timestamp);
  const diffMinutes = (now - messageTime) / 60;
  return diffMinutes > minutes;
}

/**
 * Formata número de telefone para padrão brasileiro
 */
export function formatPhone(phone) {
  const cleaned = onlyNumbers(phone);
  
  if (cleaned.length === 13 && cleaned.startsWith("55")) {
    // 55 + DDD + 9 + número
    return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 5)} ${cleaned.slice(5, 9)}-${cleaned.slice(9)}`;
  } else if (cleaned.length === 12 && cleaned.startsWith("55")) {
    // 55 + DDD + número (sem 9)
    return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }
  
  return phone;
}

/**
 * Extrai JID de um JID completo
 */
export function extractJid(jid) {
  if (!jid) return "";
  return jid.split("@")[0].split(":")[0];
}

/**
 * Verifica se é um JID de grupo
 */
export function isGroupJid(jid) {
  return jid?.endsWith("@g.us") || false;
}

/**
 * Formata data para pt-BR
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formata data e hora para pt-BR
 */
export function formatDateTime(date) {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calcula diferença de tempo em formato legível
 */
export function timeDiff(startDate, endDate = new Date()) {
  const diff = new Date(endDate) - new Date(startDate);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}min`;
  } else {
    return `${minutes}min`;
  }
}

/**
 * Trunca texto com reticências
 */
export function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Delay assíncrono
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gera ID único simples
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Constantes de eventos de grupo
export const GROUP_PARTICIPANT_ADD = 27;
export const GROUP_PARTICIPANT_LEAVE = 32;
export const isAddOrLeave = [GROUP_PARTICIPANT_ADD, GROUP_PARTICIPANT_LEAVE];
