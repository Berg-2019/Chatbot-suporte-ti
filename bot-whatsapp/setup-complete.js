const config = require('./config/config');
const database = require('./db/database');
const fs = require('fs');
const path = require('path');

console.log('🎯 CONFIGURAÇÃO FINAL DO BOT WHATSAPP');
console.log('=====================================\n');

async function finalSetup() {
  try {
    // 1. Verificar arquivo .env
    const envPath = path.join(__dirname, '.env');
    const envExists = fs.existsSync(envPath);
    console.log(`1. Arquivo .env: ${envExists ? '✅ Existe' : '❌ Não encontrado'}`);
    
    // 2. Verificar configurações
    console.log('\n2. Configurações carregadas:');
    console.log(`   - Bot Number: ${config.whatsapp.botNumber}`);
    console.log(`   - Root Numbers: ${config.whatsapp.rootNumbers.join(', ')}`);
    console.log(`   - Database Path: ${config.database.path}`);
    
    // 3. Verificar banco de dados
    const dbPath = path.join(__dirname, 'db', 'atendimento.db');
    const dbExists = fs.existsSync(dbPath);
    console.log(`\n3. Banco de dados: ${dbExists ? '✅ Existe' : '❌ Não encontrado'}`);
    
    if (dbExists) {
      // 4. Verificar usuários root
      console.log('\n4. Verificando usuários root...');
      
      const rootNumbers = ['556981170027', '5569981170027'];
      let allRootConfigured = true;
      
      for (const number of rootNumbers) {
        let user = await database.buscarUsuario(number);
        
        if (!user) {
          console.log(`   - Criando usuário ${number}...`);
          await database.criarOuAtualizarUsuario(number, 'Root User', 'root');
          user = await database.buscarUsuario(number);
        }
        
        if (user && user.role !== 'root') {
          console.log(`   - Atualizando role de ${number} para root...`);
          await database.alterarRoleUsuario(number, 'root');
          user = await database.buscarUsuario(number);
        }
        
        const isRoot = user && user.role === 'root';
        console.log(`   - ${number}: ${isRoot ? '✅ ROOT' : '❌ NÃO ROOT'}`);
        
        if (!isRoot) allRootConfigured = false;
      }
      
      // 5. Listar todos os usuários root
      console.log('\n5. Usuários root configurados:');
      const allRootUsers = await database.listarUsuariosPorRole('root');
      if (allRootUsers.length > 0) {
        allRootUsers.forEach(user => {
          console.log(`   ✅ ${user.telefone} - ${user.nome}`);
        });
      } else {
        console.log('   ❌ Nenhum usuário root encontrado');
        allRootConfigured = false;
      }
      
      // 6. Status final
      console.log('\n' + '='.repeat(50));
      if (allRootConfigured) {
        console.log('🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('\n📱 Seu número será reconhecido como ROOT pelo bot.');
        console.log('\n🚀 Para iniciar o bot:');
        console.log('   cd bot-whatsapp');
        console.log('   npm start');
        console.log('\n📋 Comandos disponíveis para ROOT:');
        console.log('   • !config - Menu de configurações');
        console.log('   • !listadm - Listar administradores');
        console.log('   • !listtc - Listar técnicos');
        console.log('   • !admin=[numero] - Promover a admin');
        console.log('   • !tecnico=[numero] - Promover a técnico');
        console.log('   • !ping - Status do sistema');
        console.log('   • !historico - Ver estatísticas');
        console.log('   • !backup - Criar backup manual');
        console.log('   • !sistema - Informações do sistema');
      } else {
        console.log('❌ CONFIGURAÇÃO INCOMPLETA');
        console.log('\nAlguns usuários root não foram configurados corretamente.');
        console.log('Execute novamente este script ou verifique o banco de dados.');
      }
    } else {
      console.log('\n❌ Banco de dados não encontrado. Execute: node init-db.js');
    }
    
  } catch (error) {
    console.error('\n❌ Erro durante a configuração:', error);
  }
  
  process.exit(0);
}

// Aguardar inicialização do banco
setTimeout(finalSetup, 1000);
