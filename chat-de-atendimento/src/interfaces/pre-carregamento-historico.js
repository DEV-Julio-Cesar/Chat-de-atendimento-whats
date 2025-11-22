// pre-carregamento-historico.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    buscarChats: (clientId) => ipcRenderer.invoke('fetch-whatsapp-chats', clientId),
    buscarHistorico: (dados) => ipcRenderer.invoke('fetch-chat-history', dados),
    pesquisarHistorico: (filtros) => ipcRenderer.invoke('search-chat-history', filtros)
});

contextBridge.exposeInMainWorld('navigationAPI', {
    navigate: (route, params = {}) => ipcRenderer.invoke('navigate-to', route, params),
    goBack: () => ipcRenderer.invoke('navigate-back'),
    goForward: () => ipcRenderer.invoke('navigate-forward'),
    getState: () => ipcRenderer.invoke('navigation-get-state'),
    onNavigationStateUpdate: (callback) => ipcRenderer.on('navigation-state', (_, state) => callback(state)),
    onParams: (callback) => ipcRenderer.on('navigation-params', (_, params) => callback(params))
});