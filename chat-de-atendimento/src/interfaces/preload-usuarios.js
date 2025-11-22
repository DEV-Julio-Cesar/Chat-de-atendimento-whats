const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('usuariosAPI', {
    listar: () => ipcRenderer.invoke('list-users'),
    stats: () => ipcRenderer.invoke('get-user-stats'),
    remover: (username) => ipcRenderer.invoke('remove-user', username),
    setAtivo: (username, ativo) => ipcRenderer.invoke('set-user-active', { username, ativo })
});

contextBridge.exposeInMainWorld('navigationAPI', {
    navigate: (route, params = {}) => ipcRenderer.invoke('navigate-to', route, params),
    goBack: () => ipcRenderer.invoke('navigate-back'),
    goForward: () => ipcRenderer.invoke('navigate-forward'),
    getState: () => ipcRenderer.invoke('navigation-get-state'),
    onNavigationStateUpdate: (callback) => ipcRenderer.on('navigation-state', (_, state) => callback(state)),
    onParams: (callback) => ipcRenderer.on('navigation-params', (_, params) => callback(params))
});