/**
 * 🔄 WhatsAppPoolManager
 * 
 * Gerenciador de pool de múltiplas instâncias WhatsApp.
 * Responsável por:
 * - Criar e gerenciar múltiplos clientes WhatsApp
 * - Distribuir carga entre clientes
 * - Monitorar saúde dos clientes
 * - Persistir e restaurar sessões
 * - Limpar instâncias inativas
 */

const WhatsAppClientService = require('./WhatsAppClientService');
const logger = require('../infraestrutura/logger');
const fs = require('fs-extra');
const path = require('path');

class WhatsAppPoolManager {
    constructor(options = {}) {
        // Map de clientes: clientId -> WhatsAppClientService
        this.clients = new Map();
        
        // Configurações
        this.config = {
            maxClients: options.maxClients || 10,
            sessionPath: options.sessionPath || path.join(process.cwd(), '.wwebjs_auth'),
            persistencePath: options.persistencePath || path.join(process.cwd(), 'dados', 'whatsapp-sessions.json'),
            autoReconnect: options.autoReconnect !== false,
            reconnectDelay: options.reconnectDelay || 5000,
            healthCheckInterval: options.healthCheckInterval || 60000 // 1 minuto
        };

        // Callbacks globais (podem ser sobrescritos por cliente)
        this.globalCallbacks = {
            onQR: options.onQR || (() => {}),
            onReady: options.onReady || (() => {}),
            onMessage: options.onMessage || (() => {}),
            onDisconnected: options.onDisconnected || (() => {}),
            onAuthFailure: options.onAuthFailure || (() => {})
        };

        // Estatísticas
        this.stats = {
            totalCreated: 0,
            totalConnected: 0,
            totalDisconnected: 0,
            totalMessages: 0
        };

        // Health check interval
        this.healthCheckTimer = null;

        // Carregar sessões persistidas
        this._loadPersistedSessions();
    }

    /**
     * Cria um novo cliente WhatsApp
     * @param {string} clientId - ID único do cliente (opcional, será gerado se não fornecido)
     * @param {Object} customCallbacks - Callbacks personalizados para este cliente
     */
    async createClient(clientId = null, customCallbacks = {}) {
        // Gerar ID se não fornecido
        if (!clientId) {
            clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // Verificar se já existe
        if (this.clients.has(clientId)) {
            logger.aviso(`[Pool] Cliente ${clientId} já existe`);
            return { success: false, message: 'Cliente já existe', clientId };
        }

        // Verificar limite
        if (this.clients.size >= this.config.maxClients) {
            logger.erro(`[Pool] Limite de ${this.config.maxClients} clientes atingido`);
            return { success: false, message: 'Limite de clientes atingido' };
        }

        try {
            logger.info(`[Pool] Criando novo cliente: ${clientId}`);

            // Merge de callbacks (customCallbacks sobrescreve globalCallbacks)
            const callbacks = {
                onQR: (id, qr) => {
                    (customCallbacks.onQR || this.globalCallbacks.onQR)(id, qr);
                },
                onReady: (id, phone) => {
                    this.stats.totalConnected++;
                    this._persistSessions();
                    (customCallbacks.onReady || this.globalCallbacks.onReady)(id, phone);
                },
                onMessage: (id, message) => {
                    this.stats.totalMessages++;
                    (customCallbacks.onMessage || this.globalCallbacks.onMessage)(id, message);
                },
                onDisconnected: (id, reason) => {
                    this.stats.totalDisconnected++;
                    if (this.config.autoReconnect) {
                        logger.info(`[Pool] Agendando reconexão de ${id} em ${this.config.reconnectDelay}ms`);
                        setTimeout(() => this.reconnectClient(id), this.config.reconnectDelay);
                    }
                    (customCallbacks.onDisconnected || this.globalCallbacks.onDisconnected)(id, reason);
                },
                onAuthFailure: (id, message) => {
                    logger.erro(`[Pool] Falha de autenticação em ${id}: ${message}`);
                    (customCallbacks.onAuthFailure || this.globalCallbacks.onAuthFailure)(id, message);
                }
            };

            // Criar instância do serviço
            const clientService = new WhatsAppClientService(clientId, {
                sessionPath: this.config.sessionPath,
                ...callbacks
            });

            // Adicionar ao pool
            this.clients.set(clientId, clientService);
            this.stats.totalCreated++;

            logger.sucesso(`[Pool] Cliente ${clientId} criado com sucesso (${this.clients.size}/${this.config.maxClients})`);

            return { success: true, clientId };
        } catch (erro) {
            logger.erro(`[Pool] Erro ao criar cliente ${clientId}:`, erro.message);
            return { success: false, message: erro.message };
        }
    }

    /**
     * Inicializa um cliente específico
     */
    async initializeClient(clientId) {
        const client = this.clients.get(clientId);
        if (!client) {
            return { success: false, message: 'Cliente não encontrado' };
        }

        return await client.initialize();
    }

    /**
     * Cria e inicializa um novo cliente em uma operação
     */
    async createAndInitialize(clientId = null, customCallbacks = {}) {
        const createResult = await this.createClient(clientId, customCallbacks);
        if (!createResult.success) {
            return createResult;
        }

        const initResult = await this.initializeClient(createResult.clientId);
        return { ...initResult, clientId: createResult.clientId };
    }

    /**
     * Remove um cliente do pool
     */
    async removeClient(clientId) {
        const client = this.clients.get(clientId);
        if (!client) {
            return { success: false, message: 'Cliente não encontrado' };
        }

        logger.info(`[Pool] Removendo cliente ${clientId}...`);
        
        // Desconectar antes de remover
        await client.disconnect();
        
        // Remover do Map
        this.clients.delete(clientId);
        
        // Atualizar persistência
        this._persistSessions();

        logger.sucesso(`[Pool] Cliente ${clientId} removido (${this.clients.size}/${this.config.maxClients})`);
        return { success: true };
    }

    /**
     * Reconecta um cliente específico
     */
    async reconnectClient(clientId) {
        const client = this.clients.get(clientId);
        if (!client) {
            return { success: false, message: 'Cliente não encontrado' };
        }

        logger.info(`[Pool] Reconectando cliente ${clientId}...`);
        return await client.reconnect();
    }

    /**
     * Envia mensagem através de um cliente específico
     */
    async sendMessage(clientId, to, text) {
        const client = this.clients.get(clientId);
        if (!client) {
            return { success: false, message: 'Cliente não encontrado' };
        }

        return await client.sendMessage(to, text);
    }

    /**
     * Envia mensagem através do primeiro cliente disponível (round-robin)
     */
    async sendMessageAuto(to, text) {
        const readyClients = this.getReadyClients();
        
        if (readyClients.length === 0) {
            return { success: false, message: 'Nenhum cliente disponível' };
        }

        // Pegar primeiro cliente pronto
        const clientId = readyClients[0];
        return await this.sendMessage(clientId, to, text);
    }

    /**
     * Envia mídia através de um cliente específico
     */
    async sendMedia(clientId, to, media, options = {}) {
        const client = this.clients.get(clientId);
        if (!client) {
            return { success: false, message: 'Cliente não encontrado' };
        }

        return await client.sendMedia(to, media, options);
    }

    /**
     * Obtém lista de IDs de clientes prontos
     */
    getReadyClients() {
        const ready = [];
        for (const [clientId, client] of this.clients.entries()) {
            if (client.status === 'ready') {
                ready.push(clientId);
            }
        }
        return ready;
    }

    /**
     * Obtém informações de todos os clientes
     */
    getAllClientsInfo() {
        const info = [];
        for (const [clientId, client] of this.clients.entries()) {
            info.push(client.getInfo());
        }
        return info;
    }

    /**
     * Obtém informações de um cliente específico
     */
    getClientInfo(clientId) {
        const client = this.clients.get(clientId);
        if (!client) {
            return null;
        }
        return client.getInfo();
    }

    /**
     * Obtém estatísticas do pool
     */
    getStats() {
        const clientsByStatus = {};
        for (const client of this.clients.values()) {
            const status = client.status;
            clientsByStatus[status] = (clientsByStatus[status] || 0) + 1;
        }

        return {
            ...this.stats,
            currentClients: this.clients.size,
            maxClients: this.config.maxClients,
            readyClients: this.getReadyClients().length,
            clientsByStatus
        };
    }

    /**
     * Health check de todos os clientes
     */
    async healthCheck() {
        logger.info('[Pool] Executando health check...');
        
        const results = [];
        for (const [clientId, client] of this.clients.entries()) {
            const state = await client.getState();
            const info = client.getInfo();
            
            results.push({
                clientId,
                status: info.status,
                state,
                isHealthy: info.status === 'ready' && state === 'CONNECTED'
            });

            // Tentar reconectar se não estiver saudável e auto-reconnect estiver ativo
            if (!results[results.length - 1].isHealthy && this.config.autoReconnect) {
                if (info.status === 'disconnected' || info.status === 'error') {
                    logger.aviso(`[Pool] Cliente ${clientId} não saudável, tentando reconectar...`);
                    await this.reconnectClient(clientId);
                }
            }
        }

        logger.info(`[Pool] Health check concluído: ${results.filter(r => r.isHealthy).length}/${results.length} clientes saudáveis`);
        return results;
    }

    /**
     * Inicia health check periódico
     */
    startHealthCheck() {
        if (this.healthCheckTimer) {
            logger.aviso('[Pool] Health check já está ativo');
            return;
        }

        logger.info(`[Pool] Iniciando health check periódico (intervalo: ${this.config.healthCheckInterval}ms)`);
        this.healthCheckTimer = setInterval(() => {
            this.healthCheck();
        }, this.config.healthCheckInterval);
    }

    /**
     * Para health check periódico
     */
    stopHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
            logger.info('[Pool] Health check periódico parado');
        }
    }

    /**
     * Persiste lista de sessões ativas em arquivo JSON
     */
    _persistSessions() {
        try {
            const sessions = [];
            for (const [clientId, client] of this.clients.entries()) {
                const info = client.getInfo();
                sessions.push({
                    clientId,
                    status: info.status,
                    phoneNumber: info.phoneNumber,
                    metadata: info.metadata
                });
            }

            fs.ensureDirSync(path.dirname(this.config.persistencePath));
            fs.writeJsonSync(this.config.persistencePath, {
                updatedAt: new Date().toISOString(),
                sessions
            }, { spaces: 2 });

            logger.info(`[Pool] ${sessions.length} sessões persistidas`);
        } catch (erro) {
            logger.erro('[Pool] Erro ao persistir sessões:', erro.message);
        }
    }

    /**
     * Carrega sessões persistidas do arquivo JSON
     */
    _loadPersistedSessions() {
        try {
            if (!fs.existsSync(this.config.persistencePath)) {
                logger.info('[Pool] Nenhuma sessão persistida encontrada');
                return;
            }

            const data = fs.readJsonSync(this.config.persistencePath);
            logger.info(`[Pool] ${data.sessions.length} sessões encontradas (última atualização: ${data.updatedAt})`);
            
            // Nota: Sessões são apenas carregadas, não reconectadas automaticamente
            // Para reconectar, use restorePersistedSessions()
        } catch (erro) {
            logger.erro('[Pool] Erro ao carregar sessões persistidas:', erro.message);
        }
    }

    /**
     * Restaura e reconecta sessões persistidas
     */
    async restorePersistedSessions() {
        try {
            if (!fs.existsSync(this.config.persistencePath)) {
                logger.info('[Pool] Nenhuma sessão para restaurar');
                return { success: true, restored: 0 };
            }

            const data = fs.readJsonSync(this.config.persistencePath);
            logger.info(`[Pool] Tentando restaurar ${data.sessions.length} sessões...`);

            let restored = 0;
            for (const session of data.sessions) {
                if (session.status === 'ready' || session.status === 'authenticated') {
                    const result = await this.createAndInitialize(session.clientId);
                    if (result.success) {
                        restored++;
                    }
                }
            }

            logger.sucesso(`[Pool] ${restored}/${data.sessions.length} sessões restauradas`);
            return { success: true, restored, total: data.sessions.length };
        } catch (erro) {
            logger.erro('[Pool] Erro ao restaurar sessões:', erro.message);
            return { success: false, message: erro.message };
        }
    }

    /**
     * Desconecta todos os clientes e limpa o pool
     */
    async shutdown() {
        logger.info('[Pool] Encerrando pool de clientes...');
        
        // Parar health check
        this.stopHealthCheck();

        // Desconectar todos os clientes
        const promises = [];
        for (const [clientId, client] of this.clients.entries()) {
            promises.push(client.disconnect());
        }

        await Promise.all(promises);

        // Limpar Map
        this.clients.clear();

        // Persistir estado final
        this._persistSessions();

        logger.sucesso('[Pool] Pool de clientes encerrado');
    }
}

module.exports = WhatsAppPoolManager;
