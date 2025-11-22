# 🔗 Sistema de Múltiplas Conexões WhatsApp

## 📋 Visão Geral

O sistema foi **completamente refatorado** para suportar **múltiplas conexões WhatsApp simultâneas** de forma profissional e escalável.

---

## 🏗️ Arquitetura Nova

### 📦 Componentes Principais

#### 1. **WhatsAppClientService** (`src/services/WhatsAppClientService.js`)
Classe responsável por gerenciar **um único cliente WhatsApp**.

**Funcionalidades:**
- ✅ Inicialização e autenticação
- ✅ Geração de QR Code (automático em DataURL)
- ✅ Gerenciamento de eventos (qr, ready, message, disconnected)
- ✅ Envio de mensagens de texto e mídia
- ✅ Status detalhado (idle, initializing, qr_ready, authenticated, ready, disconnected, error)
- ✅ Metadata (criação, última QR, mensagens enviadas)
- ✅ Reconexão automática
- ✅ Logout com remoção de sessão

**Métodos principais:**
```javascript
const client = new WhatsAppClientService(clientId, options);

await client.initialize();                    // Inicializa cliente
await client.sendMessage(to, text);           // Envia mensagem
await client.sendMedia(to, media, options);   // Envia mídia
client.getInfo();                             // Informações completas
await client.disconnect();                    // Desconecta
await client.reconnect();                     // Reconecta
await client.logout();                        // Logout e remove sessão
```

---

#### 2. **WhatsAppPoolManager** (`src/services/WhatsAppPoolManager.js`)
Gerenciador de **pool de múltiplos clientes**.

**Funcionalidades:**
- ✅ Criar/gerenciar até **10 clientes simultâneos** (configurável)
- ✅ **Health check periódico** (a cada 60s)
- ✅ **Reconexão automática** em caso de falha
- ✅ **Persistência de sessões** (salva em `dados/whatsapp-sessions.json`)
- ✅ **Restauração automática** de sessões ao reiniciar
- ✅ Distribuição de carga (round-robin para envio)
- ✅ Estatísticas globais (total criado, conectado, mensagens)
- ✅ **Graceful shutdown** (desconecta todos ao fechar app)

**Métodos principais:**
```javascript
const pool = new WhatsAppPoolManager(options);

// Criar e inicializar cliente
await pool.createAndInitialize(clientId);

// Enviar mensagem por cliente específico
await pool.sendMessage(clientId, to, text);

// Enviar por primeiro cliente disponível
await pool.sendMessageAuto(to, text);

// Obter clientes prontos
pool.getReadyClients();

// Obter informações de todos
pool.getAllClientsInfo();

// Estatísticas
pool.getStats();

// Health check manual
await pool.healthCheck();

// Restaurar sessões salvas
await pool.restorePersistedSessions();

// Shutdown gracioso
await pool.shutdown();
```

---

#### 3. **Interface de Gerenciamento** (`src/interfaces/pool-manager.html`)
**Nova janela dedicada** ao gerenciamento visual de múltiplas conexões.

**Recursos:**
- 📊 **Dashboard com estatísticas** (total clientes, conectados, mensagens)
- 🎴 **Cards individuais** por cliente com:
  - Status em tempo real (badges coloridos)
  - Telefone conectado
  - Data de criação
  - Total de mensagens
- ⚡ **Ações rápidas por cliente:**
  - 💬 Abrir Chat
  - 🔌 Desconectar
  - 🔄 Reconectar
  - 🗑️ Remover (logout)
- 🔄 **Atualização automática** a cada 5 segundos
- ➕ **Adicionar nova conexão** com 1 clique
- 📥 **Restaurar sessões** salvas

---

## 🚀 Como Usar

### 1️⃣ **Iniciar Sistema**
```powershell
npm start
```

### 2️⃣ **Login**
- **Usuário:** `admin`
- **Senha:** `admin`

### 3️⃣ **Gerenciar Conexões**

**Opção A: Tela Principal**
- Clique em **"🔗 Gerenciar Conexões"** (botão roxo destacado)

**Opção B: Conexão Rápida**
- Clique em **"📱 Conectar WhatsApp"** para adicionar nova conexão diretamente

---

## 📱 Fluxo de Conexão

### **Adicionar Novo Cliente**
1. Clique em **"➕ Adicionar Nova Conexão"**
2. Nova janela QR abre automaticamente
3. Escaneie o QR Code com WhatsApp do celular
4. Status muda: `Inicializando...` → `Aguardando QR` → `Conectado ✓`
5. Cliente aparece na lista com status verde

### **Gerenciar Cliente Conectado**
- **Abrir Chat:** Conversar com contatos
- **Desconectar:** Fecha conexão (sessão mantida)
- **Reconectar:** Restaura conexão perdida
- **Remover:** Logout completo (deleta sessão)

---

## 🔧 Configuração Avançada

### **Limites e Parâmetros**
Edite `main.js` na inicialização do pool:

```javascript
whatsappPool = new WhatsAppPoolManager({
    maxClients: 10,                    // Máximo de clientes (padrão: 10)
    sessionPath: path.join(...),       // Pasta de sessões
    persistencePath: path.join(...),   // Arquivo JSON de persistência
    autoReconnect: true,               // Reconexão automática (padrão: true)
    reconnectDelay: 5000,              // Delay entre reconexões (ms)
    healthCheckInterval: 60000         // Intervalo de health check (ms)
});
```

---

## 📂 Persistência de Sessões

### **Arquivo:** `dados/whatsapp-sessions.json`

Estrutura:
```json
{
  "updatedAt": "2024-11-21T15:30:00.000Z",
  "sessions": [
    {
      "clientId": "client_1732205400123",
      "status": "ready",
      "phoneNumber": "5511999999999",
      "metadata": {
        "createdAt": "2024-11-21T15:30:00.000Z",
        "connectedAt": "2024-11-21T15:30:10.000Z",
        "messageCount": 25
      }
    }
  ]
}
```

### **Restauração Automática**
Ao clicar em **"📥 Restaurar Sessões"**, o sistema:
1. Lê o arquivo `whatsapp-sessions.json`
2. Reconecta todos os clientes com status `ready` ou `authenticated`
3. Mostra resultado: `X/Y sessões restauradas`

---

## 🔄 API REST Atualizada

### **Novos Endpoints**

#### `GET /clients`
Retorna lista de IDs de clientes **prontos**.

**Resposta:**
```json
["client_1732205400123", "client_1732205410456"]
```

---

#### `GET /stats`
Retorna estatísticas globais do pool.

**Resposta:**
```json
{
  "totalCreated": 5,
  "totalConnected": 3,
  "totalDisconnected": 2,
  "totalMessages": 150,
  "currentClients": 3,
  "maxClients": 10,
  "readyClients": 2,
  "clientsByStatus": {
    "ready": 2,
    "initializing": 1
  }
}
```

---

#### `GET /clients/all`
Retorna informações detalhadas de **todos** os clientes.

**Resposta:**
```json
[
  {
    "clientId": "client_1732205400123",
    "status": "ready",
    "phoneNumber": "5511999999999",
    "qrCode": null,
    "metadata": {
      "createdAt": "2024-11-21T15:30:00.000Z",
      "lastQRAt": "2024-11-21T15:30:05.000Z",
      "connectedAt": "2024-11-21T15:30:10.000Z",
      "messageCount": 25
    },
    "isReady": true
  }
]
```

---

## 🛠️ Handlers IPC Novos

### **Gerenciamento de Clientes**
```javascript
// Listar todos com detalhes
ipcRenderer.invoke('list-all-clients-info')

// Obter estatísticas
ipcRenderer.invoke('get-pool-stats')

// Desconectar cliente
ipcRenderer.invoke('disconnect-client', clientId)

// Reconectar cliente
ipcRenderer.invoke('reconnect-client', clientId)

// Logout (remove sessão)
ipcRenderer.invoke('logout-client', clientId)

// Restaurar sessões salvas
ipcRenderer.invoke('restore-persisted-sessions')
```

---

## 📊 Monitoramento

### **Health Check Automático**
- Executa **a cada 60 segundos**
- Verifica estado de cada cliente
- Tenta reconectar clientes não saudáveis automaticamente
- Logs detalhados no console

### **Logs de Debug**
```
[Pool] Cliente client_123 pronto - Telefone: 5511999999999
[Pool] Executando health check...
[Pool] Health check concluído: 3/5 clientes saudáveis
[Pool] Cliente client_456 não saudável, tentando reconectar...
[Pool] 3 sessões persistidas
```

---

## 🎯 Benefícios da Nova Arquitetura

### ✅ **Escalabilidade**
- Suporta **10+ clientes simultâneos**
- Fácil aumentar limite (alterar `maxClients`)

### ✅ **Resiliência**
- Reconexão automática
- Health check contínuo
- Graceful shutdown

### ✅ **Observabilidade**
- Estatísticas em tempo real
- Logs estruturados
- Interface visual intuitiva

### ✅ **Manutenibilidade**
- Código modular e isolado
- Separação clara de responsabilidades
- Fácil extensão (novos métodos no pool)

### ✅ **Profissionalismo**
- Persistência de sessões
- Callbacks customizáveis
- Tratamento robusto de erros

---

## 🧪 Testes Recomendados

### **Teste 1: Múltiplas Conexões**
1. Conectar 3 WhatsApps diferentes
2. Verificar se todos aparecem na lista
3. Enviar mensagem de cada um
4. Verificar contadores de mensagens

### **Teste 2: Reconexão**
1. Conectar 1 WhatsApp
2. Desconectar manualmente
3. Clicar em "Reconectar"
4. Verificar se volta ao status "Conectado"

### **Teste 3: Persistência**
1. Conectar 2 WhatsApps
2. Fechar aplicação (`Ctrl+C`)
3. Reabrir (`npm start`)
4. Clicar "Restaurar Sessões"
5. Verificar se ambos reconectam

### **Teste 4: Health Check**
1. Conectar 1 WhatsApp
2. Aguardar 60 segundos
3. Verificar log: `Health check concluído`
4. Forçar desconexão no celular
5. Aguardar próximo health check
6. Verificar se tenta reconectar

---

## 🔜 Próximos Passos Sugeridos

### **Performance**
- [ ] Lazy load do Puppeteer (só inicializar quando necessário)
- [ ] Cache in-memory de contatos frequentes
- [ ] Pool de instâncias Puppeteer compartilhadas

### **Funcionalidades**
- [ ] Grupos: gerenciar múltiplos grupos por cliente
- [ ] Agendamento: mensagens programadas
- [ ] Templates: mensagens pré-definidas
- [ ] Métricas avançadas: taxa de resposta, tempo médio

### **Segurança**
- [ ] Criptografia de sessões salvas
- [ ] Rate limiting por cliente
- [ ] Validação de números antes de envio

### **UI/UX**
- [ ] Drag & drop para reordenar clientes
- [ ] Filtros (status, telefone, data)
- [ ] Busca por clientId ou telefone
- [ ] Notificações push quando cliente desconecta

---

## 📝 Changelog

### **v2.0.0 - Multi-Client Architecture**
- ✅ Criado `WhatsAppClientService` isolado
- ✅ Criado `WhatsAppPoolManager` para gerenciar múltiplos clientes
- ✅ Nova interface `pool-manager.html` para gerenciamento visual
- ✅ Persistência automática de sessões
- ✅ Health check periódico
- ✅ Reconexão automática
- ✅ Graceful shutdown
- ✅ Estatísticas em tempo real
- ✅ API REST atualizada com novos endpoints

---

## 🆘 Troubleshooting

### **Problema: Cliente não conecta**
**Solução:**
1. Verifique se o QR Code apareceu
2. Certifique-se de escanear em até 30 segundos
3. Verifique conexão de internet
4. Tente remover e criar novo cliente

### **Problema: Sessão não restaura**
**Solução:**
1. Verifique se arquivo `dados/whatsapp-sessions.json` existe
2. Delete pasta `.wwebjs_auth/session-clientId`
3. Conecte novamente

### **Problema: Limite de clientes atingido**
**Solução:**
1. Remova clientes inativos
2. Ou aumente `maxClients` no código
3. Reinicie aplicação

---

## 💡 Dicas de Uso

1. **Nomes descritivos:** Edite `clientId` no código para IDs mais legíveis (ex: `cliente_vendas`, `cliente_suporte`)
2. **Organização:** Use 1 cliente por departamento/equipe
3. **Backup:** Faça backup da pasta `.wwebjs_auth` periodicamente
4. **Logs:** Ative logs detalhados para debug (`logger.setLevel('debug')`)

---

**✨ Sistema pronto para produção com suporte a múltiplas conexões WhatsApp!**

