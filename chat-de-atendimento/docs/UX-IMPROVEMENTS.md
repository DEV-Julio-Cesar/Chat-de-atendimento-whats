# 🎨 Melhoramentos de UX e Resiliência

## Visão Geral

Novos componentes e sistemas implementados para melhorar experiência do usuário, segurança e resiliência.

## 🛡️ Resiliência & Segurança

### Rate Limiter (`src/core/rate-limiter.js`)

Protege a API contra abuso com sliding window rate limiting.

**Uso:**
```javascript
const { apiLimiter, authLimiter, messageLimiter } = require('./src/core/rate-limiter');

// Verifica se pode fazer requisição
if (apiLimiter.isAllowed(userIp)) {
  // Processa requisição
} else {
  // Retorna 429 Too Many Requests
}

// Obtém status
const status = apiLimiter.getStatus(userIp);
console.log(`Remaining: ${status.remaining}/${status.limit}`);
```

**Limites padrão:**
- API geral: 100 req/min
- Autenticação: 5 req/5min
- Mensagens: 50 msg/min

### Circuit Breaker (`src/core/circuit-breaker.js`)

Previne falhas em cascata com circuit breaker pattern.

**Uso:**
```javascript
const CircuitBreaker = require('./src/core/circuit-breaker');

const breaker = new CircuitBreaker({
  failureThreshold: 5,    // Abre após 5 falhas
  successThreshold: 2,    // Fecha após 2 sucessos em HALF_OPEN
  timeout: 60000,         // Timeout de operação: 1min
  resetTimeout: 30000     // Tenta HALF_OPEN após 30s
});

// Executa operação protegida
try {
  const result = await breaker.execute(async () => {
    return await riskyOperation();
  });
} catch (erro) {
  if (erro.message.includes('Circuit breaker is OPEN')) {
    // Circuit está aberto, aguarde
  }
}

// Verifica estado
const state = breaker.getState();
console.log(state.state); // CLOSED, OPEN, HALF_OPEN
```

**Estados:**
- **CLOSED**: Normal, operações permitidas
- **OPEN**: Bloqueado após muitas falhas
- **HALF_OPEN**: Testando recuperação

### Input Validator (`src/core/input-validator.js`)

Validação e sanitização de inputs para prevenir injeções.

**Uso:**
```javascript
const InputValidator = require('./src/core/input-validator');

// Valida telefone
const phone = InputValidator.validatePhone('11999999999');
if (phone.valid) {
  await sendMessage(phone.sanitized, message);
}

// Valida mensagem
const msg = InputValidator.validateMessage(userInput);
if (!msg.valid) {
  return alert(msg.error);
}

// Valida email
const email = InputValidator.validateEmail('user@example.com');

// Valida senha forte
const pwd = InputValidator.validatePassword('MyP@ss123', {
  minLength: 8,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecial: true
});

// Sanitiza HTML (previne XSS)
const safe = InputValidator.sanitizeHtml(userHtml);

// Previne prototype pollution
const safeObj = InputValidator.sanitizeObject(userObject);
```

## 🎨 UX Components

### Toast Notifications (`src/interfaces/toast-notifications.js`)

Sistema de notificações não-intrusivas.

**Uso no HTML:**
```html
<script src="toast-notifications.js"></script>

<script>
  // Success
  toast.success('Mensagem enviada com sucesso!');
  
  // Error
  toast.error('Erro ao conectar WhatsApp', 5000);
  
  // Warning
  toast.warning('Conexão instável');
  
  // Info
  toast.info('3 novas mensagens');
  
  // Custom
  toast.show('Custom message', 'info', 4000);
  
  // Limpar todas
  toast.clear();
</script>
```

**Tipos:**
- `success` (verde ✓)
- `error` (vermelho ✕)
- `warning` (amarelo ⚠)
- `info` (azul ℹ)

### Loading States (`src/interfaces/loading-states.js`)

Estados de carregamento elegantes.

**Uso no HTML:**
```html
<script src="loading-states.js"></script>

<script>
  // Loading fullscreen
  const loaderId = loading.show('body', {
    message: 'Conectando WhatsApp...',
    spinner: 'default', // default, dots, pulse
    size: 'medium'      // small, medium, large
  });
  
  // Remove loading
  loading.hide(loaderId);
  
  // Loading em botão
  const btn = document.querySelector('#sendBtn');
  loading.button(btn, true);  // Ativa loading
  await sendMessage();
  loading.button(btn, false); // Desativa loading
  
  // Skeleton loading
  loading.skeleton(container, 5); // 5 cards skeleton
  
  // Loading em container específico
  const id = loading.show('#chat-area', {
    message: 'Carregando mensagens...'
  });
</script>
```

**Tipos de Spinner:**
- `default`: Spinner circular
- `dots`: 3 dots animados
- `pulse`: Pulso suave

### Confirmation Modal (`src/interfaces/confirmation-modal.js`)

Modais de confirmação para ações críticas.

**Uso no HTML:**
```html
<script src="confirmation-modal.js"></script>

<script>
  // Confirmação básica
  const confirmed = await confirmModal.confirm({
    title: 'Desconectar Cliente',
    message: 'Tem certeza que deseja desconectar este cliente WhatsApp?',
    confirmText: 'Sim, desconectar',
    cancelText: 'Cancelar',
    type: 'warning'
  });
  
  if (confirmed) {
    await disconnectClient();
  }
  
  // Atalho para warning
  if (await confirmModal.warning('Isso pode causar perda de mensagens')) {
    // Continua
  }
  
  // Atalho para ação perigosa (delete)
  if (await confirmModal.danger('Todos os dados serão perdidos!')) {
    await deleteData();
  }
  
  // Atalho específico para delete
  if (await confirmModal.deleteConfirm('este cliente')) {
    await deleteClient();
  }
</script>
```

**Tipos:**
- `warning` (⚠️ amarelo)
- `danger` (🗑️ vermelho)
- `info` (ℹ️ azul)

## 📝 Exemplos Completos

### Envio de Mensagem com Validação e Feedback

```javascript
async function enviarMensagem() {
  const telefone = document.querySelector('#telefone').value;
  const mensagem = document.querySelector('#mensagem').value;
  const btn = document.querySelector('#enviarBtn');
  
  // Valida inputs
  const phoneValidation = InputValidator.validatePhone(telefone);
  if (!phoneValidation.valid) {
    toast.error(phoneValidation.error);
    return;
  }
  
  const msgValidation = InputValidator.validateMessage(mensagem);
  if (!msgValidation.valid) {
    toast.error(msgValidation.error);
    return;
  }
  
  // Loading no botão
  loading.button(btn, true);
  
  try {
    const result = await window.electronAPI.sendMessage(
      phoneValidation.sanitized,
      msgValidation.sanitized
    );
    
    if (result.success) {
      toast.success('Mensagem enviada com sucesso!');
    } else if (result.queued) {
      toast.warning('Mensagem enfileirada. Será enviada quando conectar.');
    } else {
      toast.error('Erro ao enviar: ' + result.message);
    }
  } catch (erro) {
    toast.error('Erro inesperado: ' + erro.message);
  } finally {
    loading.button(btn, false);
  }
}
```

### Deletar Cliente com Confirmação

```javascript
async function deletarCliente(clientId) {
  // Modal de confirmação
  const confirmed = await confirmModal.deleteConfirm(`o cliente ${clientId}`);
  
  if (!confirmed) {
    return; // Usuário cancelou
  }
  
  // Loading fullscreen
  const loaderId = loading.show('body', {
    message: 'Deletando cliente...'
  });
  
  try {
    await window.electronAPI.deleteClient(clientId);
    toast.success('Cliente deletado com sucesso');
    await recarregarLista();
  } catch (erro) {
    toast.error('Erro ao deletar cliente: ' + erro.message);
  } finally {
    loading.hide(loaderId);
  }
}
```

### Carregar Lista com Skeleton

```javascript
async function carregarChats() {
  const container = document.querySelector('#chat-list');
  
  // Mostra skeleton
  loading.skeleton(container, 5);
  
  try {
    const result = await window.electronAPI.getChats(clientId);
    
    if (result.success) {
      renderizarChats(result.chats);
      
      if (result.fromCache) {
        toast.info('Dados do cache (30s)', 2000);
      }
    } else {
      container.innerHTML = '<p>Erro ao carregar chats</p>';
      toast.error(result.message);
    }
  } catch (erro) {
    container.innerHTML = '<p>Erro inesperado</p>';
    toast.error(erro.message);
  }
}
```

## 🔌 Integração com API

Rate limiting já está integrado em `src/infraestrutura/api.js`:

```javascript
// Headers de resposta incluem:
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-11-21T15:30:00.000Z
Retry-After: 60

// Resposta 429 quando exceder:
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": "2025-11-21T15:30:00.000Z"
}
```

## 🎯 Boas Práticas

### 1. Sempre Valide Inputs
```javascript
// ❌ Não fazer
await sendMessage(phone, message);

// ✅ Fazer
const phoneVal = InputValidator.validatePhone(phone);
const msgVal = InputValidator.validateMessage(message);
if (phoneVal.valid && msgVal.valid) {
  await sendMessage(phoneVal.sanitized, msgVal.sanitized);
}
```

### 2. Feedback Visual Sempre
```javascript
// ❌ Operação silenciosa
await deleteClient(id);

// ✅ Com feedback
const confirmed = await confirmModal.deleteConfirm('cliente');
if (confirmed) {
  const loaderId = loading.show();
  try {
    await deleteClient(id);
    toast.success('Deletado!');
  } finally {
    loading.hide(loaderId);
  }
}
```

### 3. Trate Erros Graciosamente
```javascript
try {
  await riskyOperation();
  toast.success('Sucesso!');
} catch (erro) {
  logger.erro('Erro:', erro);
  toast.error('Erro: ' + erro.message);
}
```

### 4. Use Circuit Breaker para APIs Externas
```javascript
const whatsappBreaker = new CircuitBreaker({ failureThreshold: 5 });

async function sendViaWhatsApp(msg) {
  try {
    return await whatsappBreaker.execute(async () => {
      return await whatsappApi.send(msg);
    });
  } catch (erro) {
    if (erro.message.includes('Circuit breaker is OPEN')) {
      toast.warning('WhatsApp temporariamente indisponível');
    }
    throw erro;
  }
}
```

## 📊 Métricas

Todas as operações geram métricas Prometheus:
- `http_rate_limit_exceeded_total` - Rate limits excedidos
- `circuit_breaker_state` - Estado do circuit breaker
- `input_validation_failures_total` - Validações falhadas

## 🔜 Próximos Passos

- [ ] Adicionar componentes aos preload scripts
- [ ] Integrar em todas as telas
- [ ] Criar testes unitários
- [ ] Documentar padrões de erro handling
- [ ] Adicionar i18n para mensagens
