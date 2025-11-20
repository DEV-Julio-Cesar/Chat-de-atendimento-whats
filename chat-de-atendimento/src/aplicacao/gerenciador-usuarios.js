// =========================================================================
// MÓDULO DE GERENCIAMENTO DE USUÁRIOS
// =========================================================================

const fs = require('fs-extra');
const path = require('path');
const logger = require('../infraestrutura/logger');

let bcrypt;
try { bcrypt = require('bcryptjs'); } catch { bcrypt = null; }

const USERS_FILE = path.join(__dirname, '../../dados/usuarios.json');

/**
 * Garante que o arquivo de usuários existe
 */
async function garantirArquivo() {
    try {
        await fs.ensureFile(USERS_FILE);
        const conteudo = await fs.readFile(USERS_FILE, 'utf-8');
        
        if (!conteudo.trim()) {
            await fs.writeJson(USERS_FILE, { usuarios: [] }, { spaces: 2 });
            logger.info('[GerenciadorUsuarios] Arquivo de usuários criado');
        }
    } catch (erro) {
        await fs.writeJson(USERS_FILE, { usuarios: [] }, { spaces: 2 });
        logger.info('[GerenciadorUsuarios] Arquivo de usuários inicializado');
    }
}

/**
 * Cadastra novo usuário
 * @param {Object} novoUsuario - Dados do usuário
 * @returns {Object} - Resultado da operação
 */
async function cadastrarUsuario(novoUsuario) {
    try {
        await garantirArquivo();
        const dados = await fs.readJson(USERS_FILE);

        if (!novoUsuario.username || !novoUsuario.password) {
            return { success: false, message: 'Usuário e senha são obrigatórios' };
        }

        const existe = dados.usuarios.find(u => 
            u.username.toLowerCase() === novoUsuario.username.toLowerCase()
        );
        if (existe) return { success: false, message: 'Usuário já existe' };

        // Hash condicional
        let passwordToSave = novoUsuario.password;
        if (bcrypt) {
            try {
                const salt = await bcrypt.genSalt(10);
                passwordToSave = await bcrypt.hash(novoUsuario.password, salt);
            } catch (e) {
                logger.aviso('[GerenciadorUsuarios] Falha ao aplicar hash, salvando senha em texto (dev):', e.message);
            }
        }

        const usuarioCompleto = {
            username: novoUsuario.username,
            email: novoUsuario.email || '',
            role: novoUsuario.role || 'atendente',
            password: passwordToSave,
            ativo: true,
            criadoEm: new Date().toISOString(),
            ultimoLogin: null
        };

        dados.usuarios.push(usuarioCompleto);
        await fs.writeJson(USERS_FILE, dados, { spaces: 2 });

        logger.info(`[GerenciadorUsuarios] Usuário cadastrado: ${novoUsuario.username}`);
        return { success: true, message: 'Usuário cadastrado com sucesso' };
    } catch (erro) {
        logger.erro('[GerenciadorUsuarios] Erro ao cadastrar:', erro.message);
        return { success: false, message: erro.message };
    }
}

/**
 * Lista todos os usuários (sem senhas)
 * @returns {Array} - Lista de usuários
 */
async function listarUsuarios() {
    try {
        await garantirArquivo();
        const dados = await fs.readJson(USERS_FILE);
        
        // Remove senhas da resposta
        return dados.usuarios.map(u => ({
            username: u.username,
            email: u.email || 'Não informado',
            role: u.role || 'atendente',
            ativo: u.ativo !== false,
            criadoEm: u.criadoEm,
            ultimoLogin: u.ultimoLogin
        }));
    } catch (erro) {
        logger.erro('[GerenciadorUsuarios] Erro ao listar:', erro.message);
        return [];
    }
}

/**
 * Obtém estatísticas dos usuários
 * @returns {Object} - Estatísticas
 */
async function obterEstatisticas() {
    try {
        await garantirArquivo();
        const dados = await fs.readJson(USERS_FILE);
        
        const ativos = dados.usuarios.filter(u => u.ativo !== false).length;
        const inativos = dados.usuarios.length - ativos;
        
        const porRole = dados.usuarios.reduce((acc, u) => {
            const role = u.role || 'atendente';
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {});
        
        return {
            total: dados.usuarios.length,
            ativos,
            inativos,
            porRole
        };
    } catch (erro) {
        logger.erro('[GerenciadorUsuarios] Erro ao obter estatísticas:', erro.message);
        return { total: 0, ativos: 0, inativos: 0, porRole: {} };
    }
}

/**
 * Atualiza dados do usuário
 * @param {string} username - Nome de usuário
 * @param {Object} novosDados - Novos dados
 * @returns {Object} - Resultado da operação
 */
async function atualizarUsuario(username, novosDados) {
    try {
        await garantirArquivo();
        const dados = await fs.readJson(USERS_FILE);
        
        const index = dados.usuarios.findIndex(u => 
            u.username.toLowerCase() === username.toLowerCase()
        );
        
        if (index === -1) {
            return { 
                success: false, 
                message: 'Usuário não encontrado' 
            };
        }
        
        // Atualiza mantendo dados originais
        dados.usuarios[index] = {
            ...dados.usuarios[index],
            ...novosDados,
            username: dados.usuarios[index].username, // Não permite mudar username
            atualizadoEm: new Date().toISOString()
        };
        
        await fs.writeJson(USERS_FILE, dados, { spaces: 2 });
        
        logger.info(`[GerenciadorUsuarios] Usuário atualizado: ${username}`);
        
        return { 
            success: true, 
            message: 'Usuário atualizado' 
        };
    } catch (erro) {
        logger.erro('[GerenciadorUsuarios] Erro ao atualizar:', erro.message);
        return { 
            success: false, 
            message: erro.message 
        };
    }
}

/**
 * Remove usuário
 * @param {string} username - Nome de usuário
 * @returns {Object} - Resultado da operação
 */
async function removerUsuario(username) {
    try {
        await garantirArquivo();
        const dados = await fs.readJson(USERS_FILE);
        
        const index = dados.usuarios.findIndex(u => 
            u.username.toLowerCase() === username.toLowerCase()
        );
        
        if (index === -1) {
            return { 
                success: false, 
                message: 'Usuário não encontrado' 
            };
        }
        
        // Previne remoção do admin
        if (dados.usuarios[index].username.toLowerCase() === 'admin') {
            return {
                success: false,
                message: 'Não é possível remover o usuário admin'
            };
        }
        
        dados.usuarios.splice(index, 1);
        await fs.writeJson(USERS_FILE, dados, { spaces: 2 });
        
        logger.info(`[GerenciadorUsuarios] Usuário removido: ${username}`);
        
        return { 
            success: true, 
            message: 'Usuário removido' 
        };
    } catch (erro) {
        logger.erro('[GerenciadorUsuarios] Erro ao remover:', erro.message);
        return { 
            success: false, 
            message: erro.message 
        };
    }
}

/**
 * Registra último login
 * @param {string} username - Nome de usuário
 */
async function registrarLogin(username) {
    try {
        await atualizarUsuario(username, {
            ultimoLogin: new Date().toISOString()
        });
    } catch (erro) {
        logger.erro('[GerenciadorUsuarios] Erro ao registrar login:', erro.message);
    }
}

/**
 * Define status ativo/inativo do usuário
 * @param {string} username - Nome de usuário
 * @param {boolean} ativo - Status ativo (true/false)
 * @returns {Object} - Resultado da operação
 */
async function definirAtivo(username, ativo) {
    try {
        await garantirArquivo();
        const dados = await fs.readJson(USERS_FILE);

        const i = dados.usuarios.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
        if (i === -1) {
            return { success: false, message: 'Usuário não encontrado' };
        }

        if (dados.usuarios[i].username.toLowerCase() === 'admin' && ativo === false) {
            return { success: false, message: 'Não é possível desativar o usuário admin' };
        }

        dados.usuarios[i].ativo = !!ativo;
        dados.usuarios[i].atualizadoEm = new Date().toISOString();
        await fs.writeJson(USERS_FILE, dados, { spaces: 2 });

        logger.info(`[GerenciadorUsuarios] ${ativo ? 'Ativado' : 'Desativado'}: ${username}`);
        return { success: true, message: `Usuário ${ativo ? 'ativado' : 'desativado'}` };
    } catch (erro) {
        logger.erro('[GerenciadorUsuarios] Erro ao definir ativo:', erro.message);
        return { success: false, message: erro.message };
    }
}

module.exports = {
    cadastrarUsuario,
    listarUsuarios,
    obterEstatisticas,
    atualizarUsuario,
    removerUsuario,
    registrarLogin,
    definirAtivo
};