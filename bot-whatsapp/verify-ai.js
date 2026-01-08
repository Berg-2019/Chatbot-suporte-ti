const { OllamaClient } = require('./utils/ollama-fix');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function verifyAI() {
  console.log('🔍 Verificando status da Inteligência Artificial...\n');
  
  // Conectar ao banco de dados
  const dbPath = path.join(__dirname, 'db', 'atendimento.db');
  const db = new sqlite3.Database(dbPath);
  
  // Verificar configuração no banco de dados
  db.get("SELECT valor FROM configuracoes WHERE chave = 'ollama_enabled'", (err, row) => {
    if (err) {
      console.error('❌ Erro ao acessar banco de dados:', err);
      db.close();
      return;
    }
    
    const isEnabled = row ? row.valor : 'não configurado';
    console.log('⚙️  Configuração do banco de dados:');
    console.log('   IA Habilitada:', isEnabled === 'true' ? '✅ Sim' : '❌ Não');
    
    // Verificar status do Ollama
    const status = OllamaClient.getStatus();
    console.log('\n🔌 Status do Ollama:');
    console.log('   Conectado:', status.available ? '✅ Sim' : '❌ Não');
    console.log('   URL:', status.baseUrl);
    console.log('   Modelo:', status.model);
    
    // Testar conexão
    console.log('\n🧪 Testando conexão...');
    OllamaClient.checkConnection().then(() => {
      const newStatus = OllamaClient.getStatus();
      console.log('   Status após teste:', newStatus.available ? '✅ Conectado' : '❌ Desconectado');
      
      if (newStatus.available && isEnabled === 'true') {
        console.log('\n🎉 INTELIGÊNCIA ARTIFICIAL TOTALMENTE ATIVADA!');
        console.log('   ✅ Ollama está rodando');
        console.log('   ✅ IA está habilitada no banco de dados');
        console.log('   ✅ Sistema pronto para usar');
        console.log('\n💬 A IA agora analisará automaticamente as mensagens dos usuários.');
        console.log('🔧 Para verificar o status no bot, use o comando: !iastatus');
      } else if (isEnabled === 'true') {
        console.log('\n⚠️  IA está habilitada no banco de dados, mas Ollama não está conectado.');
        console.log('🔧 Inicie o serviço Ollama com: ollama serve');
      } else {
        console.log('\n❌ IA não está habilitada.');
        console.log('🔧 Para ativar, execute: node activate-ai.js');
      }
      
      db.close();
    });
  });
}

// Executar verificação
verifyAI().catch(error => {
  console.error('❌ Erro na verificação:', error);
  process.exit(1);
});
