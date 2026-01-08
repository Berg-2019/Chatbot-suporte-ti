#!/usr/bin/env node

/**
 * Script para testar a conexão com Ollama
 * Este script verifica se o Ollama está funcionando corretamente
 */

const { OllamaClient } = require('../utils/ollama-fix');

async function testConnection() {
  console.log('🧪 Testando conexão com Ollama...');
  console.log('==================================\n');
  
  try {
    // Testar conexão básica
    const isRunning = await OllamaClient.isOllamaRunning();
    console.log(`✅ Ollama está ${isRunning ? 'rodando' : 'parado'}`);
    
    // Mostrar status
    const status = OllamaClient.getStatus();
    console.log(`🔗 URL: ${status.baseUrl}`);
    console.log(`📦 Modelo: ${status.model}`);
    console.log(`🔌 Status: ${status.available ? 'Conectado' : 'Desconectado'}`);
    
    if (status.available) {
      // Testar geração de resposta
      console.log('\n📝 Testando geração de resposta...');
      const response = await OllamaClient.generateResponse('Olá!', 'Responda de forma breve e amigável.');
      
      if (response) {
        console.log(`✅ Resposta recebida: ${response}`);
      } else {
        console.log('⚠️  Nenhuma resposta recebida');
      }
      
      // Testar modelos disponíveis
      console.log('\n📚 Modelos disponíveis:');
      const models = await OllamaClient.getAvailableModels();
      if (models.length > 0) {
        models.forEach(model => {
          console.log(`  - ${model.name}`);
        });
      } else {
        console.log('  Nenhum modelo encontrado');
      }
    } else {
      console.log('\n🔧 Para resolver o problema:');
      console.log('  1. Verifique se o Ollama está instalado: ollama --version');
      console.log('  2. Inicie o serviço: ollama serve');
      console.log('  3. Baixe o modelo: ollama pull llama3.2:3b');
      console.log('  4. Execute: npm run install-ollama');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error.message);
  }
  
  console.log('\n🏁 Teste concluído!');
}

if (require.main === module) {
  testConnection().catch(error => {
    console.error('❌ Erro durante o teste:', error.message);
    process.exit(1);
  });
}

module.exports = { testConnection };
