// =========================================================================
// MÓDULO DE VALIDAÇÃO DE CREDENCIAIS
// =========================================================================

const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../infraestrutura/logger');

const USERS_FILE = path.join(__dirname, '../../dados/usuarios.json');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function garantirArquivo() {
    await fs.ensureFile(USERS_FILE);
    try {
        await fs.readJson(USERS_FILE);
    } catch {
        // Cria usuário admin padrão
        const adminHash = hashPassword('admin');
        const inicial = {
            usuarios: [
                {
                    username: 'admin',
                    password: adminHash,
                    email: 'admin@sistema.com',
                    role: 'admin',
                    ativo: true,
                    criadoEm: new Date().toISOString(),
                    ultimoLogin: null
                }
            ]
        };
        await fs.writeJson(USERS_FILE, inicial, { spaces: 2 });
        logger.info('[ValidacaoCredenciais] Usuário admin criado (senha: admin)');
    }
}

/**
 * Valida credenciais de usuário
 * @param {string} username - Nome de usuário
 * @param {string} password - Senha
 * @returns {boolean} - True se válido
 */
async function validarCredenciais(username, password) {
    try {
        await garantirArquivo();
        const dados = await fs.readJson(USERS_FILE);
        const passwordHash = hashPassword(password);
        
        const usuario = dados.usuarios.find(
            u => u.username.toLowerCase() === username.toLowerCase() && u.password === passwordHash
        );
        
        if (!usuario) {
            logger.aviso(`[Login] Tentativa falha: ${username}`);
            return false;
        }
        
        if (usuario.ativo === false) {
            logger.aviso(`[Login] Usuário inativo: ${username}`);
            return false;
        }
        
        // Atualiza último login
        usuario.ultimoLogin = new Date().toISOString();
        await fs.writeJson(USERS_FILE, dados, { spaces: 2 });
        
        logger.sucesso(`[Login] Sucesso: ${username}`);
        return true;
        
    } catch (erro) {
        logger.erro('[ValidacaoCredenciais] Erro:', erro.message);
        return false;
    }
}

/**
 * Verifica nível de permissão do usuário
 * @param {string} username - Nome de usuário
 * @returns {string} - Nível de permissão
 */
async function obterNivelPermissao(username) {
    try {
        await garantirArquivo();
        const dados = await fs.readJson(USERS_FILE);
        const usuario = dados.usuarios.find(u => u.username.toLowerCase() === username.toLowerCase());
        return usuario?.role || 'atendente';
    } catch (erro) {
        logger.erro('[ValidacaoCredenciais] Erro ao obter role:', erro.message);
        return 'atendente';
    }
}

/**
 * Obtém dados do usuário
 * @param {string} username - Nome de usuário
 * @returns {Object|null} - Dados do usuário ou null se não encontrado
 */
async function obterDadosUsuario(username) {
    try {
        await garantirArquivo();
        const dados = await fs.readJson(USERS_FILE);
        const usuario = dados.usuarios.find(u => u.username.toLowerCase() === username.toLowerCase());
        
        if (!usuario) return null;
        
        // Remove senha do retorno
        const { password, ...dadosSeguros } = usuario;
        return dadosSeguros;
        
    } catch (erro) {
        logger.erro('[ValidacaoCredenciais] Erro ao obter dados:', erro.message);
        return null;
    }
}

/**
 * Valida força da senha
 * @param {string} password - Senha a validar
 * @returns {Object} - Resultado da validação
 */
function validarForcaSenha(password) {
    const resultado = {
        valida: true,
        mensagens: []
    };
    
    if (!password || password.length < 6) {
        resultado.valida = false;
        resultado.mensagens.push('Senha deve ter no mínimo 6 caracteres');
    }
    
    if (password && !/[0-9]/.test(password)) {
        resultado.mensagens.push('Recomendado: adicionar números');
    }
    
    if (password && !/[A-Z]/.test(password)) {
        resultado.mensagens.push('Recomendado: adicionar letras maiúsculas');
    }
    
    return resultado;
}

module.exports = {
    validarCredenciais,
    obterNivelPermissao,
    obterDadosUsuario,
    hashPassword,
    validarForcaSenha
};