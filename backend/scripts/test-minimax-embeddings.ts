/**
 * Script de teste para MiniMax Embeddings API
 *
 * Uso:
 *   npx tsx scripts/test-minimax-embeddings.ts
 */

import axios from 'axios';
import 'dotenv/config';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID;
const MINIMAX_EMBEDDINGS_URL = 'https://api.minimax.io/v1/embeddings';

async function testEmbeddings() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║       🧠 TESTE MINIMAX EMBEDDINGS API                         ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Verificar credenciais
  if (!MINIMAX_API_KEY || MINIMAX_API_KEY === 'seu_minimax_api_key_aqui') {
    console.log('❌ MINIMAX_API_KEY não configurado no .env');
    console.log('\n💡 Adicione no .env:');
    console.log('   MINIMAX_API_KEY=sk-xxx...');
    console.log('   MINIMAX_GROUP_ID=2029601411049730229\n');
    process.exit(1);
  }

  if (!MINIMAX_GROUP_ID) {
    console.log('❌ MINIMAX_GROUP_ID não configurado no .env');
    console.log('\n💡 Adicione no .env:');
    console.log('   MINIMAX_GROUP_ID=2029601411049730229\n');
    process.exit(1);
  }

  console.log('✅ Credenciais configuradas');
  console.log(`📋 API Key: ${MINIMAX_API_KEY.substring(0, 10)}...`);
  console.log(`📋 Group ID: ${MINIMAX_GROUP_ID}\n`);

  // Teste 1: Embedding único
  console.log('🔍 Teste 1: Gerar embedding único\n');

  try {
    const startTime = Date.now();

    const response = await axios.post(
      MINIMAX_EMBEDDINGS_URL,
      {
        model: 'embo-01',
        texts: ['Meu computador não liga'],
        type: 'db',
      },
      {
        headers: {
          Authorization: `Bearer ${MINIMAX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        params: {
          GroupId: MINIMAX_GROUP_ID,
        },
        timeout: 15000,
      }
    );

    const latency = Date.now() - startTime;
    const data = response.data;

    console.log(`✅ Status: ${response.status} ${response.statusText}`);
    console.log(`⚡ Latência: ${latency}ms`);
    console.log(`📊 Modelo: ${data.model || 'embo-01'}`);
    console.log(`🔢 Dimensões: ${data.vectors[0].length}`);
    console.log(`🎫 Tokens: ${data.total_tokens}`);
    console.log(`💰 Custo estimado: ~$${(data.total_tokens / 1000000 * 0.1).toFixed(6)}`);
    console.log(`\n📌 Embedding preview (primeiros 10 valores):`);
    console.log(`   [${data.vectors[0].slice(0, 10).map((v: number) => v.toFixed(4)).join(', ')}...]`);
  } catch (error: any) {
    console.log('❌ Falha no Teste 1');
    if (error.response) {
      console.log(`   HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Erro: ${error.message}`);
    }
    process.exit(1);
  }

  // Teste 2: Embedding em batch
  console.log('\n\n🔍 Teste 2: Gerar embeddings em batch\n');

  const testTexts = [
    'Computador não liga',
    'Impressora travada',
    'Sem conexão com internet',
    'Sistema lento',
    'Tela azul da morte',
  ];

  try {
    const startTime = Date.now();

    const response = await axios.post(
      MINIMAX_EMBEDDINGS_URL,
      {
        model: 'embo-01',
        texts: testTexts,
        type: 'db',
      },
      {
        headers: {
          Authorization: `Bearer ${MINIMAX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        params: {
          GroupId: MINIMAX_GROUP_ID,
        },
        timeout: 20000,
      }
    );

    const latency = Date.now() - startTime;
    const data = response.data;

    console.log(`✅ Status: ${response.status} ${response.statusText}`);
    console.log(`⚡ Latência: ${latency}ms (${(latency / testTexts.length).toFixed(0)}ms/texto)`);
    console.log(`🔢 Embeddings gerados: ${data.vectors.length}`);
    console.log(`🎫 Tokens totais: ${data.total_tokens}`);
    console.log(`💰 Custo estimado: ~$${(data.total_tokens / 1000000 * 0.1).toFixed(6)}\n`);

    testTexts.forEach((text, idx) => {
      console.log(`   ${idx + 1}. "${text}"`);
      console.log(`      → [${data.vectors[idx].slice(0, 5).map((v: number) => v.toFixed(3)).join(', ')}...]`);
    });
  } catch (error: any) {
    console.log('❌ Falha no Teste 2');
    if (error.response) {
      console.log(`   HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Erro: ${error.message}`);
    }
    process.exit(1);
  }

  // Teste 3: Similaridade semântica
  console.log('\n\n🔍 Teste 3: Calcular similaridade semântica\n');

  try {
    const texts = [
      'O computador não está ligando',
      'PC não dá sinal de vida',
      'A impressora está sem papel',
    ];

    const response = await axios.post(
      MINIMAX_EMBEDDINGS_URL,
      {
        model: 'embo-01',
        texts,
        type: 'query',
      },
      {
        headers: {
          Authorization: `Bearer ${MINIMAX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        params: {
          GroupId: MINIMAX_GROUP_ID,
        },
        timeout: 15000,
      }
    );

    const embeddings = response.data.vectors;

    // Calcular similaridade de cosseno
    function cosineSimilarity(a: number[], b: number[]): number {
      let dotProduct = 0;
      let magA = 0;
      let magB = 0;

      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
      }

      return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
    }

    const sim1_2 = cosineSimilarity(embeddings[0], embeddings[1]);
    const sim1_3 = cosineSimilarity(embeddings[0], embeddings[2]);
    const sim2_3 = cosineSimilarity(embeddings[1], embeddings[2]);

    console.log('📊 Similaridade entre textos:\n');
    console.log(`   Texto 1: "${texts[0]}"`);
    console.log(`   Texto 2: "${texts[1]}"`);
    console.log(`   Texto 3: "${texts[2]}"\n`);

    console.log(`   Similaridade 1-2: ${(sim1_2 * 100).toFixed(2)}% ✅ (mesma semântica)`);
    console.log(`   Similaridade 1-3: ${(sim1_3 * 100).toFixed(2)}% ❌ (semântica diferente)`);
    console.log(`   Similaridade 2-3: ${(sim2_3 * 100).toFixed(2)}% ❌ (semântica diferente)`);

    if (sim1_2 > 0.85) {
      console.log('\n   ✅ Embeddings funcionando corretamente! Alta similaridade entre textos semanticamente iguais.');
    } else {
      console.log('\n   ⚠️  Similaridade abaixo do esperado. Embeddings podem não estar ideais.');
    }
  } catch (error: any) {
    console.log('❌ Falha no Teste 3');
    if (error.response) {
      console.log(`   HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   Erro: ${error.message}`);
    }
    process.exit(1);
  }

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║       ✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!             ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('🎯 Próximos passos:');
  console.log('   1. Embeddings MiniMax está pronto para uso!');
  console.log('   2. Backend usará automaticamente quando disponível');
  console.log('   3. Fallback para TF-IDF se MiniMax offline');
  console.log('   4. Inicie backend: cd backend && npm run dev\n');
}

testEmbeddings().catch(console.error);
