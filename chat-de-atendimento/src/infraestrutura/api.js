const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const metricas = require('../aplicacao/metricas');
const usuarios = require('../aplicacao/gerenciador-usuarios');
const backups = require('../aplicacao/backup');
const logger = require('./logger');

function startApi(providers, port = process.env.PORT || 3333) {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: '5mb' }));

  app.get('/api/status', async (_req, res) => {
    res.json({
      ok: true,
      clients: providers.getClients(),
      time: new Date().toISOString()
    });
  });

  app.get('/api/metrics', async (_req, res) => {
    const data = await metricas.obterMetricas();
    res.json(data);
  });

  app.get('/api/users', async (_req, res) => {
    const list = await usuarios.listarUsuarios();
    res.json({ success: true, users: list });
  });

  app.get('/api/backups', async (_req, res) => {
    const list = await backups.listBackups();
    res.json({ success: true, files: list });
  });

  app.get('/api/chats/:clientId', async (req, res) => {
    const chats = await providers.listChats(req.params.clientId);
    res.json(chats);
  });

  app.post('/api/messages', async (req, res) => {
    const { clientId, chatId, message } = req.body || {};
    if (!clientId || !chatId || !message) return res.status(400).json({ success: false, message: 'Campos obrigatórios' });
    const result = await providers.sendMessage({ clientId, chatId, message });
    res.json(result);
  });

  app.listen(port, () => logger.info(`[API] REST ouvindo em http://localhost:${port}`));
}

module.exports = { startApi };