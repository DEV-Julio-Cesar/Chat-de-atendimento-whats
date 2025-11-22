// pre-carregamento-cadastro.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cadastroAPI', {
    /**
     * Registra um novo usuário no sistema.
     * @param {Object} newUser - Dados do novo usuário
     * @returns {Promise<Object>} Retorna { success: boolean, message: string }
     */
    cadastrar: (dados) => ipcRenderer.invoke('register-user', dados)
});

contextBridge.exposeInMainWorld('navigationAPI', {
    navigate: (route, params = {}) => ipcRenderer.invoke('navigate-to', route, params),
    goBack: () => ipcRenderer.invoke('navigate-back'),
    goForward: () => ipcRenderer.invoke('navigate-forward'),
    getState: () => ipcRenderer.invoke('navigation-get-state'),
    onNavigationStateUpdate: (callback) => ipcRenderer.on('navigation-state', (_, state) => callback(state)),
    onParams: (callback) => ipcRenderer.on('navigation-params', (_, params) => callback(params))
});
