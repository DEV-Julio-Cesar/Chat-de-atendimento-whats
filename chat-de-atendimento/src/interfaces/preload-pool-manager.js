const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('poolAPI', {
    // Obter informações de todos os clientes
    getAllClientsInfo: () => ipcRenderer.invoke('list-all-clients-info'),
    
    // Obter estatísticas do pool
    getStats: () => ipcRenderer.invoke('get-pool-stats'),
    
    // Criar nova janela QR
    openNewQRWindow: () => ipcRenderer.invoke('open-new-qr-window'),
    
    // Abrir chat com cliente específico
    openChat: (clientId) => ipcRenderer.send('open-chat-window', clientId),
    
    // Desconectar cliente
    disconnectClient: (clientId) => ipcRenderer.invoke('disconnect-client', clientId),
    
    // Reconectar cliente
    reconnectClient: (clientId) => ipcRenderer.invoke('reconnect-client', clientId),
    
    // Logout de cliente (remove sessão)
    logoutClient: (clientId) => ipcRenderer.invoke('logout-client', clientId),
    
    // Restaurar sessões persistidas
    restorePersistedSessions: () => ipcRenderer.invoke('restore-persisted-sessions'),
    
    // Listener para novos clientes prontos
    onClientReady: (callback) => ipcRenderer.on('new-client-ready', (_, data) => callback(data))
});

contextBridge.exposeInMainWorld('navigationAPI', {
    navigate: (route, params = {}) => ipcRenderer.invoke('navigate-to', route, params),
    goBack: () => ipcRenderer.invoke('navigate-back'),
    goForward: () => ipcRenderer.invoke('navigate-forward'),
    getState: () => ipcRenderer.invoke('navigation-get-state'),
    onNavigationStateUpdate: (callback) => ipcRenderer.on('navigation-state', (_, state) => callback(state)),
    onParams: (callback) => ipcRenderer.on('navigation-params', (_, params) => callback(params))
});
