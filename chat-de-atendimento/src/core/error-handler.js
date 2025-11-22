// src/core/error-handler.js
// Centralizador de tratamento de erros com categorização

class ErrorHandler {
  constructor() {
    this.logger = require('../infraestrutura/logger');
    this.prometheus = require('./prometheus-metrics');
    this.auditoria = require('../infraestrutura/auditoria');
    this.errorCategories = {
      NETWORK: 'network',
      DATABASE: 'database',
      VALIDATION: 'validation',
      AUTHENTICATION: 'authentication',
      AUTHORIZATION: 'authorization',
      WHATSAPP: 'whatsapp',
      INTERNAL: 'internal',
      EXTERNAL_API: 'external_api'
    };
  }

  /**
   * Trata erro de forma centralizada
   * @param {Error} error
   * @param {Object} context - Contexto adicional
   * @returns {Object} - Erro formatado
   */
  handle(error, context = {}) {
    const category = this._categorizeError(error);
    const severity = this._determineSeverity(error, category);
    const userMessage = this._getUserFriendlyMessage(error, category);
    const errorId = this._generateErrorId();

    const errorInfo = {
      id: errorId,
      category,
      severity,
      message: error.message,
      userMessage,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context
    };

    // Log baseado em severidade
    this._logError(errorInfo);

    // Métricas
    this.prometheus.incrementCounter('errors_total', {
      category,
      severity
    });

    // Auditoria para erros críticos
    if (severity === 'critical' || severity === 'error') {
      this.auditoria.logAudit('error.occurred', {
        errorId,
        category,
        severity,
        message: error.message,
        ...context
      });
    }

    return {
      id: errorId,
      message: userMessage,
      category,
      severity,
      details: process.env.NODE_ENV === 'development' ? errorInfo : undefined
    };
  }

  /**
   * Categoriza erro
   */
  _categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';

    if (message.includes('network') || code.includes('econnrefused') || code.includes('etimedout')) {
      return this.errorCategories.NETWORK;
    }
    if (message.includes('whatsapp') || message.includes('qr')) {
      return this.errorCategories.WHATSAPP;
    }
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return this.errorCategories.AUTHENTICATION;
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return this.errorCategories.AUTHORIZATION;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return this.errorCategories.VALIDATION;
    }
    if (message.includes('database') || message.includes('sql')) {
      return this.errorCategories.DATABASE;
    }

    return this.errorCategories.INTERNAL;
  }

  /**
   * Determina severidade
   */
  _determineSeverity(error, category) {
    // Crítico: falhas que afetam todo o sistema
    if (category === this.errorCategories.DATABASE) return 'critical';
    if (error.message?.includes('FATAL')) return 'critical';

    // Erro: falhas que afetam operações importantes
    if (category === this.errorCategories.AUTHENTICATION) return 'error';
    if (category === this.errorCategories.WHATSAPP) return 'error';

    // Warning: falhas recuperáveis
    if (category === this.errorCategories.VALIDATION) return 'warning';
    if (category === this.errorCategories.NETWORK) return 'warning';

    // Info: informações úteis
    return 'info';
  }

  /**
   * Mensagem amigável para usuário
   */
  _getUserFriendlyMessage(error, category) {
    const messages = {
      [this.errorCategories.NETWORK]: 'Erro de conexão. Verifique sua internet.',
      [this.errorCategories.WHATSAPP]: 'Erro no WhatsApp. Tente reconectar.',
      [this.errorCategories.AUTHENTICATION]: 'Falha na autenticação. Faça login novamente.',
      [this.errorCategories.AUTHORIZATION]: 'Você não tem permissão para esta ação.',
      [this.errorCategories.VALIDATION]: 'Dados inválidos. Verifique os campos.',
      [this.errorCategories.DATABASE]: 'Erro interno. Contate o suporte.',
      [this.errorCategories.INTERNAL]: 'Erro inesperado. Tente novamente.'
    };

    return messages[category] || 'Ocorreu um erro. Tente novamente.';
  }

  /**
   * Gera ID único para erro
   */
  _generateErrorId() {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * Log baseado em severidade
   */
  _logError(errorInfo) {
    const logMessage = `[${errorInfo.category.toUpperCase()}] ${errorInfo.message}`;

    switch (errorInfo.severity) {
      case 'critical':
        this.logger.erro(`🔥 CRITICAL: ${logMessage}`, errorInfo);
        break;
      case 'error':
        this.logger.erro(`❌ ${logMessage}`, errorInfo);
        break;
      case 'warning':
        this.logger.aviso(`⚠️ ${logMessage}`, errorInfo);
        break;
      default:
        this.logger.info(`ℹ️ ${logMessage}`, errorInfo);
    }
  }

  /**
   * Wrapper para try-catch em funções async
   */
  async tryAsync(fn, context = {}) {
    try {
      return { success: true, data: await fn() };
    } catch (error) {
      const errorInfo = this.handle(error, context);
      return { success: false, error: errorInfo };
    }
  }

  /**
   * Wrapper para try-catch em funções síncronas
   */
  try(fn, context = {}) {
    try {
      return { success: true, data: fn() };
    } catch (error) {
      const errorInfo = this.handle(error, context);
      return { success: false, error: errorInfo };
    }
  }

  /**
   * Handler global para erros não tratados
   */
  setupGlobalHandlers() {
    process.on('uncaughtException', (error) => {
      this.logger.erro('🔥 UNCAUGHT EXCEPTION:', error);
      this.handle(error, { source: 'uncaughtException' });
      // Não fazer exit, deixar a aplicação decidir
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.erro('🔥 UNHANDLED REJECTION:', reason);
      this.handle(reason instanceof Error ? reason : new Error(String(reason)), {
        source: 'unhandledRejection'
      });
    });

    this.logger.sucesso('[ErrorHandler] Global error handlers configurados');
  }

  /**
   * Obtém estatísticas de erros
   */
  getErrorStats() {
    // Implementar se necessário coletar estatísticas locais
    return {
      categories: Object.values(this.errorCategories),
      message: 'Use Prometheus metrics para estatísticas detalhadas'
    };
  }
}

module.exports = new ErrorHandler();
