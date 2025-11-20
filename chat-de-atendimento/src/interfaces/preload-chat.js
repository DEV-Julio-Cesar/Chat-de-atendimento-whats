const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chatAPI', {
    aoDefinirCliente: (callback) => ipcRenderer.on('set-client-id', (_, id) => callback(id)),
    aoNovaMensagem: (callback) => ipcRenderer.on('nova-mensagem-recebida', (_, data) => callback(data)),
    listarChats: (clientId) => ipcRenderer.invoke('list-whatsapp-chats', clientId),
    carregarHistorico: (clientId, chatId) => ipcRenderer.invoke('load-chat-history', { clientId, chatId }),
    enviarMensagem: (clientId, chatId, message) => ipcRenderer.invoke('send-whatsapp-message', { clientId, chatId, message })
});