import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

// Intenções suportadas
enum Intent {
    OPEN_TICKET_IT = 'abrir_ticket_ti',
    OPEN_TICKET_ELECTRIC = 'abrir_ticket_eletrica',
    RESERVE_EQUIPMENT = 'reservar_equipamento',
    CONSULT_FAQ = 'consultar_faq',
    CONSULT_TICKET = 'consultar_ticket',
    SPEAK_WITH_TECHNICIAN = 'falar_tecnico',
    GREETING = 'saudacao',
    RATING = 'avaliar_atendimento',
    OTHER = 'outro',
}

class IntentServiceTester {
    private ollamaUrl: string;
    private ollamaModel: string;
    private anthropicApiKey: string;
    private enabled: boolean = false;
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
        this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        this.ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
        this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
    }

    async checkOllamaAvailability() {
        try {
            const response = await axios.get(`${this.ollamaUrl}/api/tags`, { timeout: 3000 });
            if (response.status === 200) {
                this.enabled = true;
                const models = response.data.models?.map((m: any) => m.name) || [];
                console.log(`✅ Ollama disponível em ${this.ollamaUrl}. Modelos: ${models.join(', ')}`);
                if (!models.includes(this.ollamaModel)) {
                    console.log(`⚠️ Modelo ${this.ollamaModel} não encontrado.`);
                    this.enabled = false;
                }
            }
        } catch (error: any) {
            console.log(`⚠️ Ollama não disponível em ${this.ollamaUrl}.`);
            this.enabled = false;
        }
    }

    async classify(userMessage: string, forceOllamaOffline: boolean = false) {
        const startTime = Date.now();
        let result;
        let usedProvider = 'ollama';
        let usedModel = this.ollamaModel;

        let isOllamaAvailable = this.enabled;
        if (forceOllamaOffline) {
            console.log(`\n--- SIMULANDO OLLAMA OFFLINE ---`);
            isOllamaAvailable = false;
        }

        try {
            if (isOllamaAvailable) {
                try {
                    result = await this.classifyWithOllama(userMessage);
                } catch (error: any) {
                    console.log(`Ollama falhou (${error.message}), tentando fallback para Claude...`);
                    if (this.anthropicApiKey) {
                        result = await this.classifyWithClaude(userMessage);
                        usedProvider = 'anthropic';
                        usedModel = 'claude-3-haiku-20240307';
                    } else {
                        throw error;
                    }
                }
            } else if (this.anthropicApiKey) {
                console.log(`Ollama desabilitado/offline, usando Claude como fallback... \n[Key length: ${this.anthropicApiKey.length}]`);
                result = await this.classifyWithClaude(userMessage);
                usedProvider = 'anthropic';
                usedModel = 'claude-3-haiku-20240307';
            } else {
                console.log('Intent Detection não disponível (Ollama offline e sem API Key do Claude)');
                return { intent: Intent.OTHER, confidence: 0, processingTime: Date.now() - startTime };
            }

            await this.prisma.intentClassification.create({
                data: {
                    userMessage,
                    intent: result.intent,
                    confidence: result.confidence,
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
        } catch (error: any) {
            console.error(`Erro ao classificar intenção: ${error.message}`);
            return { intent: Intent.OTHER, confidence: 0, processingTime: Date.now() - startTime };
        }
    }

    private getPrompt(userMessage: string): string {
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

    private async classifyWithClaude(userMessage: string) {
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

    private async classifyWithOllama(userMessage: string) {
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
}

async function runTests() {
    const tester = new IntentServiceTester();
    await tester.checkOllamaAvailability();

    console.log('\n--- TESTE 1: Fluxo Normal (Ollama se disponível, senão Claude) ---');
    const msg1 = "Meu computador não quer ligar a tela, tela preta!";
    console.log(`Mensagem: "${msg1}"`);
    const res1 = await tester.classify(msg1);
    console.log("Resultado: ", res1);

    console.log('\n--- TESTE 2: Simular Ollama Offline (Forçando Fallback para Claude) ---');
    const msg2 = "A lâmpada da minha sala queimou, preciso que troquem urgente.";
    console.log(`Mensagem: "${msg2}"`);
    const res2 = await tester.classify(msg2, true);
    console.log("Resultado: ", res2);

    process.exit(0);
}

runTests();
