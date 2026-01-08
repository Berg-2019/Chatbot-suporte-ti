const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./config/config');

console.log('🔧 GARANTINDO ACESSO ROOT - CORREÇÃO FINAL');
console.log('==========================================\n');

const dbPath = path.join(__dirname, 'db', 'atendimento.db');
const db = new sqlite3.Database(dbPath);

async function ensureRootAccess() {
  return new Promise((resolve, reject) => {
    console.log('1. Verificando configurações atuais...');
    console.log(`   - Root numbers: ${config.whatsapp.rootNumbers.join(', ')}`);
    
    console.log('\n2. Limpando e recriando usuários root...');
    
    // Primeiro, vamos garantir que a tabela existe
    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telefone TEXT UNIQUE NOT NULL,
        nome TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('❌ Erro ao criar tabela:', err);
        reject(err);
        return;
      }
      
      console.log('✅ Tabela usuarios verificada');
      
      // Agora vamos inserir/atualizar cada número root
      const rootNumbers = ['556981170027', '556884268042', '5569981170027'];
      let processed = 0;
      
      rootNumbers.forEach((numero, index) => {
        console.log(`\n   Processando: ${numero}`);
        
        // Usar INSERT OR REPLACE para garantir que o usuário seja criado/atualizado
        db.run(`
          INSERT OR REPLACE INTO usuarios (telefone, nome, role, created_at, last_activity)
          VALUES (?, 'Root User', 'root', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [numero], function(err) {
          if (err) {
            console.error(`   ❌ Erro ao processar ${numero}:`, err);
          } else {
            console.log(`   ✅ ${numero} configurado como root`);
          }
          
          processed++;
          
          // Se processamos todos, verificar o resultado
          if (processed === rootNumbers.length) {
            setTimeout(() => {
              console.log('\n3. Verificando resultado final...');
              
              db.all("SELECT * FROM usuarios WHERE role = 'root' ORDER BY telefone", [], (err, rows) => {
                if (err) {
                  console.error('❌ Erro ao verificar usuários root:', err);
                  reject(err);
                  return;
                }
                
                console.log(`\n👑 Usuários root configurados (${rows.length}):`);
                rows.forEach(user => {
                  console.log(`   ✅ ${user.telefone} - ${user.nome} (ID: ${user.id})`);
                });
                
                // Verificar especificamente o seu número
                const yourNumbers = ['556981170027', '5569981170027'];
                let yourNumberConfigured = false;
                
                console.log('\n📱 Verificação dos seus números:');
                yourNumbers.forEach(num => {
                  const found = rows.find(user => user.telefone === num);
                  if (found) {
                    console.log(`   ✅ ${num}: CONFIGURADO COMO ROOT`);
                    yourNumberConfigured = true;
                  } else {
                    console.log(`   ❌ ${num}: NÃO ENCONTRADO`);
                  }
                });
                
                console.log('\n' + '='.repeat(50));
                
                if (yourNumberConfigured) {
                  console.log('🎉 SUCESSO! PROBLEMA RESOLVIDO!');
                  console.log('\n✅ Você agora será reconhecido como ROOT pelo bot.');
                  console.log('\n🚀 Para testar:');
                  console.log('   1. cd bot-whatsapp');
                  console.log('   2. npm start');
                  console.log('   3. Escaneie o QR Code');
                  console.log('   4. Envie: !config');
                  console.log('   5. Você deve ver o menu de configurações');
                  
                  console.log('\n📋 Comandos disponíveis para ROOT:');
                  console.log('   • !config - Menu de configurações');
                  console.log('   • !listadm - Listar administradores');
                  console.log('   • !listtc - Listar técnicos');
                  console.log('   • !admin=[numero] - Promover a admin');
                  console.log('   • !tecnico=[numero] - Promover a técnico');
                  console.log('   • !ping - Status do sistema');
                  console.log('   • !historico - Ver estatísticas');
                  console.log('   • !backup - Criar backup');
                  console.log('   • !sistema - Info do sistema');
                } else {
                  console.log('❌ AINDA HÁ PROBLEMAS');
                  console.log('   Seus números não foram configurados corretamente.');
                  console.log('   Verifique o arquivo de configuração e tente novamente.');
                }
                
                db.close();
                resolve(yourNumberConfigured);
              });
            }, 500);
          }
        });
      });
    });
  });
}

ensureRootAccess()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
