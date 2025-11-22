// src/core/config-manager.js
// Gerenciador centralizado de configurações com validação

const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.config = {};
    this.configPath = path.join(process.cwd(), 'config.json');
    this.defaultConfig = {
      app: {
        name: 'Chat de Atendimento WhatsApp',
        version: '1.0.0',
        port: 3333,
        environment: 'production'
      },
      whatsapp: {
        maxClients: 10,
        sessionPath: '.wwebjs_auth',
        qrTimeout: 60000,
        messageQueueMaxSize: 1000,
        retryAttempts: 5
      },
      api: {
        rateLimit: {
          general: { maxRequests: 100, windowMs: 60000 },
          auth: { maxRequests: 5, windowMs: 300000 },
          messages: { maxRequests: 50, windowMs: 60000 }
        },
        cors: {
          enabled: true,
          origins: ['*']
        }
      },
      cache: {
        enabled: true,
        defaultTTL: 60000,
        chats: { ttl: 30000 },
        contacts: { ttl: 300000 }
      },
      circuitBreaker: {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000,
        resetTimeout: 30000
      },
      security: {
        passwordMinLength: 8,
        requireStrongPassword: true,
        sessionTimeout: 86400000, // 24h
        maxLoginAttempts: 5
      },
      logging: {
        level: 'info', // debug, info, warning, error
        console: true,
        file: true,
        maxFileSize: 10485760, // 10MB
        maxFiles: 5
      },
      monitoring: {
        enabled: true,
        metricsPort: 3334,
        healthCheckInterval: 30000,
        performanceMonitoring: true
      },
      backup: {
        enabled: true,
        interval: 86400000, // 24h
        maxBackups: 7,
        includeChats: false
      }
    };
    
    this.logger = null; // Lazy load para evitar circular dependency
  }

  /**
   * Carrega configuração
   */
  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.config = this._mergeDeep(this.defaultConfig, fileConfig);
        this._getLogger().sucesso('[Config] Configuração carregada de config.json');
      } else {
        this.config = { ...this.defaultConfig };
        this.save(); // Cria arquivo com defaults
        this._getLogger().info('[Config] Usando configuração padrão');
      }

      // Valida configuração
      this._validate();
      
      // Aplica variáveis de ambiente (sobrescrevem config.json)
      this._loadFromEnv();

      return this.config;
    } catch (error) {
      this._getLogger().erro('[Config] Erro ao carregar configuração:', error);
      this.config = { ...this.defaultConfig };
      return this.config;
    }
  }

  /**
   * Salva configuração
   */
  save() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      this._getLogger().sucesso('[Config] Configuração salva em config.json');
      return true;
    } catch (error) {
      this._getLogger().erro('[Config] Erro ao salvar configuração:', error);
      return false;
    }
  }

  /**
   * Obtém valor de configuração
   */
  get(path, defaultValue) {
    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Define valor de configuração
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let obj = this.config;

    for (const key of keys) {
      if (!(key in obj) || typeof obj[key] !== 'object') {
        obj[key] = {};
      }
      obj = obj[key];
    }

    obj[lastKey] = value;
    this._getLogger().info(`[Config] ${path} = ${JSON.stringify(value)}`);
  }

  /**
   * Valida configuração
   */
  _validate() {
    const errors = [];

    // Valida porta
    if (this.config.app.port < 1024 || this.config.app.port > 65535) {
      errors.push('app.port deve estar entre 1024 e 65535');
    }

    // Valida rate limits
    if (this.config.api.rateLimit.general.maxRequests < 1) {
      errors.push('api.rateLimit.general.maxRequests deve ser >= 1');
    }

    // Valida TTLs de cache
    if (this.config.cache.defaultTTL < 1000) {
      errors.push('cache.defaultTTL deve ser >= 1000ms');
    }

    // Valida limites WhatsApp
    if (this.config.whatsapp.maxClients < 1 || this.config.whatsapp.maxClients > 50) {
      errors.push('whatsapp.maxClients deve estar entre 1 e 50');
    }

    if (errors.length > 0) {
      this._getLogger().aviso('[Config] Erros de validação:', errors);
      throw new Error(`Configuração inválida: ${errors.join(', ')}`);
    }

    this._getLogger().sucesso('[Config] Configuração validada com sucesso');
  }

  /**
   * Carrega configurações de variáveis de ambiente
   */
  _loadFromEnv() {
    const envMappings = {
      'NODE_ENV': 'app.environment',
      'PORT': 'app.port',
      'MAX_CLIENTS': 'whatsapp.maxClients',
      'RATE_LIMIT_GENERAL': 'api.rateLimit.general.maxRequests',
      'CACHE_TTL': 'cache.defaultTTL',
      'LOG_LEVEL': 'logging.level'
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      if (process.env[envVar]) {
        const value = this._parseEnvValue(process.env[envVar]);
        this.set(configPath, value);
        this._getLogger().debug(`[Config] ${configPath} = ${value} (from ${envVar})`);
      }
    }
  }

  /**
   * Parse valor de env var
   */
  _parseEnvValue(value) {
    // Tenta número
    if (!isNaN(value)) {
      return Number(value);
    }

    // Tenta boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Retorna string
    return value;
  }

  /**
   * Merge profundo de objetos
   */
  _mergeDeep(target, source) {
    const output = { ...target };
    
    if (this._isObject(target) && this._isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this._isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this._mergeDeep(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }

    return output;
  }

  /**
   * Verifica se é objeto
   */
  _isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Lazy load logger
   */
  _getLogger() {
    if (!this.logger) {
      this.logger = require('../infraestrutura/logger');
    }
    return this.logger;
  }

  /**
   * Reseta para configuração padrão
   */
  reset() {
    this.config = { ...this.defaultConfig };
    this.save();
    this._getLogger().info('[Config] Configuração resetada para padrão');
  }

  /**
   * Obtém toda configuração
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Exporta configuração para JSON
   */
  export() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Importa configuração de JSON
   */
  import(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this.config = this._mergeDeep(this.defaultConfig, imported);
      this._validate();
      this.save();
      this._getLogger().sucesso('[Config] Configuração importada com sucesso');
      return true;
    } catch (error) {
      this._getLogger().erro('[Config] Erro ao importar configuração:', error);
      return false;
    }
  }
}

module.exports = new ConfigManager();
