const { OllamaClient } = require('./utils/ollama-fix');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function activateAI() {
  console.log('🤖 Ativando Inteligência Artificial...');
  
  // Conectar ao banco de dados
  const dbPath = path.join(__dirname, 'db', 'atendimento.db');
  const db = new sqlite3.Database(dbPath);
  
  // Verificar status atual do Ollama
  const status = OllamaClient.getStatus();
  console.log('📊 Status do Ollama:', status);
  
  // Verificar se o modelo está disponível
  try {
    const models = await OllamaClient.getAvailableModels();
    console.log('📚 Modelos disponíveis:', models.length);
    if (models.length > 0) {
      console.log('📦 Modelo padrão:', models[0].name);
    }
  } catch (error) {
    console.log('⚠️  Erro ao verificar modelos:', error.message);
  }
  
  // Ativar IA no banco de dados
  db.run("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES ('ollama_enabled', 'true')", (err) => {
    if (err) {
      console.error('❌ Erro ao ativar IA:', err);
      db.close();
      return;
    }
    
    console.log('✅ IA ativada no banco de dados');
    
    // Testar conexão
    OllamaClient.checkConnection().then(() => {
      const newStatus = OllamaClient.getStatus();
      console.log('🔌 Novo status do Ollama:', newStatus);
      
      // Testar geração de resposta
      if (newStatus.available) {
        console.log('🧪 Testando geração de resposta...');
        OllamaClient.generateResponse('Olá!', 'Responda de forma breve e amigável.')
          .then(response => {
            console.log('✅ Teste bem-sucedido!');
            console.log('📝 Resposta:', response);
            console.log('\n🎉 INTELIGÊNCIA ARTIFICIAL ATIVADA COM SUCESSO!');
            console.log('\n🔧 Para verificar o status, use o comando: !iastatus');
            console.log('💬 A IA agora analisará automaticamente as mensagens dos usuários.');
            db.close();
          })
          .catch(error => {
            console.log('⚠️  Erro no teste, mas IA ativada:', error.message);
            console.log('\n🎉 INTELIGÊNCIA ARTIFICIAL ATIVADA!');
            console.log('🔧 Verifique a conexão com Ollama se necessário.');
            db.close();
          });
      } else {
        console.log('⚠️  IA ativada, mas Ollama não está conectado.');
        console.log('🔧 Verifique se o serviço Ollama está rodando.');
        db.close();
      }
    });
  });
}

// Executar ativação
activateAI().catch(error => {
  console.error('❌ Erro ao ativar IA:', error);
  process.exit(1);
});
