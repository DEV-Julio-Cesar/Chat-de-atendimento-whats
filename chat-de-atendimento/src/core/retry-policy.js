// src/core/retry-policy.js
// Retry policy configurável com backoff exponencial

class RetryPolicy {
  constructor(options = {}) {
    this.maxAttempts = options.maxAttempts || 3;
    this.initialDelay = options.initialDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.factor = options.factor || 2;
    this.jitter = options.jitter !== false;
    this.logger = require('../infraestrutura/logger');
  }

  /**
   * Executa operação com retry
   * @param {Function} fn - Função async a executar
   * @param {Object} options - Opções específicas desta chamada
   * @returns {Promise<any>}
   */
  async execute(fn, options = {}) {
    const maxAttempts = options.maxAttempts || this.maxAttempts;
    const onRetry = options.onRetry || (() => {});
    const shouldRetry = options.shouldRetry || this._defaultShouldRetry;

    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn(attempt);
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
          throw error;
        }

        const delay = this._calculateDelay(attempt);
        this.logger.aviso(
          `[Retry] Tentativa ${attempt}/${maxAttempts} falhou. ` +
          `Aguardando ${delay}ms. Erro: ${error.message}`
        );

        onRetry(error, attempt, delay);
        await this._sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Calcula delay com backoff exponencial e jitter
   */
  _calculateDelay(attempt) {
    // Exponential backoff: initialDelay * (factor ^ (attempt - 1))
    let delay = this.initialDelay * Math.pow(this.factor, attempt - 1);
    
    // Limita ao maxDelay
    delay = Math.min(delay, this.maxDelay);

    // Adiciona jitter para evitar thundering herd
    if (this.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * Sleep helper
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Política padrão de retry
   */
  _defaultShouldRetry(error, attempt) {
    // Não retenta erros de validação
    if (error.message?.includes('validation')) return false;
    if (error.message?.includes('invalid')) return false;

    // Retenta erros de rede
    if (error.code === 'ECONNREFUSED') return true;
    if (error.code === 'ETIMEDOUT') return true;
    if (error.code === 'ENOTFOUND') return true;

    // Retenta erros 5xx
    if (error.status >= 500 && error.status < 600) return true;

    // Retenta rate limit com backoff
    if (error.status === 429) return true;

    return false;
  }

  /**
   * Cria política específica para network
   */
  static network() {
    return new RetryPolicy({
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      factor: 2,
      jitter: true
    });
  }

  /**
   * Cria política específica para WhatsApp
   */
  static whatsapp() {
    return new RetryPolicy({
      maxAttempts: 3,
      initialDelay: 2000,
      maxDelay: 10000,
      factor: 2,
      jitter: true
    });
  }

  /**
   * Cria política específica para operações críticas
   */
  static critical() {
    return new RetryPolicy({
      maxAttempts: 10,
      initialDelay: 500,
      maxDelay: 60000,
      factor: 2,
      jitter: true
    });
  }

  /**
   * Sem retry (execução única)
   */
  static none() {
    return new RetryPolicy({
      maxAttempts: 1,
      initialDelay: 0,
      maxDelay: 0,
      factor: 1,
      jitter: false
    });
  }
}

module.exports = RetryPolicy;
