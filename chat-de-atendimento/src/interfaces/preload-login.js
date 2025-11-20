// preload-login.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('authAPI', {
  /**
   * Envia as credenciais para o Main Process para validação.
   * @param {string} username - O nome de usuário.
   * @param {string} password - A senha do usuário.
   * @returns {Promise<boolean>} Retorna true se autenticado.
   */
  tentarLogin: (username, password) => ipcRenderer.invoke('login-attempt', { username, password }),

  /**
   * Método para abrir a janela de cadastro.
   */
  abrirCadastro: () => ipcRenderer.send('open-register-window'),

  /**
   * Método para fechar a janela de login.
   */
  fecharJanela: () => ipcRenderer.send('close-login-window')
});