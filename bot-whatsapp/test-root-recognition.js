const config = require('./config/config');
const database = require('./db/database');
const commandHandler = require('./handlers/commands');

console.log('🧪 Testando reconhecimento de usuário root...');
console.log('📋 Configurações atuais:');
console.log('   - Números root configurados:', config.whatsapp.rootNumbers);

async function testRootRecognition() {
  try {
    // Testar os números root
    const testNumbers = ['556981170027', '5569981170027'];
    
    for (const number of testNumbers) {
      console.log(`\n🔍 Testando número: ${number}`);
      
      // Buscar usuário no banco
      const user = await database.buscarUsuario(number);
      console.log('   - Usuário no banco:', user ? `${user.nome} (${user.role})` : 'Não encontrado');
      
      // Verificar se está na lista de root numbers
      const isInRootList = config.whatsapp.rootNumbers.includes(number);
      console.log('   - Está na lista de root numbers:', isInRootList ? '✅ Sim' : '❌ Não');
      
      // Simular verificação do comando handler
      if (!user) {
        console.log('   - Criando usuário...');
        await database.criarOuAtualizarUsuario(number);
      }
      
      // Buscar novamente após criação
      const updatedUser = await database.buscarUsuario(number);
      console.log('   - Usuário após verificação:', updatedUser ? `${updatedUser.nome} (${updatedUser.role})` : 'Ainda não encontrado');
      
      // Verificar se precisa atualizar role
      if (isInRootList && updatedUser && updatedUser.role !== 'root') {
        console.log('   - Atualizando role para root...');
        await database.alterarRoleUsuario(number, 'root');
        const finalUser = await database.buscarUsuario(number);
        console.log('   - Usuário final:', finalUser ? `${finalUser.nome} (${finalUser.role})` : 'Erro');
      }
      
      // Resultado final
      const finalCheck = await database.buscarUsuario(number);
      const isRoot = finalCheck && finalCheck.role === 'root';
      console.log(`   - 🎯 Resultado: ${isRoot ? '✅ RECONHECIDO COMO ROOT' : '❌ NÃO RECONHECIDO COMO ROOT'}`);
    }
    
    console.log('\n📊 Resumo dos usuários root no banco:');
    const allRootUsers = await database.listarUsuariosPorRole('root');
    allRootUsers.forEach(user => {
      console.log(`   - ${user.telefone}: ${user.nome}`);
    });
    
    console.log('\n✅ Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
  
  process.exit(0);
}

// Aguardar um pouco para o banco inicializar
setTimeout(testRootRecognition, 1000);
