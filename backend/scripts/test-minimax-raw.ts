/**
 * Teste RAW - Ver resposta exata da API MiniMax
 */

import axios from 'axios';
import 'dotenv/config';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID;

async function testRaw() {
  console.log('\n🔍 Testando API MiniMax (RAW)\n');
  console.log(`API Key: ${MINIMAX_API_KEY?.substring(0, 15)}...`);
  console.log(`Group ID: ${MINIMAX_GROUP_ID}\n`);

  // Teste Embeddings
  try {
    console.log('📊 Testando Embeddings...\n');

    const response = await axios.post(
      'https://api.minimax.io/v1/embeddings',
      {
        model: 'embo-01',
        texts: ['teste de conexão'],
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

    console.log('✅ Status:', response.status);
    console.log('📦 Resposta completa:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Erro Embeddings:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
  }

  // Teste Chat
  try {
    console.log('\n\n💬 Testando Chat...\n');

    const response = await axios.post(
      'https://api.minimax.io/v1/text/chatcompletion_v2',
      {
        model: 'abab6-chat',
        messages: [
          {
            role: 'user',
            content: 'Diga apenas OK',
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
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

    console.log('✅ Status:', response.status);
    console.log('📦 Resposta completa:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Erro Chat:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
  }
}

testRaw().catch(console.error);
