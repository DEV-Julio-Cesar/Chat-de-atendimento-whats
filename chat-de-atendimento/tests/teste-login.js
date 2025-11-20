const usuarios = require('../src/aplicacao/gerenciador-usuarios');
const { validarCredenciais } = require('../src/aplicacao/validacao-credenciais');

(async () => {
  const uid = Date.now();
  const username = `login_${uid}`;
  const password = 'Senha123';

  const log = (m,c='36') => console.log(`\x1b[${c}m${m}\x1b[0m`);

  try {
    log('== TESTE LOGIN ==', '1');
    log('Criando usuário...');
    const r1 = await usuarios.cadastrarUsuario({ username, password, role: 'atendente', email: `${uid}@x.com` });
    if (!r1.success) throw new Error('Falha cadastrar: ' + r1.message);

    log('Validando login com senha correta...');
    const ok1 = await validarCredenciais(username, password);
    if (!ok1) throw new Error('Login deveria funcionar e falhou');

    log('Validando login com senha errada...');
    const ok2 = await validarCredenciais(username, 'Errada123');
    if (ok2) throw new Error('Login com senha errada funcionou');

    if (process.env.KEEP_USER !== '1') {
      log('Removendo usuário...');
      const r2 = await usuarios.removerUsuario(username);
      if (!r2.success) throw new Error('Falha remover: ' + r2.message);
    } else {
      log('Mantendo usuário de teste (KEEP_USER=1)', '33');
    }

    log('OK! Teste login passou.', '32');
    process.exit(0);
  } catch (e) {
    log('ERRO: ' + e.message, '31');
    process.exit(1);
  }
})();