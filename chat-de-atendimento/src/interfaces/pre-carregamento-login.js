// pre-carregamento-login.js
const { contextBridge, ipcRenderer } = require('electron');

console.log('[PRELOAD-LOGIN] Iniciando...');

// Expor authAPI
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

// Expor navigationAPI
contextBridge.exposeInMainWorld('navigationAPI', {
  navigate: (route, params = {}) => ipcRenderer.invoke('navigate-to', route, params),
  goBack: () => ipcRenderer.invoke('navigate-back'),
  goForward: () => ipcRenderer.invoke('navigate-forward'),
  getState: () => ipcRenderer.invoke('navigation-get-state'),
  onNavigationStateUpdate: (callback) => {
    ipcRenderer.on('navigation-state', (_, state) => callback(state));
  },
  onParams: (callback) => {
    ipcRenderer.on('navigation-params', (_, params) => callback(params));
  }
});

// Expor UX Components API
contextBridge.exposeInMainWorld('uxAPI', {
  // Toast notifications serão acessíveis via window.ToastNotification
  // Loading states via window.LoadingState
  // Confirmation modals via window.ConfirmationModal
  // Esses componentes são carregados diretamente no renderer
  ready: true
});

console.log('[PRELOAD-LOGIN] APIs expostas:', {
  authAPI: typeof window !== 'undefined' ? !!window.authAPI : 'window não disponível',
  navigationAPI: typeof window !== 'undefined' ? !!window.navigationAPI : 'window não disponível',
  uxAPI: typeof window !== 'undefined' ? !!window.uxAPI : 'window não disponível'
});