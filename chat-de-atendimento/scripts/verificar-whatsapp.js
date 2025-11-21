/**
 * 🧪 Script de Verificação - Integração WhatsApp
 * 
 * Este script verifica se todas as correções foram aplicadas corretamente
 * e se o ambiente está pronto para testar a integração WhatsApp.
 */

const fs = require('fs-extra');
const path = require('path');

console.log('\n🔍 ===== VERIFICAÇÃO DE CORREÇÕES WHATSAPP =====\n');

let erros = 0;
let avisos = 0;
let sucessos = 0;

// Função auxiliar para verificar arquivo
function verificarArquivo(caminho, descricao) {
    const caminhoCompleto = path.join(__dirname, '..', caminho);
    if (fs.existsSync(caminhoCompleto)) {
        console.log(`✅ ${descricao}`);
        sucessos++;
        return true;
    } else {
        console.log(`❌ ${descricao} - ARQUIVO NÃO ENCONTRADO: ${caminho}`);
        erros++;
        return false;
    }
}

// Função para verificar conteúdo de arquivo
function verificarConteudo(caminho, regex, descricao) {
    const caminhoCompleto = path.join(__dirname, '..', caminho);
    
    if (!fs.existsSync(caminhoCompleto)) {
        console.log(`❌ ${descricao} - ARQUIVO NÃO ENCONTRADO: ${caminho}`);
        erros++;
        return false;
    }
    
    const conteudo = fs.readFileSync(caminhoCompleto, 'utf-8');
    
    if (regex.test(conteudo)) {
        console.log(`✅ ${descricao}`);
        sucessos++;
        return true;
    } else {
        console.log(`⚠️  ${descricao} - CONTEÚDO NÃO ENCONTRADO`);
        avisos++;
        return false;
    }
}

// Função para verificar dependência no package.json
function verificarDependencia(nomePacote) {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const pkg = require(packagePath);
    
    if (pkg.dependencies && pkg.dependencies[nomePacote]) {
        console.log(`✅ Dependência '${nomePacote}' instalada (v${pkg.dependencies[nomePacote]})`);
        sucessos++;
        return true;
    } else {
        console.log(`❌ Dependência '${nomePacote}' NÃO encontrada no package.json`);
        erros++;
        return false;
    }
}

console.log('📦 1. VERIFICANDO DEPENDÊNCIAS\n');
verificarDependencia('whatsapp-web.js');
verificarDependencia('qrcode');
verificarDependencia('puppeteer');
verificarDependencia('ws');

console.log('\n📄 2. VERIFICANDO ARQUIVOS PRINCIPAIS\n');
verificarArquivo('main.js', 'main.js existe');
verificarArquivo('src/interfaces/preload-qr.js', 'preload-qr.js existe');
verificarArquivo('src/interfaces/qr-window.html', 'qr-window.html existe');
verificarArquivo('src/interfaces/index.html', 'index.html existe');

console.log('\n🔧 3. VERIFICANDO CORREÇÕES APLICADAS\n');

// Correção 1: API Exposure no preload-qr.js
verificarConteudo(
    'src/interfaces/preload-qr.js',
    /contextBridge\.exposeInMainWorld\(\s*['"]qrAPI['"]/,
    "Correção 1: preload-qr.js expõe 'qrAPI' (não 'electronAPI')"
);

verificarConteudo(
    'src/interfaces/preload-qr.js',
    /startConnection:\s*\([^)]*\)\s*=>\s*ipcRenderer\.invoke\(\s*['"]start-whatsapp-connection['"]/,
    "Correção 1: método startConnection() existe no preload-qr.js"
);

// Correção 2: QR Code DataURL no main.js
verificarConteudo(
    'main.js',
    /qrcode\.toDataURL\(qr\)/,
    "Correção 2: QR Code convertido para DataURL no main.js"
);

// Correção 3: Handler start-whatsapp-connection
verificarConteudo(
    'main.js',
    /ipcMain\.handle\(\s*['"]start-whatsapp-connection['"]/,
    "Correção 3: Handler 'start-whatsapp-connection' existe no main.js"
);

// Correção 4: Evento whatsapp-ready enviado
verificarConteudo(
    'main.js',
    /qrWindow\.webContents\.send\(\s*['"]whatsapp-ready['"]/,
    "Correção 4: Evento 'whatsapp-ready' é enviado para janela QR"
);

console.log('\n📚 4. VERIFICANDO DOCUMENTAÇÃO\n');
verificarArquivo('docs/TESTE-WHATSAPP.md', 'Guia de testes existe');
verificarArquivo('docs/CORRECOES-WHATSAPP.md', 'Documentação de correções existe');
verificarArquivo('docs/COMANDOS.md', 'Documentação de comandos existe');

console.log('\n🗂️  5. VERIFICANDO ESTRUTURA DE DADOS\n');
verificarArquivo('dados/usuarios.json', 'Banco de usuários existe');

if (fs.existsSync(path.join(__dirname, '..', 'dados', 'usuarios-cadastrados.json'))) {
    console.log('⚠️  Arquivo legado "usuarios-cadastrados.json" ainda existe (deveria ter sido removido)');
    avisos++;
} else {
    console.log('✅ Arquivo legado "usuarios-cadastrados.json" foi removido');
    sucessos++;
}

console.log('\n🔍 6. VERIFICANDO FLUXO UI\n');

// Verificar botão "Conectar WhatsApp" no index.html
verificarConteudo(
    'src/interfaces/index.html',
    /onclick\s*=\s*["']abrirNovoQR\(\)["']/,
    'Botão "Conectar WhatsApp" com onclick correto'
);

// Verificar função abrirNovoQR no index.html
verificarConteudo(
    'src/interfaces/index.html',
    /function\s+abrirNovoQR\(\)/,
    'Função abrirNovoQR() existe no index.html'
);

// Verificar chamada window.electronAPI.abrirNovaJanelaQR
verificarConteudo(
    'src/interfaces/index.html',
    /window\.electronAPI\.abrirNovaJanelaQR\(\)/,
    'Função abrirNovoQR() chama window.electronAPI.abrirNovaJanelaQR()'
);

// Verificar preload.js expõe abrirNovaJanelaQR
verificarConteudo(
    'src/interfaces/preload.js',
    /abrirNovaJanelaQR:\s*\(\)\s*=>\s*ipcRenderer\.invoke\(\s*['"]open-new-qr-window['"]/,
    'preload.js expõe abrirNovaJanelaQR() no electronAPI'
);

// Verificar handler open-new-qr-window no main.js
verificarConteudo(
    'main.js',
    /ipcMain\.handle\(\s*['"]open-new-qr-window['"]/,
    "Handler 'open-new-qr-window' existe no main.js"
);

console.log('\n📊 ===== RESULTADO DA VERIFICAÇÃO =====\n');
console.log(`✅ Sucessos: ${sucessos}`);
console.log(`⚠️  Avisos:   ${avisos}`);
console.log(`❌ Erros:    ${erros}`);

if (erros > 0) {
    console.log('\n❌ VERIFICAÇÃO FALHOU - Corrija os erros acima antes de testar.');
    console.log('\n📖 Consulte docs/CORRECOES-WHATSAPP.md para detalhes das correções necessárias.\n');
    process.exit(1);
} else if (avisos > 0) {
    console.log('\n⚠️  VERIFICAÇÃO PASSOU COM AVISOS - Recomenda-se revisar os avisos.');
    console.log('\n📖 Consulte docs/TESTE-WHATSAPP.md para instruções de teste.\n');
    process.exit(0);
} else {
    console.log('\n✅ VERIFICAÇÃO PASSOU - Sistema pronto para teste!');
    console.log('\n📖 Próximos passos:');
    console.log('   1. Execute: npm start');
    console.log('   2. Faça login com admin/admin');
    console.log('   3. Clique em "Conectar WhatsApp"');
    console.log('   4. Escaneie o QR Code');
    console.log('\n📄 Consulte docs/TESTE-WHATSAPP.md para guia completo.\n');
    process.exit(0);
}
