// preload-history.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    buscarChats: (clientId) => ipcRenderer.invoke('fetch-whatsapp-chats', clientId),
    buscarHistorico: (dados) => ipcRenderer.invoke('fetch-chat-history', dados),
    pesquisarHistorico: (filtros) => ipcRenderer.invoke('search-chat-history', filtros)
});