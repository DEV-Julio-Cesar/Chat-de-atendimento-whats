/* Teste automatizado de cadastro de usuário */
const path = require('path');
const chalk = require('node:console'); // só para manter compat
const usuarios = require('../src/aplicacao/gerenciador-usuarios');

(async () => {
  const uid = Date.now();
  const username = `teste_${uid}`;
  const payload = {
    username,
    email: `teste+${uid}@exemplo.com`,
    role: 'atendente',
    password: 'Senha123'
  };

  const passo = (t) => console.log(`\x1b[36mℹ️  ${t}\x1b[0m`);
  const ok = (t) => console.log(`\x1b[32m✅ ${t}\x1b[0m`);
  const erro = (t) => console.log(`\x1b[31m❌ ${t}\x1b[0m`);

  try {
    console.log('\n' + '='.repeat(60));
    console.log('TESTE: CADASTRO DE USUÁRIO');
    console.log('='.repeat(60) + '\n');

    passo('1) Cadastrando novo usuário único...');
    const r1 = await usuarios.cadastrarUsuario(payload);
    if (!r1?.success) throw new Error(`Falha no cadastro: ${r1?.message}`);
    ok('Usuário cadastrado com sucesso');

    passo('2) Verificando listagem contém o usuário...');
    const lista = await usuarios.listarUsuarios();
    const existe = lista.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (!existe) throw new Error('Usuário não apareceu em listarUsuarios()');
    ok('Usuário encontrado na listagem');

    passo('3) Tentando cadastrar duplicado (deve falhar)...');
    const r2 = await usuarios.cadastrarUsuario(payload);
    if (r2?.success) throw new Error('Cadastro duplicado foi aceito (esperado falhar)');
    ok(`Duplicidade bloqueada: ${r2?.message || 'Usuário já existe'}`);

    passo('4) Obtendo estatísticas...');
    const stats = await usuarios.obterEstatisticas();
    ok(`Estatísticas OK (total: ${stats.total})`);

    const manter = process.env.KEEP_USER === '1';
    if (!manter) {
      passo('5) Limpando usuário de teste...');
      const r3 = await usuarios.removerUsuario(username);
      if (!r3?.success) throw new Error('Falha ao remover usuário de teste');
      ok('Usuário de teste removido');
    } else {
      passo('5) KEEP_USER=1 → mantendo usuário de teste');
    }

    console.log('\n' + '='.repeat(60));
    ok('Teste de cadastro finalizado com sucesso!');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  } catch (e) {
    erro(e.message);
    process.exit(1);
  }
})();