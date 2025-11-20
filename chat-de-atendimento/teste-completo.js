// =========================================================================
// SISTEMA DE TESTE E DIAGNÓSTICO COMPLETO
// =========================================================================

const fs = require('fs-extra');
const path = require('path');

const ROOT = __dirname;
const resultados = {
    passos: [],
    erros: [],
    avisos: [],
    sucessos: []
};

// =========================================================================
// UTILITÁRIOS
// =========================================================================

function log(tipo, mensagem) {
    const timestamp = new Date().toLocaleTimeString();
    const msg = `[${timestamp}] ${mensagem}`;
    
    switch(tipo) {
        case 'sucesso':
            console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
            resultados.sucessos.push(mensagem);
            break;
        case 'erro':
            console.log(`\x1b[31m❌ ${msg}\x1b[0m`);
            resultados.erros.push(mensagem);
            break;
        case 'aviso':
            console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`);
            resultados.avisos.push(mensagem);
            break;
        case 'info':
            console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`);
            resultados.passos.push(mensagem);
            break;
    }
}

function separador() {
    console.log('\n' + '='.repeat(70) + '\n');
}

// =========================================================================
// TESTE 1: ESTRUTURA DE PASTAS
// =========================================================================

function testarEstruturaPastas() {
    log('info', 'TESTE 1: Verificando estrutura de pastas...');
    
    const pastasNecessarias = [
        'dados',
        'dados/logs',
        'src',
        'src/aplicacao',
        'src/infraestrutura',
        'src/interfaces'
    ];
    
    let todasOk = true;
    
    pastasNecessarias.forEach(pasta => {
        const caminho = path.join(ROOT, pasta);
        if (fs.existsSync(caminho)) {
            log('sucesso', `Pasta existe: ${pasta}`);
        } else {
            log('erro', `Pasta faltando: ${pasta}`);
            try {
                fs.ensureDirSync(caminho);
                log('sucesso', `Pasta criada: ${pasta}`);
            } catch (erro) {
                log('erro', `Erro ao criar ${pasta}: ${erro.message}`);
                todasOk = false;
            }
        }
    });
    
    return todasOk;
}

// =========================================================================
// TESTE 2: ARQUIVOS OBRIGATÓRIOS
// =========================================================================

function testarArquivosObrigatorios() {
    log('info', 'TESTE 2: Verificando arquivos obrigatórios...');
    
    const arquivosObrigatorios = {
        'main.js': 'Arquivo principal do Electron',
        'package.json': 'Configuração do projeto',
        'src/aplicacao/validacao-credenciais.js': 'Módulo de validação',
        'src/aplicacao/gerenciador-usuarios.js': 'Gerenciador de usuários',
        'src/infraestrutura/logger.js': 'Sistema de logs',
        'src/interfaces/login.html': 'Tela de login',
        'src/interfaces/index.html': 'Tela principal',
        'src/interfaces/qr-window.html': 'Janela QR Code',
        'src/interfaces/cadastro.html': 'Tela de cadastro',
        'src/interfaces/history.html': 'Tela de histórico',
        'src/interfaces/preload-login.js': 'Preload login',
        'src/interfaces/preload.js': 'Preload principal',
        'src/interfaces/preload-qr.js': 'Preload QR',
        'src/interfaces/preload-cadastro.js': 'Preload cadastro',
        'src/interfaces/preload-history.js': 'Preload histórico'
    };
    
    let todosOk = true;
    
    Object.entries(arquivosObrigatorios).forEach(([arquivo, descricao]) => {
        const caminho = path.join(ROOT, arquivo);
        if (fs.existsSync(caminho)) {
            const tamanho = fs.statSync(caminho).size;
            if (tamanho === 0) {
                log('aviso', `${arquivo} está vazio`);
            } else {
                log('sucesso', `${arquivo} OK (${tamanho} bytes)`);
            }
        } else {
            log('erro', `${arquivo} não encontrado - ${descricao}`);
            todosOk = false;
        }
    });
    
    return todosOk;
}

// =========================================================================
// TESTE 3: CONTEÚDO DOS ARQUIVOS
// =========================================================================

function testarConteudoArquivos() {
    log('info', 'TESTE 3: Validando conteúdo dos arquivos...');
    
    const validacoes = [
        {
            arquivo: 'main.js',
            verificar: ['require', 'BrowserWindow', 'app.whenReady', 'ipcMain'],
            descricao: 'Estrutura Electron'
        },
        {
            arquivo: 'package.json',
            verificar: ['electron', 'whatsapp-web.js', 'main.js'],
            descricao: 'Dependências corretas'
        },
        {
            arquivo: 'src/aplicacao/validacao-credenciais.js',
            verificar: ['validarCredenciais', 'module.exports'],
            descricao: 'Exportação de funções'
        },
        {
            arquivo: 'src/aplicacao/gerenciador-usuarios.js',
            verificar: ['cadastrarUsuario', 'listarUsuarios', 'module.exports'],
            descricao: 'Funções de gerenciamento'
        },
        {
            arquivo: 'src/infraestrutura/logger.js',
            verificar: ['info', 'erro', 'aviso', 'module.exports'],
            descricao: 'Funções de log'
        }
    ];
    
    let todosOk = true;
    
    validacoes.forEach(({ arquivo, verificar, descricao }) => {
        const caminho = path.join(ROOT, arquivo);
        if (fs.existsSync(caminho)) {
            const conteudo = fs.readFileSync(caminho, 'utf-8');
            const faltando = verificar.filter(palavra => !conteudo.includes(palavra));
            
            if (faltando.length === 0) {
                log('sucesso', `${arquivo}: ${descricao} ✓`);
            } else {
                log('erro', `${arquivo}: Faltam elementos - ${faltando.join(', ')}`);
                todosOk = false;
            }
        } else {
            log('erro', `${arquivo}: Arquivo não encontrado`);
            todosOk = false;
        }
    });
    
    return todosOk;
}

// =========================================================================
// TESTE 4: PACKAGE.JSON
// =========================================================================

function testarPackageJson() {
    log('info', 'TESTE 4: Validando package.json...');
    
    const packagePath = path.join(ROOT, 'package.json');
    
    if (!fs.existsSync(packagePath)) {
        log('erro', 'package.json não encontrado');
        return false;
    }
    
    try {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        
        // Verifica campos essenciais
        const camposObrigatorios = ['name', 'version', 'main', 'dependencies'];
        const faltando = camposObrigatorios.filter(campo => !packageJson[campo]);
        
        if (faltando.length > 0) {
            log('erro', `Campos faltando no package.json: ${faltando.join(', ')}`);
            return false;
        }
        
        log('sucesso', `Nome: ${packageJson.name}`);
        log('sucesso', `Versão: ${packageJson.version}`);
        log('sucesso', `Main: ${packageJson.main}`);
        
        // Verifica dependências críticas
        const depsCriticas = [
            'electron',
            'whatsapp-web.js',
            'axios',
            'ws',
            'qrcode',
            'fs-extra'
        ];
        
        const depsFaltando = depsCriticas.filter(dep => 
            !packageJson.dependencies || !packageJson.dependencies[dep]
        );
        
        if (depsFaltando.length > 0) {
            log('erro', `Dependências faltando: ${depsFaltando.join(', ')}`);
            return false;
        }
        
        log('sucesso', 'Todas as dependências necessárias estão declaradas');
        
        // Verifica scripts
        if (!packageJson.scripts || !packageJson.scripts.start) {
            log('aviso', 'Script "start" não encontrado');
        } else {
            log('sucesso', `Script start: ${packageJson.scripts.start}`);
        }
        
        return true;
        
    } catch (erro) {
        log('erro', `Erro ao ler package.json: ${erro.message}`);
        return false;
    }
}

// =========================================================================
// TESTE 5: NODE_MODULES
// =========================================================================

function testarNodeModules() {
    log('info', 'TESTE 5: Verificando node_modules...');
    
    const nodeModulesPath = path.join(ROOT, 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
        log('erro', 'node_modules não encontrado');
        log('info', 'Execute: npm install');
        return false;
    }
    
    const modulosCriticos = [
        'electron',
        'whatsapp-web.js',
        'puppeteer',
        'axios',
        'ws',
        'qrcode',
        'fs-extra'
    ];
    
    let todosInstalados = true;
    
    modulosCriticos.forEach(modulo => {
        const moduloPath = path.join(nodeModulesPath, modulo);
        if (fs.existsSync(moduloPath)) {
            log('sucesso', `Módulo instalado: ${modulo}`);
        } else {
            log('erro', `Módulo faltando: ${modulo}`);
            todosInstalados = false;
        }
    });
    
    if (!todosInstalados) {
        log('info', 'Execute: npm install');
    }
    
    return todosInstalados;
}

// =========================================================================
// TESTE 6: SINTAXE JAVASCRIPT
// =========================================================================

function testarSintaxe() {
    log('info', 'TESTE 6: Validando sintaxe JavaScript...');
    
    const arquivosJS = [
        'main.js',
        'src/aplicacao/validacao-credenciais.js',
        'src/aplicacao/gerenciador-usuarios.js',
        'src/infraestrutura/logger.js',
        'src/interfaces/preload-login.js',
        'src/interfaces/preload.js',
        'src/interfaces/preload-qr.js',
        'src/interfaces/preload-cadastro.js',
        'src/interfaces/preload-history.js'
    ];
    
    let todosOk = true;
    
    arquivosJS.forEach(arquivo => {
        const caminho = path.join(ROOT, arquivo);
        if (fs.existsSync(caminho)) {
            try {
                const conteudo = fs.readFileSync(caminho, 'utf-8');
                
                // Testa require()
                new Function(`"use strict"; ${conteudo}`);
                
                log('sucesso', `Sintaxe OK: ${arquivo}`);
            } catch (erro) {
                log('erro', `Erro de sintaxe em ${arquivo}: ${erro.message}`);
                todosOk = false;
            }
        }
    });
    
    return todosOk;
}

// =========================================================================
// TESTE 7: ARQUIVOS DE DADOS
// =========================================================================

function testarArquivosDados() {
    log('info', 'TESTE 7: Verificando arquivos de dados...');
    
    const usuariosPath = path.join(ROOT, 'dados/usuarios.json');
    
    if (!fs.existsSync(usuariosPath)) {
        log('aviso', 'usuarios.json não existe, criando...');
        try {
            fs.writeJsonSync(usuariosPath, { usuarios: [] }, { spaces: 2 });
            log('sucesso', 'usuarios.json criado');
        } catch (erro) {
            log('erro', `Erro ao criar usuarios.json: ${erro.message}`);
            return false;
        }
    } else {
        try {
            const dados = fs.readJsonSync(usuariosPath);
            if (!dados.usuarios || !Array.isArray(dados.usuarios)) {
                log('erro', 'Estrutura inválida em usuarios.json');
                return false;
            }
            log('sucesso', `usuarios.json OK (${dados.usuarios.length} usuários)`);
        } catch (erro) {
            log('erro', `Erro ao ler usuarios.json: ${erro.message}`);
            return false;
        }
    }
    
    return true;
}

// =========================================================================
// TESTE 8: PERMISSÕES DE ESCRITA
// =========================================================================

function testarPermissoes() {
    log('info', 'TESTE 8: Testando permissões de escrita...');
    
    const testFile = path.join(ROOT, 'dados', '.test-write');
    
    try {
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        log('sucesso', 'Permissões de escrita OK');
        return true;
    } catch (erro) {
        log('erro', `Sem permissão de escrita: ${erro.message}`);
        return false;
    }
}

// =========================================================================
// TESTE 9: VERIFICAÇÃO DE SEGURANÇA
// =========================================================================

function testarSeguranca() {
    log('info', 'TESTE 9: Verificando configurações de segurança...');
    
    const mainPath = path.join(ROOT, 'main.js');
    
    if (!fs.existsSync(mainPath)) {
        log('erro', 'main.js não encontrado');
        return false;
    }
    
    const conteudo = fs.readFileSync(mainPath, 'utf-8');
    
    const verificacoes = [
        { texto: 'contextIsolation: true', descricao: 'Context Isolation habilitado' },
        { texto: 'nodeIntegration: false', descricao: 'Node Integration desabilitado' },
        { texto: 'contextBridge', descricao: 'Context Bridge utilizado' }
    ];
    
    let seguro = true;
    
    verificacoes.forEach(({ texto, descricao }) => {
        if (conteudo.includes(texto)) {
            log('sucesso', descricao);
        } else {
            log('aviso', `${descricao} não encontrado`);
            seguro = false;
        }
    });
    
    return seguro;
}

// =========================================================================
// RELATÓRIO FINAL
// =========================================================================

function gerarRelatorioFinal() {
    separador();
    console.log('\x1b[1m📊 RELATÓRIO FINAL DE DIAGNÓSTICO\x1b[0m\n');
    
    console.log(`✅ Sucessos: ${resultados.sucessos.length}`);
    console.log(`⚠️  Avisos: ${resultados.avisos.length}`);
    console.log(`❌ Erros: ${resultados.erros.length}`);
    
    if (resultados.erros.length > 0) {
        console.log('\n\x1b[31m🔴 ERROS ENCONTRADOS:\x1b[0m');
        resultados.erros.forEach((erro, i) => {
            console.log(`   ${i + 1}. ${erro}`);
        });
    }
    
    if (resultados.avisos.length > 0) {
        console.log('\n\x1b[33m🟡 AVISOS:\x1b[0m');
        resultados.avisos.forEach((aviso, i) => {
            console.log(`   ${i + 1}. ${aviso}`);
        });
    }
    
    separador();
    
    if (resultados.erros.length === 0) {
        console.log('\x1b[32m\x1b[1m✅ SISTEMA PRONTO PARA USO!\x1b[0m\n');
        console.log('Execute: \x1b[36mnpm start\x1b[0m\n');
        return true;
    } else {
        console.log('\x1b[31m\x1b[1m❌ CORRIJA OS ERROS ANTES DE INICIAR\x1b[0m\n');
        console.log('Passos sugeridos:');
        console.log('1. Verifique os erros listados acima');
        console.log('2. Execute: \x1b[36mnpm install\x1b[0m (se houver módulos faltando)');
        console.log('3. Execute este teste novamente: \x1b[36mnode teste-completo.js\x1b[0m\n');
        return false;
    }
}

// =========================================================================
// EXECUÇÃO PRINCIPAL
// =========================================================================

async function executarTodosTestes() {
    console.clear();
    separador();
    console.log('\x1b[1m🔍 SISTEMA DE DIAGNÓSTICO COMPLETO\x1b[0m');
    console.log('Verificando integridade do projeto...');
    separador();
    
    const testes = [
        { nome: 'Estrutura de Pastas', funcao: testarEstruturaPastas },
        { nome: 'Arquivos Obrigatórios', funcao: testarArquivosObrigatorios },
        { nome: 'Conteúdo dos Arquivos', funcao: testarConteudoArquivos },
        { nome: 'Package.json', funcao: testarPackageJson },
        { nome: 'Node Modules', funcao: testarNodeModules },
        { nome: 'Sintaxe JavaScript', funcao: testarSintaxe },
        { nome: 'Arquivos de Dados', funcao: testarArquivosDados },
        { nome: 'Permissões', funcao: testarPermissoes },
        { nome: 'Segurança', funcao: testarSeguranca }
    ];
    
    for (const teste of testes) {
        separador();
        teste.funcao();
    }
    
    const sistemaOk = gerarRelatorioFinal();
    process.exit(sistemaOk ? 0 : 1);
}

// Inicia testes
executarTodosTestes().catch(erro => {
    console.error('\n❌ Erro fatal durante os testes:', erro.message);
    console.error(erro.stack);
    process.exit(1);
});