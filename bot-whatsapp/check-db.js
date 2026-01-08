const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuração do banco de dados
const dbPath = path.join(__dirname, 'db', 'atendimento.db');

console.log('Verificando banco de dados...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar com o banco:', err);
    process.exit(1);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite.');
    
    // Listar todas as tabelas
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
      if (err) {
        console.error('❌ Erro ao consultar tabelas:', err);
      } else {
        console.log('📋 Tabelas encontradas:');
        rows.forEach(row => {
          console.log(`   • ${row.name}`);
        });
        
        // Verificar se a tabela system_users existe
        const systemUsersTable = rows.find(row => row.name === 'system_users');
        if (systemUsersTable) {
          console.log('✅ Tabela system_users encontrada!');
        } else {
          console.log('❌ Tabela system_users não encontrada!');
        }
      }
      
      db.close((err) => {
        if (err) {
          console.error('❌ Erro ao fechar banco:', err);
        } else {
          console.log('✅ Conexão com banco fechada.');
        }
        process.exit(0);
      });
    });
  }
});
