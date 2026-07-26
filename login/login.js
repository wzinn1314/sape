document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const message = document.getElementById('message');
  const loading = document.getElementById('loading');
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const submitButton = document.getElementById('btnEntrar');

  const API_BASE_URL = 'http://localhost:3000';

  // Verificar se já está logado - DESATIVADO para permitir acesso à tela de login
  // checkExistingSession();

  // 1. Mostrar / Ocultar Senha
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      togglePassword.classList.toggle('fa-eye', !isPassword);
      togglePassword.classList.toggle('fa-eye-slash', isPassword);
    });
  }

  // 2. Ação do Formulário de Login
  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); // Impede o recarregamento da página

      const identifierInput = 
        document.getElementById('loginIdentifier') || 
        document.getElementById('email') || 
        document.getElementById('matricula');

      const identifier = identifierInput ? identifierInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!identifier || !password) {
        if (message) {
          message.textContent = 'Por favor, preencha todos os campos.';
          message.className = 'message error';
        }
        showToast('Por favor, preencha todos os campos.', 'error');
        return;
      }

      setLoading(true);
      clearMessage();

      try {
        const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: identifier,
            matricula: identifier,
            password: password
          })
        });

        const data = await response.json();

        setLoading(false);

        if (response.ok && data.success) {
          // Salva os dados do usuário logado e token JWT
          localStorage.setItem('userLogado', JSON.stringify(data.data.user));
          localStorage.setItem('user', JSON.stringify(data.data.user));
          localStorage.setItem('sape_token', data.data.token);

          showToast('Login realizado com sucesso! Redirecionando...', 'success');
          
          if (message) {
            message.textContent = 'Login realizado com sucesso! Redirecionando...';
            message.className = 'message success';
          }

          const role = (data.data.user && data.data.user.role) ? data.data.user.role.toString().toLowerCase() : '';
          const matricula = (data.data.user && data.data.user.matricula) ? data.data.user.matricula.toString().toUpperCase() : '';

          // Redirecionamento após sucesso
          setTimeout(() => {
            if (role.includes('admin') || matricula === 'ADM2026') {
              window.location.href = '../deshboard/index.html';
            } else {
              window.location.href = '../teacher-home/index.html';
            }
          }, 800);

        } else {
          const errorMessage = data.message || 'Credenciais inválidas.';
          if (message) {
            message.textContent = errorMessage;
            message.className = 'message error';
          }
          showToast(errorMessage, 'error');
        }

      } catch (error) {
        setLoading(false);

        const errorMessage = 'Erro ao conectar com o servidor. Verifique se o backend Node.js está ligado na porta 3000.';
        if (message) {
          message.textContent = errorMessage;
          message.className = 'message error';
        }
        showToast(errorMessage, 'error');

        console.error('Erro de requisição:', error);
      }
    });
  }

  // Função para verificar sessão existente
  function checkExistingSession() {
    const token = localStorage.getItem('sape_token');
    const user = localStorage.getItem('sape_user');
    
    if (token && user) {
      const userData = JSON.parse(user);
      const role = (userData.role || '').toLowerCase();
      const matricula = (userData.matricula || '').toUpperCase();

      if (role.includes('admin') || matricula === 'ADM2026') {
        window.location.href = '../deshboard/index.html';
      } else {
        window.location.href = '../deshboard/index.html';
      }
    }
  }

  // Função para mostrar/ocultar loading
  function setLoading(isLoading) {
    if (loading) {
      loading.style.display = isLoading ? 'flex' : 'none';
    }

    if (submitButton) {
      submitButton.disabled = isLoading;
      if (isLoading) {
        submitButton.innerHTML = '<div class="spinner"></div> Entrando...';
      } else {
        submitButton.innerHTML = 'Entrar';
      }
    }
  }

  // Função para limpar mensagem
  function clearMessage() {
    if (message) {
      message.textContent = '';
      message.className = 'message';
    }
  }

  // Sistema de Toast Notifications
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Remover toast existente
    const existingToast = container.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }

    // Criar novo toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = getToastIcon(type);
    
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="${icon}"></i>
      </div>
      <div class="toast-content">
        <p class="toast-message">${message}</p>
      </div>
      <button class="toast-close" aria-label="Fechar notificação">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Adicionar botão de fechar
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto remover após 4 segundos
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function getToastIcon(type) {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
  }
});

// Adicionar estilos para Toast e Spinner dinamicamente
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  /* Toast Notifications */
  #toastContainer {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 300px;
    max-width: 400px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease-in-out;
  }

  .toast.show {
    opacity: 1;
    transform: translateX(0);
  }

  .toast-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }

  .toast-content {
    flex: 1;
    min-width: 0;
  }

  .toast-message {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: #333;
    line-height: 1.4;
  }

  .toast-close {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: #999;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;
    padding: 0;
  }

  .toast-close:hover {
    background: #f0f0f0;
    color: #333;
  }

  .toast-success {
    border-left: 4px solid #10b981;
  }

  .toast-success .toast-icon {
    color: #10b981;
  }

  .toast-error {
    border-left: 4px solid #ef4444;
  }

  .toast-error .toast-icon {
    color: #ef4444;
  }

  .toast-warning {
    border-left: 4px solid #f59e0b;
  }

  .toast-warning .toast-icon {
    color: #f59e0b;
  }

  .toast-info {
    border-left: 4px solid #3b82f6;
  }

  .toast-info .toast-icon {
    color: #3b82f6;
  }

  /* Loading Spinner */
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top-color: #1b66d2;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #1b66d2;
    font-weight: 600;
    margin-top: 10px;
  }

  .loading-indicator .spinner {
    width: 16px;
    height: 16px;
  }

  /* Message Styles */
  .message {
    margin-top: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    min-height: 20px;
  }

  .message.success {
    color: #10b981;
  }

  .message.error {
    color: #ef4444;
  }
`;
document.head.appendChild(toastStyles);
