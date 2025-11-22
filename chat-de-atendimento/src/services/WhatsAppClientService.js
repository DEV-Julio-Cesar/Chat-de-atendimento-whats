/**
 * 📱 WhatsAppClientService
 * 
 * Serviço isolado que gerencia um único cliente WhatsApp.
 * Responsável por:
 * - Inicialização e autenticação
 * - Geração de QR Code
 * - Gerenciamento de eventos
 * - Envio e recebimento de mensagens
 * - Desconexão segura
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const logger = require('../infraestrutura/logger');
const path = require('path');

class WhatsAppClientService {
    /**
     * @param {string} clientId - ID único do cliente
     * @param {Object} options - Opções de configuração
     * @param {string} options.sessionPath - Caminho base para sessões
     * @param {Function} options.onQR - Callback para QR Code gerado
     * @param {Function} options.onReady - Callback quando cliente está pronto
     * @param {Function} options.onMessage - Callback para mensagens recebidas
     * @param {Function} options.onDisconnected - Callback quando desconectado
     * @param {Function} options.onAuthFailure - Callback para falha de autenticação
     */
    constructor(clientId, options = {}) {
        this.clientId = clientId;
        this.client = null;
        this._status = 'idle'; // idle, initializing, qr_ready, authenticated, ready, disconnected, error
        this.qrCode = null;
        this.phoneNumber = null;
        this.sessionPath = options.sessionPath || path.join(process.cwd(), '.wwebjs_auth');
        
        // Callbacks
        this.callbacks = {
            onQR: options.onQR || (() => {}),
            onReady: options.onReady || (() => {}),
            onMessage: options.onMessage || (() => {}),
            onDisconnected: options.onDisconnected || (() => {}),
            onAuthFailure: options.onAuthFailure || (() => {})
        };
        
        this.metadata = {
            createdAt: new Date().toISOString(),
            lastQRAt: null,
            connectedAt: null,
            messageCount: 0
        };
    }

    // Getter/Setter para status com métricas
    get status() {
        return this._status;
    }

    set status(newStatus) {
        if (this._status !== newStatus) {
            const prometheusMetrics = require('../core/prometheus-metrics');
            prometheusMetrics.incrementCounter('whatsapp_status_changes_total', { 
                clientId: this.clientId, 
                from: this._status, 
                to: newStatus 
            });
            this._status = newStatus;
        }
    }

    /**
     * Inicializa o cliente WhatsApp
     */
    async initialize() {
        if (this.status === 'initializing' || this.status === 'ready') {
            logger.aviso(`[${this.clientId}] Cliente já está ${this.status}`);
            return { success: false, message: 'Cliente já está sendo inicializado ou já está pronto' };
        }

        try {
            this.status = 'initializing';
            logger.info(`[${this.clientId}] Iniciando cliente WhatsApp...`);

            // Criar instância do cliente com LocalAuth isolado por clientId
            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: this.clientId,
                    dataPath: this.sessionPath
                }),
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

            // Registrar listeners de eventos
            this._setupEventListeners();

            // Inicializar cliente
            await this.client.initialize();

            return { success: true, clientId: this.clientId };
        } catch (erro) {
            this.status = 'error';
            logger.erro(`[${this.clientId}] Erro ao inicializar:`, erro.message);
            return { success: false, message: erro.message };
        }
    }

    /**
     * Configura listeners de eventos do cliente WhatsApp
     */
    _setupEventListeners() {
        // QR Code gerado
        this.client.on('qr', async (qr) => {
            try {
                this.status = 'qr_ready';
                this.metadata.lastQRAt = new Date().toISOString();
                
                // Converter QR para DataURL
                const qrDataURL = await qrcode.toDataURL(qr);
                this.qrCode = qrDataURL;
                
                logger.info(`[${this.clientId}] QR Code gerado`);
                this.callbacks.onQR(this.clientId, qrDataURL);
            } catch (erro) {
                logger.erro(`[${this.clientId}] Erro ao gerar QR Code:`, erro.message);
            }
        });

        // Autenticado
        this.client.on('authenticated', () => {
            this.status = 'authenticated';
            logger.sucesso(`[${this.clientId}] Autenticado com sucesso`);
        });

        // Cliente pronto
        this.client.on('ready', async () => {
            this.status = 'ready';
            this.metadata.connectedAt = new Date().toISOString();
            
            // Obter informações do telefone
            try {
                const info = this.client.info;
                this.phoneNumber = info.wid.user;
                logger.sucesso(`[${this.clientId}] Cliente pronto - Número: ${this.phoneNumber}`);
            } catch (erro) {
                logger.aviso(`[${this.clientId}] Não foi possível obter número do telefone`);
            }
            
            this.callbacks.onReady(this.clientId, this.phoneNumber);

            // Processar mensagens pendentes na fila para este cliente
            try {
                const queue = require('../core/message-queue');
                await queue.process(async (msg) => {
                    if (msg.clientId !== this.clientId) return true; // Ignora outras
                    try {
                        const r = await this.client.sendMessage(msg.to, msg.text);
                        logger.sucesso(`[${this.clientId}] Mensagem (fila) enviada para ${msg.to}`);
                        return !!r;
                    } catch(e) {
                        logger.aviso(`[${this.clientId}] Falha ao enviar da fila para ${msg.to}: ${e.message}`);
                        return false;
                    }
                });
            } catch(e) {
                logger.aviso(`[${this.clientId}] Erro ao processar fila: ${e.message}`);
            }
        });

        // Mensagem recebida
        this.client.on('message', async (message) => {
            const prometheusMetrics = require('../core/prometheus-metrics');
            this.metadata.messageCount++;
            prometheusMetrics.incrementCounter('whatsapp_messages_received_total', { clientId: this.clientId });
            logger.info(`[${this.clientId}] Mensagem recebida de ${message.from}`);
            this.callbacks.onMessage(this.clientId, message);
        });

        // Desconectado
        this.client.on('disconnected', (reason) => {
            this.status = 'disconnected';
            logger.aviso(`[${this.clientId}] Desconectado: ${reason}`);
            this.callbacks.onDisconnected(this.clientId, reason);
        });

        // Falha de autenticação
        this.client.on('auth_failure', (message) => {
            this.status = 'error';
            logger.erro(`[${this.clientId}] Falha de autenticação: ${message}`);
            this.callbacks.onAuthFailure(this.clientId, message);
        });

        // Erro de carregamento
        this.client.on('loading_screen', (percent, message) => {
            logger.info(`[${this.clientId}] Carregando: ${percent}% - ${message}`);
        });
    }

    /**
     * Envia uma mensagem de texto
     * @param {string} to - Número do destinatário (formato: 5511999999999@c.us)
     * @param {string} text - Texto da mensagem
     */
    async sendMessage(to, text) {
        const queue = require('../core/message-queue');
        const prometheusMetrics = require('../core/prometheus-metrics');
        
        if (this.status !== 'ready') {
            // Enfileira para tentativa posterior
            queue.enqueue({ clientId: this.clientId, to, text });
            prometheusMetrics.incrementCounter('whatsapp_messages_queued_total', { clientId: this.clientId });
            logger.aviso(`[${this.clientId}] Cliente não pronto. Mensagem enfileirada para ${to}`);
            return { success: false, queued: true, message: `Cliente não pronto (${this.status}). Mensagem enfileirada.` };
        }

        try {
            const result = await this.client.sendMessage(to, text);
            prometheusMetrics.incrementCounter('whatsapp_messages_sent_total', { clientId: this.clientId, status: 'success' });
            logger.sucesso(`[${this.clientId}] Mensagem enviada para ${to}`);
            return { success: true, messageId: result.id.id };
        } catch (erro) {
            logger.erro(`[${this.clientId}] Erro ao enviar mensagem:`, erro.message);
            prometheusMetrics.incrementCounter('whatsapp_messages_sent_total', { clientId: this.clientId, status: 'error' });
            // Enfileira para retry futuro
            queue.enqueue({ clientId: this.clientId, to, text });
            prometheusMetrics.incrementCounter('whatsapp_messages_queued_total', { clientId: this.clientId });
            return { success: false, queued: true, message: erro.message };
        }
    }

    /**
     * Envia uma mensagem de mídia
     * @param {string} to - Número do destinatário
     * @param {Object} media - Objeto de mídia (MessageMedia)
     * @param {Object} options - Opções adicionais (caption, etc)
     */
    async sendMedia(to, media, options = {}) {
        if (this.status !== 'ready') {
            return { success: false, message: `Cliente não está pronto. Status atual: ${this.status}` };
        }

        try {
            const result = await this.client.sendMessage(to, media, options);
            logger.sucesso(`[${this.clientId}] Mídia enviada para ${to}`);
            return { success: true, messageId: result.id.id };
        } catch (erro) {
            logger.erro(`[${this.clientId}] Erro ao enviar mídia:`, erro.message);
            return { success: false, message: erro.message };
        }
    }

    /**
     * Obtém informações do cliente
     */
    getInfo() {
        return {
            clientId: this.clientId,
            status: this.status,
            phoneNumber: this.phoneNumber,
            qrCode: this.qrCode,
            metadata: this.metadata,
            isReady: this.status === 'ready'
        };
    }

    /**
     * Obtém lista de chats com cache de 30s
     */
    async getChats(forceRefresh = false) {
        if (this.status !== 'ready') {
            return { success: false, message: 'Cliente não está pronto' };
        }

        const cache = require('../core/cache');
        const cacheKey = `chats:${this.clientId}`;

        if (!forceRefresh) {
            const cached = cache.get(cacheKey);
            if (cached) {
                logger.info(`[${this.clientId}] Chats retornados do cache`);
                return { success: true, chats: cached, fromCache: true };
            }
        }

        try {
            const chats = await this.client.getChats();
            const chatList = chats.map(c => ({
                id: c.id._serialized,
                name: c.name || c.id.user,
                isGroup: c.isGroup,
                unreadCount: c.unreadCount,
                timestamp: c.timestamp
            }));
            cache.set(cacheKey, chatList, 30000); // TTL 30s
            logger.info(`[${this.clientId}] Chats carregados e cacheados (${chatList.length} encontrados)`);
            return { success: true, chats: chatList, fromCache: false };
        } catch (erro) {
            logger.erro(`[${this.clientId}] Erro ao obter chats:`, erro.message);
            return { success: false, message: erro.message };
        }
    }

    /**
     * Obtém estado atual do cliente
     */
    async getState() {
        if (!this.client) {
            return null;
        }

        try {
            const state = await this.client.getState();
            return state;
        } catch (erro) {
            logger.erro(`[${this.clientId}] Erro ao obter estado:`, erro.message);
            return null;
        }
    }

    /**
     * Desconecta o cliente de forma segura
     */
    async disconnect() {
        if (!this.client) {
            return { success: true, message: 'Cliente já estava desconectado' };
        }

        try {
            logger.info(`[${this.clientId}] Desconectando cliente...`);
            await this.client.destroy();
            this.status = 'disconnected';
            this.client = null;
            logger.sucesso(`[${this.clientId}] Cliente desconectado com sucesso`);
            return { success: true };
        } catch (erro) {
            logger.erro(`[${this.clientId}] Erro ao desconectar:`, erro.message);
            return { success: false, message: erro.message };
        }
    }

    /**
     * Reconecta o cliente (útil após falha)
     */
    async reconnect() {
        logger.info(`[${this.clientId}] Tentando reconectar...`);
        await this.disconnect();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda 2s
        return await this.initialize();
    }

    /**
     * Logout e remove sessão
     */
    async logout() {
        if (!this.client) {
            return { success: false, message: 'Cliente não está conectado' };
        }

        try {
            logger.info(`[${this.clientId}] Fazendo logout e removendo sessão...`);
            await this.client.logout();
            this.status = 'idle';
            this.phoneNumber = null;
            this.qrCode = null;
            logger.sucesso(`[${this.clientId}] Logout realizado com sucesso`);
            return { success: true };
        } catch (erro) {
            logger.erro(`[${this.clientId}] Erro ao fazer logout:`, erro.message);
            return { success: false, message: erro.message };
        }
    }
}

module.exports = WhatsAppClientService;
