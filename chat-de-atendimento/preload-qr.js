const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('qrAPI', {
    onSetClientId: (callback) => {
        ipcRenderer.on('set-client-id', (event, clientId) => callback(clientId));
    },
    
    startConnection: (clientId) => {
        return ipcRenderer.invoke('iniciar-qr-code-multiple', clientId);
    },
    
    onQRCode: (callback) => {
        ipcRenderer.on('qr-code-data', (event, qrDataURL) => callback(qrDataURL));
    },
    
    onReady: (callback) => {
        ipcRenderer.on('whatsapp-ready', (event, clientId) => callback(clientId));
    }
});