/**
 * 🧭 Navigation API - Preload
 * 
 * API de navegação exposta para todas as janelas.
 * Inclua este módulo em todos os preloads.
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expõe API de navegação no contexto da janela
 */
function exposeNavigationAPI() {
    try {
        contextBridge.exposeInMainWorld('navigationAPI', {
            // Navegar para uma rota
            navigate: (route, params = {}) => ipcRenderer.invoke('navigate-to', route, params),
            
            // Voltar
            goBack: () => ipcRenderer.invoke('navigate-back'),
            
            // Avançar
            goForward: () => ipcRenderer.invoke('navigate-forward'),
            
            // Obter estado de navegação
            getState: () => ipcRenderer.invoke('navigation-get-state'),
            
            // Listener para atualização de estado
            onNavigationStateUpdate: (callback) => {
                ipcRenderer.on('navigation-state', (_, state) => callback(state));
            },
            
            // Listener para parâmetros de navegação
            onParams: (callback) => {
                ipcRenderer.on('navigation-params', (_, params) => callback(params));
            }
        });
    } catch (error) {
        console.error('Erro ao expor navigationAPI:', error);
    }
}

module.exports = { exposeNavigationAPI };
