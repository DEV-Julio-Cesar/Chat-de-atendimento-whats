const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const metricas = require('../aplicacao/metricas');
const usuarios = require('../aplicacao/gerenciador-usuarios');
const backups = require('../aplicacao/backup');
const logger = require('./logger');
const prometheusMetrics = require('../core/prometheus-metrics');
const { apiLimiter } = require('../core/rate-limiter');

function startApi(providers, port = process.env.PORT || 3333) {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: '5mb' }));

  // Middleware de rate limiting
  app.use((req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!apiLimiter.isAllowed(identifier)) {
      const status = apiLimiter.getStatus(identifier);
      const resetDate = new Date(status.resetAt);
      
      logger.aviso(`[API] Rate limit excedido para ${identifier}`);
      prometheusMetrics.incrementCounter('http_rate_limit_exceeded_total', { ip: identifier });
      
      res.set('X-RateLimit-Limit', status.limit);
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', resetDate.toISOString());
      res.set('Retry-After', Math.ceil((status.resetAt - Date.now()) / 1000));
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: resetDate.toISOString()
      });
    }
    
    const status = apiLimiter.getStatus(identifier);
    res.set('X-RateLimit-Limit', status.limit);
    res.set('X-RateLimit-Remaining', status.remaining);
    res.set('X-RateLimit-Reset', new Date(status.resetAt).toISOString());
    
    next();
  });

  // Middleware para instrumentar requisições
  app.use((req, res, next) => {
    const start = Date.now();
    prometheusMetrics.incrementCounter('http_requests_total', { method: req.method, path: req.path });
    res.on('finish', () => {
      const duration = Date.now() - start;
      prometheusMetrics.observeHistogram('http_request_duration_ms', { method: req.method, path: req.path }, duration);
      prometheusMetrics.incrementCounter('http_responses_total', { method: req.method, path: req.path, status: res.statusCode });
    });
    next();
  });

  app.get('/api/status', async (_req, res) => {
    res.json({
      ok: true,
      clients: providers.getClients(),
      time: new Date().toISOString()
    });
  });

  // Endpoint Prometheus metrics
  app.get('/metrics', async (req, res) => {
    try {
      // Atualiza métricas do sistema
      const DI = require('../core/di');
      const whatsappPool = DI.get('whatsappPool');
      const messageQueue = require('../core/message-queue');
      
      if (whatsappPool) {
        const stats = whatsappPool.getStats();
        prometheusMetrics.setGauge('whatsapp_clients_total', {}, stats.totalClients);
        prometheusMetrics.setGauge('whatsapp_clients_ready', {}, stats.readyClients);
        prometheusMetrics.setGauge('whatsapp_clients_authenticated', {}, stats.authenticatedClients || 0);
      }
      
      prometheusMetrics.setGauge('message_queue_size', {}, messageQueue.size());
      prometheusMetrics.setGauge('process_memory_bytes', { type: 'heap_used' }, process.memoryUsage().heapUsed);
      prometheusMetrics.setGauge('process_memory_bytes', { type: 'rss' }, process.memoryUsage().rss);
      prometheusMetrics.setGauge('process_uptime_seconds', {}, process.uptime());
      
      res.set('Content-Type', 'text/plain; version=0.0.4');
      res.send(prometheusMetrics.export());
    } catch (erro) {
      logger.erro('[Metrics] Erro ao gerar métricas:', erro);
      res.status(500).send('# Error generating metrics\n');
    }
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