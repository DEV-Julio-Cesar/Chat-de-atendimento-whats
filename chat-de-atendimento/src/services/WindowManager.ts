/**
 * 🪟 WindowManager
 * 
 * Gerenciador centralizado de janelas do Electron.
 * Garante que apenas UMA janela principal esteja aberta por vez,
 * com suporte a navegação e histórico (voltar/avançar).
 */

import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import * as path from 'path';

// Types
export type RouteType = 
  | 'login' 
  | 'principal' 
  | 'pool-manager' 
  | 'chat' 
  | 'dashboard' 
  | 'chatbot' 
  | 'usuarios' 
  | 'history' 
  | 'cadastro' 
  | 'health';

export interface WindowConfig {
  file: string;
  preload: string;
  width: number;
  height: number;
  resizable: boolean;
  title: string;
}

export interface NavigationParams {
  [key: string]: any;
}

export interface HistoryEntry {
  route: RouteType;
  params?: NavigationParams;
  timestamp: number;
}

export interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  currentRoute: RouteType | null;
  historyLength: number;
}

export class WindowManager {
  private currentWindow: BrowserWindow | null = null;
  private navigationHistory: HistoryEntry[] = [];
  private currentIndex: number = -1;
  private readonly windowConfigs: Record<RouteType, WindowConfig>;
  private logger: any;

  constructor() {
    // Lazy load logger to avoid circular dependencies
    this.logger = require('../infraestrutura/logger');
    
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
   * Cria uma nova janela com a configuração especificada
   */
  private createWindow(config: WindowConfig): BrowserWindow {
    const windowOptions: BrowserWindowConstructorOptions = {
      width: config.width,
      height: config.height,
      resizable: config.resizable,
      title: config.title,
      webPreferences: {
        preload: path.join(__dirname, '../../', config.preload),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      },
      autoHideMenuBar: true,
      icon: path.join(__dirname, '../../assets/icon.png')
    };

    const window = new BrowserWindow(windowOptions);
    const filePath = path.join(__dirname, '../../', config.file);
    
    window.loadFile(filePath).catch((err: Error) => {
      this.logger.erro(`[WindowManager] Erro ao carregar ${config.file}:`, err);
    });

    window.on('closed', () => {
      if (this.currentWindow === window) {
        this.currentWindow = null;
      }
    });

    return window;
  }

  /**
   * Navega para uma rota específica
   */
  navigate(route: RouteType, params?: NavigationParams, addToHistory: boolean = true): void {
    if (!this.windowConfigs[route]) {
      this.logger.erro(`[WindowManager] Rota inválida: ${route}`);
      return;
    }

    // Evita duplicar rota consecutiva
    if (addToHistory && this.navigationHistory.length > 0) {
      const lastEntry = this.navigationHistory[this.currentIndex];
      if (lastEntry && lastEntry.route === route) {
        this.logger.aviso(`[WindowManager] Rota ${route} já é a atual, ignorando navegação duplicada`);
        return;
      }
    }

    this.logger.info(`[WindowManager] Navegando para: ${route}`);

    // Fecha janela anterior
    if (this.currentWindow && !this.currentWindow.isDestroyed()) {
      this.currentWindow.close();
    }

    // Cria nova janela
    const config = this.windowConfigs[route];
    this.currentWindow = this.createWindow(config);

    // Atualiza histórico
    if (addToHistory) {
      // Remove histórico futuro se navegou de volta
      if (this.currentIndex < this.navigationHistory.length - 1) {
        this.navigationHistory = this.navigationHistory.slice(0, this.currentIndex + 1);
      }

      this.navigationHistory.push({
        route,
        params,
        timestamp: Date.now()
      });
      this.currentIndex = this.navigationHistory.length - 1;
    }

    // Envia parâmetros se existirem
    if (params && this.currentWindow) {
      this.currentWindow.webContents.on('did-finish-load', () => {
        this.currentWindow?.webContents.send('navigation-params', params);
      });
    }
  }

  /**
   * Volta para a rota anterior no histórico
   */
  goBack(): boolean {
    if (!this.canGoBack()) {
      this.logger.aviso('[WindowManager] Não há histórico anterior');
      return false;
    }

    this.currentIndex--;
    const entry = this.navigationHistory[this.currentIndex];
    this.navigate(entry.route, entry.params, false);
    return true;
  }

  /**
   * Avança para a próxima rota no histórico
   */
  goForward(): boolean {
    if (!this.canGoForward()) {
      this.logger.aviso('[WindowManager] Não há histórico futuro');
      return false;
    }

    this.currentIndex++;
    const entry = this.navigationHistory[this.currentIndex];
    this.navigate(entry.route, entry.params, false);
    return true;
  }

  /**
   * Verifica se pode voltar
   */
  canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Verifica se pode avançar
   */
  canGoForward(): boolean {
    return this.currentIndex < this.navigationHistory.length - 1;
  }

  /**
   * Retorna ao início (principal)
   */
  goHome(): void {
    this.navigate('principal');
  }

  /**
   * Reseta o histórico e define uma nova rota raiz
   * Útil para evitar voltar ao login após autenticação
   */
  resetHistory(route: RouteType, params?: NavigationParams): void {
    this.logger.info(`[WindowManager] Resetando histórico para: ${route}`);
    this.navigationHistory = [];
    this.currentIndex = -1;
    this.navigate(route, params, true);
  }

  /**
   * Obtém estado da navegação
   */
  getNavigationState(): NavigationState {
    const currentEntry = this.navigationHistory[this.currentIndex];
    return {
      canGoBack: this.canGoBack(),
      canGoForward: this.canGoForward(),
      currentRoute: currentEntry ? currentEntry.route : null,
      historyLength: this.navigationHistory.length
    };
  }

  /**
   * Retorna a janela atual
   */
  getCurrentWindow(): BrowserWindow | null {
    return this.currentWindow;
  }

  /**
   * Fecha a janela atual
   */
  closeCurrentWindow(): void {
    if (this.currentWindow && !this.currentWindow.isDestroyed()) {
      this.currentWindow.close();
      this.currentWindow = null;
    }
  }

  /**
   * Obtém histórico completo
   */
  getHistory(): HistoryEntry[] {
    return [...this.navigationHistory];
  }

  /**
   * Limpa todo o histórico
   */
  clearHistory(): void {
    this.navigationHistory = [];
    this.currentIndex = -1;
    this.logger.info('[WindowManager] Histórico limpo');
  }
}

// Singleton export
export default new WindowManager();
