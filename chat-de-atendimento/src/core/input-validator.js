// src/core/input-validator.js
// Validação e sanitização de inputs para segurança

class InputValidator {
  /**
   * Valida e sanitiza número de telefone WhatsApp
   * @param {string} phone - Número de telefone
   * @returns {Object} { valid: boolean, sanitized: string, error?: string }
   */
  static validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return { valid: false, error: 'Telefone inválido' };
    }

    // Remove caracteres não numéricos
    const sanitized = phone.replace(/\D/g, '');

    // Valida comprimento (mínimo 10, máximo 15 dígitos)
    if (sanitized.length < 10 || sanitized.length > 15) {
      return { valid: false, error: 'Telefone deve ter entre 10 e 15 dígitos' };
    }

    // Formato WhatsApp: número@c.us ou número@g.us
    const whatsappFormat = sanitized.includes('@') ? sanitized : `${sanitized}@c.us`;

    return { valid: true, sanitized: whatsappFormat };
  }

  /**
   * Valida mensagem de texto
   * @param {string} text - Texto da mensagem
   * @returns {Object}
   */
  static validateMessage(text) {
    if (!text || typeof text !== 'string') {
      return { valid: false, error: 'Mensagem inválida' };
    }

    const trimmed = text.trim();

    if (trimmed.length === 0) {
      return { valid: false, error: 'Mensagem não pode estar vazia' };
    }

    if (trimmed.length > 5000) {
      return { valid: false, error: 'Mensagem muito longa (máx 5000 caracteres)' };
    }

    // Remove caracteres de controle perigosos
    const sanitized = trimmed.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    return { valid: true, sanitized };
  }

  /**
   * Valida email
   * @param {string} email
   * @returns {Object}
   */
  static validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email inválido' };
    }

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: 'Formato de email inválido' };
    }

    if (trimmed.length > 255) {
      return { valid: false, error: 'Email muito longo' };
    }

    return { valid: true, sanitized: trimmed };
  }

  /**
   * Valida username (alfanumérico, underscore, hífen)
   * @param {string} username
   * @returns {Object}
   */
  static validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { valid: false, error: 'Username inválido' };
    }

    const trimmed = username.trim();

    if (trimmed.length < 3 || trimmed.length > 30) {
      return { valid: false, error: 'Username deve ter entre 3 e 30 caracteres' };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return { valid: false, error: 'Username só pode conter letras, números, _ e -' };
    }

    return { valid: true, sanitized: trimmed };
  }

  /**
   * Valida senha
   * @param {string} password
   * @param {Object} options - Opções de validação
   * @returns {Object}
   */
  static validatePassword(password, options = {}) {
    const minLength = options.minLength || 8;
    const requireUppercase = options.requireUppercase !== false;
    const requireLowercase = options.requireLowercase !== false;
    const requireNumbers = options.requireNumbers !== false;
    const requireSpecial = options.requireSpecial !== false;

    if (!password || typeof password !== 'string') {
      return { valid: false, error: 'Senha inválida' };
    }

    if (password.length < minLength) {
      return { valid: false, error: `Senha deve ter no mínimo ${minLength} caracteres` };
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
      return { valid: false, error: 'Senha deve conter pelo menos uma letra maiúscula' };
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      return { valid: false, error: 'Senha deve conter pelo menos uma letra minúscula' };
    }

    if (requireNumbers && !/\d/.test(password)) {
      return { valid: false, error: 'Senha deve conter pelo menos um número' };
    }

    if (requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, error: 'Senha deve conter pelo menos um caractere especial' };
    }

    return { valid: true };
  }

  /**
   * Sanitiza HTML para prevenir XSS
   * @param {string} html
   * @returns {string}
   */
  static sanitizeHtml(html) {
    if (!html || typeof html !== 'string') return '';
    
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Valida client ID
   * @param {string} clientId
   * @returns {Object}
   */
  static validateClientId(clientId) {
    if (!clientId || typeof clientId !== 'string') {
      return { valid: false, error: 'Client ID inválido' };
    }

    const trimmed = clientId.trim();

    if (trimmed.length < 1 || trimmed.length > 50) {
      return { valid: false, error: 'Client ID deve ter entre 1 e 50 caracteres' };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return { valid: false, error: 'Client ID só pode conter letras, números, _ e -' };
    }

    return { valid: true, sanitized: trimmed };
  }

  /**
   * Valida objeto genérico (previne prototype pollution)
   * @param {any} obj
   * @returns {boolean}
   */
  static isSafeObject(obj) {
    if (obj === null || typeof obj !== 'object') return false;
    
    // Verifica propriedades perigosas
    const dangerousProps = ['__proto__', 'constructor', 'prototype'];
    for (const prop of dangerousProps) {
      if (prop in obj) return false;
    }
    
    return true;
  }

  /**
   * Sanitiza objeto removendo propriedades perigosas
   * @param {Object} obj
   * @returns {Object}
   */
  static sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return {};
    
    const sanitized = {};
    const dangerousProps = ['__proto__', 'constructor', 'prototype'];
    
    for (const [key, value] of Object.entries(obj)) {
      if (!dangerousProps.includes(key)) {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

module.exports = InputValidator;
