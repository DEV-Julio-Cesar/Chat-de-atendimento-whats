const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    aoDefinirClientId: (callback) => ipcRenderer.on('set-client-id', (_, id) => callback(id)),
    aoQRCode: (callback) => ipcRenderer.on('qr-code-data', (_, qr) => callback(qr)),
    aoPronto: (callback) => ipcRenderer.on('whatsapp-ready', (_, id) => callback(id))
});