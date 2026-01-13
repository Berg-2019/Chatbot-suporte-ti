/**
 * Configuração centralizada do Bot de Atendimento
 * 
 * @author Sistema de Atendimento Técnico
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretórios
export const TEMP_DIR = path.resolve(__dirname, "..", "temp");
export const LOGS_DIR = path.resolve(__dirname, "..", "logs");
export const DB_DIR = path.resolve(__dirname, "..", "db");
export const AUTH_DIR = path.resolve(__dirname, "..", "auth_info_baileys");
export const BACKUPS_DIR = path.resolve(__dirname, "..", "backups");

// Prefixo de comandos
export const PREFIX = process.env.PREFIX || "!";

// Nome do bot
export const BOT_NAME = process.env.BOT_NAME || "Bot de Atendimento Técnico";

// Versão do WhatsApp Web
export const WAWEB_VERSION = [2, 3000, 1015901307];

// Timeout para eventos
export const TIMEOUT_IN_MILLISECONDS_BY_EVENT = 500;

// Números root (administradores supremos)
export const ROOT_NUMBERS = (process.env.ROOT_NUMBERS || "556981170027,556884268042")
  .split(",")
  .map(n => n.trim());

// ID do grupo técnico
export const GRUPO_TECNICO_ID = process.env.GRUPO_TECNICO_ID || "";

// Modo desenvolvedor
export const DEVELOPER_MODE = process.env.NODE_ENV === "development";

// ============================================================================
// SETORES DISPONÍVEIS (conforme diagrama)
// ============================================================================
export const SETORES = [
  { id: 1, nome: "RH" },
  { id: 2, nome: "Engenharia" },
  { id: 3, nome: "Licitação" },
  { id: 4, nome: "Compras" },
  { id: 5, nome: "Transporte" },
  { id: 6, nome: "Vendas" },
  { id: 7, nome: "Controladoria" },
  { id: 8, nome: "Apropriação" },
  { id: 9, nome: "Posto Rio Branco" },
  { id: 10, nome: "Posto Porto Velho" },
  { id: 11, nome: "Escritório de Pedreira" },
  { id: 12, nome: "Usina de Asfalto" },
  { id: 13, nome: "Usina de Concreto" },
  { id: 14, nome: "Laboratório de Concreto" },
  { id: 15, nome: "Adm. Posto Rio Branco e Porto Velho" },
];

// ============================================================================
// TIPOS DE CHAMADO (conforme diagrama)
// ============================================================================
export const TIPOS_CHAMADO = [
  { id: 1, nome: "Outros", descricao: "Outros problemas não listados" },
  { id: 2, nome: "Ponto eletrônico", descricao: "Problemas com ponto eletrônico" },
  { id: 3, nome: "Servidores/Acesso Remoto", descricao: "Servidores de arquivos ou acesso remoto" },
  { id: 4, nome: "Sistemas (LOTUS/MOVTRANS/Balança)", descricao: "Problemas com sistemas LOTUS, MOVTRANS ou Sistema de balança" },
  { id: 5, nome: "Acessórios (teclado, mouse)", descricao: "Teclado, mouse e outros acessórios" },
  { id: 6, nome: "Manutenção de PC", descricao: "Manutenção de computadores e limpeza" },
  { id: 7, nome: "Reposição de tinta", descricao: "Reposição de tinta de impressora" },
];

// ============================================================================
// STATUS DE ORDEM DE SERVIÇO
// ============================================================================
export const STATUS_OS = {
  ABERTA: "aberta",
  EM_ANDAMENTO: "em_andamento",
  AGUARDANDO_PECAS: "aguardando_pecas",
  ESCALADA: "escalada",
  FINALIZADA: "finalizada",
  CANCELADA: "cancelada",
};

// ============================================================================
// NÍVEIS DE ESCALAÇÃO
// ============================================================================
export const NIVEIS_ESCALACAO = {
  NIVEL_1: 1,
  NIVEL_2: 2,
  TERCEIRO: 3,
};

// ============================================================================
// ROLES DE USUÁRIO
// ============================================================================
export const ROLES = {
  ROOT: "root",
  ADMIN: "admin",
  TECNICO: "tecnico",
  ALMOXARIFADO: "almoxarifado",
  USER: "user",
};

// ============================================================================
// ETAPAS DO FLUXO DE ATENDIMENTO
// ============================================================================
export const ETAPAS_FLUXO = {
  INICIO: "inicio",
  SELECAO_SETOR: "selecao_setor",
  SELECAO_TIPO: "selecao_tipo",
  COLETA_LOCAL: "coleta_local",
  COLETA_EQUIPAMENTO: "coleta_equipamento",
  COLETA_PATRIMONIO: "coleta_patrimonio",
  COLETA_PROBLEMA: "coleta_problema",
  CONFIRMACAO: "confirmacao",
  AGUARDANDO_TECNICO: "aguardando_tecnico",
  EM_ATENDIMENTO: "em_atendimento",
  FINALIZADO: "finalizado",
};

// ============================================================================
// MENSAGENS PADRÃO
// ============================================================================
export const MENSAGENS = {
  SAUDACAO: `👋 Olá! Eu sou o *${BOT_NAME}*.

Estou aqui para registrar sua solicitação de suporte técnico.

Para começar, por favor me informe:
*De qual setor você está entrando em contato?*

`,
  
  SELECIONE_SETOR: `📋 *Selecione seu setor:*

${SETORES.map(s => `*${s.id}* - ${s.nome}`).join("\n")}

_Digite o número do seu setor:_`,

  SELECIONE_TIPO: `🔧 *Qual o tipo do problema?*

${TIPOS_CHAMADO.map(t => `*${t.id}* - ${t.nome}`).join("\n")}

_Digite o número correspondente:_`,

  SOLICITE_LOCAL: `📍 *Informe o local do atendimento:*
_(Ex: Sala 201, Recepção, Almoxarifado)_`,

  SOLICITE_EQUIPAMENTO: `💻 *Qual equipamento precisa de suporte?*
_(Ex: Computador Dell, Impressora HP, Notebook)_`,

  SOLICITE_PATRIMONIO: `🏷️ *Informe o número de patrimônio (se houver):*
_(Digite "não tem" se não souber)_`,

  SOLICITE_PROBLEMA: `📝 *Descreva detalhadamente o problema:*`,

  OS_CRIADA: (osId) => `✅ *Ordem de Serviço #${osId} criada com sucesso!*

Sua solicitação foi registrada e encaminhada para a equipe técnica.

Você receberá atualizações sobre o andamento do atendimento.

_Para consultar o status, digite:_ *!status ${osId}*`,

  OS_ATRIBUIDA: (osId, tecnico) => `🔔 *OS #${osId} atribuída!*

O técnico *${tecnico}* assumiu seu chamado e entrará em contato em breve.`,

  OS_FINALIZADA: (osId) => `✅ *Chamado #${osId} finalizado!*

Seu atendimento foi concluído com sucesso.
Obrigado por utilizar nosso suporte técnico!

_Caso precise de algo mais, é só me chamar!_`,

  OPCAO_INVALIDA: "❌ Opção inválida. Por favor, escolha uma das opções disponíveis.",

  ERRO_SISTEMA: "⚠️ Ocorreu um erro no sistema. Por favor, tente novamente ou digite *!ajuda* para ver os comandos disponíveis.",

  CANCELADO: "❌ Operação cancelada. Digite *oi* para iniciar um novo atendimento.",
};
