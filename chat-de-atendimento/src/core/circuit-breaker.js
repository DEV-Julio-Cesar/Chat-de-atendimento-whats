// src/core/circuit-breaker.js
// Circuit Breaker pattern para proteger contra falhas em cascata

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minuto
    this.resetTimeout = options.resetTimeout || 30000; // 30 segundos
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.logger = require('../infraestrutura/logger');
  }

  /**
   * Executa uma função protegida pelo circuit breaker
   * @param {Function} fn - Função async a ser executada
   * @returns {Promise<any>}
   */
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker is OPEN. Next attempt at ${new Date(this.nextAttempt).toISOString()}`);
      }
      // Tenta half-open
      this.state = 'HALF_OPEN';
      this.logger.aviso('[CircuitBreaker] Entrando em estado HALF_OPEN');
    }

    try {
      const result = await this._executeWithTimeout(fn);
      this._onSuccess();
      return result;
    } catch (erro) {
      this._onFailure();
      throw erro;
    }
  }

  /**
   * Executa função com timeout
   */
  async _executeWithTimeout(fn) {
    return Promise.race([
      fn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Circuit breaker timeout')), this.timeout)
      )
    ]);
  }

  /**
   * Registra sucesso
   */
  _onSuccess() {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successes = 0;
        this.logger.sucesso('[CircuitBreaker] Circuit breaker FECHADO');
      }
    }
  }

  /**
   * Registra falha
   */
  _onFailure() {
    this.failures++;
    this.successes = 0;

    if (this.state === 'HALF_OPEN' || this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      this.logger.erro(`[CircuitBreaker] Circuit breaker ABERTO. Próxima tentativa: ${new Date(this.nextAttempt).toISOString()}`);
    }
  }

  /**
   * Obtém estado atual
   */
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.nextAttempt,
      isOpen: this.state === 'OPEN'
    };
  }

  /**
   * Reseta manualmente o circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.logger.info('[CircuitBreaker] Circuit breaker resetado manualmente');
  }

  /**
   * Força abertura do circuit breaker
   */
  forceOpen() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.resetTimeout;
    this.logger.aviso('[CircuitBreaker] Circuit breaker forçado ABERTO');
  }
}

module.exports = CircuitBreaker;
