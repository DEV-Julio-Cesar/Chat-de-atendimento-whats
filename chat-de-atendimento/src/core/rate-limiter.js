// src/core/rate-limiter.js
// Rate limiting simples baseado em sliding window

class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map(); // ip -> [timestamps]
  }

  /**
   * Verifica se o IP pode fazer a requisição
   * @param {string} identifier - IP ou identificador único
   * @returns {boolean}
   */
  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, [now]);
      return true;
    }

    // Remove timestamps fora da janela
    const timestamps = this.requests.get(identifier).filter(t => t > windowStart);
    
    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    timestamps.push(now);
    this.requests.set(identifier, timestamps);
    return true;
  }

  /**
   * Obtém informações sobre o rate limit
   * @param {string} identifier
   * @returns {Object}
   */
  getStatus(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = this.requests.get(identifier) || [];
    const validTimestamps = timestamps.filter(t => t > windowStart);
    
    return {
      remaining: Math.max(0, this.maxRequests - validTimestamps.length),
      limit: this.maxRequests,
      resetAt: validTimestamps.length > 0 ? validTimestamps[0] + this.windowMs : now + this.windowMs
    };
  }

  /**
   * Limpa requisições antigas periodicamente
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter(t => t > windowStart);
      if (valid.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, valid);
      }
    }
  }

  /**
   * Reseta rate limit para um identificador
   */
  reset(identifier) {
    this.requests.delete(identifier);
  }
}

// Instâncias pré-configuradas
const apiLimiter = new RateLimiter(100, 60000); // 100 req/min
const authLimiter = new RateLimiter(5, 300000); // 5 req/5min (login)
const messageLimiter = new RateLimiter(50, 60000); // 50 msg/min

// Cleanup a cada 5 minutos
setInterval(() => {
  apiLimiter.cleanup();
  authLimiter.cleanup();
  messageLimiter.cleanup();
}, 300000);

module.exports = {
  RateLimiter,
  apiLimiter,
  authLimiter,
  messageLimiter
};
