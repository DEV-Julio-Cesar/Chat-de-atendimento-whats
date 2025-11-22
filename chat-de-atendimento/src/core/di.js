// src/core/di.js
// Contêiner simples de Injeção de Dependências
// Uso:
//   const di = require('./src/core/di');
//   di.register('logger', loggerInstance);
//   const logger = di.get('logger');

const registry = new Map();

function register(name, value) {
  if (!name) throw new Error('Nome da dependência obrigatório');
  if (registry.has(name)) {
    console.warn(`[DI] Sobrescrevendo dependência existente: ${name}`);
  }
  registry.set(name, value);
}

function get(name) {
  if (!registry.has(name)) {
    throw new Error(`[DI] Dependência não registrada: ${name}`);
  }
  return registry.get(name);
}

function has(name) {
  return registry.has(name);
}

module.exports = { register, get, has };
