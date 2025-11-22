const fs = require('fs-extra');
const path = require('path');
const logger = require('../infraestrutura/logger');

const FILE = path.join(__dirname, '../../dados/mensagens-rapidas.json');
const METRICS_FILE = path.join(__dirname, '../../dados/mensagens-rapidas-metrics.json');

async function carregarTodas() {
  try {
    await fs.ensureFile(FILE);
    const conteudo = await fs.readFile(FILE, 'utf-8');
    if (!conteudo.trim()) {
      await fs.writeJson(FILE, [], { spaces: 2 });
      return [];
    }
    return await fs.readJson(FILE);
  } catch (erro) {
    logger.erro('[Mensagens Rápidas] Falha ao carregar:', erro.message);
    return [];
  }
}

async function obterPorCodigo(codigo) {
  const lista = await carregarTodas();
  return lista.find(m => m.codigo.toLowerCase() === codigo.toLowerCase()) || null;
}

async function adicionarMensagem(codigo, texto) {
  const lista = await carregarTodas();
  if (lista.some(m => m.codigo.toLowerCase() === codigo.toLowerCase())) {
    return { success: false, message: 'Código já existente' };
  }
  lista.push({ codigo, texto });
  await fs.writeJson(FILE, lista, { spaces: 2 });
  return { success: true };
}

async function removerMensagem(codigo) {
  let lista = await carregarTodas();
  const original = lista.length;
  lista = lista.filter(m => m.codigo.toLowerCase() !== codigo.toLowerCase());
  await fs.writeJson(FILE, lista, { spaces: 2 });
  return { success: lista.length !== original };
}

module.exports = {
  carregarTodas,
  obterPorCodigo,
  adicionarMensagem,
  removerMensagem,
  registrarUso,
  obterMetricas,
  resetMetricas
};

async function garantirMetrics() {
  await fs.ensureFile(METRICS_FILE);
  const conteudo = await fs.readFile(METRICS_FILE, 'utf-8');
  if (!conteudo.trim()) {
    await fs.writeJson(METRICS_FILE, { usos: {} }, { spaces: 2 });
  }
}

async function obterMetricas() {
  try {
    await garantirMetrics();
    return await fs.readJson(METRICS_FILE);
  } catch (e) {
    logger.erro('[Mensagens Rápidas] Falha métricas:', e.message);
    return { usos: {} };
  }
}

async function registrarUso(codigo) {
  try {
    await garantirMetrics();
    const data = await fs.readJson(METRICS_FILE);
    if (!data.usos) data.usos = {};
    if (!data.usos[codigo]) {
      data.usos[codigo] = { count: 0, lastUsed: null };
    }
    data.usos[codigo].count += 1;
    data.usos[codigo].lastUsed = new Date().toISOString();
    await fs.writeJson(METRICS_FILE, data, { spaces: 2 });
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

async function resetMetricas() {
  try {
    await fs.writeJson(METRICS_FILE, { usos: {} }, { spaces: 2 });
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
