const fs = require('fs-extra');
const path = require('path');
const logger = require('../infraestrutura/logger');

const METRICS_FILE = path.join(__dirname, '../../dados/metricas.json');

async function garantirArquivoMetricas() {
    try {
        await fs.ensureFile(METRICS_FILE);
        const conteudo = await fs.readFile(METRICS_FILE, 'utf-8');
        
        if (!conteudo.trim()) {
            const inicial = {
                mensagensEnviadas: 0,
                mensagensRecebidas: 0,
                totalConversas: 0,
                clientesAtivos: 0,
                historico: []
            };
            await fs.writeJson(METRICS_FILE, inicial, { spaces: 2 });
        }
    } catch (erro) {
        const inicial = {
            mensagensEnviadas: 0,
            mensagensRecebidas: 0,
            totalConversas: 0,
            clientesAtivos: 0,
            historico: []
        };
        await fs.writeJson(METRICS_FILE, inicial, { spaces: 2 });
    }
}

async function registrarMensagemEnviada() {
    try {
        await garantirArquivoMetricas();
        const dados = await fs.readJson(METRICS_FILE);
        dados.mensagensEnviadas++;
        await fs.writeJson(METRICS_FILE, dados, { spaces: 2 });
    } catch (erro) {
        logger.erro('[Métricas] Erro ao registrar mensagem enviada:', erro.message);
    }
}

async function registrarMensagemRecebida() {
    try {
        await garantirArquivoMetricas();
        const dados = await fs.readJson(METRICS_FILE);
        dados.mensagensRecebidas++;
        await fs.writeJson(METRICS_FILE, dados, { spaces: 2 });
    } catch (erro) {
        logger.erro('[Métricas] Erro ao registrar mensagem recebida:', erro.message);
    }
}

async function obterMetricas() {
    try {
        await garantirArquivoMetricas();
        const dados = await fs.readJson(METRICS_FILE);
        
        // Calcula métricas adicionais
        const total = dados.mensagensEnviadas + dados.mensagensRecebidas;
        const mediaResposta = dados.mensagensEnviadas > 0 
            ? (dados.mensagensRecebidas / dados.mensagensEnviadas).toFixed(2)
            : 0;
        
        return {
            success: true,
            metricas: {
                ...dados,
                totalMensagens: total,
                mediaResposta
            }
        };
    } catch (erro) {
        logger.erro('[Métricas] Erro ao obter métricas:', erro.message);
        return { success: false, message: erro.message };
    }
}

async function resetarMetricas() {
    try {
        const inicial = {
            mensagensEnviadas: 0,
            mensagensRecebidas: 0,
            totalConversas: 0,
            clientesAtivos: 0,
            historico: []
        };
        await fs.writeJson(METRICS_FILE, inicial, { spaces: 2 });
        logger.info('[Métricas] Métricas resetadas');
        return { success: true };
    } catch (erro) {
        logger.erro('[Métricas] Erro ao resetar:', erro.message);
        return { success: false, message: erro.message };
    }
}

module.exports = {
    registrarMensagemEnviada,
    registrarMensagemRecebida,
    obterMetricas,
    resetarMetricas
};