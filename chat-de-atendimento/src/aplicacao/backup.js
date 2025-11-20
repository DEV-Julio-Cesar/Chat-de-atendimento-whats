const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const archiver = require('archiver');
const logger = require('../infraestrutura/logger');

const DADOS_DIR = path.join(__dirname, '../../dados');
const BACKUP_DIR = path.join(DADOS_DIR, 'backups');
const RETENTION = 7;

async function ensureDirs() {
  await fs.ensureDir(BACKUP_DIR);
}

async function runBackupNow() {
  await ensureDirs();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const zipPath = path.join(BACKUP_DIR, `backup-${stamp}.zip`);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      logger.info(`[Backup] Criado ${zipPath} (${archive.pointer()} bytes)`);
      await applyRetention();
      resolve({ success: true, file: zipPath });
    });

    archive.on('error', (err) => {
      logger.erro('[Backup] Erro:', err.message);
      reject({ success: false, message: err.message });
    });

    archive.pipe(output);
    // Inclui toda a pasta dados exceto backups
    archive.glob('**/*', {
      cwd: DADOS_DIR,
      ignore: ['backups/**']
    });
    archive.finalize();
  });
}

async function applyRetention() {
  const files = (await fs.readdir(BACKUP_DIR))
    .filter(f => f.endsWith('.zip'))
    .map(f => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
    .sort((a, b) => b.t - a.t);

  const extras = files.slice(RETENTION);
  for (const e of extras) {
    await fs.remove(path.join(BACKUP_DIR, e.f));
    logger.info(`[Backup] Removido antigo: ${e.f}`);
  }
}

function scheduleBackups() {
  // Diariamente às 02:00
  cron.schedule('0 2 * * *', async () => {
    try {
      await runBackupNow();
    } catch (e) {
      logger.erro('[Backup] Falha no agendamento:', e.message);
    }
  }, { timezone: 'America/Sao_Paulo' });

  logger.info('[Backup] Agendado diário 02:00');
}

async function listBackups() {
  await ensureDirs();
  const files = await fs.readdir(BACKUP_DIR);
  return files.filter(f => f.endsWith('.zip')).sort().reverse()
    .map(f => path.join(BACKUP_DIR, f));
}

module.exports = {
  scheduleBackups,
  runBackupNow,
  listBackups
};