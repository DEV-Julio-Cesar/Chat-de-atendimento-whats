// src/interfaces/notificacoes-toast.js
// Sistema de notificações toast para feedback visual

class ToastNotification {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.maxToasts = 5;
    this.init();
  }

  init() {
    // Cria container se não existir
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  /**
   * Mostra notificação
   * @param {string} message - Mensagem
   * @param {string} type - success | error | warning | info
   * @param {number} duration - Duração em ms (0 = permanente)
   */
  show(message, type = 'info', duration = 4000) {
    // Remove toasts extras
    while (this.toasts.length >= this.maxToasts) {
      const oldToast = this.toasts.shift();
      if (oldToast && oldToast.element) {
        this.remove(oldToast.element);
      }
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    toast.style.cssText = `
      background: white;
      border-left: 4px solid ${colors[type] || colors.info};
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 300px;
      max-width: 400px;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideIn 0.3s ease-out;
      pointer-events: auto;
      cursor: pointer;
      transition: transform 0.2s, opacity 0.2s;
    `;

    toast.innerHTML = `
      <span style="
        font-size: 20px;
        color: ${colors[type] || colors.info};
        font-weight: bold;
      ">${icons[type] || icons.info}</span>
      <span style="
        flex: 1;
        color: #333;
        font-size: 14px;
        line-height: 1.4;
      ">${message}</span>
      <button style="
        background: none;
        border: none;
        color: #999;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      ">×</button>
    `;

    // Adiciona estilos de animação se não existirem
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
        .toast:hover {
          transform: scale(1.02);
        }
      `;
      document.head.appendChild(style);
    }

    // Click para fechar
    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.remove(toast);
    });

    // Click no toast inteiro também fecha
    toast.addEventListener('click', () => {
      this.remove(toast);
    });

    this.container.appendChild(toast);
    this.toasts.push({ element: toast, type, message });

    // Auto-remove após duração
    if (duration > 0) {
      setTimeout(() => {
        this.remove(toast);
      }, duration);
    }

    return toast;
  }

  /**
   * Remove toast com animação
   */
  remove(toast) {
    if (!toast || !toast.parentNode) return;

    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
        this.toasts = this.toasts.filter(t => t.element !== toast);
      }
    }, 300);
  }

  /**
   * Atalhos para tipos específicos
   */
  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  /**
   * Remove todas as notificações
   */
  clear() {
    this.toasts.forEach(toast => {
      if (toast.element && toast.element.parentNode) {
        this.remove(toast.element);
      }
    });
    this.toasts = [];
  }
}

// Singleton
// Singleton comentado - cada página deve criar sua própria instância
// const toast = new ToastNotification();

// Exporta para uso global
if (typeof window !== 'undefined') {
  window.ToastNotification = ToastNotification;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = toast;
}
