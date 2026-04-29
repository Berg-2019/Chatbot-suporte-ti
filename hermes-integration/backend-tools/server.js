/**
 * Hermes Helpdesk Tools Server
 * 
 * Servidor bridge que expõe tools do helpdesk para o Hermes Agent.
 * Traduz chamadas de tools do Hermes em requisições HTTP para o backend NestJS.
 * 
 * Este servidor pode ser usado como alternativa ao acesso direto do Hermes
 * aos endpoints /api/hermes/* do backend.
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const HERMES_API_KEY = process.env.HERMES_API_KEY || 'hermes_dev_key_change_me';

// Cliente HTTP com autenticação para o backend
const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'x-api-key': HERMES_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ============================================
// TOOLS REGISTRY - Definição das ferramentas
// ============================================

const tools = [
  // --- Ticket Tools ---
  {
    name: 'create_helpdesk_ticket',
    description: 'Cria um novo ticket de suporte no sistema de helpdesk',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título resumido do problema (max 100 caracteres)' },
        description: { type: 'string', description: 'Descrição detalhada do problema' },
        area: { type: 'string', enum: ['TI', 'ELECTRIC'], description: 'Área do chamado' },
        sector: { type: 'string', description: 'Departamento do solicitante' },
        location: { type: 'string', description: 'Localização física do equipamento/problema' },
        requesterName: { type: 'string', description: 'Nome completo do solicitante' },
        phone: { type: 'string', description: 'Número de telefone (formato: 5511999999999)' },
      },
      required: ['title', 'description', 'area', 'phone'],
    },
  },
  {
    name: 'check_helpdesk_ticket',
    description: 'Consulta o status e detalhes de um ticket existente',
    parameters: {
      type: 'object',
      properties: {
        ticket_id: { type: 'string', description: 'Número ou ID do ticket (formato: #1234 ou UUID)' },
      },
      required: ['ticket_id'],
    },
  },
  {
    name: 'check_active_ticket',
    description: 'Verifica se há ticket ativo para um telefone',
    parameters: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Número de telefone (formato: 5511999999999)' },
      },
      required: ['phone'],
    },
  },
  // --- FAQ Tools ---
  {
    name: 'search_helpdesk_faq',
    description: 'Busca respostas na base de conhecimento do helpdesk',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Pergunta ou keywords para busca' },
        category: {
          type: 'string',
          enum: ['ACCESS', 'CONFIG', 'NETWORK', 'HARDWARE', 'SOFTWARE', 'GENERAL'],
          description: 'Categoria opcional para filtrar resultados',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'mark_faq_helpful',
    description: 'Marca um artigo FAQ como útil ou não útil',
    parameters: {
      type: 'object',
      properties: {
        faq_id: { type: 'string', description: 'ID do artigo FAQ' },
        helpful: { type: 'boolean', description: 'true se útil, false se não útil' },
      },
      required: ['faq_id', 'helpful'],
    },
  },
  // --- Equipment Tools ---
  {
    name: 'check_equipment_availability',
    description: 'Verifica disponibilidade de equipamento para reserva',
    parameters: {
      type: 'object',
      properties: {
        stock_type: {
          type: 'string',
          enum: ['NOTEBOOK', 'MONITOR', 'KEYBOARD', 'MOUSE', 'HEADSET', 'WEBCAM', 'DOCK_STATION', 'OTHER'],
          description: 'Tipo do equipamento',
        },
      },
      required: ['stock_type'],
    },
  },
  {
    name: 'create_equipment_reservation',
    description: 'Cria uma reserva de equipamento',
    parameters: {
      type: 'object',
      properties: {
        stockItemId: { type: 'string', description: 'ID do item de estoque a reservar' },
        startTime: { type: 'string', description: 'Data de início (ISO8601)' },
        endTime: { type: 'string', description: 'Data de fim (ISO8601)' },
        notes: { type: 'string', description: 'Motivo do empréstimo' },
        phone: { type: 'string', description: 'Telefone do solicitante' },
        requesterName: { type: 'string', description: 'Nome do solicitante' },
        requesterSector: { type: 'string', description: 'Setor do solicitante' },
      },
      required: ['stockItemId', 'startTime', 'endTime', 'phone', 'requesterName'],
    },
  },
  // --- Escalation Tools ---
  {
    name: 'notify_agent_escalation',
    description: 'Escala uma conversa para um atendente humano',
    parameters: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Telefone do usuário' },
        ticketId: { type: 'string', description: 'ID do ticket (se houver)' },
        ticketNumber: { type: 'string', description: 'Número do ticket (se houver)' },
        problemSummary: { type: 'string', description: 'Resumo do problema' },
        conversationHistory: { type: 'array', description: 'Histórico da conversa' },
        attemptedSolutions: { type: 'array', items: { type: 'string' }, description: 'Soluções tentadas' },
        urgency: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], description: 'Nível de urgência' },
        area: { type: 'string', enum: ['TI', 'ELECTRIC'], description: 'Área do problema' },
      },
      required: ['phone', 'problemSummary', 'urgency', 'area'],
    },
  },
  {
    name: 'get_agent_status',
    description: 'Verifica status dos agentes e tempo de resposta',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

// ============================================
// IMPLEMENTAÇÕES DAS TOOLS
// ============================================

const toolImplementations = {
  async create_helpdesk_ticket(params) {
    const res = await api.post('/api/hermes/tickets', params);
    return res.data;
  },

  async check_helpdesk_ticket({ ticket_id }) {
    const cleanId = ticket_id.replace('#', '');
    const res = await api.get(`/api/hermes/tickets/${cleanId}`);
    return res.data;
  },

  async check_active_ticket({ phone }) {
    const res = await api.get(`/api/hermes/tickets/by-phone/${phone}`);
    return res.data;
  },

  async search_helpdesk_faq({ query, category }) {
    const params = { q: query };
    if (category) params.category = category;
    const res = await api.get('/api/hermes/faq/search', { params });
    return res.data;
  },

  async mark_faq_helpful({ faq_id, helpful }) {
    const res = await api.post(`/api/hermes/faq/${faq_id}/helpful`, { helpful });
    return res.data;
  },

  async check_equipment_availability({ stock_type }) {
    const res = await api.get('/api/hermes/stock', {
      params: { stockType: stock_type },
    });
    return res.data;
  },

  async create_equipment_reservation(params) {
    const res = await api.post('/api/hermes/reservations', params);
    return res.data;
  },

  async notify_agent_escalation(params) {
    const res = await api.post('/api/hermes/escalate', params);
    return res.data;
  },

  async get_agent_status() {
    const res = await api.get('/api/hermes/agents/status');
    return res.data;
  },
};

// ============================================
// ROTAS
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'hermes-backend-tools',
    backend: BACKEND_URL,
    tools_count: tools.length,
    timestamp: new Date().toISOString(),
  });
});

// Listar tools disponíveis
app.get('/api/tools', (req, res) => {
  res.json({ tools });
});

// Executar uma tool
app.post('/api/tools/execute', async (req, res) => {
  const { tool_name, parameters } = req.body;

  if (!tool_name) {
    return res.status(400).json({ error: 'tool_name é obrigatório' });
  }

  const tool = tools.find(t => t.name === tool_name);
  if (!tool) {
    return res.status(404).json({
      error: `Tool '${tool_name}' não encontrada`,
      available_tools: tools.map(t => t.name),
    });
  }

  const implementation = toolImplementations[tool_name];
  if (!implementation) {
    return res.status(501).json({ error: `Tool '${tool_name}' não implementada` });
  }

  try {
    console.log(`🔧 Executando tool: ${tool_name}`);
    const result = await implementation(parameters || {});
    console.log(`✅ Tool ${tool_name} executada com sucesso`);
    res.json({ success: true, tool: tool_name, result });
  } catch (error) {
    console.error(`❌ Erro na tool ${tool_name}:`, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      tool: tool_name,
      error: error.response?.data?.message || error.message,
      details: error.response?.data || null,
    });
  }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.TOOLS_PORT || 3003;

app.listen(PORT, () => {
  console.log('');
  console.log('🛠️  Hermes Helpdesk Tools Server');
  console.log('================================');
  console.log(`   URL:     http://localhost:${PORT}`);
  console.log(`   Backend: ${BACKEND_URL}`);
  console.log(`   Tools:   ${tools.length} disponíveis`);
  console.log(`   API Key: ${HERMES_API_KEY ? '✅ configurada' : '❌ não configurada'}`);
  console.log('');
  console.log('   Endpoints:');
  console.log('   GET  /health          - Health check');
  console.log('   GET  /api/tools       - Listar tools');
  console.log('   POST /api/tools/execute - Executar tool');
  console.log('');
});
