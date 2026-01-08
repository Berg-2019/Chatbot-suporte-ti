const config = require('../config/config');
const { botLogger } = require('./logger');
const database = require('../db/database');

/**
 * Ollama Client com fallback melhorado
 * Esta versão inclui verificações adicionais e fallback mais robusto
 */
class OllamaClient {
  constructor() {
    this.baseUrl = config.ollama.baseUrl;
    this.model = config.ollama.model;
    this.isAvailable = false;
    this.checkConnection();
  }

  async checkConnection() {
    try {
      // Verificar se o Ollama está rodando
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos de timeout
      
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        this.isAvailable = true;
        console.log('✅ Ollama conectado com sucesso');
        botLogger.systemInfo({ ollama: 'connected', model: this.model });
      } else {
        this.isAvailable = false;
        console.log('⚠️ Ollama não está disponível - Status:', response.status);
        botLogger.systemWarning({ ollama: 'not_available', status: response.status });
      }
    } catch (error) {
      this.isAvailable = false;
      console.log('⚠️ Erro ao conectar com Ollama:', error.message);
      botLogger.systemWarning({ ollama: 'connection_error', error: error.message });
    }
  }

  async generateResponse(prompt, systemPrompt = '') {
    // Verificar se a IA está habilitada
    const isEnabled = await database.buscarConfiguracao('ollama_enabled') !== 'false';
    
    if (!isEnabled || !this.isAvailable) {
      console.log('⚠️ Ollama não disponível ou desabilitado, pulando análise IA');
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout
      
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
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data.response?.trim() || null;

    } catch (error) {
      console.error('Erro na API Ollama:', error);
      botLogger.botError(error, 'OLLAMA_API');
      
      // Tentar reconectar
      await this.checkConnection();
      return null;
    }
  }

  async analyzeUserMessage(message) {
    // Verificar se a IA está habilitada
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getAvailableModels() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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

// Função para verificar e iniciar Ollama se necessário
async function ensureOllamaRunning() {
  try {
    // Verificar se o Ollama está rodando
    const response = await fetch('http://localhost:11434/api/tags', {
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('✅ Ollama já está rodando');
      return true;
    }
  } catch (error) {
    console.log('⚠️ Ollama não está rodando');
  }
  
  return false;
}

module.exports = {
  OllamaClient: new OllamaClient(),
  ensureOllamaRunning
};
