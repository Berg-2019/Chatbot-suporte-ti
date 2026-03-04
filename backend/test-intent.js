const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
require('dotenv').config();

class IntentServiceTester {
    constructor() {
        this.prisma = new PrismaClient();
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        this.ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
        this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
        this.enabled = false;
    }

    async checkOllamaAvailability() {
        try {
            const response = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 3000 });
            if (response.status === 200) {
                this.enabled = true;
                const models = response.data.models ? response.data.models.map(m => m.name) : [];
                console.log(`✅ Ollama disponível em ${this.ollamaUrl}. Modelos: ${models.join(', ')}`);
                if (!models.includes(this.ollamaModel)) {
                    console.log(`⚠️ Modelo ${this.ollamaModel} não encontrado.`);
                    this.enabled = false;
                }
            }
        } catch (error) {
            console.log(`⚠️ Ollama não disponível em ${this.ollamaUrl}.`);
            this.enabled = false;
        }
    }

    getPrompt(userMessage) {
        return `Você é um classificador de intenções para um sistema de helpdesk de TI.

Analise a mensagem do usuário e classifique em UMA das intenções abaixo:
- abrir_ticket_ti: Problemas com computador, rede, sistema, software, impressora, internet
- abrir_ticket_eletrica: Problemas elétricos, ar-condicionado, iluminação, tomadas
- reservar_equipamento: Quer reservar notebook, projetor, cabo, adaptador
- consultar_faq: Pergunta genérica
- consultar_ticket: Quer saber status de um ticket
- falar_tecnico: Quer falar com uma pessoa
- avaliar_atendimento: Quer dar nota
- saudacao: Apenas cumprimentando
- outro: Não se encaixa em nenhuma categoria

Mensagem: "${userMessage}"

Retorne APENAS um JSON:
{
  "intent": "nome_da_intencao",
  "confidence": 0.95,
  "entities": {}
}`;
    }

    async classifyWithClaude(userMessage) {
        const prompt = this.getPrompt(userMessage);
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            { model: 'claude-3-haiku-20240307', max_tokens: 200, temperature: 0.1, messages: [{ role: 'user', content: prompt }] },
            { headers: { 'x-api-key': this.anthropicApiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, timeout: 15000 }
        );
        const text = response.data.content[0].text;
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('Claude não retornou JSON');
        return JSON.parse(match[0]);
    }

    async classifyWithOllama(userMessage) {
        const prompt = this.getPrompt(userMessage);
        const response = await axios.post(`${this.ollamaUrl}/api/generate`,
            { model: this.ollamaModel, prompt, stream: false, options: { temperature: 0.3 } },
            { timeout: 30000 }
        );
        const text = response.data.response;
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('Ollama não retornou JSON');
        return JSON.parse(match[0]);
    }

    async classify(userMessage, forceOllamaOffline = false) {
        const startTime = Date.now();
        let result;
        let usedProvider = 'ollama';
        let usedModel = this.ollamaModel;

        let isOllamaAvailable = this.enabled;
        if (forceOllamaOffline) {
            console.log(`\n--- SIMULANDO OLLAMA CAÍDO/OFFLINE ---`);
            isOllamaAvailable = false;
        }

        try {
            if (isOllamaAvailable) {
                try {
                    result = await this.classifyWithOllama(userMessage);
                } catch (error) {
                    console.log(`Ollama falhou (${error.message}), tentando fallback para Claude...`);
                    if (this.anthropicApiKey && this.anthropicApiKey.length > 5) {
                        result = await this.classifyWithClaude(userMessage);
                        usedProvider = 'anthropic';
                        usedModel = 'claude-3-haiku-20240307';
                    } else {
                        throw error;
                    }
                }
            } else if (this.anthropicApiKey && this.anthropicApiKey.length > 5) {
                console.log(`Ollama desabilitado/offline, usando Claude como fallback... \n[Key length: ${this.anthropicApiKey.length}]`);
                result = await this.classifyWithClaude(userMessage);
                usedProvider = 'anthropic';
                usedModel = 'claude-3-haiku-20240307';
            } else {
                console.log('Intent Detection não disponível (Ollama offline e sem API Key do Claude)');
                return { intent: 'outro', confidence: 0, processingTime: Date.now() - startTime };
            }

            await this.prisma.intentClassification.create({
                data: {
                    userMessage,
                    intent: result.intent,
                    confidence: parseFloat(result.confidence) || 0.5,
                    entities: result.entities || {},
                    provider: usedProvider,
                    model: usedModel,
                    processingTime: Date.now() - startTime,
                },
            });

            return {
                ...result,
                provider: usedProvider,
                processingTime: Date.now() - startTime,
            };
        } catch (error) {
            console.error(`Erro ao classificar intenção: ${error.message}`);
            return { intent: 'outro', confidence: 0, processingTime: Date.now() - startTime };
        }
    }
}

async function runTests() {
    const tester = new IntentServiceTester();
    await tester.checkOllamaAvailability();

    console.log('\n======================================================');
    console.log('TESTE 1: Fluxo Normal (Ollama se disponível, senão falha/fallback)');
    console.log('======================================================');
    const msg1 = "Meu computador não quer ligar a tela de jeito nenhum, a luz não acende!";
    console.log(`Mensagem Teste: "${msg1}"\n`);
    const res1 = await tester.classify(msg1);
    console.log("-> Resultado LLM:\n", JSON.stringify(res1, null, 2));

    console.log('\n======================================================');
    console.log('TESTE 2: Simular Ollama Offline (Forçando Fallback para Claude)');
    console.log('======================================================');
    const msg2 = "A lâmpada da minha sala queimou, preciso que troquem urgente porque ta escuro.";
    console.log(`Mensagem Teste: "${msg2}"`);
    const res2 = await tester.classify(msg2, true);
    console.log("-> Resultado LLM:\n", JSON.stringify(res2, null, 2));

    process.exit(0);
}

runTests();
