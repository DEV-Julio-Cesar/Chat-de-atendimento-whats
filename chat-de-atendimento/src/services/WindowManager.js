/**
 * 🪟 WindowManager
 * 
 * Gerenciador centralizado de janelas do Electron.
 * Garante que apenas UMA janela principal esteja aberta por vez,
 * com suporte a navegação e histórico (voltar/avançar).
 */

const { BrowserWindow } = require('electron');
const path = require('path');
const logger = require('../infraestrutura/logger');

class WindowManager {
    constructor() {
        this.currentWindow = null;
        this.navigationHistory = [];
        this.currentIndex = -1;
        
        // Configurações de janelas por rota
        this.windowConfigs = {
            'login': {
                file: 'src/interfaces/login.html',
                preload: 'src/interfaces/preload-login.js',
                width: 450,
                height: 600,
                resizable: false,
                title: 'Login - Sistema WhatsApp'
            },
            'principal': {
                file: 'src/interfaces/index.html',
                preload: 'src/interfaces/preload.js',
                width: 1000,
                height: 700,
                resizable: true,
                title: 'Sistema de Atendimento WhatsApp'
            },
            'pool-manager': {
                file: 'src/interfaces/pool-manager.html',
                preload: 'src/interfaces/preload-pool-manager.js',
                width: 1200,
                height: 800,
                resizable: true,
                title: 'Gerenciador de Conexões WhatsApp'
            },
            'chat': {
                file: 'src/interfaces/chat.html',
                preload: 'src/interfaces/preload-chat.js',
                width: 1000,
                height: 700,
                resizable: true,
                title: 'Chat WhatsApp'
            },
            'dashboard': {
                file: 'src/interfaces/dashboard.html',
                preload: 'src/interfaces/preload-dashboard.js',
                width: 1200,
                height: 800,
                resizable: true,
                title: 'Dashboard - Métricas'
            },
            'chatbot': {
                file: 'src/interfaces/chatbot.html',
                preload: 'src/interfaces/preload-chatbot.js',
                width: 900,
                height: 700,
                resizable: true,
                title: 'Configuração do Chatbot'
            },
            'usuarios': {
                file: 'src/interfaces/usuarios.html',
                preload: 'src/interfaces/preload-usuarios.js',
                width: 900,
                height: 650,
                resizable: true,
                title: 'Gerenciar Usuários'
            },
            'history': {
                file: 'src/interfaces/history.html',
                preload: 'src/interfaces/preload-history.js',
                width: 1000,
                height: 700,
                resizable: true,
                title: 'Histórico de Conversas'
            },
            'cadastro': {
                file: 'src/interfaces/cadastro.html',
                preload: 'src/interfaces/preload-cadastro.js',
                width: 500,
                height: 650,
                resizable: false,
                title: 'Cadastro de Usuário'
            },
            'health': {
                file: 'src/interfaces/health.html',
                preload: 'src/interfaces/preload-health.js',
                width: 1200,
                height: 800,
                resizable: true,
                title: '🏥 Health - Sistema'
            }
        };
    }

    /**
     * Navega para uma nova rota, fechando a janela anterior
     * @param {string} route - Nome da rota (ex: 'principal', 'chat')
     * @param {Object} params - Parâmetros para passar à nova janela (opcional)
     * @param {boolean} addToHistory - Se deve adicionar ao histórico (padrão: true)
     */
    navigate(route, params = {}, addToHistory = true) {
        const config = this.windowConfigs[route];
        
        if (!config) {
            logger.erro(`[WindowManager] Rota desconhecida: ${route}`);
            return null;
        }

        logger.info(`[WindowManager] Navegando para: ${route}`);

        // Fechar janela atual se existir
        if (this.currentWindow && !this.currentWindow.isDestroyed()) {
            this.currentWindow.close();
        }

        // Criar nova janela
        this.currentWindow = new BrowserWindow({
            width: config.width,
            height: config.height,
            title: config.title,
            resizable: config.resizable,
            webPreferences: {
                preload: path.join(__dirname, '..', '..', config.preload),
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        // Carregar arquivo HTML
        this.currentWindow.loadFile(config.file);

        // Enviar parâmetros após carregar
        if (Object.keys(params).length > 0) {
            this.currentWindow.webContents.once('did-finish-load', () => {
                this.currentWindow.webContents.send('navigation-params', params);
            });
        }

        // Adicionar ao histórico
        if (addToHistory) {
            // Remover histórico futuro se estamos no meio da pilha
            if (this.currentIndex < this.navigationHistory.length - 1) {
                this.navigationHistory = this.navigationHistory.slice(0, this.currentIndex + 1);
            }

            // Evitar duplicar mesma rota consecutiva com mesmos parâmetros
            if (this.currentIndex >= 0) {
                const last = this.navigationHistory[this.currentIndex];
                if (last.route === route && JSON.stringify(last.params) === JSON.stringify(params)) {
                    logger.info(`[WindowManager] Ignorando empilhamento duplicado da rota: ${route}`);
                    addToHistory = false;
                }
            }

            if (addToHistory) {
            
            this.navigationHistory.push({ route, params });
            this.currentIndex = this.navigationHistory.length - 1;
            }
        }

        // Atualizar estado de navegação
        this._updateNavigationState();

        // Handler para quando a janela for fechada
        this.currentWindow.on('closed', () => {
            this.currentWindow = null;
        });

        return this.currentWindow;
    }

    /**
     * Volta para a rota anterior no histórico
     */
    goBack() {
        if (!this.canGoBack()) {
            logger.aviso('[WindowManager] Não há histórico anterior');
            return false;
        }

        this.currentIndex--;
        const previous = this.navigationHistory[this.currentIndex];
        
        logger.info(`[WindowManager] Voltando para: ${previous.route}`);
        this.navigate(previous.route, previous.params, false);
        
        return true;
    }

    /**
     * Avança para a próxima rota no histórico
     */
    goForward() {
        if (!this.canGoForward()) {
            logger.aviso('[WindowManager] Não há histórico futuro');
            return false;
        }

        this.currentIndex++;
        const next = this.navigationHistory[this.currentIndex];
        
        logger.info(`[WindowManager] Avançando para: ${next.route}`);
        this.navigate(next.route, next.params, false);
        
        return true;
    }

    /**
     * Verifica se pode voltar
     */
    canGoBack() {
        return this.currentIndex > 0;
    }

    /**
     * Verifica se pode avançar
     */
    canGoForward() {
        return this.currentIndex < this.navigationHistory.length - 1;
    }

    /**
     * Obtém rota atual
     */
    getCurrentRoute() {
        if (this.currentIndex >= 0 && this.currentIndex < this.navigationHistory.length) {
            return this.navigationHistory[this.currentIndex].route;
        }
        return null;
    }

    /**
     * Limpa histórico de navegação
     */
    clearHistory() {
        this.navigationHistory = [];
        this.currentIndex = -1;
        logger.info('[WindowManager] Histórico de navegação limpo');
    }

    /**
     * Define uma rota como raiz, limpando todo histórico anterior.
     * Usado pós login para que a tela de login não permaneça acessível via Voltar.
     * @param {string} route
     * @param {Object} params
     */
    resetHistory(route, params = {}) {
        logger.info(`[WindowManager] Resetando histórico. Nova raiz: ${route}`);
        this.navigationHistory = [{ route, params }];
        this.currentIndex = 0;
        // Navega sem adicionar ao histórico (já definido manualmente)
        this.navigate(route, params, false);
        this._updateNavigationState();
    }

    /**
     * Obtém janela atual
     */
    getCurrentWindow() {
        return this.currentWindow;
    }

    /**
     * Atualiza estado de navegação na janela atual
     * @private
     */
    _updateNavigationState() {
        if (this.currentWindow && !this.currentWindow.isDestroyed()) {
            this.currentWindow.webContents.send('navigation-state', {
                canGoBack: this.canGoBack(),
                canGoForward: this.canGoForward(),
                currentRoute: this.getCurrentRoute(),
                historyLength: this.navigationHistory.length
            });
        }
    }

    /**
     * Registra configuração personalizada de janela
     */
    registerWindowConfig(route, config) {
        this.windowConfigs[route] = config;
        logger.info(`[WindowManager] Configuração registrada para rota: ${route}`);
    }

    /**
     * Abre janela secundária (não fecha a principal)
     * Útil para QR Code, popups, etc
     */
    openSecondaryWindow(route, params = {}) {
        const config = this.windowConfigs[route];
        
        if (!config) {
            logger.erro(`[WindowManager] Rota desconhecida: ${route}`);
            return null;
        }

        logger.info(`[WindowManager] Abrindo janela secundária: ${route}`);

        const secondaryWindow = new BrowserWindow({
            width: config.width,
            height: config.height,
            title: config.title,
            resizable: config.resizable,
            parent: this.currentWindow,
            modal: false,
            webPreferences: {
                preload: path.join(__dirname, '..', config.preload),
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        secondaryWindow.loadFile(config.file);

        // Enviar parâmetros
        if (Object.keys(params).length > 0) {
            secondaryWindow.webContents.once('did-finish-load', () => {
                secondaryWindow.webContents.send('navigation-params', params);
            });
        }

        return secondaryWindow;
    }
}

module.exports = WindowManager;
