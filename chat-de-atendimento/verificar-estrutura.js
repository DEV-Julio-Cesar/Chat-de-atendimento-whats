// =========================================================================
// SCRIPT DE VERIFICAÇÃO E CORREÇÃO DA ESTRUTURA DO PROJETO
// =========================================================================

const fs = require('fs-extra');
const path = require('path');

const estruturaEsperada = {
    'dados': {
        type: 'directory',
        children: {
            'logs': { type: 'directory' },
            'usuarios.json': { 
                type: 'file',
                content: JSON.stringify({ usuarios: [] }, null, 2)
            }
        }
    },
    'src': {
        type: 'directory',
        children: {
            'aplicacao': {
                type: 'directory',
                children: {
                    'validacao-credenciais.js': { type: 'file', required: true },
                    'gerenciador-usuarios.js': { type: 'file', required: true }
                }
            },
            'infraestrutura': {
                type: 'directory',
                children: {
                    'logger.js': { type: 'file', required: true }
                }
            },
            'interfaces': {
                type: 'directory',
                children: {
                    'login.html': { type: 'file', required: true },
                    'index.html': { type: 'file', required: true },
                    'qr-window.html': { type: 'file', required: true },
                    'cadastro.html': { type: 'file', required: true },
                    'history.html': { type: 'file', required: true },
                    'preload-login.js': { type: 'file', required: true },
                    'preload.js': { type: 'file', required: true },
                    'preload-qr.js': { type: 'file', required: true },
                    'preload-cadastro.js': { type: 'file', required: true },
                    'preload-history.js': { type: 'file', required: true }
                }
            }
        }
    },
    'main.js': { type: 'file', required: true },
    'package.json': { type: 'file', required: true }
};

const ROOT = __dirname;

function verificarEstrutura(estrutura, basePath = ROOT) {
    const problemas = [];
    const criados = [];

    for (const [nome, config] of Object.entries(estrutura)) {
        const caminhoCompleto = path.join(basePath, nome);

        if (config.type === 'directory') {
            if (!fs.existsSync(caminhoCompleto)) {
                try {
                    fs.ensureDirSync(caminhoCompleto);
                    criados.push(`📁 Pasta criada: ${path.relative(ROOT, caminhoCompleto)}`);
                } catch (erro) {
                    problemas.push(`❌ Erro ao criar pasta: ${path.relative(ROOT, caminhoCompleto)} - ${erro.message}`);
                }
            }

            if (config.children) {
                const resultado = verificarEstrutura(config.children, caminhoCompleto);
                problemas.push(...resultado.problemas);
                criados.push(...resultado.criados);
            }
        } else if (config.type === 'file') {
            if (!fs.existsSync(caminhoCompleto)) {
                if (config.required) {
                    problemas.push(`❌ Arquivo obrigatório faltando: ${path.relative(ROOT, caminhoCompleto)}`);
                } else {
                    if (config.content) {
                        try {
                            fs.writeFileSync(caminhoCompleto, config.content, 'utf-8');
                            criados.push(`📄 Arquivo criado: ${path.relative(ROOT, caminhoCompleto)}`);
                        } catch (erro) {
                            problemas.push(`❌ Erro ao criar arquivo: ${path.relative(ROOT, caminhoCompleto)} - ${erro.message}`);
                        }
                    }
                }
            } else {
                // Verifica se o arquivo está vazio
                const conteudo = fs.readFileSync(caminhoCompleto, 'utf-8').trim();
                if (conteudo.length === 0 && config.required) {
                    problemas.push(`⚠️ Arquivo vazio: ${path.relative(ROOT, caminhoCompleto)}`);
                }
            }
        }
    }

    return { problemas, criados };
}

function verificarDependencias() {
    const packageJsonPath = path.join(ROOT, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
        return ['❌ package.json não encontrado!'];
    }

    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const dependenciasNecessarias = [
            'electron',
            'whatsapp-web.js',
            'axios',
            'ws',
            'qrcode',
            'fs-extra'
        ];

        const faltando = dependenciasNecessarias.filter(dep => 
            !packageJson.dependencies || !packageJson.dependencies[dep]
        );

        return faltando.map(dep => `⚠️ Dependência faltando: ${dep}`);
    } catch (erro) {
        return [`❌ Erro ao ler package.json: ${erro.message}`];
    }
}

function verificarNodeModules() {
    const nodeModulesPath = path.join(ROOT, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
        return ['⚠️ node_modules não encontrado. Execute: npm install'];
    }
    return [];
}

function gerarRelatorio() {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 VERIFICAÇÃO DA ESTRUTURA DO PROJETO');
    console.log('='.repeat(70) + '\n');

    const { problemas, criados } = verificarEstrutura(estruturaEsperada);
    const depProblemas = verificarDependencias();
    const nodeModulesProblemas = verificarNodeModules();

    if (criados.length > 0) {
        console.log('✅ ARQUIVOS E PASTAS CRIADOS:\n');
        criados.forEach(msg => console.log('   ' + msg));
        console.log('');
    }

    if (problemas.length > 0) {
        console.log('❌ PROBLEMAS ENCONTRADOS:\n');
        problemas.forEach(msg => console.log('   ' + msg));
        console.log('');
        console.log('💡 SOLUÇÃO: Certifique-se de que todos os arquivos foram criados.');
        console.log('   Os arquivos podem ter sido fornecidos anteriormente no chat.\n');
    }

    if (depProblemas.length > 0) {
        console.log('⚠️ DEPENDÊNCIAS NO PACKAGE.JSON:\n');
        depProblemas.forEach(msg => console.log('   ' + msg));
        console.log('');
    }

    if (nodeModulesProblemas.length > 0) {
        console.log('⚠️ MÓDULOS NODE:\n');
        nodeModulesProblemas.forEach(msg => console.log('   ' + msg));
        console.log('\n   💡 Execute: npm install\n');
    }

    if (problemas.length === 0 && depProblemas.length === 0 && nodeModulesProblemas.length === 0 && criados.length === 0) {
        console.log('✅ TUDO OK! Estrutura do projeto está correta.\n');
        console.log('   Agora execute: npm start\n');
    } else if (problemas.length === 0 && depProblemas.length === 0 && nodeModulesProblemas.length === 0) {
        console.log('✅ ESTRUTURA CORRIGIDA!\n');
        console.log('   Agora execute: npm start\n');
    } else if (problemas.length > 0) {
        console.log('⚠️ AÇÃO NECESSÁRIA:\n');
        console.log('   1. Certifique-se de criar os arquivos faltando');
        console.log('   2. Execute: npm install (se necessário)');
        console.log('   3. Execute: npm start\n');
    }

    console.log('='.repeat(70) + '\n');

    // Retorna código de saída
    process.exit(problemas.length > 0 ? 1 : 0);
}

// Executa verificação
try {
    gerarRelatorio();
} catch (erro) {
    console.error('\n❌ ERRO FATAL:', erro.message);
    console.error(erro.stack);
    process.exit(1);
}// =========================================================================
// MÓDULO DE VALIDAÇÃO DE CREDENCIAIS
// =========================================================================

/**
 * Valida credenciais de usuário
 * @param {string} username - Nome de usuário
 * @param {string} password - Senha
 * @returns {boolean} - True se válido
 */
function validarCredenciais(username, password) {
    // Base de usuários padrão
    // TODO: Migrar para banco de dados com hash de senha
    const usuariosValidos = {
        'admin': 'admin123',
        'atendente': 'atendente123',
        'gerente': 'gerente123',
        'supervisor': 'supervisor123'
    };
    
    // Verifica se usuário existe e senha está correta
    if (!username || !password) {
        return false;
    }
    
    return usuariosValidos[username.toLowerCase()] === password;
}

/**
 * Verifica nível de permissão do usuário
 * @param {string} username - Nome de usuário
 * @returns {string} - Nível de permissão
 */
function obterNivelPermissao(username) {
    const permissoes = {
        'admin': 'administrador',
        'gerente': 'gerente',
        'supervisor': 'supervisor',
        'atendente': 'atendente'
    };
    
    return permissoes[username.toLowerCase()] || 'atendente';
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
    validarForcaSenha
};