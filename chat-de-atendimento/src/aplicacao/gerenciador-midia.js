const fs = require('fs-extra');
const path = require('path');
const logger = require('../infraestrutura/logger');

const MEDIA_DIR = path.join(__dirname, '../../dados/media');

async function garantirPastaMedia() {
    await fs.ensureDir(MEDIA_DIR);
}

/**
 * Salva arquivo de mídia
 */
async function salvarMidia(clientId, chatId, buffer, filename) {
    try {
        await garantirPastaMedia();
        
        const clientFolder = path.join(MEDIA_DIR, clientId);
        await fs.ensureDir(clientFolder);
        
        const chatFolder = path.join(clientFolder, chatId.replace(/[@.]/g, '_'));
        await fs.ensureDir(chatFolder);
        
        const timestamp = Date.now();
        const ext = path.extname(filename) || '.bin';
        const safeName = `${timestamp}_${path.basename(filename, ext).replace(/[^a-z0-9]/gi, '_')}${ext}`;
        const filePath = path.join(chatFolder, safeName);
        
        await fs.writeFile(filePath, buffer);
        
        logger.info(`[Mídia] Salvo: ${safeName}`);
        
        return {
            success: true,
            filePath,
            relativePath: path.relative(MEDIA_DIR, filePath),
            filename: safeName
        };
        
    } catch (erro) {
        logger.erro('[Mídia] Erro ao salvar:', erro.message);
        return { success: false, message: erro.message };
    }
}

/**
 * Carrega arquivo de mídia
 */
async function carregarMidia(relativePath) {
    try {
        const fullPath = path.join(MEDIA_DIR, relativePath);
        
        if (!(await fs.pathExists(fullPath))) {
            return { success: false, message: 'Arquivo não encontrado' };
        }
        
        const buffer = await fs.readFile(fullPath);
        const mimeType = getMimeType(fullPath);
        
        return {
            success: true,
            buffer,
            mimeType
        };
        
    } catch (erro) {
        logger.erro('[Mídia] Erro ao carregar:', erro.message);
        return { success: false, message: erro.message };
    }
}

function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'audio/ogg'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

module.exports = {
    salvarMidia,
    carregarMidia
};