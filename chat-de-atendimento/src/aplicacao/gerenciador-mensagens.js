const fs = require('fs-extra');
const path = require('path');
const logger = require('../infraestrutura/logger');

const MESSAGES_DIR = path.join(__dirname, '../../dados/mensagens');

async function garantirPastaMensagens() {
    await fs.ensureDir(MESSAGES_DIR);
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

module.exports = {
    salvarMensagem,
    carregarHistorico,
    listarChatsComMensagens
};