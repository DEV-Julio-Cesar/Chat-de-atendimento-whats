// src/interfaces/modal-confirmacao.js
// Modal de confirmação para ações críticas

class ConfirmationModal {
  constructor() {
    this.modal = null;
    this.currentResolve = null;
  }

  /**
   * Mostra modal de confirmação
   * @param {Object} options
   * @returns {Promise<boolean>}
   */
  async confirm(options = {}) {
    const {
      title = 'Confirmar Ação',
      message = 'Tem certeza que deseja continuar?',
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      type = 'warning', // warning, danger, info
      confirmButtonClass = '',
      cancelButtonClass = ''
    } = options;

    return new Promise((resolve) => {
      this.currentResolve = resolve;
      this.show({ title, message, confirmText, cancelText, type, confirmButtonClass, cancelButtonClass });
    });
  }

  /**
   * Cria e exibe o modal
   */
  show({ title, message, confirmText, cancelText, type, confirmButtonClass, cancelButtonClass }) {
    // Remove modal anterior se existir
    this.remove();

    const colors = {
      warning: { icon: '⚠️', color: '#f59e0b', bg: '#fef3c7' },
      danger: { icon: '🗑️', color: '#ef4444', bg: '#fee2e2' },
      info: { icon: 'ℹ️', color: '#3b82f6', bg: '#dbeafe' }
    };

    const theme = colors[type] || colors.warning;

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      animation: fadeIn 0.2s ease-out;
    `;

    // Modal
    const modal = document.createElement('div');
    modal.className = 'confirmation-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease-out;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    `;

    const iconWrapper = document.createElement('div');
    iconWrapper.style.cssText = `
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: ${theme.bg};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    `;
    iconWrapper.textContent = theme.icon;

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      margin: 0;
      font-size: 18px;
      color: #1f2937;
      font-weight: 600;
    `;

    header.appendChild(iconWrapper);
    header.appendChild(titleEl);

    // Message
    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      margin: 0 0 24px 0;
      color: #6b7280;
      font-size: 14px;
      line-height: 1.6;
    `;

    // Buttons
    const buttons = document.createElement('div');
    buttons.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = cancelText;
    cancelBtn.className = cancelButtonClass;
    cancelBtn.style.cssText = `
      padding: 10px 20px;
      border: 1px solid #e5e7eb;
      background: white;
      color: #6b7280;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;
    cancelBtn.onmouseover = () => {
      cancelBtn.style.background = '#f9fafb';
      cancelBtn.style.borderColor = '#d1d5db';
    };
    cancelBtn.onmouseout = () => {
      cancelBtn.style.background = 'white';
      cancelBtn.style.borderColor = '#e5e7eb';
    };

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = confirmText;
    confirmBtn.className = confirmButtonClass;
    confirmBtn.style.cssText = `
      padding: 10px 20px;
      border: none;
      background: ${theme.color};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    `;
    confirmBtn.onmouseover = () => {
      confirmBtn.style.filter = 'brightness(0.9)';
      confirmBtn.style.transform = 'scale(1.02)';
    };
    confirmBtn.onmouseout = () => {
      confirmBtn.style.filter = 'brightness(1)';
      confirmBtn.style.transform = 'scale(1)';
    };

    buttons.appendChild(cancelBtn);
    buttons.appendChild(confirmBtn);

    modal.appendChild(header);
    modal.appendChild(messageEl);
    modal.appendChild(buttons);
    overlay.appendChild(modal);

    // Event listeners
    cancelBtn.addEventListener('click', () => this.handleCancel());
    confirmBtn.addEventListener('click', () => this.handleConfirm());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.handleCancel();
    });

    // ESC key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.handleCancel();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Adiciona animações
    this.ensureStyles();

    document.body.appendChild(overlay);
    this.modal = overlay;

    // Focus no botão confirmar
    confirmBtn.focus();
  }

  /**
   * Handler de confirmação
   */
  handleConfirm() {
    if (this.currentResolve) {
      this.currentResolve(true);
      this.currentResolve = null;
    }
    this.remove();
  }

  /**
   * Handler de cancelamento
   */
  handleCancel() {
    if (this.currentResolve) {
      this.currentResolve(false);
      this.currentResolve = null;
    }
    this.remove();
  }

  /**
   * Remove modal
   */
  remove() {
    if (this.modal && this.modal.parentNode) {
      this.modal.style.animation = 'fadeOut 0.2s ease-out';
      setTimeout(() => {
        if (this.modal && this.modal.parentNode) {
          this.modal.parentNode.removeChild(this.modal);
        }
        this.modal = null;
      }, 200);
    }
  }

  /**
   * Atalhos para tipos comuns
   */
  async warning(message, title = 'Atenção') {
    return this.confirm({ type: 'warning', message, title });
  }

  async danger(message, title = 'Ação Perigosa') {
    return this.confirm({
      type: 'danger',
      message,
      title,
      confirmText: 'Sim, deletar',
      cancelText: 'Cancelar'
    });
  }

  async deleteConfirm(itemName = 'este item') {
    return this.confirm({
      type: 'danger',
      title: 'Confirmar Exclusão',
      message: `Tem certeza que deseja deletar ${itemName}? Esta ação não pode ser desfeita.`,
      confirmText: 'Sim, deletar',
      cancelText: 'Cancelar'
    });
  }

  /**
   * Garante estilos de animação
   */
  ensureStyles() {
    if (document.getElementById('confirmation-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'confirmation-modal-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Singleton
const confirmModal = new ConfirmationModal();

// Exporta globalmente
if (typeof window !== 'undefined') {
  window.confirmModal = confirmModal;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = confirmModal;
}
