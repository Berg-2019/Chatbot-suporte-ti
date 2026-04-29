/**
 * Script de teste para validar integração com MiniMax API
 *
 * Uso:
 *   npx tsx scripts/test-minimax.ts
 */

import axios from 'axios';
import 'dotenv/config';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_API_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2';

interface TestResult {
  success: boolean;
  model: string;
  latency: number;
  response?: string;
  error?: string;
}

async function testMinimaxConnection(): Promise<TestResult> {
  console.log('\n🔍 Testando conexão com MiniMax API...\n');

  if (!MINIMAX_API_KEY || MINIMAX_API_KEY === 'seu_minimax_api_key_aqui') {
    return {
      success: false,
      model: 'N/A',
      latency: 0,
      error: 'MINIMAX_API_KEY não configurado no .env',
    };
  }

  const startTime = Date.now();

  try {
    const response = await axios.post(
      MINIMAX_API_URL,
      {
        model: 'abab6-chat',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente de testes. Responda apenas "OK" para confirmar funcionamento.',
          },
          {
            role: 'user',
            content: 'Teste de conexão',
          },
        ],
        temperature: 0.1,
        max_tokens: 50,
      },
      {
        headers: {
          Authorization: `Bearer ${MINIMAX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const latency = Date.now() - startTime;

    // Verificar resposta
    const reply = response.data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error('Resposta vazia da API');
    }

    return {
      success: true,
      model: 'abab6-chat',
      latency,
      response: reply,
    };
  } catch (error: any) {
    const latency = Date.now() - startTime;

    let errorMessage = error.message;

    if (error.response) {
      errorMessage = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;
    }

    return {
      success: false,
      model: 'abab6-chat',
      latency,
      error: errorMessage,
    };
  }
}

async function testIntentClassification(): Promise<void> {
  console.log('\n🧠 Testando classificação de intenção...\n');

  if (!MINIMAX_API_KEY || MINIMAX_API_KEY === 'seu_minimax_api_key_aqui') {
    console.log('⚠️  MiniMax não configurado, pulando teste de intent\n');
    return;
  }

  const testCases = [
    'Meu computador não liga',
    'Quero reservar um projetor',
    'A impressora está travada',
    'Sem internet aqui',
    'Oi, preciso falar com técnico',
  ];

  for (const message of testCases) {
    try {
      const startTime = Date.now();

      const response = await axios.post(
        MINIMAX_API_URL,
        {
          model: 'abab6-chat',
          messages: [
            {
              role: 'system',
              content: 'Classifique a intenção e retorne apenas JSON: {"intent":"nome","confidence":0.95}',
            },
            {
              role: 'user',
              content: `Mensagem: "${message}"\n\nClassifique em: abrir_ticket_ti, abrir_ticket_eletrica, reservar_equipamento, falar_tecnico, outro`,
            },
          ],
          temperature: 0.2,
          max_tokens: 100,
        },
        {
          headers: {
            Authorization: `Bearer ${MINIMAX_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const latency = Date.now() - startTime;
      const reply = response.data.choices?.[0]?.message?.content?.trim();

      // Extrair JSON
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`✅ "${message}"`);
        console.log(`   → Intent: ${parsed.intent} (${(parsed.confidence * 100).toFixed(0)}%) [${latency}ms]\n`);
      } else {
        console.log(`⚠️  "${message}"`);
        console.log(`   → Resposta não-JSON: ${reply}\n`);
      }
    } catch (error: any) {
      console.log(`❌ "${message}"`);
      console.log(`   → Erro: ${error.message}\n`);
    }
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║       🤖 TESTE DE INTEGRAÇÃO MINIMAX API                      ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  // Teste 1: Conexão básica
  const result = await testMinimaxConnection();

  if (result.success) {
    console.log('✅ Status: CONECTADO');
    console.log(`📊 Modelo: ${result.model}`);
    console.log(`⚡ Latência: ${result.latency}ms`);
    console.log(`💬 Resposta: ${result.response}`);
  } else {
    console.log('❌ Status: FALHOU');
    console.log(`❗ Erro: ${result.error}`);
    console.log('\n💡 Verifique:');
    console.log('   1. MINIMAX_API_KEY está configurado no .env');
    console.log('   2. Chave API é válida');
    console.log('   3. Créditos disponíveis na conta');
    console.log('   4. Conexão com internet');
    process.exit(1);
  }

  // Teste 2: Classificação de intenções
  await testIntentClassification();

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║       ✅ TODOS OS TESTES CONCLUÍDOS                           ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
