// src/core/cache.js
// Cache simples com TTL (Time-To-Live).

class SimpleCache {
  constructor() {
    this.storage = new Map();
  }

  set(key, value, ttlMs = 60000) {
    const expiresAt = Date.now() + ttlMs;
    this.storage.set(key, { value, expiresAt });
  }

  get(key) {
    const entry = this.storage.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.storage.delete(key);
      return null;
    }
    return entry.value;
  }

  clear() {
    this.storage.clear();
  }

  has(key) {
    return this.get(key) !== null;
  }
}

module.exports = new SimpleCache();
