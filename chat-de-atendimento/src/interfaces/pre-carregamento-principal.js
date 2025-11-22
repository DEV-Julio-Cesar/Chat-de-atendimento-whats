/**
 * =========================================================================
 * PRELOAD PRINCIPAL - PONTE DE COMUNICAÇÃO IPC
 * =========================================================================
 * 
 * Este script funciona como uma ponte segura entre o processo de renderização
 * (interface) e o processo principal do Electron. Expõe APIs controladas
 * para que a interface possa se comunicar com o backend de forma segura.
 * 
 * Funcionalidades expostas:
 * - Configuração do WhatsApp
 * - Envio de mensagens
 * - Gerenciamento de janelas
 * - Chat interno entre atendentes
 * - Histórico de conversas
 * 
 * @author Sistema Chat Atendimento
 * @version 2.0.0
 * @since 2024
 */

const { contextBridge, ipcRenderer } = require('electron');

// =========================================================================
// API PRINCIPAL DO WHATSAPP
// =========================================================================

/**
 * Expõe a API principal do WhatsApp para o processo de renderização
 * Todas as funções são seguras e controladas pelo processo principal
 */
contextBridge.exposeInMainWorld('apiWhatsApp', {
    
    // =====================================================
    // CONFIGURAÇÃO E CREDENCIAIS
    // =====================================================
    
    /**
     * Configura as credenciais da API do WhatsApp Business
     * @param {string} token - Token de acesso da API
     * @param {string} idTelefone - ID do número de telefone
     * @returns {Promise<Object>} Resultado da configuração
     */
    configurarCredenciais: (token, idTelefone) => {
        console.log('[PreloadPrincipal] Configurando credenciais WhatsApp');
        return ipcRenderer.invoke('configurar-credenciais-whatsapp', { token, id: idTelefone });
    },
    
    // =====================================================
    // ENVIO DE MENSAGENS
    // =====================================================
    
    /**
     * Envia uma mensagem via WhatsApp Business API
     * @param {string} numero - Número do destinatário
     * @param {string} mensagem - Texto da mensagem
     * @returns {Promise<Object>} Resultado do envio
     */
    enviarMensagem: (numero, mensagem) => {
        console.log(`[PreloadPrincipal] Enviando mensagem para: ${numero}`);
        return ipcRenderer.invoke('enviar-mensagem-whatsapp', { numero, mensagem });
    },
    
    // =====================================================
    // GERENCIAMENTO DE QR CODE
    // =====================================================
    
    /**
     * Inicia o processo de conexão via QR Code
     * @returns {Promise<Object>} Resultado da operação
     */
    iniciarConexaoQRCode: () => {
        console.log('[PreloadPrincipal] Iniciando conexão QR Code');
        return ipcRenderer.invoke('iniciar-qr-code-flow');
    },
    
    // =====================================================
    // CONVERSAS E HISTÓRICO
    // =====================================================
    
    /**
     * Busca a lista de conversas do WhatsApp
     * @returns {Promise<Array>} Lista de conversas
     */
    buscarConversas: () => {
        console.log('[PreloadPrincipal] Buscando conversas');
        return ipcRenderer.invoke('fetch-whatsapp-chats');
    },
    
    /**
     * Abre a janela de histórico de conversas
     * @returns {void}
     */
    abrirHistorico: () => {
        console.log('[PreloadPrincipal] Abrindo janela de histórico');
        ipcRenderer.send('abrir-janela-historico');
    },
    
    // =====================================================
    // CHAT INTERNO ENTRE ATENDENTES
    // =====================================================
    
    /**
     * Envia mensagem no chat interno entre atendentes
     * @param {string} remetente - Nome do remetente
     * @param {string} mensagem - Texto da mensagem
     * @returns {Promise<Object>} Resultado do envio
     */
    enviarMensagemInterna: (remetente, mensagem) => {
        console.log(`[PreloadPrincipal] Enviando mensagem interna de: ${remetente}`);
        return ipcRenderer.invoke('enviar-mensagem-interna', { remetente, mensagem });
    },
    
    // =====================================================
    // LISTENERS DE EVENTOS
    // =====================================================
    
    /**
     * Registra listener para novas mensagens do WhatsApp
     * @param {Function} callback - Função de callback
     */
    aoReceberMensagemWhatsApp: (callback) => {
        console.log('[PreloadPrincipal] Registrando listener para mensagens WhatsApp');
        ipcRenderer.on('nova-mensagem-whatsapp', (evento, mensagem) => {
            callback(mensagem);
        });
    },
    
    /**
     * Registra listener para mensagens do chat interno
     * @param {Function} callback - Função de callback
     */
    aoReceberMensagemInterna: (callback) => {
        console.log('[PreloadPrincipal] Registrando listener para chat interno');
        ipcRenderer.on('mensagem-chat-interno', (evento, mensagem) => {
            callback(mensagem);
        });
    },
    
    /**
     * Remove listener de eventos
     * @param {string} nomeEvento - Nome do evento
     * @param {Function} callback - Função de callback
     */
    removerListener: (nomeEvento, callback) => {
        console.log(`[PreloadPrincipal] Removendo listener: ${nomeEvento}`);
        ipcRenderer.removeListener(nomeEvento, callback);
    },
    
    // =====================================================
    // UTILITÁRIOS
    // =====================================================
    
    /**
     * Obtém informações do sistema
     * @returns {Object} Informações do sistema
     */
    obterInfoSistema: () => {
        return {
            versao: '2.0.0',
            plataforma: process.platform,
            ambiente: process.env.NODE_ENV || 'production',
            timestamp: new Date().toISOString()
        };
    },
    
    /**
     * Registra log no console principal
     * @param {string} nivel - Nível do log (info, warn, error)
     * @param {string} mensagem - Mensagem do log
     */
    registrarLog: (nivel, mensagem) => {
        console.log(`[PreloadPrincipal] ${nivel.toUpperCase()}: ${mensagem}`);
        ipcRenderer.send('registrar-log', { nivel, mensagem });
    }
});

// =========================================================================
// API DE NOTIFICAÇÕES
// =========================================================================

/**
 * API para gerenciar notificações do sistema
 */
contextBridge.exposeInMainWorld('apiNotificacoes', {
    
    /**
     * Mostra uma notificação do sistema
     * @param {string} titulo - Título da notificação
     * @param {string} corpo - Corpo da notificação
     * @param {Object} opcoes - Opções adicionais
     */
    mostrarNotificacao: (titulo, corpo, opcoes = {}) => {
        console.log(`[PreloadPrincipal] Mostrando notificação: ${titulo}`);
        ipcRenderer.send('mostrar-notificacao', { titulo, corpo, opcoes });
    },
    
    /**
     * Solicita permissão para notificações
     * @returns {Promise<string>} Status da permissão
     */
    solicitarPermissao: () => {
        return ipcRenderer.invoke('solicitar-permissao-notificacao');
    }
});

// =========================================================================
// API DE ARQUIVOS
// =========================================================================

/**
 * API para operações com arquivos
 */
contextBridge.exposeInMainWorld('apiArquivos', {
    
    /**
     * Abre um diálogo para selecionar arquivo
     * @param {Object} opcoes - Opções do diálogo
     * @returns {Promise<Array>} Caminhos dos arquivos selecionados
     */
    selecionarArquivo: (opcoes = {}) => {
        console.log('[PreloadPrincipal] Abrindo seletor de arquivo');
        return ipcRenderer.invoke('selecionar-arquivo', opcoes);
    },
    
    /**
     * Salva um arquivo no sistema
     * @param {string} conteudo - Conteúdo do arquivo
     * @param {string} nomeArquivo - Nome sugerido do arquivo
     * @returns {Promise<string>} Caminho onde foi salvo
     */
    salvarArquivo: (conteudo, nomeArquivo) => {
        console.log(`[PreloadPrincipal] Salvando arquivo: ${nomeArquivo}`);
        return ipcRenderer.invoke('salvar-arquivo', { conteudo, nomeArquivo });
    }
});

// =========================================================================
// EVENTOS DO SISTEMA
// =========================================================================

/**
 * Eventos relacionados ao ciclo de vida da aplicação
 */
window.addEventListener('DOMContentLoaded', () => {
    console.log('[PreloadPrincipal] ✅ Preload principal carregado com sucesso');
    console.log('[PreloadPrincipal] 🔗 APIs expostas: apiWhatsApp, apiNotificacoes, apiArquivos');
    
    // Informa ao processo principal que a interface está pronta
    ipcRenderer.send('interface-pronta');
});

/**
 * Antes da página ser fechada
 */
window.addEventListener('beforeunload', () => {
    console.log('[PreloadPrincipal] 🔄 Interface sendo fechada...');
    ipcRenderer.send('interface-fechando');
});

/**
 * Gerencia erros não capturados
 */
window.addEventListener('error', (evento) => {
    console.error('[PreloadPrincipal] ❌ Erro na interface:', evento.error);
    ipcRenderer.send('erro-interface', {
        mensagem: evento.message,
        arquivo: evento.filename,
        linha: evento.lineno,
        coluna: evento.colno,
        stack: evento.error?.stack
    });
});

// =========================================================================
// INFORMAÇÕES DE DEBUG
// =========================================================================

console.log('🔧 ====================================================');
console.log('🌐 PRELOAD PRINCIPAL - INTERFACE WHATSAPP');
console.log('🔧 ====================================================');
console.log('✅ Context Bridge configurado');
console.log('🔗 APIs expostas para o renderer');
console.log('📡 Comunicação IPC estabelecida');
console.log('🛡️ Segurança: nodeIntegration=false, contextIsolation=true');
console.log('🔧 ====================================================');
