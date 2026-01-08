const config = require('../config/config');
const { botLogger } = require('./logger');

class OllamaClient {
  constructor() {
    this.baseUrl = config.ollama.baseUrl;
    this.model = config.ollama.model;
    this.isAvailable = false;
    this.checkConnection();
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (response.ok) {
        this.isAvailable = true;
        console.log('✅ Ollama conectado com sucesso');
        botLogger.systemInfo({ ollama: 'connected', model: this.model });
      } else {
        this.isAvailable = false;
        console.log('⚠️ Ollama não está disponível');
      }
    } catch (error) {
      this.isAvailable = false;
      console.log('⚠️ Erro ao conectar com Ollama:', error.message);
    }
  }

  async generateResponse(prompt, systemPrompt = '') {
    if (!this.isAvailable) {
      console.log('⚠️ Ollama não disponível, pulando análise IA');
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: systemPrompt ? `${systemPrompt}\n\nUsuário: ${prompt}` : prompt,
          stream: false,
          options: {
            temperature: 0.7,
            max_tokens: 200
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response?.trim() || null;

    } catch (error) {
      console.error('Erro na API Ollama:', error);
      botLogger.botError(error, 'OLLAMA_API');
      return null;
    }
  }

  async analyzeUserMessage(message) {
    // Verificar se a IA está habilitada
    const database = require('../db/database');
    const isEnabled = await database.buscarConfiguracao('ollama_enabled') !== 'false';
    
    if (!isEnabled || !this.isAvailable) {
      return 'OUTRO'; // Fallback se IA desabilitada ou indisponível
    }

    const systemPrompt = `Você é um assistente técnico de TI. Analise a mensagem do usuário e determine se ela contém:

1. Uma saudação ou cumprimento (ex: "oi", "olá", "bom dia")
2. Um problema técnico específico que precisa de atendimento
3. Uma pergunta sobre como usar o sistema
4. Outro tipo de mensagem

Responda APENAS com uma das opções:
- SAUDACAO: se for uma saudação
- PROBLEMA: se descrever um problema técnico
- DUVIDA: se for uma pergunta sobre o sistema
- OUTRO: para outros casos

Exemplos:
- "oi" = SAUDACAO
- "minha impressora não está funcionando" = PROBLEMA
- "como faço para abrir um chamado?" = DUVIDA
- "obrigado" = OUTRO`;

    const response = await this.generateResponse(message, systemPrompt);
    
    if (!response) {
      return 'OUTRO'; // Fallback se a IA não estiver disponível
    }

    const classification = response.toUpperCase().trim();
    
    // Validar resposta
    if (['SAUDACAO', 'PROBLEMA', 'DUVIDA', 'OUTRO'].includes(classification)) {
      return classification;
    }
    
    return 'OUTRO'; // Fallback para respostas inválidas
  }

  async analyzeProblem(problemDescription) {
    // Verificar se a IA está habilitada
    const database = require('../db/database');
    const isEnabled = await database.buscarConfiguracao('ollama_enabled') !== 'false';
    
    if (!isEnabled || !this.isAvailable) {
      return {
        categoria: 'Sistema',
        prioridade: 'Normal',
        analise: 'Problema reportado pelo usuário'
      };
    }

    const systemPrompt = `Você é um assistente técnico de TI. Analise o problema descrito pelo usuário e forneça:

1. Categoria do problema (Hardware, Software, Rede, Impressora, Sistema, Outro)
2. Prioridade sugerida (Alta, Normal, Baixa)
3. Breve análise do problema (máximo 100 caracteres)

Formato da resposta:
Categoria: [categoria]
Prioridade: [prioridade]
Análise: [análise breve]

Exemplo:
Categoria: Impressora
Prioridade: Normal
Análise: Problema comum de conectividade com impressora`;

    const response = await this.generateResponse(problemDescription, systemPrompt);
    
    if (!response) {
      return {
        categoria: 'Sistema',
        prioridade: 'Normal',
        analise: 'Problema reportado pelo usuário'
      };
    }

    // Extrair informações da resposta
    const lines = response.split('\n');
    let categoria = 'Sistema';
    let prioridade = 'Normal';
    let analise = 'Problema reportado pelo usuário';

    lines.forEach(line => {
      if (line.toLowerCase().includes('categoria:')) {
        categoria = line.split(':')[1]?.trim() || 'Sistema';
      } else if (line.toLowerCase().includes('prioridade:')) {
        prioridade = line.split(':')[1]?.trim() || 'Normal';
      } else if (line.toLowerCase().includes('análise:') || line.toLowerCase().includes('analise:')) {
        analise = line.split(':')[1]?.trim() || 'Problema reportado pelo usuário';
      }
    });

    return { categoria, prioridade, analise };
  }

  async generateWelcomeMessage(userName = 'usuário') {
    // Verificar se a IA está habilitada
    const database = require('../db/database');
    const isEnabled = await database.buscarConfiguracao('ollama_enabled') !== 'false';
    
    if (!isEnabled || !this.isAvailable) {
      return `👋 Olá! Sou seu assistente técnico de TI.

🔧 Para abrir um chamado, descreva seu problema técnico
📋 Use !ajuda para ver todos os comandos disponíveis
💬 Estou aqui para ajudar com questões de TI!`;
    }

    const systemPrompt = `Você é um assistente técnico de TI amigável. Crie uma mensagem de boas-vindas personalizada para um usuário que está entrando em contato pela primeira vez.

A mensagem deve:
- Ser calorosa e profissional
- Explicar brevemente como o sistema funciona
- Mencionar que pode descrever problemas técnicos
- Mencionar o comando !ajuda para ver mais opções
- Ser concisa (máximo 200 caracteres)

Use emojis apropriados e mantenha um tom amigável.`;

    const response = await this.generateResponse(`Criar mensagem de boas-vindas para ${userName}`, systemPrompt);
    
    if (!response) {
      return `👋 Olá! Sou seu assistente técnico de TI.

🔧 Para abrir um chamado, descreva seu problema técnico
📋 Use !ajuda para ver todos os comandos disponíveis
💬 Estou aqui para ajudar com questões de TI!`;
    }

    return response;
  }

  async isOllamaRunning() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        return data.models || [];
      }
      return [];
    } catch (error) {
      console.error('Erro ao buscar modelos Ollama:', error);
      return [];
    }
  }

  getStatus() {
    return {
      available: this.isAvailable,
      baseUrl: this.baseUrl,
      model: this.model
    };
  }
}

module.exports = new OllamaClient();
