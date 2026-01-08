const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🔧 Corrigindo usuário root...');

const dbPath = path.join(__dirname, 'db', 'atendimento.db');
const db = new sqlite3.Database(dbPath);

// Números root que devem ser configurados
const rootNumbers = ['556981170027', '556884268042', '5569981170027'];

console.log('📋 Verificando usuários root existentes...');

// Primeiro, vamos ver todos os usuários
db.all('SELECT * FROM usuarios', [], (err, rows) => {
  if (err) {
    console.error('❌ Erro ao consultar usuários:', err);
    return;
  }
  
  console.log('👥 Usuários existentes:');
  rows.forEach(user => {
    console.log(`   - ${user.telefone}: ${user.nome} (${user.role})`);
  });
  
  console.log('\n🔧 Inserindo/atualizando usuários root...');
  
  // Inserir ou atualizar cada número root
  rootNumbers.forEach((numero, index) => {
    db.run(`
      INSERT OR REPLACE INTO usuarios (telefone, nome, role, created_at, last_activity)
      VALUES (?, 'Root User', 'root', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [numero], function(err) {
      if (err) {
        console.error(`❌ Erro ao inserir usuário root ${numero}:`, err);
      } else {
        console.log(`✅ Usuário root ${numero} configurado`);
      }
      
      // Se é o último, verificar novamente
      if (index === rootNumbers.length - 1) {
        setTimeout(() => {
          console.log('\n📋 Verificando usuários root após correção...');
          
          db.all("SELECT * FROM usuarios WHERE role = 'root'", [], (err, rootUsers) => {
            if (err) {
              console.error('❌ Erro ao consultar usuários root:', err);
            } else {
              console.log('👑 Usuários root configurados:');
              rootUsers.forEach(user => {
                console.log(`   - ${user.telefone}: ${user.nome}`);
              });
              
              console.log('\n✅ Correção concluída!');
              console.log('🚀 Agora você pode iniciar o bot com: npm start');
            }
            
            db.close();
          });
        }, 500);
      }
    });
  });
});
