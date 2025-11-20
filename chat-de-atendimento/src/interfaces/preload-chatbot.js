const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chatbotAPI', {
    carregarRegras: () => ipcRenderer.invoke('get-chatbot-rules'),
    salvarRegras: (rules) => ipcRenderer.invoke('save-chatbot-rules', rules)
});