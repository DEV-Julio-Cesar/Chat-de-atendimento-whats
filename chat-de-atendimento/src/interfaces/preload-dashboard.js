const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dashboardAPI', {
    obterMetricas: () => ipcRenderer.invoke('get-metrics'),
    resetarMetricas: () => ipcRenderer.invoke('reset-metrics'),
    exportar: (tipo) => ipcRenderer.invoke('report:export', tipo)
    metricasMensagensRapidas: () => ipcRenderer.invoke('quick-messages-metrics'),
    resetMetricasMensagensRapidas: () => ipcRenderer.invoke('quick-messages-metrics-reset')
});

contextBridge.exposeInMainWorld('navigationAPI', {
    navigate: (route, params = {}) => ipcRenderer.invoke('navigate-to', route, params),
    goBack: () => ipcRenderer.invoke('navigate-back'),
    goForward: () => ipcRenderer.invoke('navigate-forward'),
    getState: () => ipcRenderer.invoke('navigation-get-state'),
    onNavigationStateUpdate: (callback) => ipcRenderer.on('navigation-state', (_, state) => callback(state)),
    onParams: (callback) => ipcRenderer.on('navigation-params', (_, params) => callback(params))
});