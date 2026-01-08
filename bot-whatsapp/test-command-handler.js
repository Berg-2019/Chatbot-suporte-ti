const config = require('./config/config');
const database = require('./db/database');
const commandHandler = require('./handlers/commands');

console.log('🧪 TESTE COMPLETO DO HANDLER DE COMANDOS');
console.log('=========================================\n');

async function testCommandHandler() {
  try {
    // 1. Configurar usuário de teste
    const testPhone = '556981170027';
    console.log(`1. Configurando usuário de teste: ${testPhone}`);
    
    // Garantir que o usuário existe como root
    await database.criarOuAtualizarUsuario(testPhone, 'Root User', 'root');
    const user = await database.buscarUsuario(testPhone);
    console.log(`   - Usuário no banco: ${user ? `${user.nome} (${user.role})` : 'Não encontrado'}`);
    
    // 2. Simular mensagens e respostas
    const testMessages = [];
    const mockSendMessage = async (message) => {
      testMessages.push(message);
      console.log(`   📤 Bot respondeu: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    };
    
    // 3. Testar comandos administrativos
    console.log('\n2. Testando comandos administrativos...');
    
    const adminCommands = [
      { command: '!config', description: 'Menu de configurações' },
      { command: '!listadm', description: 'Listar administradores' },
      { command: '!listtc', description: 'Listar técnicos' },
      { command: '!ping', description: 'Status do sistema' }
    ];
    
    for (const { command, description } of adminCommands) {
      console.log(`\n   🔧 Testando: ${command} (${description})`);
      testMessages.length = 0; // Limpar mensagens anteriores
      
      try {
        await commandHandler.handleMessage(
          { body: command },
          mockSendMessage,
          testPhone,
          false // não é grupo técnico
        );
        
        if (testMessages.length > 0) {
          const response = testMessages[0];
          const hasError = response.includes('❌') || response.includes('Comando disponível apenas');
          console.log(`   📊 Resultado: ${hasError ? '❌ ACESSO NEGADO' : '✅ ACESSO PERMITIDO'}`);
        } else {
          console.log('   📊 Resultado: ⚠️ SEM RESPOSTA');
        }
      } catch (error) {
        console.log(`   📊 Resultado: ❌ ERRO - ${error.message}`);
      }
    }
    
    // 4. Testar comando de usuário comum
    console.log('\n3. Testando comando de usuário comum...');
    console.log('   🔧 Testando: !ajuda');
    testMessages.length = 0;
    
    await commandHandler.handleMessage(
      { body: '!ajuda' },
      mockSendMessage,
      testPhone,
      false
    );
    
    if (testMessages.length > 0) {
      const response = testMessages[0];
      const hasAdminCommands = response.includes('*ADMINISTRADORES:*');
      console.log(`   📊 Resultado: ${hasAdminCommands ? '✅ MOSTRA COMANDOS ADMIN' : '❌ NÃO MOSTRA COMANDOS ADMIN'}`);
    }
    
    // 5. Testar reconhecimento automático de root
    console.log('\n4. Testando reconhecimento automático de root...');
    
    // Simular usuário que não existe no banco mas está na lista root
    const newRootPhone = '5569981170027';
    console.log(`   🔧 Testando número: ${newRootPhone}`);
    
    // Remover usuário se existir
    await database.db?.run('DELETE FROM usuarios WHERE telefone = ?', [newRootPhone]);
    
    testMessages.length = 0;
    await commandHandler.handleMessage(
      { body: '!config' },
      mockSendMessage,
      newRootPhone,
      false
    );
    
    // Verificar se o usuário foi criado como root
    const newUser = await database.buscarUsuario(newRootPhone);
    console.log(`   📊 Usuário criado: ${newUser ? `${newUser.nome} (${newUser.role})` : 'Não criado'}`);
    
    if (testMessages.length > 0) {
      const response = testMessages[0];
      const hasError = response.includes('❌') || response.includes('Comando disponível apenas');
      console.log(`   📊 Acesso: ${hasError ? '❌ NEGADO' : '✅ PERMITIDO'}`);
    }
    
    // 6. Resumo final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DOS TESTES:');
    
    const finalRootUsers = await database.listarUsuariosPorRole('root');
    console.log(`\n👑 Usuários root no banco (${finalRootUsers.length}):`);
    finalRootUsers.forEach(user => {
      console.log(`   ✅ ${user.telefone} - ${user.nome}`);
    });
    
    console.log(`\n⚙️ Números root na configuração (${config.whatsapp.rootNumbers.length}):`);
    config.whatsapp.rootNumbers.forEach(number => {
      console.log(`   📱 ${number}`);
    });
    
    // Verificar se todos os números da config estão no banco como root
    let allConfigured = true;
    for (const number of config.whatsapp.rootNumbers) {
      const user = await database.buscarUsuario(number);
      const isRoot = user && user.role === 'root';
      if (!isRoot) {
        allConfigured = false;
        console.log(`   ⚠️ ${number} não está configurado como root no banco`);
      }
    }
    
    console.log(`\n🎯 STATUS FINAL: ${allConfigured ? '✅ TODOS OS ROOTS CONFIGURADOS' : '❌ CONFIGURAÇÃO INCOMPLETA'}`);
    
    if (allConfigured) {
      console.log('\n🚀 O bot deve reconhecer você como root agora!');
      console.log('   Para testar, inicie o bot com: npm start');
      console.log('   E envie comandos como !config, !listadm, etc.');
    }
    
  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error);
  }
  
  process.exit(0);
}

// Aguardar inicialização
setTimeout(testCommandHandler, 1000);
