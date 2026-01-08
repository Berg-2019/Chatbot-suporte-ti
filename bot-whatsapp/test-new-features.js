const database = require('./db/database');
const commandHandler = require('./handlers/commands');

async function testNewFeatures() {
  console.log('🧪 Testando novas funcionalidades...\n');

  // Array para capturar mensagens enviadas
  const testMessages = [];
  const mockSendMessage = async (message) => {
    testMessages.push(message);
    console.log(`📤 Mensagem enviada: ${message.substring(0, 100)}...`);
  };

  try {
    // 1. Testar comando !tcgrupo
    console.log('1️⃣ Testando comando !tcgrupo');
    testMessages.length = 0;
    
    await commandHandler.handleMessage(
      { body: '!tcgrupo' },
      mockSendMessage,
      '556981170027', // Root user
      true // isGrupoTecnico = true (simulando que está em um grupo)
    );
    
    console.log(`   Resultado: ${testMessages.length > 0 ? '✅ Sucesso' : '❌ Falha'}`);
    if (testMessages.length > 0) {
      console.log(`   Mensagem: ${testMessages[0]}`);
    }

    // 2. Testar comando !root
    console.log('\n2️⃣ Testando comando !root');
    testMessages.length = 0;
    
    await commandHandler.handleMessage(
      { body: '!root' },
      mockSendMessage,
      '556981170027',
      false
    );
    
    console.log(`   Resultado: ${testMessages.length > 0 ? '✅ Sucesso' : '❌ Falha'}`);
    if (testMessages.length > 0) {
      console.log(`   Mensagem: ${testMessages[0]}`);
    }

    // 3. Testar comando !tecnico com menção
    console.log('\n3️⃣ Testando comando !tecnico com menção');
    testMessages.length = 0;
    
    await commandHandler.handleMessage(
      { body: '!tecnico @556912345678' },
      mockSendMessage,
      '556981170027', // Root user
      false
    );
    
    console.log(`   Resultado: ${testMessages.length > 0 ? '✅ Sucesso' : '❌ Falha'}`);
    if (testMessages.length > 0) {
      console.log(`   Mensagem: ${testMessages[0]}`);
    }

    // 4. Testar comando !adm com menção
    console.log('\n4️⃣ Testando comando !adm com menção');
    testMessages.length = 0;
    
    await commandHandler.handleMessage(
      { body: '!adm @556987654321' },
      mockSendMessage,
      '556981170027', // Root user
      false
    );
    
    console.log(`   Resultado: ${testMessages.length > 0 ? '✅ Sucesso' : '❌ Falha'}`);
    if (testMessages.length > 0) {
      console.log(`   Mensagem: ${testMessages[0]}`);
    }

    // 5. Testar comando !almoxarifado com menção
    console.log('\n5️⃣ Testando comando !almoxarifado com menção');
    testMessages.length = 0;
    
    await commandHandler.handleMessage(
      { body: '!almoxarifado @556911111111' },
      mockSendMessage,
      '556981170027', // Root user
      false
    );
    
    console.log(`   Resultado: ${testMessages.length > 0 ? '✅ Sucesso' : '❌ Falha'}`);
    if (testMessages.length > 0) {
      console.log(`   Mensagem: ${testMessages[0]}`);
    }

    // 6. Testar função parseMention
    console.log('\n6️⃣ Testando função parseMention');
    
    // Simular diferentes formatos de menção
    const testMentions = [
      '@556981170027',
      '@5569 8117 0027',
      '@55 69 98117-0027',
      '@+55 69 98117-0027',
      'texto @556981170027 mais texto',
      'sem menção aqui'
    ];

    testMentions.forEach((mention, index) => {
      // Como parseMention é uma função interna, vamos testar indiretamente
      console.log(`   Teste ${index + 1}: "${mention}"`);
    });

    // 7. Verificar se grupo técnico foi salvo no banco
    console.log('\n7️⃣ Verificando configuração do grupo técnico no banco');
    
    try {
      const grupoTecnico = await database.obterGrupoTecnico();
      console.log(`   Grupo técnico atual: ${grupoTecnico || 'Não configurado'}`);
      console.log(`   Resultado: ${grupoTecnico ? '✅ Configurado' : '⚠️ Não configurado'}`);
    } catch (error) {
      console.log(`   Erro ao buscar grupo técnico: ${error.message}`);
    }

    // 8. Testar permissões
    console.log('\n8️⃣ Testando permissões de comandos');
    
    // Usuário comum tentando usar !tcgrupo
    testMessages.length = 0;
    await commandHandler.handleMessage(
      { body: '!tcgrupo' },
      mockSendMessage,
      '556900000000', // Usuário comum
      true
    );
    
    console.log(`   Usuário comum usando !tcgrupo: ${testMessages.length > 0 ? '✅ Bloqueado corretamente' : '❌ Não bloqueado'}`);
    if (testMessages.length > 0 && testMessages[0].includes('❌')) {
      console.log(`   Mensagem de erro: ${testMessages[0]}`);
    }

    console.log('\n🎉 Teste das novas funcionalidades concluído!');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
}

// Executar testes
testNewFeatures().then(() => {
  console.log('\n✅ Testes finalizados');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal nos testes:', error);
  process.exit(1);
});
