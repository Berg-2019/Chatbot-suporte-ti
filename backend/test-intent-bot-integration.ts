/**
 * Test Intent Classification Integration with Bot
 *
 * Este script testa a integração do sistema de IA adaptativa com o bot WhatsApp
 */

import axios from 'axios';
import 'dotenv/config';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const INTENT_API_URL = `${BACKEND_URL}/api/bot/intent/classify`;

// Mensagens de teste (cenários reais)
const testMessages = [
  {
    text: 'Olá bom dia, estou com problemas na minha CPU, não está ligando',
    expected: 'abrir_ticket_ti',
    description: 'Problema claro de TI - CPU não liga',
  },
  {
    text: 'Minha impressora não está imprimindo',
    expected: 'abrir_ticket_ti',
    description: 'Problema de TI - Impressora',
  },
  {
    text: 'A tomada do escritório parou de funcionar',
    expected: 'abrir_ticket_eletrica',
    description: 'Problema elétrico - Tomada',
  },
  {
    text: 'Oi',
    expected: 'saudacao',
    description: 'Saudação simples',
  },
  {
    text: 'Preciso consultar o status do chamado 12345',
    expected: 'consultar_status',
    description: 'Consulta de status',
  },
  {
    text: 'Quero falar com um técnico',
    expected: 'falar_tecnico',
    description: 'Solicitação de atendimento humano',
  },
];

async function testIntentClassification() {
  console.log('🧪 Testando Integração: Intent Service + Bot WhatsApp\n');
  console.log('='.repeat(70) + '\n');

  let passedTests = 0;
  let failedTests = 0;

  for (const test of testMessages) {
    console.log(`📝 Teste: ${test.description}`);
    console.log(`📨 Mensagem: "${test.text}"`);

    try {
      const response = await axios.post(
        INTENT_API_URL,
        { text: test.text, has_active_ticket: false },
        { timeout: 30000 }
      );

      const result = response.data;
      const confidence = (result.confidence * 100).toFixed(1);

      console.log(`🧠 Intenção: ${result.intent} (${confidence}% confiança)`);
      console.log(`🤖 Provider: ${result.provider}`);
      console.log(`⏱️  Tempo: ${result.processingTime}ms`);

      // Verificar se deve pular menu (confidence >= 70%)
      const shouldSkipMenu =
        (result.intent === 'abrir_ticket_ti' || result.intent === 'abrir_ticket_eletrica') &&
        result.confidence >= 0.70;

      if (shouldSkipMenu) {
        console.log('✨ SKIP MENU: Sim - Bot irá direto para coleta de dados');
      } else {
        console.log('📋 SKIP MENU: Não - Bot mostrará menu');
      }

      // Validar resultado esperado
      if (result.intent === test.expected) {
        console.log('✅ PASSOU - Intent correta\n');
        passedTests++;
      } else {
        console.log(`⚠️  ATENÇÃO - Intent esperada: ${test.expected}, recebida: ${result.intent}\n`);
        if (result.confidence >= 0.70) {
          console.log('   Mas confiança é alta, pode ser aceitável\n');
        }
        failedTests++;
      }

    } catch (error: any) {
      console.log(`❌ ERRO: ${error.message}`);
      if (error.response?.data) {
        console.log('Detalhes:', error.response.data);
      }
      console.log('');
      failedTests++;
    }

    console.log('-'.repeat(70) + '\n');
  }

  // Resumo
  console.log('='.repeat(70));
  console.log('📊 RESUMO DOS TESTES\n');
  console.log(`✅ Testes Passaram: ${passedTests}/${testMessages.length}`);
  console.log(`❌ Testes Falharam: ${failedTests}/${testMessages.length}`);
  console.log(`📈 Taxa de Sucesso: ${((passedTests / testMessages.length) * 100).toFixed(1)}%\n`);

  // Teste específico do cenário do usuário
  console.log('='.repeat(70));
  console.log('🎯 TESTE ESPECÍFICO: Cenário do Usuário\n');
  console.log('Mensagem: "Olá bom dia, estou com problemas na minha CPU, não está ligando"\n');

  try {
    const response = await axios.post(
      INTENT_API_URL,
      {
        text: 'Olá bom dia, estou com problemas na minha CPU, não está ligando',
        has_active_ticket: false,
        phoneNumber: '5511999999999'
      },
      { timeout: 30000 }
    );

    const result = response.data;
    console.log('Resultado:');
    console.log(`  Intent: ${result.intent}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`  Provider: ${result.provider}`);
    console.log(`  Tempo: ${result.processingTime}ms\n`);

    const shouldSkip =
      (result.intent === 'abrir_ticket_ti' || result.intent === 'abrir_ticket_eletrica') &&
      result.confidence >= 0.70;

    if (shouldSkip) {
      console.log('✅ COMPORTAMENTO ESPERADO:');
      console.log('   Bot vai PULAR o menu e ir direto para:');
      console.log('   1. Perguntar nome (se contato novo)');
      console.log('   2. Perguntar departamento');
      console.log('   3. Perguntar categoria (Hardware, Software, etc.)');
      console.log('   4. Usar mensagem original como descrição do problema\n');
    } else {
      console.log('❌ PROBLEMA DETECTADO:');
      console.log('   Bot vai mostrar menu genérico ao invés de detectar problema\n');
      console.log('   Possíveis causas:');
      console.log('   - Confiança muito baixa (< 70%)');
      console.log('   - Intent incorreta');
      console.log('   - Modelo AI não está funcionando corretamente\n');
    }

  } catch (error: any) {
    console.log(`❌ ERRO ao testar cenário do usuário: ${error.message}\n`);
  }

  console.log('='.repeat(70));
  console.log('\n💡 PRÓXIMOS PASSOS:\n');
  console.log('1. Se os testes passaram, reiniciar o bot WhatsApp');
  console.log('2. Testar com mensagem real no WhatsApp');
  console.log('3. Verificar logs do bot para confirmar SKIP MENU');
  console.log('4. Monitorar dashboard de IA para ver métricas\n');
}

testIntentClassification();
