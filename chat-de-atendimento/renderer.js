// ...existing code...
let isConnected = false;
let activeChatNumber = null;
let conversations = {}; // histórico por número

// DOM refs (pre-declared to be assigned on DOMContentLoaded)
let statusText, statusEl, btnSettings, settingsModal, btnCancelSettings, connectionForm, inputToken, inputPhoneId, btnConnect;
let conversationsContainer, mensagensDiv, chatForm, chatHeader, activeChatName, activeChatNumberEl, mensagemInput, placeholderChat;
let btnGenerateQR, btnConnectQR, qrcodeImage, qrcodeMessage;
const btnHistory = document.getElementById('btn-history-search'); // Ref do novo botão
btnHistory && btnHistory.addEventListener('click', () => {
    window.whatsappAPI.openHistorySearch();
});

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Refs ---
    statusText = document.getElementById('status-text');
    statusEl = document.getElementById('connection-status');
    btnSettings = document.getElementById('btn-settings');
    settingsModal = document.getElementById('settings-modal');
    btnCancelSettings = document.getElementById('btn-cancel-settings');
    connectionForm = document.getElementById('connection-form');
    inputToken = document.getElementById('input-token');
    inputPhoneId = document.getElementById('input-phone-id');
    btnConnect = document.getElementById('btn-connect');
    conversationsContainer = document.getElementById('conversations-container');
    mensagensDiv = document.getElementById('mensagens');
    chatForm = document.getElementById('chat-form');
    chatHeader = document.getElementById('chat-header');
    activeChatName = document.getElementById('active-chat-name');
    activeChatNumberEl = document.getElementById('active-chat-number');
    mensagemInput = document.getElementById('mensagem-input');
    placeholderChat = document.getElementById('placeholder-chat');

    // QR refs
    btnGenerateQR = document.getElementById('btn-generate-qr');
    btnConnectQR = document.getElementById('btn-connect-qr');
    qrcodeImage = document.getElementById('qrcode-image');
    qrcodeMessage = document.getElementById('qrcode-message');

    // --- Event listeners ---
    btnSettings && btnSettings.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    btnCancelSettings && btnCancelSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

    connectionForm && connectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = inputToken.value.trim();
        const phoneId = inputPhoneId.value.trim();
        if (!token || !phoneId) return;
        btnConnect.textContent = 'Conectando...';
        try {
            const resultado = await window.whatsappAPI.configurarCredenciais(token, phoneId);
            if (resultado && resultado.sucesso) {
                updateConnectionStatus(true);
                settingsModal.classList.add('hidden');
                await loadAndDisplayChats();
            } else {
                console.error('Erro de conexão:', resultado && resultado.erro);
                updateConnectionStatus(false);
            }
        } catch (err) {
            console.error('Erro interno ao configurar credenciais:', err);
            updateConnectionStatus(false);
        } finally {
            btnConnect.textContent = 'Conectar API';
        }
    });

    // QR Flow: iniciar
    btnGenerateQR && btnGenerateQR.addEventListener('click', async () => {
        btnGenerateQR.textContent = 'Gerando...';
        btnGenerateQR.disabled = true;
        qrcodeMessage && (qrcodeMessage.textContent = 'Aguarde a geração do QR Code...');
        btnGenerateQR && btnGenerateQR.classList.add('hidden');
        try {
            const resultado = await window.whatsappAPI.iniciarConexaoQRCode();
            console.log('QR Flow iniciado:', resultado);
            qrcodeMessage && (qrcodeMessage.textContent = 'Inicialização bem-sucedida. Aguardando o QR Code...');
            qrcodeImage && qrcodeImage.classList.add('hidden');
            btnConnectQR && btnConnectQR.classList.add('hidden');
        } catch (err) {
            console.error('Falha ao iniciar QR Flow:', err);
            qrcodeMessage && (qrcodeMessage.textContent = `[ERRO] Falha ao iniciar QR Flow: ${err.message || err}`);
            if (btnGenerateQR) {
                btnGenerateQR.textContent = 'Gerar Código QR';
                btnGenerateQR.disabled = false;
                btnGenerateQR.classList.remove('hidden');
            }
        }
    });

    btnConnectQR && btnConnectQR.addEventListener('click', () => settingsModal.classList.add('hidden'));

    // Send message
    chatForm && chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isConnected || !activeChatNumber) return;
        const texto = mensagemInput.value.trim();
        if (!texto) return;
        addMessageToHistory(activeChatNumber, { texto }, 'Eu', false);
        mensagemInput.value = '';
        try {
            const resultado = await window.whatsappAPI.enviarMensagem(activeChatNumber, texto);
            if (resultado && resultado.sucesso) {
                console.log('Mensagem enviada:', resultado.dados);
            } else {
                addMessageToHistory(activeChatNumber, { texto: `[ERRO] Falha no envio: ${resultado && resultado.erro ? resultado.erro : 'erro'}` }, 'Sistema', false);
            }
        } catch (err) {
            addMessageToHistory(activeChatNumber, { texto: `[ERRO] Falha interna: ${err.message}` }, 'Sistema', false);
        }
    });

    // IPC listeners
    window.whatsappAPI && window.whatsappAPI.onNovaMensagemRecebida && window.whatsappAPI.onNovaMensagemRecebida((novaMensagem) => {
        try {
            const num = novaMensagem.number || (novaMensagem.from ? novaMensagem.from.split('@')[0] : 'unknown');
            addMessageToHistory(num, novaMensagem, novaMensagem.name || 'Cliente', true);
        } catch (err) {
            console.error('Erro ao processar nova mensagem:', err);
        }
    });

    window.whatsappAPI && window.whatsappAPI.onQRCodeReceived && window.whatsappAPI.onQRCodeReceived((qrDataURL) => {
        try {
            if (qrcodeImage) {
                qrcodeImage.src = qrDataURL;
                qrcodeImage.classList.remove('hidden');
            }
            if (qrcodeMessage) qrcodeMessage.textContent = 'Escaneie o código com seu celular. Não feche esta tela!';
            if (btnGenerateQR) {
                btnGenerateQR.textContent = 'Aguardando Escaneamento...';
                btnGenerateQR.disabled = true;
                btnGenerateQR.classList.add('hidden');
            }
            if (btnConnectQR) {
                btnConnectQR.classList.remove('hidden');
                btnConnectQR.textContent = 'Aguardando Escaneamento...';
            }
        } catch (err) {
            console.error('Erro ao exibir QR:', err);
        }
    });

    window.whatsappAPI && window.whatsappAPI.onWhatsappReady && window.whatsappAPI.onWhatsappReady(handleWhatsappReady);

    // Initial UI state
    updateConnectionStatus(isConnected);
    // Removida a tentativa antecipada de carregar chats aqui.
    // O loadAndDisplayChats() será chamado apenas por handleWhatsappReady após conexão bem-sucedida.

    // Atualiza lista de clientes ao iniciar
    setTimeout(updateConnectedClientsList, 1000);

    // Chat interno refs
    const internalMessagesDiv = document.getElementById('internal-messages');
    const internalForm = document.getElementById('internal-chat-form');
    const internalInput = document.getElementById('internal-chat-input');
    const toggleBtn = document.getElementById('btn-toggle-internal-chat');
    const internalBody = document.getElementById('internal-chat-body');
    let internalMinimized = false;
    const currentUser = 'Operador'; // Ajustar: recuperar do login se houver

    function renderInternalMessage(msg) {
        const el = document.createElement('div');
        const mine = msg.from === currentUser;
        el.className = `px-3 py-2 rounded-lg max-w-[85%] ${mine ? 'bg-teal-500 text-white ml-auto' : 'bg-white border border-gray-200'}`;
        el.innerHTML = `<span class="block text-xs font-semibold">${msg.from}</span><span>${msg.texto}</span><span class="block text-[10px] opacity-70 mt-1">${new Date(msg.timestamp || Date.now()).toLocaleTimeString()}</span>`;
        internalMessagesDiv.appendChild(el);
        internalMessagesDiv.scrollTop = internalMessagesDiv.scrollHeight;
    }

    // Carrega histórico inicial
    window.internalChatAPI.fetchHistory().then(r => {
        if (r.sucesso) r.history.forEach(renderInternalMessage);
    });

    // Listener mensagens novas
    window.internalChatAPI.onMessage(msg => renderInternalMessage(msg));

    // Enviar
    internalForm && internalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const texto = internalInput.value.trim();
        if (!texto) return;
        renderInternalMessage({ from: currentUser, texto, timestamp: Date.now() });
        internalInput.value = '';
        const r = await window.internalChatAPI.send(currentUser, texto);
        if (!r.sucesso) console.warn('Falha envio interno:', r.erro);
    });

    // Minimizar / expandir
    toggleBtn && toggleBtn.addEventListener('click', () => {
        internalMinimized = !internalMinimized;
        internalBody.style.display = internalMinimized ? 'none' : 'flex';
        toggleBtn.textContent = internalMinimized ? 'Expandir' : 'Minimizar';
    });
});

// Botão para adicionar novo WhatsApp
const btnAddWhatsapp = document.getElementById('btn-add-whatsapp');
btnAddWhatsapp && btnAddWhatsapp.addEventListener('click', async () => {
    try {
        const result = await window.whatsappAPI.openNewQRWindow();
        console.log('Nova janela QR aberta:', result);
    } catch (err) {
        console.error('Erro ao abrir janela QR:', err);
    }
});

// Listener para novos clientes conectados
window.whatsappAPI && window.whatsappAPI.onNewClientReady && window.whatsappAPI.onNewClientReady((data) => {
    console.log('Novo cliente conectado:', data);
    
    // Atualiza a lista de clientes
    updateConnectedClientsList();
    
    // Mostra notificação visual
    if (Notification && Notification.permission === 'granted') {
        new Notification('WhatsApp Conectado', {
            body: `Número: ${data.number}`,
            icon: 'path/to/whatsapp-icon.png' // adicione um ícone se quiser
        });
    }
    
    // Toast simples (opcional)
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce';
    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>WhatsApp ${data.number} conectado!</span>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
});

// -------------------- Utilities & Core Functions (single implementations) --------------------

function updateConnectionStatus(connected) {
    isConnected = !!connected;
    if (statusText) {
        statusText.textContent = isConnected ? '✅ Conectado' : '❌ Desconectado';
        statusText.classList.toggle('text-green-600', isConnected);
        statusText.classList.toggle('text-red-600', !isConnected);
    }
    if (statusEl) {
        statusEl.classList.toggle('bg-green-100', isConnected);
        statusEl.classList.toggle('bg-red-100', !isConnected);
    }
    // 🚨 chamada a renderConversationsList() removida intencionalmente
}

function renderConversationsList() {
    if (!conversationsContainer) return;
    conversationsContainer.innerHTML = '';
    const sorted = Object.keys(conversations).sort((a, b) => (conversations[b].unread || 0) - (conversations[a].unread || 0));
    sorted.forEach(number => {
        const convo = conversations[number];
        const item = createConversationListItem(convo);
        conversationsContainer.appendChild(item);
    });
}

function createConversationListItem(convo) {
    const number = convo.number;
    const isActive = number === activeChatNumber;
    const last = convo.lastMessage || (convo.history && convo.history.length ? convo.history[convo.history.length - 1].texto : 'Nova conversa');
    const avatarUrl = convo.profilePicUrl || 'https://via.placeholder.com/40/CCCCCC/808080?text=C';

    const item = document.createElement('div');
    item.dataset.number = number;
    item.className = `p-3 flex items-center space-x-3 cursor-pointer border-b border-gray-100 transition duration-150 ${isActive ? 'bg-teal-100 border-l-4 border-teal-500' : 'hover:bg-gray-100'}`;
    item.innerHTML = `
        <img src="${avatarUrl}" alt="${convo.name || number}" class="w-10 h-10 rounded-full object-cover flex-shrink-0">
        <div class="flex-grow min-w-0">
            <p class="font-semibold text-gray-800 truncate">${convo.name || number}</p>
            <p class="text-xs text-gray-500 truncate">${(last || '').length > 30 ? (last || '').slice(0,30) + '...' : (last || '')}</p>
        </div>
        ${(convo.unread || 0) > 0 ? `<span class="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex-shrink-0">${convo.unread}</span>` : ''}
    `;
    item.addEventListener('click', () => setActiveChat(number));
    return item;
}

function setActiveChat(number) {
    if (!conversations[number]) return;
    activeChatNumber = number;

    // Visual active update
    document.querySelectorAll('#conversations-container > div').forEach(el => {
        el.classList.remove('bg-teal-100', 'border-l-4', 'border-teal-500');
    });
    const el = document.querySelector(`[data-number="${number}"]`);
    if (el) el.classList.add('bg-teal-100', 'border-l-4', 'border-teal-500');

    conversations[number].unread = 0;
    renderConversationsList();

    placeholderChat && placeholderChat.classList.add('hidden');
    chatHeader && chatHeader.classList.remove('hidden');
    chatForm && chatForm.classList.remove('hidden');
    activeChatName && (activeChatName.textContent = conversations[number].name || number);
    activeChatNumberEl && (activeChatNumberEl.textContent = number);
    renderChatMessages();
}

function renderChatMessages() {
    if (!mensagensDiv) return;
    mensagensDiv.innerHTML = '';
    if (!activeChatNumber) return;
    const history = conversations[activeChatNumber].history || [];
    history.forEach(msg => {
        const isMe = msg.sender === 'Eu';
        const bubbleClass = isMe ? 'bg-blue-500 text-white self-end rounded-br-none' : 'bg-white text-gray-800 self-start rounded-tl-none border border-gray-200';
        const msgEl = document.createElement('div');
        msgEl.className = `max-w-xs md:max-w-md p-3 my-2 rounded-xl shadow-sm ${bubbleClass}`;
        msgEl.textContent = msg.texto;
        mensagensDiv.appendChild(msgEl);
    });
    mensagensDiv.scrollTop = mensagensDiv.scrollHeight;
}

function addMessageToHistory(number, message, sender, isIncoming) {
    if (!conversations[number]) {
        conversations[number] = {
            name: message.name || `Cliente (${number.slice(-4)})`,
            number,
            history: [],
            unread: 0,
            profilePicUrl: ''
        };
    }
    conversations[number].history.push({
        texto: message.texto,
        sender,
        timestamp: new Date().toLocaleTimeString()
    });
    if (isIncoming) {
        if (number !== activeChatNumber) conversations[number].unread = (conversations[number].unread || 0) + 1;
        else renderChatMessages();
    }
    renderConversationsList();
    if (number === activeChatNumber) renderChatMessages();
}

async function loadAndDisplayChats() {
    try {
        console.log('Carregando conversas ativas do WhatsApp...');
        const response = await window.whatsappAPI.fetchChats();

        if (response && response.sucesso && Array.isArray(response.chats)) {
            conversations = conversations || {};
            response.chats.forEach(chat => {
                conversations[chat.number] = {
                    name: chat.name,
                    number: chat.number,
                    history: conversations[chat.number] ? conversations[chat.number].history : [],
                    unread: conversations[chat.number] ? conversations[chat.number].unread : 0,
                    profilePicUrl: chat.profilePicUrl || ''
                };
            });
            renderConversationsList();
        } else {
            console.error('Falha ao carregar chats:', response && response.erro);
        }
    } catch (e) {
        console.error('Erro IPC ao carregar chats:', e);
    }
}

function handleWhatsappReady() {
    updateConnectionStatus(true);
    settingsModal && settingsModal.classList.add('hidden');
    btnGenerateQR && btnGenerateQR.classList.add('hidden');
    qrcodeImage && qrcodeImage.classList.add('hidden');
    qrcodeMessage && (qrcodeMessage.textContent = '✅ Conexão estabelecida com sucesso! (Sessão salva)');
    btnConnectQR && (btnConnectQR.textContent = 'CONECTADO VIA QR', btnConnectQR.classList.remove('hidden'));
    loadAndDisplayChats();
}

// Função para atualizar a lista de clientes conectados
async function updateConnectedClientsList() {
    try {
        const result = await window.whatsappAPI.listConnectedClients();
        if (result && result.sucesso) {
            const clientsPanel = document.getElementById('clients-panel');
            const clientsList = document.getElementById('clients-list');
            const clientsBadge = document.getElementById('connected-clients-badge');
            const clientsCount = document.getElementById('clients-count');

            if (result.clients.length > 0) {
                clientsPanel && clientsPanel.classList.remove('hidden');
                clientsBadge && clientsBadge.classList.remove('hidden');
                clientsCount && (clientsCount.textContent = result.clients.length);

                if (clientsList) {
                    clientsList.innerHTML = result.clients.map(client => `
                        <div class="bg-white p-2 rounded-lg flex items-center justify-between text-sm">
                            <div class="flex items-center gap-2">
                                <div class="w-2 h-2 rounded-full ${client.isReady ? 'bg-green-500' : 'bg-yellow-500'}"></div>
                                <span class="font-medium text-gray-700">${client.number}</span>
                            </div>
                            <button 
                                onclick="disconnectClient('${client.clientId}')" 
                                class="text-red-500 hover:text-red-700 p-1"
                                title="Desconectar"
                            >
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                            </button>
                        </div>
                    `).join('');
                }
            } else {
                clientsPanel && clientsPanel.classList.add('hidden');
                clientsBadge && clientsBadge.classList.add('hidden');
            }
        }
    } catch (err) {
        console.error('Erro ao atualizar lista de clientes:', err);
    }
}

// Função para desconectar um cliente
async function disconnectClient(clientId) {
    if (!confirm(`Desconectar o cliente ${clientId}?`)) return;
    
    try {
        const result = await window.whatsappAPI.disconnectClient(clientId);
        if (result && result.sucesso) {
            console.log('Cliente desconectado:', clientId);
            updateConnectedClientsList();
        }
    } catch (err) {
        console.error('Erro ao desconectar cliente:', err);
    }
}

// Torna a função global para uso no onclick do HTML
window.disconnectClient = disconnectClient;