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
    setFullScreen: (flag) => ipcRenderer.send('set-fullscreen', flag)
});