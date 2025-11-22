// src/core/feature-flags.js
// Sistema de feature flags para habilitar/desabilitar funcionalidades

const fs = require('fs');
const path = require('path');

class FeatureFlags {
  constructor() {
    this.flags = new Map();
    this.flagsPath = path.join(process.cwd(), 'dados', 'feature-flags.json');
    this.logger = null;
    this.defaultFlags = {
      // Features de desenvolvimento
      'dev.debug-mode': { enabled: false, description: 'Modo debug avançado' },
      'dev.performance-logs': { enabled: false, description: 'Logs de performance detalhados' },
      
      // Features de WhatsApp
      'whatsapp.multi-device': { enabled: true, description: 'Suporte a múltiplos dispositivos' },
      'whatsapp.auto-reconnect': { enabled: true, description: 'Reconexão automática' },
      'whatsapp.message-queue': { enabled: true, description: 'Fila de mensagens' },
      'whatsapp.media-support': { enabled: true, description: 'Suporte a mídia' },
      
      // Features de segurança
      'security.rate-limiting': { enabled: true, description: 'Rate limiting na API' },
      'security.audit-log': { enabled: true, description: 'Log de auditoria' },
      'security.2fa': { enabled: false, description: 'Autenticação de 2 fatores' },
      
      // Features de UX
      'ux.toast-notifications': { enabled: true, description: 'Notificações toast' },
      'ux.loading-states': { enabled: true, description: 'Estados de loading' },
      'ux.dark-mode': { enabled: true, description: 'Tema escuro' },
      'ux.keyboard-shortcuts': { enabled: false, description: 'Atalhos de teclado' },
      
      // Features de monitoramento
      'monitoring.metrics': { enabled: true, description: 'Métricas Prometheus' },
      'monitoring.health-check': { enabled: true, description: 'Health check endpoint' },
      'monitoring.performance': { enabled: true, description: 'Performance monitoring' },
      
      // Features experimentais
      'experimental.ai-chatbot': { enabled: false, description: 'Chatbot com IA' },
      'experimental.voice-messages': { enabled: false, description: 'Mensagens de voz' },
      'experimental.message-scheduler': { enabled: false, description: 'Agendamento de mensagens' },
      
      // Features de cache
      'cache.chats': { enabled: true, description: 'Cache de conversas' },
      'cache.contacts': { enabled: true, description: 'Cache de contatos' },
      'cache.messages': { enabled: false, description: 'Cache de mensagens' },
      
      // Features de backup
      'backup.auto': { enabled: true, description: 'Backup automático' },
      'backup.cloud': { enabled: false, description: 'Backup em nuvem' }
    };
    
    this.load();
  }

  /**
   * Carrega feature flags
   */
  load() {
    try {
      if (fs.existsSync(this.flagsPath)) {
        const data = JSON.parse(fs.readFileSync(this.flagsPath, 'utf8'));
        
        // Merge com defaults (adiciona novas flags)
        for (const [key, value] of Object.entries(this.defaultFlags)) {
          if (!data[key]) {
            data[key] = value;
          }
        }
        
        for (const [key, value] of Object.entries(data)) {
          this.flags.set(key, value);
        }
      } else {
        // Usa defaults
        for (const [key, value] of Object.entries(this.defaultFlags)) {
          this.flags.set(key, value);
        }
        this.save();
      }
    } catch (error) {
      this._getLogger().erro('[FeatureFlags] Erro ao carregar:', error);
      // Fallback para defaults
      for (const [key, value] of Object.entries(this.defaultFlags)) {
        this.flags.set(key, value);
      }
    }
  }

  /**
   * Salva feature flags
   */
  save() {
    try {
      const dir = path.dirname(this.flagsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {};
      for (const [key, value] of this.flags) {
        data[key] = value;
      }

      fs.writeFileSync(this.flagsPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      this._getLogger().erro('[FeatureFlags] Erro ao salvar:', error);
    }
  }

  /**
   * Verifica se feature está habilitada
   * @param {string} flagName - Nome da flag
   * @returns {boolean}
   */
  isEnabled(flagName) {
    const flag = this.flags.get(flagName);
    if (!flag) {
      this._getLogger().aviso(`[FeatureFlags] Flag desconhecida: ${flagName}`);
      return false;
    }
    return flag.enabled === true;
  }

  /**
   * Habilita feature
   * @param {string} flagName
   */
  enable(flagName) {
    const flag = this.flags.get(flagName);
    if (flag) {
      flag.enabled = true;
      this.flags.set(flagName, flag);
      this.save();
      this._getLogger().info(`[FeatureFlags] Habilitado: ${flagName}`);
    }
  }

  /**
   * Desabilita feature
   * @param {string} flagName
   */
  disable(flagName) {
    const flag = this.flags.get(flagName);
    if (flag) {
      flag.enabled = false;
      this.flags.set(flagName, flag);
      this.save();
      this._getLogger().info(`[FeatureFlags] Desabilitado: ${flagName}`);
    }
  }

  /**
   * Toggle feature
   * @param {string} flagName
   */
  toggle(flagName) {
    const flag = this.flags.get(flagName);
    if (flag) {
      flag.enabled = !flag.enabled;
      this.flags.set(flagName, flag);
      this.save();
      this._getLogger().info(`[FeatureFlags] ${flagName} = ${flag.enabled}`);
    }
  }

  /**
   * Obtém todas as flags
   */
  getAll() {
    const result = {};
    for (const [key, value] of this.flags) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Obtém todas as flags como array
   */
  getAllFlags() {
    const result = [];
    for (const [name, flag] of this.flags) {
      result.push({
        name,
        enabled: flag.enabled,
        description: flag.description
      });
    }
    return result;
  }

  /**
   * Obtém flags por categoria
   */
  getByCategory(category) {
    const result = {};
    for (const [key, value] of this.flags) {
      if (key.startsWith(category + '.')) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Verifica se há flags experimentais habilitadas
   */
  hasExperimentalEnabled() {
    for (const [key, value] of this.flags) {
      if (key.startsWith('experimental.') && value.enabled) {
        return true;
      }
    }
    return false;
  }

  /**
   * Wrapper condicional
   */
  when(flagName, trueFn, falseFn = () => {}) {
    if (this.isEnabled(flagName)) {
      return trueFn();
    } else {
      return falseFn();
    }
  }

  /**
   * Wrapper async condicional
   */
  async whenAsync(flagName, trueFn, falseFn = async () => {}) {
    if (this.isEnabled(flagName)) {
      return await trueFn();
    } else {
      return await falseFn();
    }
  }

  /**
   * Middleware Express para feature flags
   */
  middleware(flagName) {
    return (req, res, next) => {
      if (this.isEnabled(flagName)) {
        next();
      } else {
        res.status(503).json({
          error: 'Feature Unavailable',
          message: 'This feature is currently disabled',
          feature: flagName
        });
      }
    };
  }

  /**
   * Reseta para padrão
   */
  reset() {
    this.flags.clear();
    for (const [key, value] of Object.entries(this.defaultFlags)) {
      this.flags.set(key, value);
    }
    this.save();
    this._getLogger().info('[FeatureFlags] Resetado para padrão');
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
}

module.exports = new FeatureFlags();
