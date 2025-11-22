// src/interfaces/estados-carregamento.js
// Componente de loading states reutilizável

class LoadingState {
  constructor() {
    this.activeLoaders = new Map();
  }

  /**
   * Mostra loading overlay em um elemento ou fullscreen
   * @param {string|HTMLElement} target - Seletor CSS ou elemento
   * @param {Object} options - Opções de customização
   * @returns {string} loaderId - ID único do loader
   */
  show(target = 'body', options = {}) {
    const {
      message = 'Carregando...',
      spinner = 'default',
      overlay = true,
      backgroundColor = 'rgba(255, 255, 255, 0.95)',
      size = 'medium'
    } = options;

    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) {
      console.error('Loading target not found:', target);
      return null;
    }

    const loaderId = `loader-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'loading-overlay';
    
    const sizes = {
      small: { spinner: '30px', fontSize: '12px' },
      medium: { spinner: '50px', fontSize: '14px' },
      large: { spinner: '70px', fontSize: '16px' }
    };
    
    const currentSize = sizes[size] || sizes.medium;

    loader.style.cssText = `
      position: ${element === document.body ? 'fixed' : 'absolute'};
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: ${overlay ? backgroundColor : 'transparent'};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      gap: 16px;
    `;

    // Spinner
    const spinnerEl = document.createElement('div');
    spinnerEl.className = `spinner-${spinner}`;
    
    if (spinner === 'default') {
      spinnerEl.style.cssText = `
        width: ${currentSize.spinner};
        height: ${currentSize.spinner};
        border: 4px solid #f3f4f6;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      `;
    } else if (spinner === 'dots') {
      spinnerEl.style.cssText = `
        display: flex;
        gap: 8px;
      `;
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.style.cssText = `
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out ${i * 0.16}s infinite;
        `;
        spinnerEl.appendChild(dot);
      }
    } else if (spinner === 'pulse') {
      spinnerEl.style.cssText = `
        width: ${currentSize.spinner};
        height: ${currentSize.spinner};
        background: #3b82f6;
        border-radius: 50%;
        animation: pulse 1.5s ease-in-out infinite;
      `;
    }

    // Mensagem
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      color: #374151;
      font-size: ${currentSize.fontSize};
      font-weight: 500;
      text-align: center;
      max-width: 300px;
    `;

    loader.appendChild(spinnerEl);
    if (message) loader.appendChild(messageEl);

    // Adiciona estilos de animação
    this.ensureStyles();

    // Adiciona ao elemento
    if (element === document.body || element.style.position === 'static') {
      element.style.position = 'relative';
    }
    element.appendChild(loader);

    this.activeLoaders.set(loaderId, { element: loader, target: element });
    return loaderId;
  }

  /**
   * Remove loading por ID
   * @param {string} loaderId
   */
  hide(loaderId) {
    const loader = this.activeLoaders.get(loaderId);
    if (loader && loader.element && loader.element.parentNode) {
      loader.element.style.opacity = '0';
      loader.element.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        if (loader.element.parentNode) {
          loader.element.parentNode.removeChild(loader.element);
        }
        this.activeLoaders.delete(loaderId);
      }, 300);
    }
  }

  /**
   * Remove todos os loaders
   */
  hideAll() {
    for (const [loaderId] of this.activeLoaders) {
      this.hide(loaderId);
    }
  }

  /**
   * Loading em botão
   * @param {HTMLElement} button
   * @param {boolean} loading
   */
  button(button, loading) {
    if (!button) return;

    if (loading) {
      button.dataset.originalText = button.innerHTML;
      button.disabled = true;
      button.style.opacity = '0.7';
      button.style.cursor = 'not-allowed';
      
      const spinner = document.createElement('span');
      spinner.style.cssText = `
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        margin-right: 8px;
        vertical-align: middle;
      `;
      
      button.innerHTML = '';
      button.appendChild(spinner);
      button.appendChild(document.createTextNode('Carregando...'));
    } else {
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  /**
   * Skeleton loading para cards
   * @param {HTMLElement} container
   * @param {number} count
   */
  skeleton(container, count = 3) {
    if (!container) return;

    container.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-card';
      skeleton.style.cssText = `
        background: #f3f4f6;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        animation: pulse 1.5s ease-in-out infinite;
      `;
      
      const lines = [80, 60, 40];
      lines.forEach(width => {
        const line = document.createElement('div');
        line.style.cssText = `
          height: 12px;
          background: #e5e7eb;
          border-radius: 4px;
          margin-bottom: 8px;
          width: ${width}%;
        `;
        skeleton.appendChild(line);
      });
      
      container.appendChild(skeleton);
    }
  }

  /**
   * Garante que estilos de animação existam
   */
  ensureStyles() {
    if (document.getElementById('loading-styles')) return;

    const style = document.createElement('style');
    style.id = 'loading-styles';
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.9); }
      }
      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
        40% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

// Singleton
const loading = new LoadingState();

// Exporta globalmente
if (typeof window !== 'undefined') {
  window.loading = loading;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = loading;
}
