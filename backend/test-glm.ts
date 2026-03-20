/**
 * Test GLM-4 AI Integration (Zhipu AI)
 * Documentação: https://open.bigmodel.cn/dev/api
 */

import axios from 'axios';
import 'dotenv/config';

const GLM_API_KEY = process.env.GLM_API_KEY || '';

async function testGLM() {
  console.log('🧪 Testando integração com GLM-4 (Zhipu AI)...\n');

  if (!GLM_API_KEY) {
    console.error('❌ GLM_API_KEY não encontrada no .env');
    console.log('\n💡 Para obter API Key:');
    console.log('1. Acesse: https://open.bigmodel.cn/');
    console.log('2. Crie uma conta e faça login');
    console.log('3. Vá em "API Keys" e gere uma nova chave');
    console.log('4. Adicione no .env: GLM_API_KEY=sua_chave_aqui\n');
    process.exit(1);
  }

  console.log('✓ API Key encontrada:', GLM_API_KEY.substring(0, 20) + '...');

  const testMessages = [
    'Minha impressora não está imprimindo',
    'O ar condicionado está vazando água',
    'Preciso reservar um notebook para amanhã',
    'Qual o status do meu chamado?',
    'Quero falar com um técnico',
  ];

  console.log('\n🧪 Testando com múltiplas mensagens...\n');

  for (const testMessage of testMessages) {
    console.log(`\n📝 Mensagem: "${testMessage}"`);
    console.log('─'.repeat(60));

    const prompt = `Você é um classificador de intenções para um sistema de helpdesk de TI.

Analise a mensagem do usuário e classifique em UMA das intenções abaixo:

**Intenções disponíveis:**
- abrir_ticket_ti: Problemas com computador, rede, sistema, software, impressora, internet
- abrir_ticket_eletrica: Problemas elétricos, ar-condicionado, iluminação, tomadas
- reservar_equipamento: Quer reservar notebook, projetor, cabo, adaptador
- consultar_faq: Pergunta genérica que pode estar na FAQ (como fazer X, o que é Y)
- consultar_ticket: Quer saber status de um ticket/chamado existente
- falar_tecnico: Quer falar com uma pessoa, atendimento humano
- avaliar_atendimento: Quer avaliar o atendimento, dar nota, feedback
- saudacao: Apenas cumprimentando (oi, olá, bom dia)
- outro: Não se encaixa em nenhuma categoria acima

**Mensagem do usuário:**
"${testMessage}"

**IMPORTANTE:**
1. Responda APENAS com JSON válido
2. Não adicione explicações ou texto extra antes ou depois do JSON
3. Use o formato exato abaixo

**Formato de resposta (JSON):**
{
  "intent": "nome_da_intencao",
  "confidence": 0.95,
  "entities": {
    "equipamento": "impressora",
    "problema": "não imprime",
    "setor": "RH"
  }
}

Se não houver entidades relevantes, use entities vazio: "entities": {}`;

    try {
      const startTime = Date.now();

      const response = await axios.post(
        'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        {
          model: 'glm-4-flash', // Modelo mais rápido e barato
          messages: [
            {
              role: 'system',
              content:
                'Você é um classificador de intenções para helpdesk. Responda APENAS com JSON válido, sem explicações adicionais.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          top_p: 0.9,
          max_tokens: 200,
        },
        {
          headers: {
            Authorization: `Bearer ${GLM_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );

      const processingTime = Date.now() - startTime;

      console.log(`✅ Resposta recebida em ${processingTime}ms`);

      const content = response.data.choices[0].message.content;
      console.log('\n📥 Resposta bruta:');
      console.log(content);

      // Extrair JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('\n✅ JSON parseado:');
        console.log(JSON.stringify(parsed, null, 2));

        console.log('\n📊 Resultado:');
        console.log(`   Intent: ${parsed.intent}`);
        console.log(`   Confiança: ${(parsed.confidence * 100).toFixed(1)}%`);
        console.log(`   Entidades: ${JSON.stringify(parsed.entities)}`);

        // Informações de uso
        if (response.data.usage) {
          console.log('\n💰 Uso:');
          console.log(`   Prompt tokens: ${response.data.usage.prompt_tokens}`);
          console.log(`   Completion tokens: ${response.data.usage.completion_tokens}`);
          console.log(`   Total tokens: ${response.data.usage.total_tokens}`);
          // GLM-4-Flash: ~$0.001/1k tokens (entrada) e ~$0.001/1k tokens (saída)
          const cost = (response.data.usage.total_tokens / 1000) * 0.001;
          console.log(`   Custo estimado: $${cost.toFixed(6)}`);
        }
      } else {
        console.log('❌ Não foi possível extrair JSON da resposta');
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

    console.log('─'.repeat(60));
  }

  console.log('\n✅ Testes concluídos!\n');
}

testGLM();
