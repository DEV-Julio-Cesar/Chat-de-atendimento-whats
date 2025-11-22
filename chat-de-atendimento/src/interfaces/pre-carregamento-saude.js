// pre-carregamento-saude.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('healthAPI', {
  getHealthStatus: () => ipcRenderer.invoke('health:get-status')
});

contextBridge.exposeInMainWorld('navigationAPI', {
  navigate: (route, params = {}) => ipcRenderer.invoke('navigate-to', route, params),
  goBack: () => ipcRenderer.invoke('navigate-back'),
  goForward: () => ipcRenderer.invoke('navigate-forward'),
  getState: () => ipcRenderer.invoke('navigation-get-state'),
  onNavigationStateUpdate: (callback) => ipcRenderer.on('navigation-state', (_, state) => callback(state)),
  onParams: (callback) => ipcRenderer.on('navigation-params', (_, params) => callback(params))
});
