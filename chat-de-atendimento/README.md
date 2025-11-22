# 🚀 CHAT DE ATENDIMENTO WHATSAPP - VERSÃO 2.0

> **Sistema completo de atendimento ao cliente via WhatsApp com interface Electron**
> 
> ✨ **NOVO:** Suporte a **múltiplas conexões WhatsApp simultâneas** com gerenciamento profissional!

---

## ⚡ Comandos Rápidos

```powershell
# 1) Usuário de teste (admin/admin)
npm run seed:admin

# 2) Servidores (opcional, em terminais separados)
npm run ws
npm run chat:interno

# 3) Iniciar o aplicativo
npm start

# 4) Testes rápidos
npm run teste:login
npm run teste:cadastro
```

**📚 Documentação Completa:**
- 📖 `docs/COMANDOS.md` - Todos os comandos disponíveis
- 🏗️ `docs/ESTRUTURA.md` - Arquitetura do projeto
- 🧪 `docs/TESTE-WHATSAPP.md` - Guia de teste da integração WhatsApp
- 🔗 **`docs/MULTI-WHATSAPP.md` - Sistema de múltiplas conexões (NOVO!)**

---

## 📋 ÍNDICE

- [📖 Sobre o Projeto](#-sobre-o-projeto)
- [🏗️ Arquitetura](#️-arquitetura)
- [📁 Estrutura de Pastas](#-estrutura-de-pastas)
- [⚡ Funcionalidades](#-funcionalidades)
- [🛠️ Instalação](#️-instalação)
- [🚀 Como Usar](#-como-usar)
- [⚙️ Configuração](#️-configuração)
- [🔧 Desenvolvimento](#-desenvolvimento)
- [📚 API e Documentação](#-api-e-documentação)
- [🤝 Contribuição](#-contribuição)
 - [🧑‍💻 Usuário de Teste](#-usuário-de-teste)

---

## 📖 SOBRE O PROJETO

O **Chat de Atendimento WhatsApp** é uma aplicação desktop desenvolvida em **Electron** que permite gerenciar atendimentos ao cliente via WhatsApp de forma profissional e organizada.

### ✨ Principais Diferenciais

- 🎨 **Interface Intuitiva**: Design moderno e fácil de usar
- 🔐 **Sistema de Login**: Autenticação segura com usuários fixos e cadastráveis
- 💬 **Chat Interno**: Comunicação entre atendentes em tempo real
- 📊 **Histórico Completo**: Registro de todas as conversas
- 🔄 **Conexão Múltipla**: Suporte a múltiplas instâncias do WhatsApp
- 🛡️ **Segurança**: Dados protegidos e criptografados

---

## 🏗️ ARQUITETURA

### 🔧 Tecnologias Utilizadas

- **Electron**: Framework para aplicações desktop
- **Node.js**: Runtime JavaScript
- **WhatsApp Web.js**: Biblioteca para integração com WhatsApp
- **WebSocket**: Comunicação em tempo real
- **HTML/CSS/JS**: Interface do usuário
- **JSON**: Armazenamento de dados local

### 🌐 Estrutura da Aplicação

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PROCESSO      │    │   PROCESSO      │    │   SERVIDORES    │
│   PRINCIPAL     │◄──►│ RENDERIZAÇÃO    │◄──►│   WEBSOCKET     │
│   (Main)        │    │   (Interface)   │    │  (Chat/WhatsApp)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 📁 ESTRUTURA DE PASTAS

```
chat-de-atendimento/
│
├── 📁 src/                          # Código fonte principal
│   ├── 📁 aplicacao/               # Regras de negócio e serviços
│   │
│   ├── 📁 whatsapp/                # Integração WhatsApp
│   │   ├── servidor-websocket.js    # Servidor principal (canônico)
│   │   ├── servidor-chat-interno.js # Chat entre atendentes (canônico)
│   │   ├── websocket_server.js      # Proxy para servidor canônico
│   │   └── internal-chat-server.js  # Proxy para servidor canônico
│   │
│   ├── 📁 interfaces/              # Arquivos de interface
│   │   ├── preload-principal.js    # Ponte IPC principal
│   │   ├── preload-login.js        # Ponte IPC login
│   │   ├── preload-cadastro.js     # Ponte IPC cadastro
│   │   ├── preload-history.js      # Ponte IPC histórico
│   │   ├── renderizador-principal.js # Lógica da interface principal
│   │   ├── login.html              # Tela de login
│   │   ├── cadastro.html           # Tela de cadastro
│   │   ├── index.html              # Tela principal
│   │   ├── history.html            # Tela de histórico
│   │   └── qr-window.html          # Tela de QR Code
│   │
│   └── 📁 utilitarios/             # Funções auxiliares (futuro)
│
├── 📁 config/                      # Configurações
│   └── configuracoes-principais.js # Arquivo central de configs
│
├── 📁 dados/                       # Armazenamento de dados
│   ├── usuarios.json               # Base de usuários (canônica)
│   ├── historico-conversas.json    # Histórico de chats
│   └── configuracoes-sistema.json  # Configs salvas
│
├── 📁 logs/                        # Logs do sistema
│   └── aplicativo.log              # Log principal
│
├── 📁 assets/                      # Recursos (ícones, imagens)
│   └── icon.png                    # Ícone do aplicativo
│
├── main.js                         # Ponto de entrada (atualizado)
├── package.json                    # Dependências e scripts
├── package-lock.json               # Lock das dependências
└── README.md                       # Esta documentação
```

Para uma visão didática e atualizada da arquitetura e responsabilidades de cada pasta, consulte `docs/ESTRUTURA.md`.

---

## ⚡ FUNCIONALIDADES

### 🔐 Sistema de Autenticação
- ✅ Login com usuários fixos (administradores)
- ✅ Cadastro de novos usuários dinâmico
- ✅ Validação segura de credenciais
- ✅ Hash de senhas com SHA-256
- ✅ Gestão de sessões de usuário

### 💬 Chat WhatsApp
- ✅ Conexão via WhatsApp Web.js
- ✅ QR Code para autenticação
- ✅ Envio e recebimento de mensagens
- ✅ Lista de conversas ativas
- ✅ Histórico de conversas

### 👥 Chat Interno
- ✅ Comunicação entre atendentes
- ✅ Mensagens em tempo real
- ✅ Notificações de entrada/saída
- ✅ Histórico das mensagens internas

### 📊 Gerenciamento
- ✅ Histórico completo de atendimentos
- ✅ Estatísticas de uso
- ✅ Backup automático de dados
- ✅ Logs detalhados do sistema

---

## 🛠️ INSTALAÇÃO

### 📋 Pré-requisitos

- **Node.js** (versão 16 ou superior)
- **npm** ou **yarn**
- Sistema operacional: Windows, macOS ou Linux

### ⬇️ Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/chat-atendimento-whatsapp.git
   cd chat-atendimento-whatsapp
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o aplicativo:**
   ```bash
   npm start
   ```

### 📦 Build para Produção

```bash
# Build para Windows
npm run build:win

# Build para macOS
npm run build:mac

# Build para Linux
npm run build:linux
```

---

## 🚀 COMO USAR

### 1️⃣ Primeiro Acesso

1. **Execute o aplicativo** com `npm start`
2. **(Opcional) Popular usuário de teste:**
    - Rode `npm run seed:admin` para garantir o usuário `admin` com senha `admin` nas bases locais
3. **Faça login** com:
    - **Usuário:** `admin` | **Senha:** `admin`

### 2️⃣ Cadastrar Novos Usuários

1. Na tela de login, clique em **"Cadastrar Usuário"**
2. Preencha os dados solicitados
3. O usuário será salvo automaticamente

### 3️⃣ Configurar WhatsApp

1. **Método 1 - API Business:**
   - Acesse **Configurações**
   - Insira seu **Token** e **Phone ID**
   - Clique em **"Conectar"**

2. **Método 2 - QR Code:**
   - Clique em **"Conectar via QR"**
   - Escaneie o código com seu WhatsApp
   - Aguarde a conexão ser estabelecida

### 4️⃣ Usar o Chat Interno

1. **Digite sua mensagem** na área de chat interno
2. **Pressione Enter** ou clique em **"Enviar"**
3. **Visualize** mensagens de outros atendentes em tempo real

---

## ⚙️ CONFIGURAÇÃO

### 📝 Arquivo de Configuração

As configurações estão centralizadas em:
```
config/configuracoes-principais.js
```

### 🔧 Principais Configurações

```javascript
// Portas dos servidores
rede: {
    websocket: {
        portaPrincipal: 8080,      // Servidor principal
        portaChatInterno: 9090     // Chat interno
    }
}

// Configurações de segurança
seguranca: {
    tentativasLoginMaximas: 5,     // Máximo de tentativas
    tempoBloqueiLogin: 300000,     // Tempo de bloqueio (ms)
    sessaoExpiracaoHoras: 8        // Expiração da sessão
}

// Interface
interface: {
    tema: {
        padrao: 'claro'            // Tema padrão
    },
    chat: {
        mensagensPorPagina: 50     // Paginação
    }
}
```

---

## 🔧 DESENVOLVIMENTO

### 🏃‍♂️ Executar em Modo Desenvolvimento

```bash
# Com logs detalhados
NODE_ENV=development npm start

# Com auto-reload (se configurado)
npm run dev
```

### 🧪 Executar Servidores Separadamente

```bash
# Servidor WebSocket principal
node src/whatsapp/servidor-websocket.js

# Servidor de chat interno
node src/whatsapp/servidor-chat-interno.js
```

Também disponível via scripts npm:

```powershell
npm run ws
npm run chat:interno
```

### 🐛 Debug

1. **Ative o modo debug** em `config/configuracoes-principais.js`
2. **Abra o DevTools** com `Ctrl+Shift+I`
3. **Visualize logs** no console

### 🔍 Estrutura de Logs

```

---

## 🧑‍💻 Usuário de Teste

- Para criar/atualizar o usuário de testes, execute:

```powershell
npm run seed:admin
```

- Isso garante o usuário `admin/admin` em `dados/usuarios.json` (usado pela validação de login) e remove arquivos legados de usuários, mantendo a base unificada.
logs/
├── aplicativo.log          # Log principal
├── erro-{data}.log         # Logs de erro
└── debug-{data}.log        # Logs de debug
```

---

## 📚 API E DOCUMENTAÇÃO

### 🔌 APIs Expostas (Preload)

#### `apiWhatsApp`
```javascript
// Configurar credenciais
await apiWhatsApp.configurarCredenciais(token, idTelefone);

// Enviar mensagem
await apiWhatsApp.enviarMensagem(numero, mensagem);

// Buscar conversas
const conversas = await apiWhatsApp.buscarConversas();

// Chat interno
await apiWhatsApp.enviarMensagemInterna(remetente, mensagem);
```

#### `apiNotificacoes`
```javascript
// Mostrar notificação
apiNotificacoes.mostrarNotificacao(titulo, corpo, opcoes);

// Solicitar permissão
await apiNotificacoes.solicitarPermissao();
```

### 📡 Eventos IPC

#### Principais Handlers:
- `tentar-login` - Processar login
- `registrar-novo-usuario` - Cadastrar usuário
- `configurar-credenciais-whatsapp` - Configurar WhatsApp
- `enviar-mensagem-whatsapp` - Enviar mensagem
- `enviar-mensagem-interna` - Chat interno

#### Eventos Emitidos:
- `nova-mensagem-whatsapp` - Nova mensagem recebida
- `mensagem-chat-interno` - Mensagem do chat interno
- `erro-sistema` - Erro no sistema

---

## 🤝 CONTRIBUIÇÃO

### 📝 Como Contribuir

1. **Fork o projeto**
2. **Crie uma branch** para sua feature (`git checkout -b feature/MinhaFeature`)
3. **Commit suas mudanças** (`git commit -m 'Adiciona MinhaFeature'`)
4. **Push para a branch** (`git push origin feature/MinhaFeature`)
5. **Abra um Pull Request**

### 🎯 Diretrizes

- ✅ **Documente** todas as funções com JSDoc
- ✅ **Use nomes intuitivos** em português
- ✅ **Mantenha a estrutura** organizada
- ✅ **Teste** antes de fazer commit
- ✅ **Siga os padrões** de código existentes

### 🐛 Reportar Bugs

1. **Verifique** se o bug já foi reportado
2. **Crie uma issue** detalhada
3. **Inclua logs** e prints
4. **Descreva** os passos para reproduzir

---

## 📄 LICENÇA

Este projeto está sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.

---

## 📞 SUPORTE

- 📧 **Email:** suporte@chatwhatsapp.com.br
- 💬 **Discord:** [Link do servidor]
- 📱 **WhatsApp:** (11) 99999-9999
- 🌐 **Site:** https://chatwhatsapp.com.br

---

## 🏆 CRÉDITOS

Desenvolvido com ❤️ por **Sistema Chat Atendimento**

### 🙏 Agradecimentos

- **Electron Team** - Framework principal
- **WhatsApp Web.js** - Integração com WhatsApp  
- **Node.js Community** - Bibliotecas utilizadas
- **Contributors** - Todos que contribuíram para o projeto

---

**⭐ Se este projeto te ajudou, deixe uma estrela no GitHub!**
