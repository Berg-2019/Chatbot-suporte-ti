/**
 * Test MiniMax AI Integration
 */

import axios from 'axios';
import 'dotenv/config';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';

async function testMiniMax() {
  console.log('🧪 Testando integração com MiniMax AI...\n');

  if (!MINIMAX_API_KEY) {
    console.error('❌ MINIMAX_API_KEY não encontrada no .env');
    process.exit(1);
  }

  console.log('✓ API Key encontrada:', MINIMAX_API_KEY.substring(0, 20) + '...');

  const testMessage = 'Minha impressora não está imprimindo';

  const prompt = `Você é um classificador de intenções para helpdesk. Analise a mensagem e retorne JSON com: intent, confidence, entities.

Mensagem: "${testMessage}"

Responda APENAS com JSON válido:
{
  "intent": "abrir_ticket_ti",
  "confidence": 0.95,
  "entities": {
    "equipamento": "impressora",
    "problema": "não imprime"
  }
}`;

  try {
    console.log('\n📤 Enviando requisição para MiniMax...');

    // Testando diferentes URLs e modelos possíveis
    console.log('Tentando modelo: abab6-chat');

    const response = await axios.post(
      'https://api.minimax.io/v1/text/chatcompletion',
      {
        model: 'abab6-chat',
        messages: [
          {
            role: 'system',
            content: 'Você é um classificador de intenções para helpdesk. Responda APENAS com JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.1,
        top_p: 0.9,
      },
      {
        headers: {
          'Authorization': `Bearer ${MINIMAX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('✅ Resposta recebida!\n');
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    const content = response.data.choices[0].message.content;
    console.log('\n📥 Conteúdo da resposta:');
    console.log(content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('\n✅ JSON parseado com sucesso:');
      console.log(JSON.stringify(parsed, null, 2));
    }

  } catch (error: any) {
    console.error('\n❌ Erro:', error.message);
    if (error.response?.data) {
      console.error('Detalhes do erro:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status) {
      console.error('Status HTTP:', error.response.status);
    }
  }
}

testMiniMax();
