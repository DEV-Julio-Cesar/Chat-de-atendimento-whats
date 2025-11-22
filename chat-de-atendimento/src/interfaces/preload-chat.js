contextBridge.exposeInMainWorld('iaAPI', {
    perguntarGemini: ({ mensagem, contexto }) => ipcRenderer.invoke('ia:gemini:perguntar', { mensagem, contexto })
});
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chatAPI', {
    aoDefinirCliente: (callback) => ipcRenderer.on('set-client-id', (_, id) => callback(id)),
    aoNovaMensagem: (callback) => ipcRenderer.on('nova-mensagem-recebida', (_, data) => callback(data)),
    listarChats: (clientId) => ipcRenderer.invoke('list-whatsapp-chats', clientId),
    carregarHistorico: (clientId, chatId) => ipcRenderer.invoke('load-chat-history', { clientId, chatId }),
    enviarMensagem: (clientId, chatId, message) => ipcRenderer.invoke('send-whatsapp-message', { clientId, chatId, message }),
    listarMensagensRapidas: () => ipcRenderer.invoke('quick-messages-list'),
    obterMensagemRapida: (codigo) => ipcRenderer.invoke('quick-messages-get', codigo),
    adicionarMensagemRapida: (codigo, texto) => ipcRenderer.invoke('quick-messages-add', { codigo, texto }),
    removerMensagemRapida: (codigo) => ipcRenderer.invoke('quick-messages-remove', codigo),
    registrarUsoMensagemRapida: (codigo) => ipcRenderer.invoke('quick-messages-registrar-uso', codigo),
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