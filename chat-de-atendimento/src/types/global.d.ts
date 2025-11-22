// src/types/global.d.ts
// Declarações de tipos para módulos internos sem TypeScript

declare module '../infraestrutura/logger' {
  export function info(message: string, ...args: any[]): void;
  export function sucesso(message: string, ...args: any[]): void;
  export function aviso(message: string, ...args: any[]): void;
  export function erro(message: string, ...args: any[]): void;
  export function debug(message: string, ...args: any[]): void;
}

declare module '../core/cache' {
  export class SimpleCache {
    get(key: string): any;
    set(key: string, value: any, ttlMs?: number): void;
    has(key: string): boolean;
    clear(): void;
  }
  const cache: SimpleCache;
  export default cache;
}

declare module '../core/di' {
  export class DependencyInjection {
    register(name: string, value: any): void;
    get(name: string): any;
    has(name: string): boolean;
  }
  const di: DependencyInjection;
  export default di;
}

declare module '../core/message-queue' {
  export interface QueuedMessage {
    clientId: string;
    to: string;
    text: string;
    attempts?: number;
  }
  
  export class MessageQueue {
    enqueue(item: QueuedMessage): void;
    size(): number;
    process(sendFn: (msg: QueuedMessage) => Promise<boolean>): Promise<void>;
  }
  
  const queue: MessageQueue;
  export default queue;
}

declare module '../core/prometheus-metrics' {
  export interface Labels {
    [key: string]: string | number;
  }
  
  export class PrometheusMetrics {
    incrementCounter(name: string, labels?: Labels, value?: number): void;
    setGauge(name: string, labels: Labels, value: number): void;
    observeHistogram(name: string, labels: Labels, value: number): void;
    export(): string;
    reset(): void;
  }
  
  const metrics: PrometheusMetrics;
  export default metrics;
}

declare module '../security/permissions' {
  export type Role = 'admin' | 'supervisor' | 'agent' | 'viewer';
  export type Action = string;
  
  export function can(role: Role, action: Action): boolean;
}

declare module '../infraestrutura/auditoria' {
  export interface AuditDetails {
    user?: string;
    [key: string]: any;
  }
  
  export function logAudit(event: string, details: AuditDetails): void;
}
