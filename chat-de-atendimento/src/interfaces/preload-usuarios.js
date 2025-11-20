const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('usuariosAPI', {
    listar: () => ipcRenderer.invoke('list-users'),
    stats: () => ipcRenderer.invoke('get-user-stats'),
    remover: (username) => ipcRenderer.invoke('remove-user', username),
    setAtivo: (username, ativo) => ipcRenderer.invoke('set-user-active', { username, ativo })
});