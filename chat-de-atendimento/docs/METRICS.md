# 📊 Metrics Endpoint - Prometheus

## Visão Geral

O endpoint `/metrics` fornece métricas no formato Prometheus para observabilidade do sistema.

## Acesso

```
GET http://localhost:3333/metrics
Content-Type: text/plain; version=0.0.4
```

## Métricas Disponíveis

### 🔢 Counters (Contadores - Sempre crescem)

#### `http_requests_total`
Total de requisições HTTP recebidas.
```
http_requests_total{method="GET",path="/api/status"} 42
http_requests_total{method="POST",path="/api/messages"} 158
```

#### `http_responses_total`
Total de respostas HTTP por status code.
```
http_responses_total{method="GET",path="/api/status",status="200"} 42
http_responses_total{method="POST",path="/api/messages",status="400"} 3
```

#### `whatsapp_messages_sent_total`
Total de mensagens enviadas pelo WhatsApp.
```
whatsapp_messages_sent_total{clientId="client-001",status="success"} 145
whatsapp_messages_sent_total{clientId="client-001",status="error"} 3
```

#### `whatsapp_messages_received_total`
Total de mensagens recebidas no WhatsApp.
```
whatsapp_messages_received_total{clientId="client-001"} 89
```

#### `whatsapp_messages_queued_total`
Total de mensagens enfileiradas (quando cliente não está pronto).
```
whatsapp_messages_queued_total{clientId="client-001"} 12
```

#### `whatsapp_status_changes_total`
Total de mudanças de status dos clientes WhatsApp.
```
whatsapp_status_changes_total{clientId="client-001",from="authenticated",to="ready"} 1
whatsapp_status_changes_total{clientId="client-001",from="ready",to="disconnected"} 2
```

### 📏 Gauges (Valores atuais)

#### `whatsapp_clients_total`
Número total de clientes WhatsApp configurados.
```
whatsapp_clients_total 3
```

#### `whatsapp_clients_ready`
Número de clientes WhatsApp prontos para uso.
```
whatsapp_clients_ready 2
```

#### `whatsapp_clients_authenticated`
Número de clientes WhatsApp autenticados.
```
whatsapp_clients_authenticated 2
```

#### `message_queue_size`
Tamanho atual da fila de mensagens pendentes.
```
message_queue_size 5
```

#### `process_memory_bytes`
Uso de memória do processo Node.js.
```
process_memory_bytes{type="heap_used"} 52428800
process_memory_bytes{type="rss"} 104857600
```

#### `process_uptime_seconds`
Tempo de execução do processo em segundos.
```
process_uptime_seconds 3600
```

### 📊 Histograms (Distribuições)

#### `http_request_duration_ms`
Duração das requisições HTTP em milissegundos.
```
http_request_duration_ms_sum{method="GET",path="/api/status"} 845.3
http_request_duration_ms_count{method="GET",path="/api/status"} 42
```

## Exemplos de Uso

### cURL
```bash
curl http://localhost:3333/metrics
```

### Prometheus Configuration
```yaml
scrape_configs:
  - job_name: 'whatsapp-chat-system'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3333']
    metrics_path: '/metrics'
```

### Grafana Queries

**Taxa de mensagens por minuto:**
```promql
rate(whatsapp_messages_sent_total[5m]) * 60
```

**Percentual de mensagens com erro:**
```promql
rate(whatsapp_messages_sent_total{status="error"}[5m]) 
/ 
rate(whatsapp_messages_sent_total[5m]) * 100
```

**Latência média de requisições:**
```promql
rate(http_request_duration_ms_sum[5m]) 
/ 
rate(http_request_duration_ms_count[5m])
```

**Clientes disponíveis vs total:**
```promql
whatsapp_clients_ready / whatsapp_clients_total * 100
```

## Alertas Sugeridos

### Cliente WhatsApp Offline
```yaml
- alert: WhatsAppClientDown
  expr: whatsapp_clients_ready < whatsapp_clients_total
  for: 5m
  annotations:
    summary: "Cliente WhatsApp offline por mais de 5 minutos"
```

### Fila de mensagens crescendo
```yaml
- alert: MessageQueueGrowing
  expr: message_queue_size > 50
  for: 10m
  annotations:
    summary: "Fila de mensagens acima de 50 por mais de 10 minutos"
```

### Taxa de erro alta
```yaml
- alert: HighMessageErrorRate
  expr: |
    rate(whatsapp_messages_sent_total{status="error"}[5m])
    /
    rate(whatsapp_messages_sent_total[5m]) > 0.1
  for: 5m
  annotations:
    summary: "Taxa de erro de mensagens acima de 10%"
```

### Uso de memória alto
```yaml
- alert: HighMemoryUsage
  expr: process_memory_bytes{type="heap_used"} > 500000000
  for: 5m
  annotations:
    summary: "Uso de memória acima de 500MB"
```

## Arquitetura

### Implementação
- **Módulo**: `src/core/prometheus-metrics.js`
- **Endpoint**: `src/infraestrutura/api.js` - GET `/metrics`
- **Instrumentação**: 
  - Middleware HTTP em `api.js`
  - WhatsAppClientService (envio, recebimento, status)
  - Message Queue (enfileiramento)

### Formato
Seguimos o [formato de exposição Prometheus](https://prometheus.io/docs/instrumenting/exposition_formats/):
- Content-Type: `text/plain; version=0.0.4`
- Métricas em formato texto
- Comentários com `# HELP` e `# TYPE`
- Labels entre chaves `{key="value"}`

## Próximos Passos

1. **Grafana Dashboard**: Criar dashboard visual com métricas principais
2. **Alertmanager**: Configurar alertas e notificações
3. **Histórico**: Persistir métricas para análise temporal
4. **SLOs**: Definir Service Level Objectives (ex: 99% de mensagens entregues)
5. **Traces**: Adicionar OpenTelemetry para tracing distribuído

## Referências

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [Best Practices for Naming Metrics](https://prometheus.io/docs/practices/naming/)
