/**
 * Intent Classification Service Client
 * Integra com o serviço Python de classificação de intenção
 */

import axios from 'axios';

const INTENT_SERVICE_URL = process.env.INTENT_SERVICE_URL || 'http://localhost:5000';

class IntentService {
    constructor() {
        this.available = false;
        this.checkAvailability();
    }

    /**
     * Verifica se o serviço de intenção está disponível
     */
    async checkAvailability() {
        try {
            const response = await axios.get(`${INTENT_SERVICE_URL}/health`, { timeout: 3000 });
            this.available = response.data?.status === 'ok';
            console.log(`🧠 Intent Service: ${this.available ? '✅ Disponível' : '❌ Indisponível'}`);
        } catch (e) {
            this.available = false;
            console.log('🧠 Intent Service: ❌ Indisponível (fallback para regras simples)');
        }
    }

    /**
     * Classifica a intenção de uma mensagem
     * @param {string} text - Texto da mensagem
     * @param {boolean} hasActiveTicket - Se o usuário tem ticket ativo
     * @returns {Promise<{intent: string, confidence: number, shouldRouteToTech: boolean}>}
     */
    async classify(text, hasActiveTicket = false) {
        // Se serviço indisponível, usar regras simples
        if (!this.available) {
            return this.classifyWithRules(text, hasActiveTicket);
        }

        try {
            const response = await axios.post(
                `${INTENT_SERVICE_URL}/classify`,
                { text, has_active_ticket: hasActiveTicket },
                { timeout: 3000 }
            );

            return {
                intent: response.data.intent,
                confidence: response.data.confidence,
                shouldRouteToTech: response.data.should_route_to_tech
            };
        } catch (e) {
            console.warn('⚠️ Falha ao classificar via serviço, usando regras:', e.message);
            return this.classifyWithRules(text, hasActiveTicket);
        }
    }

    /**
     * Classificação simples baseada em regras (fallback)
     */
    classifyWithRules(text, hasActiveTicket) {
        const normalizedText = text.toLowerCase().trim();

        // Palavras-chave para cada intenção
        const patterns = {
            greeting: ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'eae', 'hello', 'hi'],
            status_query: ['status', 'andamento', 'chamado', 'consultar', 'acompanhar', 'previsão'],
            new_ticket: ['problema', 'preciso', 'ajuda', 'não funciona', 'erro', 'parou', 'quebrou', 'chamado de ti', 'chamado de elétrica'],
        };

        // Verificar padrões
        for (const [intent, keywords] of Object.entries(patterns)) {
            if (keywords.some(kw => normalizedText.includes(kw))) {
                // Se tem ticket ativo e é saudação, provavelmente quer continuar conversa
                if (hasActiveTicket && intent === 'greeting') {
                    return {
                        intent: 'chat_with_tech',
                        confidence: 0.7,
                        shouldRouteToTech: true
                    };
                }
                return {
                    intent,
                    confidence: 0.6,
                    shouldRouteToTech: hasActiveTicket && intent !== 'new_ticket'
                };
            }
        }

        // Default: se tem ticket ativo, provavelmente é continuação de conversa
        if (hasActiveTicket) {
            return {
                intent: 'chat_with_tech',
                confidence: 0.5,
                shouldRouteToTech: true
            };
        }

        // Sem ticket ativo e sem padrão reconhecido
        return {
            intent: 'unknown',
            confidence: 0.3,
            shouldRouteToTech: false
        };
    }
}

export const intentService = new IntentService();
