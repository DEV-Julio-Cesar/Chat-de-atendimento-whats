// src/aplicacao/ia-gemini.js
// Integração profissional com Google Gemini API para atendimento
const fetch = require('node-fetch');
const logger = require('../infraestrutura/logger');
const config = require('../../config/configuracoes-principais');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const GEMINI_API_KEY = config.geminiApiKey || process.env.GEMINI_API_KEY;

async function enviarPerguntaGemini({ mensagem, contexto = [] }) {
  if (!GEMINI_API_KEY) {
    logger.erro('[Gemini] Chave de API não configurada');
    return { success: false, message: 'Gemini API Key não configurada' };
  }
  try {
    const body = {
      contents: [
        ...contexto,
        { role: 'user', parts: [{ text: mensagem }] }
      ]
    };
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeout: 15000
    });
    if (!res.ok) {
      logger.erro('[Gemini] Erro HTTP', res.status, await res.text());
      return { success: false, message: 'Erro Gemini: ' + res.status };
    }
    const data = await res.json();
    const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, resposta, raw: data };
  } catch (err) {
    logger.erro('[Gemini] Falha na requisição', err);
    return { success: false, message: 'Erro na requisição Gemini' };
  }
}

module.exports = { enviarPerguntaGemini };