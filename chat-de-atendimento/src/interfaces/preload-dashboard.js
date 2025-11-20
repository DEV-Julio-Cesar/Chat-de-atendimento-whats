const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dashboardAPI', {
    obterMetricas: () => ipcRenderer.invoke('get-metrics'),
    resetarMetricas: () => ipcRenderer.invoke('reset-metrics'),
    exportar: (tipo) => ipcRenderer.invoke('report:export', tipo)
});