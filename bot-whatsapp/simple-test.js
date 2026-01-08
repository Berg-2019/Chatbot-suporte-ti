const database = require('./db/database');

async function simpleTest() {
  console.log('🧪 Teste simples das novas funcionalidades\n');

  try {
    // 1. Testar método obterGrupoTecnico
    console.log('1️⃣ Testando obterGrupoTecnico...');
    const grupoAtual = await database.obterGrupoTecnico();
    console.log(`   Grupo técnico atual: ${grupoAtual || 'Não configurado'}`);

    // 2. Testar método definirGrupoTecnico
    console.log('\n2️⃣ Testando definirGrupoTecnico...');
    const novoGrupoId = 'TESTE123@g.us';
    await database.definirGrupoTecnico(novoGrupoId);
    console.log(`   ✅ Grupo técnico definido: ${novoGrupoId}`);

    // 3. Verificar se foi salvo
    console.log('\n3️⃣ Verificando se foi salvo...');
    const grupoSalvo = await database.obterGrupoTecnico();
    console.log(`   Grupo salvo: ${grupoSalvo}`);
    console.log(`   Resultado: ${grupoSalvo === novoGrupoId ? '✅ Sucesso' : '❌ Falha'}`);

    // 4. Testar buscarUsuario
    console.log('\n4️⃣ Testando buscarUsuario...');
    const usuario = await database.buscarUsuario('556981170027');
    console.log(`   Usuário encontrado: ${usuario ? usuario.nome || usuario.telefone : 'Não encontrado'}`);
    console.log(`   Role: ${usuario ? usuario.role : 'N/A'}`);

    console.log('\n✅ Teste simples concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack:', error.stack);
  }
}

simpleTest().then(() => {
  console.log('\n🎉 Teste finalizado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
