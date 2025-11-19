// preload-history.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('historyAPI', {
    /**
     * Envia filtros de data e número para o Main Process para consulta de histórico.
     * @param {object} filters { number, dateStart, dateEnd }
     * @returns {Promise<object>} Retorna { sucesso: boolean, history: array }
     */
    searchHistory: (filters) => {
        return ipcRenderer.invoke('search-chat-history', filters);
    }
});