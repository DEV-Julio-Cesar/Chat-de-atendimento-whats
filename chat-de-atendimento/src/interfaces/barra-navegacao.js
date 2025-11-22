/**
 * 🧭 Navigation Bar Component
 * 
 * Componente reutilizável de navegação para todas as telas.
 * Adicione este script em qualquer HTML para ter navegação automática.
 */

// Estilos CSS para a barra de navegação
const navigationStyles = `
<style>
    .navigation-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 50px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        padding: 0 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 9999;
        gap: 10px;
    }

    .nav-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .nav-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
    }

    .nav-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .nav-title {
        flex: 1;
        color: white;
        font-size: 16px;
        font-weight: 600;
        text-align: center;
    }

    .nav-home-btn {
        background: rgba(255, 255, 255, 0.9);
        color: #667eea;
    }

    .nav-home-btn:hover {
        background: white;
    }

    /* Adicionar margem ao body para compensar barra fixa */
    body {
        padding-top: 60px !important;
    }
</style>
`;

// HTML da barra de navegação
const navigationHTML = `
<div class="navigation-bar">
    <button class="nav-btn" id="navBackBtn" onclick="navigationGoBack()" disabled>
        ← Voltar
    </button>
    <button class="nav-btn" id="navForwardBtn" onclick="navigationGoForward()" disabled>
        Avançar →
    </button>
    <div class="nav-title" id="navTitle">Sistema WhatsApp</div>
    <button class="nav-btn nav-home-btn" onclick="navigationGoHome()">
        🏠 Início
    </button>
</div>
`;

/**
 * Inicializa a barra de navegação
 * Chame esta função no final do <body> ou em DOMContentLoaded
 */
function initNavigationBar(pageTitle = '') {
    // Adicionar estilos
    document.head.insertAdjacentHTML('beforeend', navigationStyles);
    
    // Adicionar HTML da navegação
    document.body.insertAdjacentHTML('afterbegin', navigationHTML);
    
    // Atualizar título se fornecido
    if (pageTitle) {
        document.getElementById('navTitle').textContent = pageTitle;
    }
    
    // Listener para atualização de estado
    if (window.navigationAPI) {
        window.navigationAPI.onNavigationStateUpdate((state) => {
            updateNavigationState(state);
        });
    }
    
    // Solicitar estado inicial
    requestNavigationState();
}

/**
 * Atualiza estado dos botões de navegação
 */
function updateNavigationState(state) {
    const backBtn = document.getElementById('navBackBtn');
    const forwardBtn = document.getElementById('navForwardBtn');
    
    if (backBtn) {
        backBtn.disabled = !state.canGoBack;
    }
    
    if (forwardBtn) {
        forwardBtn.disabled = !state.canGoForward;
    }
}

/**
 * Solicita estado de navegação atual
 */
function requestNavigationState() {
    if (window.navigationAPI && window.navigationAPI.getState) {
        window.navigationAPI.getState().then(state => {
            if (state) {
                updateNavigationState(state);
            }
        });
    }
}

/**
 * Volta para a página anterior
 */
function navigationGoBack() {
    if (window.navigationAPI && window.navigationAPI.goBack) {
        window.navigationAPI.goBack();
    }
}

/**
 * Avança para a próxima página
 */
function navigationGoForward() {
    if (window.navigationAPI && window.navigationAPI.goForward) {
        window.navigationAPI.goForward();
    }
}

/**
 * Vai para a página inicial (principal)
 */
function navigationGoHome() {
    if (window.navigationAPI && window.navigationAPI.navigate) {
        window.navigationAPI.navigate('principal');
    }
}

/**
 * Navega para uma rota específica
 */
function navigateTo(route, params = {}) {
    if (window.navigationAPI && window.navigationAPI.navigate) {
        window.navigationAPI.navigate(route, params);
    }
}

// Auto-inicializar se document já estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // A página deve chamar initNavigationBar('Título da Página')
    });
} else {
    // Document já está pronto, mas esperamos a página chamar manualmente
}
