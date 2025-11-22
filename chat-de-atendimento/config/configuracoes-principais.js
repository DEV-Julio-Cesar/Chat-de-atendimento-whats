/**
 * =========================================================================
 * CONFIGURAÇÕES PRINCIPAIS DO SISTEMA
 * =========================================================================
 * 
 * Arquivo central de configurações do aplicativo Chat de Atendimento WhatsApp.
 * Centraliza todas as configurações para facilitar manutenção e personalização.
 * 
 * @author Sistema Chat Atendimento
 * @version 2.0.0
 * @since 2024
 */

// =========================================================================
// CONFIGURAÇÕES DO APLICATIVO
// =========================================================================

const configuracoes = {
    
    // =====================================================
    // CONFIGURAÇÃO DE IA (Gemini)
    // =====================================================
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    // INFORMAÇÕES GERAIS
    // =====================================================
    aplicativo: {
        nome: 'Chat de Atendimento WhatsApp',
        versao: '2.0.0',
        autor: 'Sistema Chat Atendimento',
        descricao: 'Sistema completo de atendimento ao cliente via WhatsApp',
        site: 'https://github.com/seu-usuario/chat-atendimento',
        email: 'suporte@chatwhatsapp.com.br'
    },
    
    // =====================================================
    // CONFIGURAÇÕES DE JANELAS
    // =====================================================
    janelas: {
        login: {
            largura: 450,
            altura: 600,
            redimensionavel: false,
            titulo: 'Login - Chat de Atendimento'
        },
        principal: {
            largura: 1400,
            altura: 900,
            larguraMinima: 1000,
            alturaMinima: 700,
            titulo: 'Chat de Atendimento WhatsApp'
        },
        cadastro: {
            largura: 500,
            altura: 650,
            redimensionavel: false,
            titulo: 'Cadastrar Novo Usuário',
            modal: true
        },
        historico: {
            largura: 1000,
            altura: 700,
            titulo: 'Histórico de Conversas'
        },
        qrCode: {
            largura: 400,
            altura: 500,
            redimensionavel: false,
            titulo: 'Conectar WhatsApp - QR Code'
        }
    },
    
    // =====================================================
    // CONFIGURAÇÕES DE REDE
    // =====================================================
    rede: {
        websocket: {
            portaPrincipal: 8080,
            portaChatInterno: 9090,
            timeoutReconexao: 5000,
            tentativasMaximas: 3
        },
        whatsappAPI: {
            versao: 'v19.0',
            baseURL: 'https://graph.facebook.com',
            timeout: 10000
        }
    },
    
    // =====================================================
    // CONFIGURAÇÕES DE ARQUIVOS
    // =====================================================
    arquivos: {
        usuarios: 'dados/usuarios.json',
        configuracoes: 'dados/configuracoes-sistema.json',
        logs: 'logs/aplicativo.log',
        historico: 'dados/historico-conversas.json',
        backup: 'dados/backup/',
        temporarios: 'temp/'
    },
    
    // =====================================================
    // CONFIGURAÇÕES DE SEGURANÇA
    // =====================================================
    seguranca: {
        hashAlgoritmo: 'sha256',
        tentativasLoginMaximas: 5,
        tempoBloqueiLogin: 300000, // 5 minutos
        sessaoExpiracaoHoras: 8,
        backupAutomaticoHoras: 24
    },
    
    // =====================================================
    // CONFIGURAÇÕES DE INTERFACE
    // =====================================================
    interface: {
        tema: {
            padrao: 'claro',
            opcoes: ['claro', 'escuro', 'automatico']
        },
        idioma: {
            padrao: 'pt-BR',
            opcoes: ['pt-BR', 'en-US', 'es-ES']
        },
        notificacoes: {
            habilitadas: true,
            som: true,
            desktop: true,
            duracaoMs: 5000
        },
        chat: {
            mensagensPorPagina: 50,
            intervaloAtualizacaoMs: 2000,
            maxCaracteresMensagem: 4096,
            formatoDataHora: 'DD/MM/YYYY HH:mm:ss'
        }
    },
    
    // =====================================================
    // CONFIGURAÇÕES DE DESENVOLVIMENTO
    // =====================================================
    desenvolvimento: {
        debug: process.env.NODE_ENV === 'development',
        consoleLogs: true,
        arquivoLogs: true,
        devTools: process.env.NODE_ENV === 'development',
        hotReload: false,
        simulacaoMensagens: true
    },
    
    // =====================================================
    // CONFIGURAÇÕES DE WHATSAPP
    // =====================================================
    whatsapp: {
        web: {
            timeoutQR: 60000, // 1 minuto
            timeoutConexao: 30000, // 30 segundos
            tentativasReconexao: 3,
            salvarSessao: true,
            diretorioSessao: '.wwebjs_auth'
        },
        mensagens: {
            maxTentativasEnvio: 3,
            intervaloTentativasMs: 1000,
            confirmacaoLeitura: false,
            formatoPadrao: 'texto'
        }
    },
    
    // =====================================================
    // CONFIGURAÇÕES DE PERFORMANCE
    // =====================================================
    performance: {
        cache: {
            habilitado: true,
            tamanhoMaxMB: 100,
            tempoVidaMinutos: 30
        },
        memoria: {
            limpezaAutomatica: true,
            intervaloLimpezaMinutos: 15,
            limiteMB: 500
        },
        banco: {
            backupAutomatico: true,
            compactacaoAutomatica: true,
            intervaloBacupHoras: 6
        }
    }
};

// =========================================================================
// FUNÇÕES UTILITÁRIAS DE CONFIGURAÇÃO
// =========================================================================

/**
 * Obtém uma configuração específica usando notação de ponto
 * @param {string} caminho - Caminho da configuração (ex: 'janelas.login.largura')
 * @param {any} padrao - Valor padrão se não encontrar
 * @returns {any} Valor da configuração
 */
function obterConfiguracao(caminho, padrao = null) {
    try {
        const partes = caminho.split('.');
        let valor = configuracoes;
        
        for (const parte of partes) {
            valor = valor[parte];
            if (valor === undefined) {
                return padrao;
            }
        }
        
        return valor;
    } catch (erro) {
        console.error(`[Config] Erro ao obter configuração '${caminho}':`, erro);
        return padrao;
    }
}

/**
 * Define uma configuração específica
 * @param {string} caminho - Caminho da configuração
 * @param {any} valor - Novo valor
 * @returns {boolean} true se definiu com sucesso
 */
function definirConfiguracao(caminho, valor) {
    try {
        const partes = caminho.split('.');
        const ultimaChave = partes.pop();
        let obj = configuracoes;
        
        for (const parte of partes) {
            if (!(parte in obj)) {
                obj[parte] = {};
            }
            obj = obj[parte];
        }
        
        obj[ultimaChave] = valor;
        console.log(`[Config] Configuração '${caminho}' definida para:`, valor);
        return true;
        
    } catch (erro) {
        console.error(`[Config] Erro ao definir configuração '${caminho}':`, erro);
        return false;
    }
}

/**
 * Valida se todas as configurações obrigatórias estão presentes
 * @returns {boolean} true se válidas
 */
function validarConfiguracoes() {
    const obrigatorias = [
        'aplicativo.nome',
        'aplicativo.versao',
        'rede.websocket.portaPrincipal',
        'rede.websocket.portaChatInterno',
        'arquivos.usuarios'
    ];
    
    for (const config of obrigatorias) {
        if (obterConfiguracao(config) === null) {
            console.error(`[Config] Configuração obrigatória ausente: ${config}`);
            return false;
        }
    }
    
    console.log('[Config] ✅ Todas as configurações obrigatórias estão presentes');
    return true;
}

/**
 * Obtém informações de depuração das configurações
 * @returns {Object} Informações de debug
 */
function obterInfoDebug() {
    return {
        ambiente: process.env.NODE_ENV || 'production',
        debug: configuracoes.desenvolvimento.debug,
        versao: configuracoes.aplicativo.versao,
        plataforma: process.platform,
        timestamp: new Date().toISOString()
    };
}

/**
 * Mescla configurações personalizadas com as padrão
 * @param {Object} configPersonalizadas - Configurações personalizadas
 */
function mesclarConfiguracoes(configPersonalizadas) {
    try {
        // Função recursiva para mesclar objetos
        function mesclarObjetos(destino, origem) {
            for (const chave in origem) {
                if (origem.hasOwnProperty(chave)) {
                    if (typeof origem[chave] === 'object' && origem[chave] !== null && !Array.isArray(origem[chave])) {
                        if (!destino[chave]) {
                            destino[chave] = {};
                        }
                        mesclarObjetos(destino[chave], origem[chave]);
                    } else {
                        destino[chave] = origem[chave];
                    }
                }
            }
        }
        
        mesclarObjetos(configuracoes, configPersonalizadas);
        console.log('[Config] ✅ Configurações personalizadas mescladas com sucesso');
        
    } catch (erro) {
        console.error('[Config] ❌ Erro ao mesclar configurações:', erro);
    }
}

// =========================================================================
// EXPORTAÇÕES
// =========================================================================

module.exports = {
    configuracoes,
    obterConfiguracao,
    definirConfiguracao,
    validarConfiguracoes,
    obterInfoDebug,
    mesclarConfiguracoes
};

// =========================================================================
// INICIALIZAÇÃO
// =========================================================================

// Valida configurações na inicialização
if (!validarConfiguracoes()) {
    console.error('[Config] ❌ Falha na validação das configurações!');
    process.exit(1);
}

console.log('[Config] ✅ Módulo de configurações carregado com sucesso');
console.log(`[Config] 🚀 ${configuracoes.aplicativo.nome} v${configuracoes.aplicativo.versao}`);
