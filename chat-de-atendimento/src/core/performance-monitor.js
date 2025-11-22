// src/core/performance-monitor.js
// Monitor de performance para identificar gargalos

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.logger = require('../infraestrutura/logger');
    this.prometheus = require('./prometheus-metrics');
  }

  /**
   * Inicia medição de performance
   * @param {string} operationName - Nome da operação
   * @returns {Function} finish - Função para finalizar medição
   */
  start(operationName) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    return () => {
      const duration = Date.now() - startTime;
      const memoryDelta = process.memoryUsage().heapUsed - startMemory;

      this.record(operationName, duration, memoryDelta);
      return { duration, memoryDelta };
    };
  }

  /**
   * Registra métrica de performance
   */
  record(operationName, duration, memoryDelta = 0) {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0,
        totalMemory: 0,
        p95: [],
        p99: []
      });
    }

    const metric = this.metrics.get(operationName);
    metric.count++;
    metric.totalDuration += duration;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.avgDuration = metric.totalDuration / metric.count;
    metric.totalMemory += memoryDelta;

    // Mantém últimas 100 medições para percentis
    metric.p95.push(duration);
    metric.p99.push(duration);
    if (metric.p95.length > 100) metric.p95.shift();
    if (metric.p99.length > 100) metric.p99.shift();

    // Log se operação demorou muito
    if (duration > 5000) {
      this.logger.aviso(`[Performance] ${operationName} demorou ${duration}ms`);
    }

    // Envia para Prometheus
    this.prometheus.observeHistogram('operation_duration_ms', { operation: operationName }, duration);
    this.prometheus.incrementCounter('operation_count_total', { operation: operationName });
  }

  /**
   * Decorator para funções async
   */
  measure(operationName) {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args) {
        const finish = this.start(operationName);
        try {
          const result = await originalMethod.apply(this, args);
          finish();
          return result;
        } catch (error) {
          finish();
          throw error;
        }
      };

      return descriptor;
    };
  }

  /**
   * Wrapper para funções
   */
  wrap(operationName, fn) {
    return async (...args) => {
      const finish = this.start(operationName);
      try {
        const result = await fn(...args);
        finish();
        return result;
      } catch (error) {
        finish();
        throw error;
      }
    };
  }

  /**
   * Calcula percentil
   */
  _calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Obtém estatísticas de uma operação
   */
  getStats(operationName) {
    const metric = this.metrics.get(operationName);
    if (!metric) return null;

    return {
      operation: operationName,
      count: metric.count,
      avgDuration: Math.round(metric.avgDuration),
      minDuration: metric.minDuration === Infinity ? 0 : metric.minDuration,
      maxDuration: metric.maxDuration,
      p95Duration: this._calculatePercentile(metric.p95, 95),
      p99Duration: this._calculatePercentile(metric.p99, 99),
      totalMemoryDelta: metric.totalMemory,
      avgMemoryDelta: Math.round(metric.totalMemory / metric.count)
    };
  }

  /**
   * Obtém todas as estatísticas
   */
  getAllStats() {
    const stats = [];
    for (const [operationName] of this.metrics) {
      stats.push(this.getStats(operationName));
    }
    return stats.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /**
   * Reseta métricas
   */
  reset(operationName) {
    if (operationName) {
      this.metrics.delete(operationName);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Gera relatório de performance
   */
  report() {
    const stats = this.getAllStats();
    
    this.logger.info('=== Performance Report ===');
    stats.forEach(stat => {
      this.logger.info(
        `${stat.operation}: ${stat.count} calls, ` +
        `avg ${stat.avgDuration}ms, ` +
        `p95 ${stat.p95Duration}ms, ` +
        `max ${stat.maxDuration}ms`
      );
    });
    this.logger.info('========================');

    return stats;
  }

  /**
   * Monitora event loop lag
   */
  startEventLoopMonitoring(intervalMs = 1000) {
    let lastCheck = Date.now();

    const check = () => {
      const now = Date.now();
      const lag = now - lastCheck - intervalMs;
      lastCheck = now;

      if (lag > 100) {
        this.logger.aviso(`[Performance] Event loop lag: ${lag}ms`);
      }

      this.prometheus.setGauge('event_loop_lag_ms', {}, lag);
    };

    setInterval(check, intervalMs);
  }
}

module.exports = new PerformanceMonitor();
