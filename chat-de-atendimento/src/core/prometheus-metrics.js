// src/core/prometheus-metrics.js
// Métricas no formato Prometheus para observabilidade

class PrometheusMetrics {
  constructor() {
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
  }

  // Incrementa contador
  incrementCounter(name, labels = {}, value = 1) {
    const key = this._makeKey(name, labels);
    const current = this.counters.get(key) || { name, labels, value: 0 };
    current.value += value;
    this.counters.set(key, current);
  }

  // Define gauge (valor atual)
  setGauge(name, labels = {}, value) {
    const key = this._makeKey(name, labels);
    this.gauges.set(key, { name, labels, value });
  }

  // Registra observação em histograma
  observeHistogram(name, labels = {}, value) {
    const key = this._makeKey(name, labels);
    const hist = this.histograms.get(key) || { name, labels, observations: [], sum: 0, count: 0 };
    hist.observations.push(value);
    hist.sum += value;
    hist.count++;
    this.histograms.set(key, hist);
  }

  // Gera chave única para métrica + labels
  _makeKey(name, labels) {
    const labelStr = Object.entries(labels).sort().map(([k, v]) => `${k}="${v}"`).join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  // Formata labels para output Prometheus
  _formatLabels(labels) {
    if (!labels || Object.keys(labels).length === 0) return '';
    const pairs = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
    return `{${pairs.join(',')}}`;
  }

  // Exporta métricas no formato Prometheus
  export() {
    const lines = [];
    
    // Counters
    const counterGroups = new Map();
    for (const metric of this.counters.values()) {
      if (!counterGroups.has(metric.name)) counterGroups.set(metric.name, []);
      counterGroups.get(metric.name).push(metric);
    }
    for (const [name, metrics] of counterGroups) {
      lines.push(`# HELP ${name} Total count`);
      lines.push(`# TYPE ${name} counter`);
      for (const m of metrics) {
        lines.push(`${name}${this._formatLabels(m.labels)} ${m.value}`);
      }
    }

    // Gauges
    const gaugeGroups = new Map();
    for (const metric of this.gauges.values()) {
      if (!gaugeGroups.has(metric.name)) gaugeGroups.set(metric.name, []);
      gaugeGroups.get(metric.name).push(metric);
    }
    for (const [name, metrics] of gaugeGroups) {
      lines.push(`# HELP ${name} Current value`);
      lines.push(`# TYPE ${name} gauge`);
      for (const m of metrics) {
        lines.push(`${name}${this._formatLabels(m.labels)} ${m.value}`);
      }
    }

    // Histograms (simplificado: sum, count)
    const histGroups = new Map();
    for (const metric of this.histograms.values()) {
      if (!histGroups.has(metric.name)) histGroups.set(metric.name, []);
      histGroups.get(metric.name).push(metric);
    }
    for (const [name, metrics] of histGroups) {
      lines.push(`# HELP ${name} Histogram`);
      lines.push(`# TYPE ${name} histogram`);
      for (const m of metrics) {
        const labelStr = this._formatLabels(m.labels);
        lines.push(`${name}_sum${labelStr} ${m.sum}`);
        lines.push(`${name}_count${labelStr} ${m.count}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  // Reseta todas as métricas
  reset() {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

module.exports = new PrometheusMetrics();
