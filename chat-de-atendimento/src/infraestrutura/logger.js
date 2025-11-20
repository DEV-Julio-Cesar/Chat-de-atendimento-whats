// =========================================================================
// MÓDULO DE LOGGER
// =========================================================================

const fs = require('fs-extra');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../dados/logs');
const LOG_FILE = path.join(LOG_DIR, `app-${new Date().toISOString().split('T')[0]}.log`);

// Garante que o diretório de logs existe
fs.ensureDirSync(LOG_DIR);

// Cores para console (opcional)
const cores = {
    reset: '\x1b[0m',
    info: '\x1b[36m',      // Ciano
    aviso: '\x1b[33m',     // Amarelo
    erro: '\x1b[31m',      // Vermelho
    debug: '\x1b[35m'      // Magenta
};

/**
 * Formata mensagem de log
 * @param {string} nivel - Nível do log
 * @param  {...any} args - Argumentos a logar
 * @returns {string} - Mensagem formatada
 */
function formatarMensagem(nivel, ...args) {
    const timestamp = new Date().toISOString();
    const mensagem = args.map(arg => {
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg, null, 2);
            } catch {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');
    
    return `[${timestamp}] [${nivel}] ${mensagem}`;
}

/**
 * Escreve no arquivo de log
 * @param {string} mensagem - Mensagem a escrever
 */
function escreverLog(mensagem) {
    try {
        fs.appendFileSync(LOG_FILE, mensagem + '\n', 'utf-8');
    } catch (erro) {
        console.error('❌ Erro ao escrever log:', erro.message);
    }
}

/**
 * Limpa logs antigos (mais de 30 dias)
 */
function limparLogsAntigos() {
    try {
        const arquivos = fs.readdirSync(LOG_DIR);
        const agora = Date.now();
        const trintaDias = 30 * 24 * 60 * 60 * 1000;
        
        arquivos.forEach(arquivo => {
            const caminhoCompleto = path.join(LOG_DIR, arquivo);
            const stats = fs.statSync(caminhoCompleto);
            
            if (agora - stats.mtimeMs > trintaDias) {
                fs.unlinkSync(caminhoCompleto);
                console.log(`🗑️ Log antigo removido: ${arquivo}`);
            }
        });
    } catch (erro) {
        console.error('⚠️ Erro ao limpar logs antigos:', erro.message);
    }
}

// Executa limpeza ao iniciar (uma vez por dia)
const ultimaLimpeza = path.join(LOG_DIR, '.ultima-limpeza');
try {
    if (!fs.existsSync(ultimaLimpeza) || 
        Date.now() - fs.statSync(ultimaLimpeza).mtimeMs > 24 * 60 * 60 * 1000) {
        limparLogsAntigos();
        fs.writeFileSync(ultimaLimpeza, new Date().toISOString());
    }
} catch (erro) {
    // Ignora erro de limpeza
}

/**
 * Log de informação
 * @param  {...any} args - Dados a logar
 */
function info(...args) {
    const mensagem = formatarMensagem('INFO', ...args);
    console.log(`${cores.info}${mensagem}${cores.reset}`);
    escreverLog(mensagem);
}

/**
 * Log de erro
 * @param  {...any} args - Dados a logar
 */
function erro(...args) {
    const mensagem = formatarMensagem('ERRO', ...args);
    console.error(`${cores.erro}${mensagem}${cores.reset}`);
    escreverLog(mensagem);
}

/**
 * Log de aviso
 * @param  {...any} args - Dados a logar
 */
function aviso(...args) {
    const mensagem = formatarMensagem('AVISO', ...args);
    console.warn(`${cores.aviso}${mensagem}${cores.reset}`);
    escreverLog(mensagem);
}

/**
 * Log de debug (apenas em desenvolvimento)
 * @param  {...any} args - Dados a logar
 */
function debug(...args) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
        const mensagem = formatarMensagem('DEBUG', ...args);
        console.debug(`${cores.debug}${mensagem}${cores.reset}`);
        escreverLog(mensagem);
    }
}

/**
 * Log de sucesso
 * @param  {...any} args - Dados a logar
 */
function sucesso(...args) {
    const mensagem = formatarMensagem('SUCESSO', ...args);
    console.log(`\x1b[32m${mensagem}${cores.reset}`); // Verde
    escreverLog(mensagem);
}

module.exports = {
    info,
    erro,
    aviso,
    debug,
    sucesso
};