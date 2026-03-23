/**
 * Test Knowledge Base Integration with Intent Classification
 */

const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const testMessages = [
  'Meu computador não liga',
  'Estou sem internet',
  'A impressora não está imprimindo',
  'O sistema está muito lento',
  'A tomada não funciona',
  'O ar condicionado parou',
  'Preciso resetar minha senha do AD',
  'O Outlook não sincroniza',
  'Não consigo conectar na VPN'
];

async function testKnowledgeIntegration() {
  console.log('🧪 Testando Integração da Base de Conhecimento\n');
  console.log('=' .repeat(80));

  for (const message of testMessages) {
    console.log(`\n📝 Mensagem: "${message}"`);
    console.log('-'.repeat(80));

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/intent/classify`,
        { userMessage: message },
        { timeout: 10000 }
      );

      const { intent, confidence, context, provider, model } = response.data;

      console.log(`✅ Intent: ${intent}`);
      console.log(`📊 Confidence: ${(confidence * 100).toFixed(1)}%`);
      console.log(`🤖 Provider: ${provider} (${model})`);

      if (context && context.includes('📚 Conhecimento relevante')) {
        console.log('✨ Knowledge Base Usado: SIM');
        const knowledgePreview = context.substring(0, 200);
        console.log(`📚 Preview: ${knowledgePreview}...`);
      } else {
        console.log('⚠️  Knowledge Base Usado: NÃO');
      }
    } catch (error) {
      console.error(`❌ Erro: ${error.message}`);
      if (error.response?.data) {
        console.error('Detalhes:', error.response.data);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Teste concluído');
}

testKnowledgeIntegration().catch(console.error);
