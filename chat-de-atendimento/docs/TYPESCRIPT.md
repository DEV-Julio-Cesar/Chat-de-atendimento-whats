# 📘 TypeScript Migration Guide

## Visão Geral

Migração progressiva do projeto para TypeScript, começando pelos módulos core (WindowManager e WhatsAppClientService).

## Status da Migração

### ✅ Completado

1. **WindowManager** (`src/services/WindowManager.ts`)
   - Tipos completos para rotas, configurações e navegação
   - Interface `NavigationState` para estado de navegação
   - Type-safe route management

2. **WhatsAppClientService** (`src/services/WhatsAppClientService.ts`)
   - Tipos para status do cliente, callbacks e resultados
   - Interfaces para mensagens, chats e informações do cliente
   - Type-safe com whatsapp-web.js

3. **Global Type Declarations** (`src/types/global.d.ts`)
   - Declarações para módulos JS internos
   - Logger, Cache, DI, MessageQueue, Prometheus, Permissions, Auditoria

### 🔄 Pendente

- WhatsAppPoolManager
- API REST endpoints
- Módulos de aplicação (chatbot, metricas, backup, etc)
- Scripts de teste
- main.js (processo principal do Electron)

## Estrutura de Tipos

### WindowManager

```typescript
// Rotas disponíveis
type RouteType = 
  | 'login' 
  | 'principal' 
  | 'pool-manager' 
  | 'chat' 
  | 'dashboard' 
  | 'chatbot' 
  | 'usuarios' 
  | 'history' 
  | 'cadastro' 
  | 'health';

// Configuração de janela
interface WindowConfig {
  file: string;
  preload: string;
  width: number;
  height: number;
  resizable: boolean;
  title: string;
}

// Estado de navegação
interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  currentRoute: RouteType | null;
  historyLength: number;
}
```

### WhatsAppClientService

```typescript
// Status do cliente
type ClientStatus = 
  | 'idle' 
  | 'initializing' 
  | 'qr_ready' 
  | 'authenticated' 
  | 'ready' 
  | 'disconnected' 
  | 'error';

// Resultado de envio de mensagem
interface MessageResult {
  success: boolean;
  messageId?: string;
  queued?: boolean;
  message?: string;
}

// Resultado de listagem de chats
interface ChatResult {
  success: boolean;
  chats?: Chat[];
  fromCache?: boolean;
  message?: string;
}

// Informações do cliente
interface ClientInfo {
  clientId: string;
  status: ClientStatus;
  phoneNumber: string | null;
  qrCode: string | null;
  metadata: ClientMetadata;
  isReady: boolean;
}
```

## Configuração TypeScript

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "types": ["node"]
  }
}
```

### Scripts npm

```json
{
  "scripts": {
    "build:ts": "tsc",
    "watch:ts": "tsc --watch",
    "type-check": "tsc --noEmit"
  }
}
```

## Uso dos Módulos TypeScript

### Importando WindowManager

```typescript
import windowManager, { RouteType, NavigationState } from './services/WindowManager';

// Type-safe navigation
windowManager.navigate('principal');
windowManager.navigate('chat', { clientId: '123' });

// Type-safe state
const state: NavigationState = windowManager.getNavigationState();
```

### Importando WhatsAppClientService

```typescript
import WhatsAppClientService, { 
  ClientOptions, 
  MessageResult, 
  ClientInfo 
} from './services/WhatsAppClientService';

// Type-safe initialization
const options: ClientOptions = {
  sessionPath: './sessions',
  onReady: (clientId) => console.log(`${clientId} ready`),
  onQR: (clientId, qr) => console.log(`QR: ${qr}`)
};

const client = new WhatsAppClientService('client-001', options);

// Type-safe methods
const result: MessageResult = await client.sendMessage('5511999999999@c.us', 'Hello!');
const info: ClientInfo = client.getClientInfo();
```

## Integração com Código JavaScript

Os módulos TypeScript compilados são compatíveis com código JavaScript existente:

```javascript
// main.js (JavaScript)
const WindowManager = require('./src/services/WindowManager');
const WhatsAppClientService = require('./src/services/WhatsAppClientService');

// Funciona normalmente
const windowManager = WindowManager.default;
windowManager.navigate('principal');
```

## Benefícios da Migração

### 1. **Type Safety**
- Erros capturados em tempo de compilação
- IntelliSense completo no VS Code
- Refatoração segura

### 2. **Documentação Viva**
- Tipos servem como documentação
- Interfaces explícitas para contratos de API
- Menos necessidade de comentários

### 3. **Melhor Developer Experience**
- Autocomplete preciso
- Navegação de código melhorada
- Validação em tempo real

### 4. **Qualidade de Código**
- Detecção de bugs potenciais
- Código mais robusto e confiável
- Menos runtime errors

## Próximos Passos

### Prioridade Alta
1. **WhatsAppPoolManager.ts**
   - Gerenciamento de múltiplos clientes
   - Pool de conexões type-safe

2. **API Types** (`src/infraestrutura/api.ts`)
   - Request/Response types
   - Endpoint definitions
   - Middleware types

### Prioridade Média
3. **Application Modules**
   - chatbot.ts
   - metricas.ts
   - backup.ts
   - gerenciador-usuarios.ts

4. **Core Modules TS Native**
   - di.ts (converter de .js)
   - cache.ts
   - message-queue.ts
   - prometheus-metrics.ts

### Prioridade Baixa
5. **Test Files**
   - Converter testes para TypeScript
   - Adicionar types para Jest

6. **Main Process**
   - main.ts (processo principal Electron)
   - Preload scripts em TypeScript

## Convenções de Código

### Naming
- **Interfaces**: PascalCase com `I` prefix opcional (`IWindowConfig` ou `WindowConfig`)
- **Types**: PascalCase (`RouteType`, `ClientStatus`)
- **Enums**: PascalCase para enum e membros (`Status.Ready`)

### Exports
- **Default export** para classes singleton
- **Named exports** para tipos e interfaces
- **Namespace export** para grupos relacionados

### Error Handling
```typescript
try {
  await client.sendMessage(to, text);
} catch (erro: any) {
  logger.erro('Erro:', erro.message);
}
```

### Async/Await
- Preferir async/await sobre Promises
- Sempre tipar retornos async: `Promise<Type>`

## Troubleshooting

### Erro: Cannot find module
```bash
npm install --save-dev @types/node @types/express
```

### Erro: Type 'null' is not assignable
Use non-null assertion `!` ou optional chaining `?.`

### Erro: implicit any
Adicione tipos explícitos ou use `any` com `@ts-ignore`

## Referências

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Electron with TypeScript](https://www.electronjs.org/docs/latest/tutorial/typescript)
- [whatsapp-web.js Types](https://github.com/pedroslopez/whatsapp-web.js)
