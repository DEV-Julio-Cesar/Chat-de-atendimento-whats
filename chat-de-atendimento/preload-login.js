// preload-login.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('loginAPI', {
    /**
     * Envia as credenciais para o Main Process para validação.
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise<boolean>} Retorna true se autenticado.
     */
    authenticate: (username, password) => {
        return ipcRenderer.invoke('login-attempt', { username, password });
    }
});