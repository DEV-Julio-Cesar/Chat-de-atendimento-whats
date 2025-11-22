# 🚀 Advanced Improvements - Sistema Completo

## Visão Geral

Melhoramentos avançados implementados para produção-ready application: performance monitoring, error handling centralizado, configuração gerenciada, retry policies e feature flags.

---

## 📊 Performance Monitor

**Arquivo:** `src/core/performance-monitor.js`

Monitor de performance com métricas detalhadas e detecção de gargalos.

### Uso Básico

```javascript
const perfMonitor = require('./src/core/performance-monitor');

// Medir operação
const finish = perfMonitor.start('sendMessage');
await sendMessage();
const { duration, memoryDelta } = finish();

// Wrapper para funções
const wrappedFn = perfMonitor.wrap('processData', processData);
await wrappedFn(data);

// Obter estatísticas
const stats = perfMonitor.getStats('sendMessage');
console.log(`Avg: ${stats.avgDuration}ms, P95: ${stats.p95Duration}ms`);

// Relatório completo
perfMonitor.report();

// Event loop monitoring
perfMonitor.startEventLoopMonitoring();
```

### Métricas Coletadas

- **count**: Total de execuções
- **avgDuration**: Duração média (ms)
- **minDuration**: Duração mínima
- **maxDuration**: Duração máxima
- **p95Duration**: Percentil 95
- **p99Duration**: Percentil 99
- **memoryDelta**: Variação de memória

### Integração com Prometheus

Todas as métricas são automaticamente enviadas para Prometheus:
- `operation_duration_ms{operation="nome"}` - Histogram
- `operation_count_total{operation="nome"}` - Counter
- `event_loop_lag_ms` - Gauge

---

## 🛠️ Error Handler

**Arquivo:** `src/core/error-handler.js`

Sistema centralizado de tratamento de erros com categorização e severidade.

### Uso

```javascript
const errorHandler = require('./src/core/error-handler');

// Tratar erro
try {
  await riskyOperation();
} catch (error) {
  const errorInfo = errorHandler.handle(error, {
    user: 'user123',
    operation: 'sendMessage'
  });
  
  // errorInfo = { id, message, category, severity }
  return res.status(500).json(errorInfo);
}

// Wrapper try-catch async
const result = await errorHandler.tryAsync(async () => {
  return await operation();
}, { context: 'important' });

if (!result.success) {
  console.error(result.error);
}

// Configurar handlers globais
errorHandler.setupGlobalHandlers();
```

### Categorias de Erro

- **NETWORK**: Erros de conexão
- **WHATSAPP**: Erros do WhatsApp
- **AUTHENTICATION**: Falha de autenticação
- **AUTHORIZATION**: Permissões negadas
- **VALIDATION**: Dados inválidos
- **DATABASE**: Erros de BD
- **INTERNAL**: Erros internos
- **EXTERNAL_API**: Erros de APIs externas

### Severidades

1. **critical**: Afeta todo o sistema
2. **error**: Afeta operações importantes
3. **warning**: Recuperável
4. **info**: Informativo

### Mensagens User-Friendly

O sistema automaticamente converte erros técnicos em mensagens amigáveis:
```javascript
// Technical: "ECONNREFUSED 127.0.0.1:3000"
// User-friendly: "Erro de conexão. Verifique sua internet."
```

---

## ⚙️ Config Manager

**Arquivo:** `src/core/config-manager.js`

Gerenciador centralizado de configurações com validação e suporte a env vars.

### Uso

```javascript
const config = require('./src/core/config-manager');

// Carregar configuração
config.load();

// Obter valores
const port = config.get('app.port', 3333);
const maxClients = config.get('whatsapp.maxClients');

// Definir valores
config.set('api.rateLimit.general.maxRequests', 200);
config.save();

// Obter tudo
const allConfig = config.getAll();

// Resetar para padrão
config.reset();

// Exportar/Importar
const jsonStr = config.export();
config.import(jsonStr);
```

### Estrutura de Configuração

```json
{
  "app": {
    "name": "Chat de Atendimento",
    "version": "1.0.0",
    "port": 3333,
    "environment": "production"
  },
  "whatsapp": {
    "maxClients": 10,
    "sessionPath": ".wwebjs_auth",
    "qrTimeout": 60000,
    "messageQueueMaxSize": 1000
  },
  "api": {
    "rateLimit": {
      "general": { "maxRequests": 100, "windowMs": 60000 }
    }
  },
  "cache": {
    "enabled": true,
    "defaultTTL": 60000
  },
  "security": {
    "passwordMinLength": 8,
    "requireStrongPassword": true
  }
}
```

### Variáveis de Ambiente

Sobrescrevem valores do config.json:

```bash
NODE_ENV=production
PORT=8080
MAX_CLIENTS=20
RATE_LIMIT_GENERAL=200
LOG_LEVEL=debug
```

### Arquivo de Configuração

Criado automaticamente em: `config.json` (raiz do projeto)

---

## 🔄 Retry Policy

**Arquivo:** `src/core/retry-policy.js`

Sistema de retry com backoff exponencial e jitter.

### Uso

```javascript
const RetryPolicy = require('./src/core/retry-policy');

// Política customizada
const policy = new RetryPolicy({
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2,
  jitter: true
});

const result = await policy.execute(async (attempt) => {
  return await unstableOperation();
}, {
  onRetry: (error, attempt, delay) => {
    console.log(`Retry ${attempt}, aguardando ${delay}ms`);
  },
  shouldRetry: (error, attempt) => {
    return error.code === 'ETIMEDOUT';
  }
});

// Políticas pré-configuradas
const networkPolicy = RetryPolicy.network();
const whatsappPolicy = RetryPolicy.whatsapp();
const criticalPolicy = RetryPolicy.critical();
const noRetry = RetryPolicy.none();

await networkPolicy.execute(async () => {
  return await fetch('https://api.example.com');
});
```

### Políticas Pré-configuradas

| Política | maxAttempts | initialDelay | maxDelay | Uso |
|----------|-------------|--------------|----------|-----|
| **network()** | 5 | 1000ms | 30000ms | Requisições HTTP |
| **whatsapp()** | 3 | 2000ms | 10000ms | Operações WhatsApp |
| **critical()** | 10 | 500ms | 60000ms | Ops críticas |
| **none()** | 1 | 0ms | 0ms | Sem retry |

### Backoff Exponencial

```
Attempt 1: 1000ms
Attempt 2: 2000ms
Attempt 3: 4000ms
Attempt 4: 8000ms
Attempt 5: 16000ms (limitado a maxDelay)
```

Com **jitter**: Adiciona aleatoriedade de 50-100% para evitar thundering herd.

---

## 🚩 Feature Flags

**Arquivo:** `src/core/feature-flags.js`

Sistema de feature flags para habilitar/desabilitar funcionalidades.

### Uso

```javascript
const featureFlags = require('./src/core/feature-flags');

// Verificar se habilitada
if (featureFlags.isEnabled('whatsapp.multi-device')) {
  await connectMultiDevice();
}

// Habilitar/Desabilitar
featureFlags.enable('experimental.ai-chatbot');
featureFlags.disable('cache.messages');
featureFlags.toggle('ux.dark-mode');

// Wrapper condicional
featureFlags.when('monitoring.metrics', 
  () => collectMetrics(),
  () => console.log('Metrics disabled')
);

// Wrapper async
await featureFlags.whenAsync('backup.auto',
  async () => await performBackup()
);

// Middleware Express
app.use('/experimental', featureFlags.middleware('experimental.ai-chatbot'));

// Obter por categoria
const securityFlags = featureFlags.getByCategory('security');
const experimentalFlags = featureFlags.getByCategory('experimental');

// Verificar experimentais
if (featureFlags.hasExperimentalEnabled()) {
  console.warn('⚠️ Features experimentais ativadas');
}
```

### Categorias de Flags

#### Desenvolvimento
- `dev.debug-mode` - Modo debug avançado
- `dev.performance-logs` - Logs de performance

#### WhatsApp
- `whatsapp.multi-device` ✅ - Múltiplos dispositivos
- `whatsapp.auto-reconnect` ✅ - Reconexão automática
- `whatsapp.message-queue` ✅ - Fila de mensagens
- `whatsapp.media-support` ✅ - Suporte a mídia

#### Segurança
- `security.rate-limiting` ✅ - Rate limiting
- `security.audit-log` ✅ - Log de auditoria
- `security.2fa` - 2FA

#### UX
- `ux.toast-notifications` ✅ - Notificações toast
- `ux.loading-states` ✅ - Loading states
- `ux.dark-mode` ✅ - Tema escuro
- `ux.keyboard-shortcuts` - Atalhos

#### Monitoramento
- `monitoring.metrics` ✅ - Métricas
- `monitoring.health-check` ✅ - Health check
- `monitoring.performance` ✅ - Performance

#### Experimental
- `experimental.ai-chatbot` - Chatbot IA
- `experimental.voice-messages` - Voz
- `experimental.message-scheduler` - Agendamento

#### Cache
- `cache.chats` ✅ - Cache de chats
- `cache.contacts` ✅ - Cache de contatos
- `cache.messages` - Cache de msgs

#### Backup
- `backup.auto` ✅ - Auto backup
- `backup.cloud` - Cloud backup

### Arquivo de Flags

Armazenado em: `dados/feature-flags.json`

---

## 🎯 Exemplo Completo de Integração

```javascript
const config = require('./src/core/config-manager');
const perfMonitor = require('./src/core/performance-monitor');
const errorHandler = require('./src/core/error-handler');
const RetryPolicy = require('./src/core/retry-policy');
const featureFlags = require('./src/core/feature-flags');

// Inicialização
config.load();
errorHandler.setupGlobalHandlers();
perfMonitor.startEventLoopMonitoring();

// Operação com todos os sistemas
async function sendWhatsAppMessage(to, message) {
  // Feature flag
  if (!featureFlags.isEnabled('whatsapp.message-queue')) {
    throw new Error('Message queue disabled');
  }

  // Performance monitoring
  const finish = perfMonitor.start('whatsapp.sendMessage');

  try {
    // Retry policy
    const policy = RetryPolicy.whatsapp();
    
    const result = await policy.execute(async (attempt) => {
      const maxRetries = config.get('whatsapp.retryAttempts', 3);
      
      if (attempt > maxRetries) {
        throw new Error('Max retries exceeded');
      }

      return await client.sendMessage(to, message);
    });

    finish();
    return { success: true, result };

  } catch (error) {
    finish();
    
    // Error handling
    const errorInfo = errorHandler.handle(error, {
      operation: 'sendWhatsAppMessage',
      to,
      messageLength: message.length
    });

    return { success: false, error: errorInfo };
  }
}
```

---

## 📈 Métricas e Monitoramento

Todas as ferramentas integram com Prometheus:

```promql
# Performance
operation_duration_ms{operation="sendMessage"}
operation_count_total{operation="sendMessage"}
event_loop_lag_ms

# Errors
errors_total{category="whatsapp",severity="error"}

# Sistema
process_memory_bytes
process_uptime_seconds
```

---

## 🔧 Setup Inicial

1. **Carregar configuração:**
```javascript
const config = require('./src/core/config-manager');
config.load();
```

2. **Inicializar error handler:**
```javascript
const errorHandler = require('./src/core/error-handler');
errorHandler.setupGlobalHandlers();
```

3. **Iniciar performance monitoring:**
```javascript
const perfMonitor = require('./src/core/performance-monitor');
perfMonitor.startEventLoopMonitoring();
```

4. **Carregar feature flags:**
```javascript
const featureFlags = require('./src/core/feature-flags');
// Flags carregam automaticamente
```

---

## 🎓 Boas Práticas

### 1. Use Performance Monitor em Ops Críticas
```javascript
const finish = perfMonitor.start('criticalOp');
await criticalOperation();
const { duration } = finish();
if (duration > 5000) logger.warn('Slow operation');
```

### 2. Sempre Use Error Handler
```javascript
const result = await errorHandler.tryAsync(async () => {
  return await riskyOp();
});
```

### 3. Configure Via Config Manager
```javascript
const timeout = config.get('api.timeout', 30000);
```

### 4. Use Retry para Operações de Rede
```javascript
const policy = RetryPolicy.network();
await policy.execute(async () => await fetch(url));
```

### 5. Feature Flags para Rollout Gradual
```javascript
featureFlags.when('new-feature', () => {
  useNewImplementation();
});
```

---

## 🚀 Roadmap Futuro

- [ ] Distributed tracing (OpenTelemetry)
- [ ] Redis para feature flags distribuídos
- [ ] A/B testing framework
- [ ] Grafana dashboards automáticos
- [ ] Health check avançado com dependências
- [ ] Rate limiting distribuído
- [ ] Circuit breaker metrics
- [ ] Auto-scaling baseado em métricas
