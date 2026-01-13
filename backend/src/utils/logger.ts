/**
 * Utilitários de logging
 */

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

function timestamp(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function infoLog(message: string): void {
  console.log(`${colors.cyan}[${timestamp()}]${colors.reset} ℹ️  ${message}`);
}

export function successLog(message: string): void {
  console.log(`${colors.cyan}[${timestamp()}]${colors.reset} ${colors.green}✅${colors.reset} ${message}`);
}

export function warningLog(message: string): void {
  console.log(`${colors.cyan}[${timestamp()}]${colors.reset} ${colors.yellow}⚠️${colors.reset}  ${message}`);
}

export function errorLog(message: string, error?: Error): void {
  console.error(`${colors.cyan}[${timestamp()}]${colors.reset} ${colors.red}❌${colors.reset} ${message}`);
  if (error?.stack) {
    console.error(`   ${colors.red}Stack:${colors.reset}`, error.stack);
  }
}

export function sayLog(message: string): void {
  console.log(`${colors.cyan}[${timestamp()}]${colors.reset} ${colors.magenta}💬${colors.reset} ${message}`);
}

export function chatLog(from: string, message: string): void {
  console.log(`${colors.cyan}[${timestamp()}]${colors.reset} ${colors.blue}📩${colors.reset} Mensagem de ${from}: ${message.slice(0, 50)}${message.length > 50 ? '...' : ''}`);
}
