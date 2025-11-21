const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('qrAPI', {
    onSetClientId: (callback) => ipcRenderer.on('set-client-id', (_, id) => callback(id)),
    onQRCode: (callback) => ipcRenderer.on('qr-code-data', (_, qr) => callback(qr)),
    onReady: (callback) => ipcRenderer.on('whatsapp-ready', (_, id) => callback(id)),
    startConnection: (clientId) => ipcRenderer.invoke('start-whatsapp-connection', clientId)
});