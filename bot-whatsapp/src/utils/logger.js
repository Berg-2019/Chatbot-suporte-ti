/**
 * Sistema de logs coloridos
 * Baseado no takeshi-bot
 * 
 * @author Sistema de Atendimento Técnico
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  
  // Foreground colors
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  
  // Background colors
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
};

function getTimestamp() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function sayLog(message) {
  console.log(
    `${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.bright}${colors.magenta}💬${colors.reset}`,
    message
  );
}

export function infoLog(message) {
  console.log(
    `${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.blue}ℹ️${colors.reset}`,
    message
  );
}

export function successLog(message) {
  console.log(
    `${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.green}✅${colors.reset}`,
    message
  );
}

export function errorLog(message, error = null) {
  console.error(
    `${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.red}❌${colors.reset}`,
    message
  );
  if (error) {
    console.error(
      `${colors.dim}   Stack:${colors.reset}`,
      error.stack || error
    );
  }
}

export function warningLog(message) {
  console.log(
    `${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.yellow}⚠️${colors.reset}`,
    message
  );
}

export function debugLog(message, data = null) {
  if (process.env.NODE_ENV === "development") {
    console.log(
      `${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.dim}🔍${colors.reset}`,
      message
    );
    if (data) {
      console.log(`${colors.dim}   Data:${colors.reset}`, JSON.stringify(data, null, 2));
    }
  }
}

export function bannerLog() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   ${colors.bright}${colors.white}🤖 BOT DE ATENDIMENTO TÉCNICO${colors.reset}${colors.cyan}                              ║
║                                                                ║
║   ${colors.reset}Sistema de Ordens de Serviço via WhatsApp${colors.cyan}                 ║
║   ${colors.reset}Versão: 3.0.0 | Node: ${process.version}${colors.cyan}                         ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}
`);
}

export function osLog(osId, action, details = "") {
  console.log(
    `${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.bgBlue}${colors.white} OS #${osId} ${colors.reset}`,
    `${colors.bright}${action}${colors.reset}`,
    details ? `- ${details}` : ""
  );
}

export function userLog(phone, action) {
  const maskedPhone = phone.slice(0, 4) + "****" + phone.slice(-4);
  console.log(
    `${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.magenta}👤 ${maskedPhone}${colors.reset}`,
    action
  );
}
