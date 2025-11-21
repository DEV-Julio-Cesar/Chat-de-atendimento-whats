// Script de seed para garantir usuário admin/admin nos arquivos de dados
// - Atualiza dados/usuarios.json (canônico para login)
// - Opcional: ajusta dados/usuarios-cadastrados.json para consistência

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname ? path.join(__dirname, '..') : process.cwd();
const USERS_FILE = path.join(ROOT, 'dados', 'usuarios.json');

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function ensureUsersJson() {
  await fs.ensureFile(USERS_FILE);
  try {
    const data = await fs.readJson(USERS_FILE);
    if (!data || typeof data !== 'object' || !Array.isArray(data.usuarios)) {
      throw new Error('Estrutura inválida');
    }
  } catch {
    await fs.writeJson(USERS_FILE, { usuarios: [] }, { spaces: 2 });
  }
}

async function seedAdminInUsuariosJson() {
  await ensureUsersJson();
  const data = await fs.readJson(USERS_FILE);

  const adminIndex = data.usuarios.findIndex(
    (u) => typeof u.username === 'string' && u.username.toLowerCase() === 'admin'
  );

  const adminUser = {
    username: 'admin',
    password: sha256('admin'), // compatível com validacao-credenciais.js
    email: 'admin@sistema.com',
    role: 'admin',
    ativo: true,
    criadoEm: new Date().toISOString(),
    ultimoLogin: null,
  };

  if (adminIndex === -1) {
    data.usuarios.push(adminUser);
    console.log('[seed-admin] Usuário admin criado em usuarios.json');
  } else {
    // Normaliza: sempre senha SHA-256 e role admin, mantém datas se existirem
    const existente = data.usuarios[adminIndex] || {};
    data.usuarios[adminIndex] = {
      ...existente,
      ...adminUser,
      criadoEm: existente.criadoEm || adminUser.criadoEm,
    };
    console.log('[seed-admin] Usuário admin atualizado em usuarios.json');
  }

  await fs.writeJson(USERS_FILE, data, { spaces: 2 });
}

// Removido suporte ao arquivo legado `usuarios-cadastrados.json`
// O projeto usa apenas `dados/usuarios.json` como fonte canônica

(async () => {
  try {
    await seedAdminInUsuariosJson();
    // Limpa arquivo legado se existir (opcional)
    const legacy = path.join(ROOT, 'dados', 'usuarios-cadastrados.json');
    if (await fs.pathExists(legacy)) {
      await fs.remove(legacy);
      console.log('[seed-admin] Removido arquivo legado: dados/usuarios-cadastrados.json');
    }
    console.log('\n[seed-admin] Concluído. Credenciais: admin / admin');
    process.exit(0);
  } catch (err) {
    console.error('[seed-admin] Erro:', err.message);
    process.exit(1);
  }
})();
