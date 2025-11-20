const { Notification } = require('electron');
const logger = require('../infraestrutura/logger');

let notificacoesAtivas = true;

function setAtivo(ativo) {
    notificacoesAtivas = ativo;
}

function mostrarNotificacao(titulo, corpo, icone = null) {
    if (!notificacoesAtivas) return;
    
    try {
        const notification = new Notification({
            title: titulo,
            body: corpo,
            icon: icone,
            silent: false
        });

        notification.show();
        
        logger.info(`[Notificação] ${titulo}: ${corpo}`);
        
    } catch (erro) {
        logger.erro('[Notificação] Erro:', erro.message);
    }
}

function notificarNovaMensagem(chatName, mensagem) {
    const corpo = mensagem.length > 50 
        ? mensagem.substring(0, 47) + '...'
        : mensagem;
    
    mostrarNotificacao(
        `Nova mensagem de ${chatName}`,
        corpo
    );
}

function notificarClienteConectado(clientId) {
    mostrarNotificacao(
        'WhatsApp Conectado',
        `Cliente ${clientId} conectado com sucesso!`
    );
}

function notificarClienteDesconectado(clientId) {
    mostrarNotificacao(
        'WhatsApp Desconectado',
        `Cliente ${clientId} foi desconectado.`
    );
}

module.exports = {
    setAtivo,
    mostrarNotificacao,
    notificarNovaMensagem,
    notificarClienteConectado,
    notificarClienteDesconectado
};