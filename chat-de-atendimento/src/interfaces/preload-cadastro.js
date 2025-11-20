// preload-cadastro.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cadastroAPI', {
    /**
     * Registra um novo usuário no sistema.
     * @param {Object} newUser - Dados do novo usuário
     * @returns {Promise<Object>} Retorna { success: boolean, message: string }
     */
    cadastrar: (dados) => ipcRenderer.invoke('register-user', dados)
});
