// =========================================================================
// SISTEMA DE ATENDIMENTO WHATSAPP - ARQUIVO PRINCIPAL
// =========================================================================

// =========================================================================
// 1. IMPORTAÇÕES
// =========================================================================
const { app, BrowserWindow, ipcMain, Menu, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const WebSocket = require('ws');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');

// Importações dos módulos internos
const { validarCredenciais, obterNivelPermissao, obterDadosUsuario } = require('./src/aplicacao/validacao-credenciais');
const gerenciadorUsuarios = require('./src/aplicacao/gerenciador-usuarios');
const logger = require('./src/infraestrutura/logger');
const gerenciadorMensagens = require('./src/aplicacao/gerenciador-mensagens');
const gerenciadorMidia = require('./src/aplicacao/gerenciador-midia');
const chatbot = require('./src/aplicacao/chatbot');
const metricas = require('./src/aplicacao/metricas');
const notificacoes = require('./src/aplicacao/notificacoes');
const backups = require('./src/aplicacao/backup');
const atend = require('./src/aplicacao/atendimentos');
const relatorios = require('./src/aplicacao/relatorios');
const tema = require('./src/aplicacao/tema');
const { startApi } = require('./src/infraestrutura/api');

// =========================================================================
// 2. VARIÁVEIS GLOBAIS
// =========================================================================

// Janelas do Electron
let mainWindow = null;
let loginWindow = null;
let historyWindow = null;

// Clientes WhatsApp (múltiplas conexões)
const whatsappClients = new Map();
const qrWindows = new Map();

// Configurações da API Cloud (WhatsApp Business)
let WHATSAPP_TOKEN = '';
let PHONE_NUMBER_ID = '';
const API_VERSION = 'v19.0';

// WebSocket
const WS_SERVER_URL = 'ws://localhost:8080';
let ws = null;
let internalWS = null;
let internalChatHistory = [];

// Usuário logado
let usuarioLogado = null;

// =========================================================================
// 3. FUNÇÕES DE CONEXÃO WEBSOCKET
// =========================================================================

/**
 * Conecta ao servidor WebSocket externo
 */
function connectWebSocket() {
    logger.info(`[WS] Conectando a ${WS_SERVER_URL}...`);
    
    ws = new WebSocket(WS_SERVER_URL);
    
    ws.on('open', () => {
        logger.info('[WS] Conexão estabelecida');
    });
    
    ws.on('message', (data) => {
        try {
            const mensagem = JSON.parse(data.toString());
            if (mainWindow) {
                mainWindow.webContents.send('nova-mensagem-recebida', mensagem);
            }
        } catch (erro) {
            logger.erro('[WS] Erro ao processar mensagem:', erro.message);
        }
    });
    
    ws.on('close', () => {
        logger.info('[WS] Conexão fechada. Reconectando em 5s...');
        setTimeout(connectWebSocket, 5000);
    });
    
    ws.on('error', (erro) => {
        logger.erro('[WS] Erro:', erro.message);
    });
}

/**
 * Conecta ao servidor de chat interno
 */
function connectInternalChat() {
    try {
        internalWS = new WebSocket('ws://localhost:9090');
        
        internalWS.on('open', () => {
            logger.info('[ChatInterno] Conectado');
        });
        
        internalWS.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.type === 'internal') {
                    internalChatHistory.push(msg);
                    if (mainWindow) {
                        mainWindow.webContents.send('internal-chat-message', msg);
                    }
                }
            } catch (erro) {
                logger.erro('[ChatInterno] Erro ao processar:', erro.message);
            }
        });
        
        internalWS.on('close', () => {
            logger.info('[ChatInterno] Desconectado. Reconectando...');
            setTimeout(connectInternalChat, 4000);
        });
        
        internalWS.on('error', (erro) => {
            logger.erro('[ChatInterno] Erro:', erro.message);
        });
    } catch (erro) {
        logger.erro('[ChatInterno] Falha na conexão:', erro.message);
    }
}

/**
 * Envia mensagem para o chat interno
 */
function sendInternalChatMessage(from, texto) {
    if (!internalWS || internalWS.readyState !== WebSocket.OPEN) {
        return { sucesso: false, erro: 'WebSocket indisponível' };
    }
    
    const payload = { type: 'internal', from, texto, timestamp: Date.now() };
    internalWS.send(JSON.stringify(payload));
    
    return { sucesso: true };
}

// =========================================================================
// 4. FUNÇÕES DE API WHATSAPP CLOUD
// =========================================================================

/**
 * Envia mensagem via WhatsApp Cloud API
 */
async function enviarMensagemWhatsApp(numeroDestino, mensagem) {
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        throw new Error('Credenciais da API não configuradas');
    }
    
    const WHATSAPP_API_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
    
    const payload = {
        messaging_product: 'whatsapp',
        to: numeroDestino,
        type: 'text',
        text: { body: mensagem }
    };
    
    try {
        const response = await axios.post(WHATSAPP_API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (erro) {
        const mensagemErro = erro.response?.data?.error?.message || erro.message;
        logger.erro('[API WhatsApp] Erro:', mensagemErro);
        throw new Error(`Falha na API: ${mensagemErro}`);
    }
}

// =========================================================================
// 5. FUNÇÕES DE CRIAÇÃO DE JANELAS
// =========================================================================

/**
 * Cria janela de login
 */
function createLoginWindow() {
    loginWindow = new BrowserWindow({
        width: 450,
        height: 600,
        resizable: false,
        frame: true,
        webPreferences: {
            preload: path.join(__dirname, 'src/interfaces/preload-login.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    loginWindow.loadFile('src/interfaces/login.html');
    
    loginWindow.on('closed', () => {
        loginWindow = null;
        // Se fechar login sem autenticar, sai do app
        if (!mainWindow) {
            app.quit();
        }
    });
}

/**
 * Cria janela principal
 */
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'src/interfaces/preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadFile('src/interfaces/index.html');
    
    // Envia dados do usuário logado
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('usuario-logado', usuarioLogado);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/**
 * Cria janela de histórico
 */
function createHistoryWindow() {
    if (historyWindow) {
        historyWindow.focus();
        return;
    }
    
    historyWindow = new BrowserWindow({
        width: 800,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'src/interfaces/preload-history.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    
    historyWindow.loadFile('src/interfaces/history.html');
    historyWindow.on('closed', () => {
        historyWindow = null;
    });
}

/**
 * Cria janela de cadastro
 */
function createCadastroWindow() {
    const win = new BrowserWindow({
        width: 500,
        height: 650,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'src/interfaces/preload-cadastro.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    win.loadFile('src/interfaces/cadastro.html');
}

/**
 * Cria janela de QR Code para cliente específico
 */
function createQRWindow(clientId) {
    if (qrWindows.has(clientId)) {
        qrWindows.get(clientId).focus();
        return;
    }
    
    const qrWindow = new BrowserWindow({
        width: 500,
        height: 650,
        title: `WhatsApp - ${clientId}`,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'src/interfaces/preload-qr.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    
    qrWindow.loadFile('src/interfaces/qr-window.html');
    qrWindows.set(clientId, qrWindow);
    
    qrWindow.webContents.once('did-finish-load', () => {
        qrWindow.webContents.send('set-client-id', clientId);
    });
    
    qrWindow.on('closed', () => {
        qrWindows.delete(clientId);
    });
}

/**
 * Cria janela de usuários
 */
function createUsuariosWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 650,
        webPreferences: {
            preload: path.join(__dirname, 'src/interfaces/preload-usuarios.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    win.loadFile('src/interfaces/usuarios.html');
}

/**
 * Cria janela de chat
 */
function createChatWindow(clientId) {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'src/interfaces/preload-chat.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.loadFile('src/interfaces/chat.html');
    
    win.webContents.on('did-finish-load', () => {
        win.webContents.send('set-client-id', clientId);
    });
}

/**
 * Cria janela do dashboard
 */
function createDashboardWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'src/interfaces/preload-dashboard.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    win.loadFile('src/interfaces/dashboard.html');
}

/**
 * Cria janela do chatbot
 */
function createChatbotWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'src/interfaces/preload-chatbot.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    win.loadFile('src/interfaces/chatbot.html');
}

// =========================================================================
// 6. CONFIGURAÇÃO DE MENU
// =========================================================================

function criarMenuPrincipal() {
    const menuTemplate = [
        {
            label: 'Arquivo',
            submenu: [
                {
                    label: 'Recarregar',
                    accelerator: 'Ctrl+R',
                    click: () => {
                        if (mainWindow) mainWindow.reload();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Sair',
                    accelerator: 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Navegação',
            submenu: [
                {
                    label: 'Voltar',
                    accelerator: 'Alt+Left',
                    click: () => {
                        if (mainWindow) mainWindow.webContents.goBack();
                    }
                },
                {
                    label: 'Avançar',
                    accelerator: 'Alt+Right',
                    click: () => {
                        if (mainWindow) mainWindow.webContents.goForward();
                    }
                }
            ]
        },
        {
            label: 'Visualizar',
            submenu: [
                {
                    label: 'Tela Cheia',
                    accelerator: 'F11',
                    click: (item, focusedWindow) => {
                        if (focusedWindow) {
                            focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
                        }
                    }
                }
            ]
        },
        {
            label: 'Ajuda',
            submenu: [
                {
                    label: 'Sobre',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Sobre',
                            message: 'Sistema de Atendimento WhatsApp',
                            detail: 'Versão 1.0\nDesenvolvido com Electron e whatsapp-web.js'
                        });
                        
                        if (Notification.isSupported()) {
                            new Notification({
                                title: 'Informação',
                                body: 'Você está usando a versão 1.0'
                            }).show();
                        }
                    }
                }
            ]
        }
    ];
    
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

// =========================================================================
// 7. GERENCIAMENTO DE CLIENTES WHATSAPP
// =========================================================================

/**
 * Inicializa cliente WhatsApp com QR Code
 */
async function inicializarClienteWhatsApp(clientId) {
    try {
        logger.info(`[${clientId}] Iniciando cliente WhatsApp...`);

        const client = new Client({
            authStrategy: new LocalAuth({ clientId }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        // Evento: QR Code gerado
        client.on('qr', (qr) => {
            logger.info(`[${clientId}] QR Code gerado`);
            const qrWindow = qrWindows.get(clientId);
            if (qrWindow && !qrWindow.isDestroyed()) {
                qrWindow.webContents.send('qr-code-data', qr);
            }
        });

        // Evento: Cliente pronto
        client.on('ready', () => {
            logger.sucesso(`[${clientId}] Cliente conectado com sucesso!`);
            whatsappClients.set(clientId, client);

            // Notificação
            notificacoes.notificarClienteConectado(clientId);

            BrowserWindow.getAllWindows().forEach(win => {
                if (!win.isDestroyed()) {
                    win.webContents.send('new-client-ready', {
                        clientId,
                        timestamp: Date.now()
                    });
                }
            });
        });

        // Evento: Mensagem recebida
        client.on('message', async (message) => {
            if (message.fromMe || message.from.includes('@g.us')) return;

            logger.info(`[${clientId}] Nova mensagem de ${message.from}: ${message.body}`);

            // Notificação
            const chat = await message.getChat();
            notificacoes.notificarNovaMensagem(chat.name || message.from, message.body);

            // Salva no histórico
            await gerenciadorMensagens.salvarMensagem(clientId, message.from, {
                id: message.id,
                timestamp: message.timestamp * 1000,
                from: message.from,
                to: message.to,
                body: message.body,
                type: message.type,
                fromMe: message.fromMe,
                hasMedia: message.hasMedia
            });

            // Processa com chatbot
            const resposta = await chatbot.processarMensagem(message.body, message.from, clientId);
            
            if (resposta.devResponder) {
                await message.reply(resposta.resposta);
                logger.info(`[${clientId}] Chatbot respondeu: ${resposta.resposta}`);
            }

            // Registra métrica
            await metricas.registrarMensagemRecebida();
            
            // Notifica todas as janelas
            BrowserWindow.getAllWindows().forEach(win => {
                if (!win.isDestroyed()) {
                    win.webContents.send('nova-mensagem-recebida', {
                        clientId,
                        chatId: message.from,
                        mensagem: {
                            id: message.id.id,
                            body: message.body,
                            timestamp: message.timestamp * 1000,
                            fromMe: message.fromMe
                        }
                    });
                }
            });
        });

        // Evento: Desconectado
        client.on('disconnected', (reason) => {
            logger.aviso(`[${clientId}] Cliente desconectado: ${reason}`);
            whatsappClients.delete(clientId);
            
            // Notificação
            notificacoes.notificarClienteDesconectado(clientId);
        });

        await client.initialize();
        return { success: true, clientId };

    } catch (erro) {
        logger.erro(`[${clientId}] Erro ao inicializar:`, erro.message);
        return { success: false, message: erro.message };
    }
}

// =========================================================================
// 8. MANIPULADORES IPC
// =========================================================================

function configurarManipuladoresIPC() {
    // Login
    ipcMain.handle('login-attempt', async (_event, { username, password }) => {
        try {
            const valido = await validarCredenciais(username, password);
            
            if (!valido) {
                return { success: false, message: 'Usuário ou senha inválidos' };
            }
            
            const role = await obterNivelPermissao(username);
            const dados = await obterDadosUsuario(username);
            
            usuarioLogado = { username, role, ...dados };
            
            logger.sucesso(`[Login] ${username} autenticado com sucesso (${role})`);
            
            // Registra atendente no sistema
            await atend.registrarAtendente(username);
            
            return { success: true, role, dados };
            
        } catch (erro) {
            logger.erro('[Login] Erro:', erro.message);
            return { success: false, message: 'Erro ao processar login: ' + erro.message };
        }
    });

    ipcMain.on('close-login-window', () => {
        if (loginWindow) {
            createMainWindow();
            loginWindow.close();
        }
    });

    ipcMain.on('open-register-window', () => {
        createCadastroWindow();
    });

    // abrir lista de usuários
    ipcMain.on('open-users-window', () => {
        createUsuariosWindow();
    });

    // abrir janela de chat
    ipcMain.on('open-chat-window', (_event, clientId) => {
        createChatWindow(clientId);
    });

    // abrir dashboard
    ipcMain.on('open-dashboard', () => {
        createDashboardWindow();
    });

    // abrir chatbot
    ipcMain.on('open-chatbot', () => {
        createChatbotWindow();
    });

    // API de cadastro
    ipcMain.handle('register-new-user', async (event, newUser) => {
        try {
            const res = await gerenciadorUsuarios.cadastrarUsuario(newUser);
            return res;
        } catch (erro) {
            logger.erro('[Cadastro] Erro:', erro.message);
            return { success: false, message: 'Falha ao cadastrar usuário: ' + erro.message };
        }
    });

    ipcMain.handle('register-user', async (_event, dados) => {
        try {
            const result = await gerenciadorUsuarios.cadastrarUsuario(dados);
            return result;
        } catch (erro) {
            return { success: false, message: erro.message };
        }
    });

    // Métricas
    ipcMain.handle('get-metrics', async () => {
        return await metricas.obterMetricas();
    });

    ipcMain.handle('reset-metrics', async () => {
        return await metricas.resetarMetricas();
    });

    // APIs de usuários
    ipcMain.handle('list-users', async () => {
        try {
            const users = await gerenciadorUsuarios.listarUsuarios();
            return { success: true, users };
        } catch (erro) {
            logger.erro('[Listar Usuários] Erro:', erro.message);
            return { success: false, users: [], message: erro.message };
        }
    });

    ipcMain.handle('get-user-stats', async () => {
        try {
            const stats = await gerenciadorUsuarios.obterEstatisticas();
            return { success: true, stats };
        } catch (erro) {
            logger.erro('[Estatísticas] Erro:', erro.message);
            return { success: false, stats: {}, message: erro.message };
        }
    });

    ipcMain.handle('remove-user', async (_e, username) => {
        try {
            const res = await gerenciadorUsuarios.removerUsuario(username);
            return res;
        } catch (erro) {
            logger.erro('[Remover Usuário] Erro:', erro.message);
            return { success: false, message: erro.message };
        }
    });

    ipcMain.handle('set-user-active', async (_e, { username, ativo }) => {
        try {
            const res = await gerenciadorUsuarios.definirAtivo(username, ativo);
            return res;
        } catch (erro) {
            logger.erro('[Ativar/Desativar Usuário] Erro:', erro.message);
            return { success: false, message: erro.message };
        }
    });

    // --- ENVIO DE MENSAGENS ---
    
    ipcMain.handle('send-whatsapp-message', async (event, { numero, mensagem, clientId, chatId, message }) => {
        try {
            // Formato novo (chat.html): { clientId, chatId, message }
            if (clientId && chatId && message) {
                const client = whatsappClients.get(clientId);
                if (!client) {
                    return { success: false, message: 'Cliente não conectado' };
                }

                await client.sendMessage(chatId, message);
                
                // Registra métrica
                await metricas.registrarMensagemEnviada();
                
                await gerenciadorMensagens.salvarMensagem(clientId, chatId, {
                    id: { id: Date.now() },
                    timestamp: Date.now(),
                    from: 'me',
                    to: chatId,
                    body: message,
                    type: 'chat',
                    fromMe: true,
                    hasMedia: false
                });

                logger.sucesso(`[${clientId}] Mensagem enviada para ${chatId}`);
                return { success: true };
            }
            
            // Formato antigo (index.html): { numero, mensagem, clientId }
            if (numero && mensagem) {
                // Se tem clientId, usa cliente específico
                if (clientId && whatsappClients.has(clientId)) {
                    const client = whatsappClients.get(clientId);
                    if (client.info) {
                        await client.sendMessage(`${numero}@c.us`, mensagem);
                        return { sucesso: true, dados: { status: 'enviado', clientId } };
                    }
                }
                
                // Caso contrário, tenta API Cloud
                if (WHATSAPP_TOKEN && !WHATSAPP_TOKEN.startsWith('TOKEN_DE_TESTE_')) {
                    const resultado = await enviarMensagemWhatsApp(numero, mensagem);
                    return { sucesso: true, dados: resultado };
                }
                
                return { sucesso: false, erro: 'Nenhum cliente disponível' };
            }
            
            return { success: false, message: 'Parâmetros inválidos' };
            
        } catch (erro) {
            logger.erro('[Enviar Mensagem] Erro:', erro.message);
            return { success: false, sucesso: false, message: erro.message, erro: erro.message };
        }
    });
    
    // Enviar mensagem com mídia
    ipcMain.handle('send-whatsapp-media', async (_event, { clientId, chatId, filePath, caption }) => {
        try {
            const client = whatsappClients.get(clientId);
            if (!client) {
                return { success: false, message: 'Cliente não conectado' };
            }

            const media = MessageMedia.fromFilePath(filePath);
            await client.sendMessage(chatId, media, { caption: caption || '' });

            logger.sucesso(`[${clientId}] Mídia enviada para ${chatId}`);
            return { success: true };

        } catch (erro) {
            logger.erro('[Enviar Mídia] Erro:', erro.message);
            return { success: false, message: erro.message };
        }
    });

    // Download de mídia recebida
    ipcMain.handle('download-whatsapp-media', async (_event, { clientId, messageId }) => {
        try {
            const client = whatsappClients.get(clientId);
            if (!client) {
                return { success: false, message: 'Cliente não conectado' };
            }

            // Implemente a lógica de download conforme necessário
            return { success: true };

        } catch (erro) {
            logger.erro('[Download Mídia] Erro:', erro.message);
            return { success: false, message: erro.message };
        }
    });

    // --- CHATS E HISTÓRICO ---
    
    ipcMain.handle('list-whatsapp-chats', async (_event, clientId) => {
        try {
            const client = whatsappClients.get(clientId);
            if (!client) {
                return { success: false, message: 'Cliente não conectado', chats: [] };
            }

            const chats = await client.getChats();
            
            const chatList = chats.map(chat => ({
                id: chat.id._serialized,
                name: chat.name || chat.id.user,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount,
                timestamp: chat.timestamp || 0
            }));

            // Ordena por timestamp (mais recente primeiro)
            chatList.sort((a, b) => b.timestamp - a.timestamp);

            return { success: true, chats: chatList };

        } catch (erro) {
            logger.erro('[Listar Chats] Erro:', erro.message);
            return { success: false, chats: [], message: erro.message };
        }
    });

    // Carregar histórico de mensagens
    ipcMain.handle('load-chat-history', async (_event, { clientId, chatId }) => {
        try {
            const result = await gerenciadorMensagens.carregarHistorico(clientId, chatId);
            return result;
        } catch (erro) {
            logger.erro('[Carregar Histórico] Erro:', erro.message);
            return { success: false, mensagens: [], message: erro.message };
        }
    });
    
    ipcMain.handle('fetch-whatsapp-chats', async (event, clientId) => {
        const client = clientId ? whatsappClients.get(clientId) : Array.from(whatsappClients.values())[0];
        
        if (!client || !client.info) {
            return { sucesso: false, erro: 'Cliente não conectado' };
        }
        
        try {
            const chats = await client.getChats();
            const conversasFormatadas = await Promise.all(
                chats.map(async (chat) => {
                    const number = chat.id.user || 'unknown';
                    let contact = null;
                    let profilePicUrl = '';
                    
                    try {
                        contact = await chat.getContact();
                        if (contact && typeof contact.getProfilePicUrl === 'function') {
                            profilePicUrl = await contact.getProfilePicUrl();
                        }
                    } catch (err) {
                        // Ignora erros de perfil
                    }
                    
                    const name = contact?.name || contact?.pushname || chat.name || number;
                    
                    return {
                        id: chat.id._serialized,
                        name,
                        number,
                        isGroup: !!chat.isGroup,
                        lastMessage: chat.lastMessage?.body || '',
                        profilePicUrl: profilePicUrl || '',
                        unreadCount: chat.unreadCount || 0
                    };
                })
            );
            
            return { sucesso: true, chats: conversasFormatadas };
        } catch (erro) {
            return { sucesso: false, erro: erro.message };
        }
    });
    
    ipcMain.handle('fetch-chat-history', async (event, { number, clientId }) => {
        const client = clientId ? whatsappClients.get(clientId) : Array.from(whatsappClients.values())[0];
        
        if (!client || !client.info) {
            return { sucesso: false, erro: 'Cliente não conectado' };
        }
        
        try {
            const chatId = `${number}@c.us`;
            const chat = await client.getChatById(chatId);
            
            if (!chat) {
                return { sucesso: false, erro: 'Chat não encontrado' };
            }
            
            const messages = await chat.fetchMessages({ limit: 50 });
            const history = messages.map(msg => ({
                texto: msg.body,
                timestamp: new Date(msg.timestamp * 1000).toLocaleString('pt-BR'),
                sender: msg.fromMe ? 'Eu' : (msg.author?.split('@')[0] || 'Cliente'),
                fromMe: msg.fromMe,
                hasMedia: msg.hasMedia
            })).reverse();
            
            return { sucesso: true, history };
        } catch (erro) {
            return { sucesso: false, erro: erro.message };
        }
    });
    
    ipcMain.on('open-history-search-window', () => {
        createHistoryWindow();
    });
    
    ipcMain.handle('search-chat-history', async (event, filters) => {
        // Implementação futura com banco de dados
        return { 
            sucesso: false, 
            erro: 'Busca de histórico requer banco de dados' 
        };
    });
    
    // --- CONFIGURAÇÕES ---
    
    ipcMain.handle('config-whatsapp-credentials', (event, { token, id }) => {
        WHATSAPP_TOKEN = token;
        PHONE_NUMBER_ID = id;
        return { sucesso: true, status: 'Credenciais atualizadas' };
    });
    
    // --- CHAT INTERNO ---
    
    ipcMain.handle('internal-chat-send', (event, { from, texto }) => {
        return sendInternalChatMessage(from, texto);
    });
    
    ipcMain.handle('internal-chat-history', () => {
        return { 
            sucesso: true, 
            history: internalChatHistory.slice(-100) 
        };
    });
    
    // --- INTERFACE ---
    
    ipcMain.on('set-fullscreen', (event, flag) => {
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
            win.setFullScreen(flag);
        }
    });

    // Controle de notificações
    ipcMain.handle('toggle-notifications', async (_event, ativo) => {
        notificacoes.setAtivo(ativo);
        return { success: true, ativo };
    });

    // Backups
    ipcMain.handle('backup:run', async () => backups.runBackupNow());
    ipcMain.handle('backup:list', async () => ({ success: true, files: await backups.listBackups() }));

    // Atendimentos
    ipcMain.handle('attend:register', async (_e, username) => atend.registrarAtendente(username));
    ipcMain.handle('attend:set-status', async (_e, { username, status }) => atend.setStatus(username, status));
    ipcMain.handle('attend:claim', async (_e, { username, clientId, chatId }) => atend.assumirChat(username, clientId, chatId));
    ipcMain.handle('attend:release', async (_e, { username, clientId, chatId }) => atend.liberarChat(username, clientId, chatId));
    ipcMain.handle('attend:get', async (_e, { clientId, chatId }) => atend.obterAtendimento(clientId, chatId));
    ipcMain.handle('attend:list', async () => atend.listarAtendimentos());

    // Relatórios
    ipcMain.handle('report:export', async (_e, tipo) => relatorios.exportar(tipo));

    // Tema
    ipcMain.handle('theme:get', async () => ({ success: true, theme: await tema.getTheme() }));
    ipcMain.handle('theme:set', async (_e, themeName) => tema.setTheme(themeName));

    // Abrir nova janela QR
    ipcMain.handle('open-new-qr-window', async () => {
        const clientId = `client_${Date.now()}`;
        createQRWindow(clientId);
        await inicializarClienteWhatsApp(clientId);
        return { success: true, clientId };
    });

    // Listar clientes conectados
    ipcMain.handle('list-connected-clients', async () => {
        return Array.from(whatsappClients.keys());
    });

    // Desconectar cliente
    ipcMain.handle('disconnect-client', async (_event, clientId) => {
        try {
            const client = whatsappClients.get(clientId);
            if (client) {
                await client.destroy();
                whatsappClients.delete(clientId);
                logger.info(`[${clientId}] Cliente desconectado`);
            }
            return { success: true };
        } catch (erro) {
            logger.erro('[Desconectar] Erro:', erro.message);
            return { success: false, message: erro.message };
        }
    });

    // Chatbot
    ipcMain.handle('get-chatbot-rules', async () => {
        try {
            const rules = await chatbot.carregarRegras();
            return { success: true, rules };
        } catch (erro) {
            logger.erro('[Chatbot] Erro ao carregar regras:', erro.message);
            return { success: false, message: erro.message };
        }
    });

    ipcMain.handle('save-chatbot-rules', async (_event, rules) => {
        try {
            const result = await chatbot.salvarRegras(rules);
            return result;
        } catch (erro) {
            logger.erro('[Chatbot] Erro ao salvar regras:', erro.message);
            return { success: false, message: erro.message };
        }
    });
}

// =========================================================================
// 9. INICIALIZAÇÃO DO APLICATIVO
// =========================================================================

app.whenReady().then(async () => {
    configurarManipuladoresIPC();
    criarMenuPrincipal();
    
    // Inicia com tela de login
    createLoginWindow();
    
    // Configura backups e API
    backups.scheduleBackups();
    
    startApi({
        getClients: () => Array.from(whatsappClients.keys()),
        listChats: async (clientId) => {
            try {
                const client = whatsappClients.get(clientId);
                if (!client) return { success: false, chats: [], message: 'Cliente não conectado' };
                const chats = await client.getChats();
                return {
                    success: true,
                    chats: chats.map(c => ({ id: c.id._serialized, name: c.name || c.id.user, isGroup: c.isGroup }))
                };
            } catch (e) {
                return { success: false, chats: [], message: e.message };
            }
        },
        sendMessage: async ({ clientId, chatId, message }) => {
            try {
                const client = whatsappClients.get(clientId);
                if (!client) return { success: false, message: 'Cliente não conectado' };
                await client.sendMessage(chatId, message);
                return { success: true };
            } catch (e) {
                return { success: false, message: e.message };
            }
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createLoginWindow();
    }
});

app.on('before-quit', async () => {
    logger.info('=== Encerrando Aplicativo ===');
    
    // Fecha todos os clientes WhatsApp
    for (const [clientId, client] of whatsappClients.entries()) {
        try {
            await client.destroy();
        } catch (erro) {
            logger.erro(`Erro ao fechar ${clientId}:`, erro.message);
        }
    }
    
    // Notificação de saída
    if (Notification.isSupported()) {
        new Notification({
            title: 'Encerrando...',
            body: 'Salvando dados. Até logo!',
            silent: true
        }).show();
    }
    
    // Fecha WebSockets
    if (ws) ws.close();
    if (internalWS) internalWS.close();
});

// =========================================================================
// FIM DO ARQUIVO
// =========================================================================