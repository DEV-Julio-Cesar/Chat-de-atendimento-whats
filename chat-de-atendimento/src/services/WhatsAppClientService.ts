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

import { Client, LocalAuth, Message, Chat, MessageMedia } from 'whatsapp-web.js';
import * as path from 'path';

// @ts-ignore - qrcode não tem types oficiais
const qrcode = require('qrcode');

// Types
export type ClientStatus = 
  | 'idle' 
  | 'initializing' 
  | 'qr_ready' 
  | 'authenticated' 
  | 'ready' 
  | 'disconnected' 
  | 'error';

export interface ClientOptions {
  sessionPath?: string;
  onQR?: (clientId: string, qr: string) => void;
  onReady?: (clientId: string) => void;
  onMessage?: (clientId: string, message: Message) => void;
  onDisconnected?: (clientId: string, reason: string) => void;
  onAuthFailure?: (clientId: string, message: string) => void;
}

export interface ClientCallbacks {
  onQR: (clientId: string, qr: string) => void;
  onReady: (clientId: string) => void;
  onMessage: (clientId: string, message: Message) => void;
  onDisconnected: (clientId: string, reason: string) => void;
  onAuthFailure: (clientId: string, message: string) => void;
}

export interface ClientMetadata {
  createdAt: string;
  lastQRAt: string | null;
  connectedAt: string | null;
  messageCount: number;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  queued?: boolean;
  message?: string;
}

export interface ChatResult {
  success: boolean;
  chats?: Chat[];
  fromCache?: boolean;
  message?: string;
}

export interface ClientInfo {
  clientId: string;
  status: ClientStatus;
  phoneNumber: string | null;
  qrCode: string | null;
  metadata: ClientMetadata;
  isReady: boolean;
}

export class WhatsAppClientService {
  readonly clientId: string;
  private client: Client | null = null;
  private _status: ClientStatus = 'idle';
  private qrCode: string | null = null;
  private phoneNumber: string | null = null;
  private readonly sessionPath: string;
  private readonly callbacks: ClientCallbacks;
  private metadata: ClientMetadata;
  private logger: any;
  private cache: any;

  constructor(clientId: string, options: ClientOptions = {}) {
    this.clientId = clientId;
    this.sessionPath = options.sessionPath || path.join(process.cwd(), '.wwebjs_auth');
    
    // Lazy load dependencies
    this.logger = require('../infraestrutura/logger');
    this.cache = require('../core/cache');
    
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
  get status(): ClientStatus {
    return this._status;
  }

  set status(newStatus: ClientStatus) {
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
  async initialize(): Promise<void> {
    if (this.status === 'initializing' || this.status === 'ready') {
      this.logger.aviso(`[${this.clientId}] Cliente já está ${this.status}`);
      return;
    }

    try {
      this.status = 'initializing';
      this.logger.info(`[${this.clientId}] Iniciando cliente WhatsApp...`);

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

      this.setupEventListeners();
      await this.client.initialize();

    } catch (erro: any) {
      this.status = 'error';
      this.logger.erro(`[${this.clientId}] Erro na inicialização:`, erro);
      throw erro;
    }
  }

  /**
   * Configura os listeners de eventos do cliente
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    // QR Code gerado
    this.client.on('qr', async (qr: string) => {
      try {
        this.status = 'qr_ready';
        this.qrCode = await qrcode.toDataURL(qr);
        this.metadata.lastQRAt = new Date().toISOString();
        this.logger.info(`[${this.clientId}] QR Code gerado`);
        this.callbacks.onQR(this.clientId, this.qrCode!);
      } catch (erro: any) {
        this.logger.erro(`[${this.clientId}] Erro ao gerar QR Code:`, erro);
      }
    });

    // Carregando...
    this.client.on('loading_screen', (percent: number) => {
      this.logger.info(`[${this.clientId}] Carregando: ${percent}%`);
    });

    // Autenticado
    this.client.on('authenticated', () => {
      this.status = 'authenticated';
      this.logger.sucesso(`[${this.clientId}] Autenticado com sucesso`);
    });

    // Pronto para uso
    this.client.on('ready', async () => {
      this.status = 'ready';
      this.metadata.connectedAt = new Date().toISOString();

      try {
        const info = await this.client!.info;
        this.phoneNumber = info.wid.user;
        this.logger.sucesso(`[${this.clientId}] Cliente pronto! Número: ${this.phoneNumber}`);
      } catch (erro: any) {
        this.logger.erro(`[${this.clientId}] Erro ao obter info:`, erro);
      }

      this.callbacks.onReady(this.clientId);

      // Processa mensagens enfileiradas
      const messageQueue = require('../core/message-queue');
      await messageQueue.process(async (msg: any) => {
        if (msg.clientId === this.clientId) {
          try {
            await this.client!.sendMessage(msg.to, msg.text);
            this.logger.sucesso(`[${this.clientId}] Mensagem da fila enviada para ${msg.to}`);
            return true;
          } catch (erro: any) {
            this.logger.erro(`[${this.clientId}] Erro ao enviar mensagem da fila:`, erro.message);
            return false;
          }
        }
        return false;
      });
    });

    // Mensagem recebida
    this.client.on('message', async (message: Message) => {
      const prometheusMetrics = require('../core/prometheus-metrics');
      this.metadata.messageCount++;
      prometheusMetrics.incrementCounter('whatsapp_messages_received_total', { clientId: this.clientId });
      this.logger.info(`[${this.clientId}] Mensagem recebida de ${message.from}`);
      this.callbacks.onMessage(this.clientId, message);
    });

    // Desconectado
    this.client.on('disconnected', (reason: string) => {
      this.status = 'disconnected';
      this.logger.aviso(`[${this.clientId}] Desconectado: ${reason}`);
      this.callbacks.onDisconnected(this.clientId, reason);
    });

    // Falha de autenticação
    this.client.on('auth_failure', (message: string) => {
      this.status = 'error';
      this.logger.erro(`[${this.clientId}] Falha de autenticação:`, message);
      this.callbacks.onAuthFailure(this.clientId, message);
    });
  }

  /**
   * Envia uma mensagem de texto
   */
  async sendMessage(to: string, text: string): Promise<MessageResult> {
    const queue = require('../core/message-queue');
    const prometheusMetrics = require('../core/prometheus-metrics');
    
    if (this.status !== 'ready') {
      queue.enqueue({ clientId: this.clientId, to, text });
      prometheusMetrics.incrementCounter('whatsapp_messages_queued_total', { clientId: this.clientId });
      this.logger.aviso(`[${this.clientId}] Cliente não pronto. Mensagem enfileirada para ${to}`);
      return { success: false, queued: true, message: `Cliente não pronto (${this.status}). Mensagem enfileirada.` };
    }

    try {
      const result = await this.client!.sendMessage(to, text);
      prometheusMetrics.incrementCounter('whatsapp_messages_sent_total', { clientId: this.clientId, status: 'success' });
      this.logger.sucesso(`[${this.clientId}] Mensagem enviada para ${to}`);
      return { success: true, messageId: result.id.id };
    } catch (erro: any) {
      this.logger.erro(`[${this.clientId}] Erro ao enviar mensagem:`, erro.message);
      prometheusMetrics.incrementCounter('whatsapp_messages_sent_total', { clientId: this.clientId, status: 'error' });
      queue.enqueue({ clientId: this.clientId, to, text });
      prometheusMetrics.incrementCounter('whatsapp_messages_queued_total', { clientId: this.clientId });
      return { success: false, queued: true, message: erro.message };
    }
  }

  /**
   * Envia uma mensagem de mídia
   */
  async sendMediaMessage(to: string, media: MessageMedia, options?: { caption?: string }): Promise<MessageResult> {
    if (this.status !== 'ready') {
      return { success: false, message: `Cliente não pronto (${this.status})` };
    }

    try {
      const result = await this.client!.sendMessage(to, media, options);
      this.logger.sucesso(`[${this.clientId}] Mídia enviada para ${to}`);
      return { success: true, messageId: result.id.id };
    } catch (erro: any) {
      this.logger.erro(`[${this.clientId}] Erro ao enviar mídia:`, erro.message);
      return { success: false, message: erro.message };
    }
  }

  /**
   * Obtém informações do cliente
   */
  async getInfo(): Promise<any> {
    if (!this.client || this.status !== 'ready') {
      return null;
    }
    try {
      return await this.client.info;
    } catch (erro: any) {
      this.logger.erro(`[${this.clientId}] Erro ao obter info:`, erro);
      return null;
    }
  }

  /**
   * Lista todos os chats com cache
   */
  async getChats(forceRefresh: boolean = false): Promise<ChatResult> {
    if (this.status !== 'ready' || !this.client) {
      return { success: false, message: 'Cliente não está pronto' };
    }

    const cacheKey = `chats_${this.clientId}`;
    
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.logger.info(`[${this.clientId}] Retornando chats do cache`);
        return { success: true, chats: cached, fromCache: true };
      }
    }

    try {
      const chats = await this.client.getChats();
      this.cache.set(cacheKey, chats, 30000); // 30s TTL
      this.logger.info(`[${this.clientId}] ${chats.length} chats obtidos`);
      return { success: true, chats, fromCache: false };
    } catch (erro: any) {
      this.logger.erro(`[${this.clientId}] Erro ao obter chats:`, erro);
      return { success: false, message: erro.message };
    }
  }

  /**
   * Obtém informações sobre o cliente
   */
  getClientInfo(): ClientInfo {
    return {
      clientId: this.clientId,
      status: this.status,
      phoneNumber: this.phoneNumber,
      qrCode: this.qrCode,
      metadata: { ...this.metadata },
      isReady: this.status === 'ready'
    };
  }

  /**
   * Desconecta e destrói o cliente
   */
  async disconnect(): Promise<void> {
    if (!this.client) {
      this.logger.aviso(`[${this.clientId}] Cliente já está desconectado`);
      return;
    }

    try {
      this.logger.info(`[${this.clientId}] Desconectando cliente...`);
      await this.client.destroy();
      this.client = null;
      this.status = 'disconnected';
      this.logger.sucesso(`[${this.clientId}] Cliente desconectado com sucesso`);
    } catch (erro: any) {
      this.logger.erro(`[${this.clientId}] Erro ao desconectar:`, erro);
      throw erro;
    }
  }

  /**
   * Remove a sessão persistente
   */
  async logout(): Promise<void> {
    if (!this.client) {
      this.logger.aviso(`[${this.clientId}] Nenhum cliente ativo para logout`);
      return;
    }

    try {
      this.logger.info(`[${this.clientId}] Fazendo logout...`);
      await this.client.logout();
      await this.disconnect();
      this.status = 'idle';
      this.phoneNumber = null;
      this.qrCode = null;
      this.logger.sucesso(`[${this.clientId}] Logout realizado com sucesso`);
    } catch (erro: any) {
      this.logger.erro(`[${this.clientId}] Erro no logout:`, erro);
      throw erro;
    }
  }

  /**
   * Verifica se o cliente está pronto
   */
  isReady(): boolean {
    return this.status === 'ready';
  }

  /**
   * Obtém o cliente raw (use com cautela)
   */
  getRawClient(): Client | null {
    return this.client;
  }
}

export default WhatsAppClientService;
