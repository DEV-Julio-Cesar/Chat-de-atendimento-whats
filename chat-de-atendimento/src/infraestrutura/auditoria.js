// src/infraestrutura/auditoria.js
// Registro de eventos de auditoria em arquivo texto estruturado JSON lines.

const fs = require('fs');
const path = require('path');
const AUDIT_PATH = path.join(__dirname, '..', 'dados', 'auditoria.log');

function logAudit(event, { user = null, details = null } = {}) {
  const registro = {
    timestamp: new Date().toISOString(),
    event,
    user,
    details
  };
  try {
    fs.appendFileSync(AUDIT_PATH, JSON.stringify(registro) + '\n');
  } catch (e) {
    console.error('[AUDIT] Falha ao registrar evento:', e.message);
  }
}

module.exports = { logAudit };
