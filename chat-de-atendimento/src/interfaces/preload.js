// preload.js - Script de Pré-carregamento (Ponte Segura IPC)
const { contextBridge, ipcRenderer } = require('electron');

// 🚨 CORREÇÃO: Todas as funções estão unificadas em UMA ÚNICA EXPOSIÇÃO.
contextBridge.exposeInMainWorld('whatsappAPI', {
    // Funcao para abrir a nova janela de Historico
    openHistorySearch: () => {
        ipcRenderer.send('open-history-search-window');
    },
    
    // --- FUNÇÕES DA CLOUD API (IPC Main.handle) ---
    configurarCredenciais: (token, id) => {
        // Nota: Garanta que o nome do handler no main.js seja 'config-whatsapp-credentials'
        return ipcRenderer.invoke('config-whatsapp-credentials', { token, id });
    },
    
    enviarMensagem: (numero, mensagem) => {
        return ipcRenderer.invoke('send-whatsapp-message', { numero, mensagem });
    },

    /**
     * Solicita ao Main Process para iniciar o processo de conexão via QR Code.
     */
    iniciarConexaoQRCode: () => {
        return ipcRenderer.invoke('iniciar-qr-code-flow');
    },

    // Função para buscar a lista de conversas
    fetchChats: () => {
        return ipcRenderer.invoke('fetch-whatsapp-chats');
    },
    
    // 🚨 CORRIGIDO: Esta função estava fora do objeto
    fetchChatHistory: (number) => {
        return ipcRenderer.invoke('fetch-chat-history', number);
    },

    // --- LISTENERS (IPC Main.send) ---
    /**
     * Assina um evento para receber novas mensagens do WhatsApp.
     */
    onNovaMensagemRecebida: (callback) => {
        ipcRenderer.on('nova-mensagem-recebida', (event, mensagem) => callback(mensagem));
    },

    /**
     * Assina um evento para receber a DataURL da imagem do QR Code.
     */
    onQRCodeReceived: (callback) => {
        ipcRenderer.on('qr-code-data', (event, qrDataURL) => callback(qrDataURL));
    },

    /**
     * Assina um evento para receber a notificação de que o WhatsApp está conectado.
     */
    onWhatsappReady: (callback) => {
        ipcRenderer.on('whatsapp-ready', () => callback());
    },

    // 🆕 Novas funções para múltiplos clientes
    openNewQRWindow: () => {
        return ipcRenderer.invoke('open-new-qr-window');
    },
    
    listConnectedClients: () => {
        return ipcRenderer.invoke('list-connected-clients');
    },
    
    disconnectClient: (clientId) => {
        return ipcRenderer.invoke('disconnect-client', clientId);
    },
    
    onNewClientReady: (callback) => {
        ipcRenderer.on('new-client-ready', (event, data) => callback(data));
    }
});

contextBridge.exposeInMainWorld('internalChatAPI', {
    send: (from, texto) => ipcRenderer.invoke('internal-chat-send', { from, texto }),
    fetchHistory: () => ipcRenderer.invoke('internal-chat-history'),
    onMessage: (cb) => ipcRenderer.on('internal-chat-message', (e, msg) => cb(msg))
});

contextBridge.exposeInMainWorld('electronAPI', {
  abrirNovaJanelaQR: () => ipcRenderer.invoke('open-new-qr-window'),
  listarClientesConectados: () => ipcRenderer.invoke('list-connected-clients'),
  desconectarCliente: (clientId) => ipcRenderer.invoke('disconnect-client', clientId),
  enviarMensagem: (dados) => ipcRenderer.invoke('send-whatsapp-message', dados),
  aoClientePronto: (callback) => ipcRenderer.on('new-client-ready', (_, data) => callback(data)),
  aoNovaMensagem: (callback) => ipcRenderer.on('nova-mensagem-recebida', (_, data) => callback(data)),
  abrirUsuarios: () => ipcRenderer.send('open-users-window'),
  abrirPoolManager: () => ipcRenderer.send('open-pool-manager'),
  abrirChat: (clientId) => ipcRenderer.send('open-chat-window', clientId),
  abrirDashboard: () => ipcRenderer.send('open-dashboard'),
  abrirChatbot: () => ipcRenderer.send('open-chatbot'),
  // NOVO: backups/relatórios/tema/atendimentos
  backupNow: () => ipcRenderer.invoke('backup:run'),
  listarBackups: () => ipcRenderer.invoke('backup:list'),
  exportarRelatorio: (tipo) => ipcRenderer.invoke('report:export', tipo),
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setTheme: (t) => ipcRenderer.invoke('theme:set', t),
  attend: {
    register: (u) => ipcRenderer.invoke('attend:register', u),
    setStatus: (p) => ipcRenderer.invoke('attend:set-status', p),
    claim: (p) => ipcRenderer.invoke('attend:claim', p),
    release: (p) => ipcRenderer.invoke('attend:release', p),
    get: (p) => ipcRenderer.invoke('attend:get', p),
    list: () => ipcRenderer.invoke('attend:list')
  }
});

// Expor API de navegação
contextBridge.exposeInMainWorld('navigationAPI', {
  navigate: (route, params = {}) => ipcRenderer.invoke('navigate-to', route, params),
  goBack: () => ipcRenderer.invoke('navigate-back'),
  goForward: () => ipcRenderer.invoke('navigate-forward'),
  getState: () => ipcRenderer.invoke('navigation-get-state'),
  onNavigationStateUpdate: (callback) => {
    ipcRenderer.on('navigation-state', (_, state) => callback(state));
  },
  onParams: (callback) => {
    ipcRenderer.on('navigation-params', (_, params) => callback(params));
  }
});