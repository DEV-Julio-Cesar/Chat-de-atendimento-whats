const fs = require('fs-extra');
const path = require('path');
const logger = require('../infraestrutura/logger');

const FILE = path.join(__dirname, '../../dados/atendimentos.json');

async function ensureFile() {
  await fs.ensureFile(FILE);
  try {
    await fs.readJson(FILE);
  } catch {
    await fs.writeJson(FILE, { atendentes: {}, chats: [] }, { spaces: 2 });
  }
}

async function load() {
  await ensureFile();
  return fs.readJson(FILE);
}

async function save(data) {
  await fs.writeJson(FILE, data, { spaces: 2 });
}

async function registrarAtendente(username) {
  const data = await load();
  data.atendentes[username] = data.atendentes[username] || { status: 'online', updatedAt: new Date().toISOString() };
  await save(data);
  return { success: true };
}

async function setStatus(username, status) {
  const data = await load();
  data.atendentes[username] = data.atendentes[username] || {};
  data.atendentes[username].status = status;
  data.atendentes[username].updatedAt = new Date().toISOString();
  await save(data);
  return { success: true };
}

async function assumirChat(username, clientId, chatId) {
  const data = await load();
  const exists = data.chats.find(c => c.clientId === clientId && c.chatId === chatId);
  if (exists && exists.username !== username) {
    return { success: false, message: `Já em atendimento por ${exists.username}` };
  }
  if (!exists) {
    data.chats.push({ clientId, chatId, username, since: new Date().toISOString() });
  } else {
    exists.username = username;
  }
  await save(data);
  logger.info(`[Atendimento] ${username} assumiu ${chatId} (${clientId})`);
  return { success: true };
}

async function liberarChat(username, clientId, chatId) {
  const data = await load();
  const i = data.chats.findIndex(c => c.clientId === clientId && c.chatId === chatId && c.username === username);
  if (i === -1) return { success: false, message: 'Atendimento não encontrado para este usuário' };
  data.chats.splice(i, 1);
  await save(data);
  logger.info(`[Atendimento] ${username} liberou ${chatId} (${clientId})`);
  return { success: true };
}

async function obterAtendimento(clientId, chatId) {
  const data = await load();
  const entry = data.chats.find(c => c.clientId === clientId && c.chatId === chatId);
  return { success: true, atendimento: entry || null };
}

async function listarAtendimentos() {
  const data = await load();
  return { success: true, ...data };
}

module.exports = {
  registrarAtendente,
  setStatus,
  assumirChat,
  liberarChat,
  obterAtendimento,
  listarAtendimentos
};