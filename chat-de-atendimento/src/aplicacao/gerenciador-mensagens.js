const fs = require('fs-extra');
const path = require('path');
const logger = require('../infraestrutura/logger');
const chatbot = require('./chatbot');

const MESSAGES_DIR = path.join(__dirname, '../../dados/mensagens');

async function garantirPastaMensagens() {
    await fs.ensureDir(MESSAGES_DIR);
}

// Estado em memória para fluxos de diagnóstico de provedor
// Estrutura: { [chatKey]: { intent: string, tipo: string, passoAtual: number, totalPassos: number, tentativas: number } }
const diagnosticosAtivos = new Map();

function chaveDiagnostico(clientId, chatId) {
    return `${clientId}::${chatId}`;
}

function iniciarDiagnostico(clientId, chatId, intent, tipo, passos) {
    diagnosticosAtivos.set(chaveDiagnostico(clientId, chatId), {
        intent,
        tipo,
        passoAtual: 0,
        totalPassos: passos.length,
        tentativas: 0,
        passos
    });
}

function avancarPasso(clientId, chatId) {
    const chave = chaveDiagnostico(clientId, chatId);
    const estado = diagnosticosAtivos.get(chave);
    if (!estado) return null;
    estado.passoAtual += 1;
    return estado;
}

function finalizarDiagnostico(clientId, chatId) {
    diagnosticosAtivos.delete(chaveDiagnostico(clientId, chatId));
}

function obterDiagnostico(clientId, chatId) {
    return diagnosticosAtivos.get(chaveDiagnostico(clientId, chatId));
}

/**
 * Salva mensagem no histórico
 */
async function salvarMensagem(clientId, chatId, mensagem) {
    try {
        await garantirPastaMensagens();
        
        const fileName = `${clientId}_${chatId.replace(/[@.]/g, '_')}.json`;
        const filePath = path.join(MESSAGES_DIR, fileName);
        
        let historico = { chatId, mensagens: [] };
        
        if (await fs.pathExists(filePath)) {
            historico = await fs.readJson(filePath);
        }
        
        historico.mensagens.push({
            id: mensagem.id?.id || Date.now(),
            timestamp: mensagem.timestamp || Date.now(),
            from: mensagem.from || chatId,
            to: mensagem.to || 'me',
            body: mensagem.body || '',
            type: mensagem.type || 'chat',
            fromMe: mensagem.fromMe || false,
            hasMedia: mensagem.hasMedia || false,
            mediaUrl: mensagem.mediaUrl || null
        });
        
        await fs.writeJson(filePath, historico, { spaces: 2 });
        
        logger.info(`[Mensagens] Salva em ${chatId}`);
        return { success: true };
        
    } catch (erro) {
        logger.erro('[Mensagens] Erro ao salvar:', erro.message);
        return { success: false, message: erro.message };
    }
}

/**
 * Carrega histórico de chat
 */
async function carregarHistorico(clientId, chatId) {
    try {
        await garantirPastaMensagens();
        
        const fileName = `${clientId}_${chatId.replace(/[@.]/g, '_')}.json`;
        const filePath = path.join(MESSAGES_DIR, fileName);
        
        if (!(await fs.pathExists(filePath))) {
            return { success: true, mensagens: [] };
        }
        
        const historico = await fs.readJson(filePath);
        return { success: true, mensagens: historico.mensagens || [] };
        
    } catch (erro) {
        logger.erro('[Mensagens] Erro ao carregar histórico:', erro.message);
        return { success: false, mensagens: [], message: erro.message };
    }
}

/**
 * Lista todos os chats com mensagens
 */
async function listarChatsComMensagens(clientId) {
    try {
        await garantirPastaMensagens();
        
        const files = await fs.readdir(MESSAGES_DIR);
        const prefix = `${clientId}_`;
        
        const chats = [];
        
        for (const file of files) {
            if (file.startsWith(prefix) && file.endsWith('.json')) {
                const filePath = path.join(MESSAGES_DIR, file);
                const historico = await fs.readJson(filePath);
                
                const ultimaMensagem = historico.mensagens[historico.mensagens.length - 1];
                
                chats.push({
                    chatId: historico.chatId,
                    totalMensagens: historico.mensagens.length,
                    ultimaMensagem: ultimaMensagem?.body || '',
                    ultimoTimestamp: ultimaMensagem?.timestamp || 0
                });
            }
        }
        
        // Ordena por mais recente
        chats.sort((a, b) => b.ultimoTimestamp - a.ultimoTimestamp);
        
        return { success: true, chats };
        
    } catch (erro) {
        logger.erro('[Mensagens] Erro ao listar chats:', erro.message);
        return { success: false, chats: [], message: erro.message };
    }
}

// Roteamento de mensagem para chatbot provedor e regras gerais
// Retorna: { devResponder, resposta?, escalar?, metadata? }
async function roteamentoAutomatizado(clientId, chatId, textoMensagem) {
    try {
        const textoLower = (textoMensagem || '').toLowerCase().trim();

        // Verifica se há diagnóstico ativo e interpreta confirmação
        const diag = obterDiagnostico(clientId, chatId);
        if (diag) {
            if (['nao', 'não', 'n'].includes(textoLower)) {
                finalizarDiagnostico(clientId, chatId);
                return { devResponder: true, resposta: 'Diagnóstico interrompido. Encaminhando para atendente...', escalar: true };
            }
            if (['sim', 's'].includes(textoLower)) {
                const estado = avancarPasso(clientId, chatId);
                if (!estado) {
                    return { devResponder: false };
                }
                if (estado.passoAtual < estado.totalPassos) {
                    const proximoPasso = estado.passos[estado.passoAtual];
                    return { devResponder: true, resposta: `Passo ${estado.passoAtual + 1}: ${proximoPasso}\nDigite 'sim' para continuar ou 'não' para escalar.` };
                } else {
                    finalizarDiagnostico(clientId, chatId);
                    return { devResponder: true, resposta: 'Diagnóstico concluído. Sua conexão deve normalizar em breve. Caso persista, respondA com "continuar" para escalar.', metadata: { intent: estado.intent } };
                }
            }
        }

        // Processamento primário via chatbot
        const resultado = await chatbot.processarMensagem(textoMensagem, chatId, clientId);
        if (resultado.devResponder) {
            // Se é intent de diagnóstico inicializa estado
            if (resultado.tipoIntent === 'diagnostico' && resultado.intent) {
                // Extrair passos listados na resposta (já formatados) ou recarregar config para obter array
                const config = await chatbot.carregarConfigProvedor();
                const intentObj = config.intents.find(i => i.nome === resultado.intent);
                if (intentObj && Array.isArray(intentObj.passosDiagnostico) && intentObj.passosDiagnostico.length > 0) {
                    iniciarDiagnostico(clientId, chatId, intentObj.nome, intentObj.tipo, intentObj.passosDiagnostico);
                    // Primeiro passo já foi apresentado na resposta formatada; instruir continuidade
                    return { devResponder: true, resposta: resultado.resposta + '\n\nDigite "sim" para iniciar passo a passo ou "não" para escalar.' };
                }
            }
            return { devResponder: true, resposta: resultado.resposta, escalar: resultado.escalar || false, metadata: { intent: resultado.intent, tipo: resultado.tipoIntent } };
        }

        // Sem resposta automática: encaminhar para humano
        return { devResponder: false };
    } catch (erro) {
        logger.erro('[Mensagens] Erro roteamento:', erro.message);
        return { devResponder: false };
    }
}

module.exports = {
    salvarMensagem,
    carregarHistorico,
    listarChatsComMensagens,
    roteamentoAutomatizado
};