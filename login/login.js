document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const message = document.getElementById('message');
  const loading = document.getElementById('loading');
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');

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
          message.style.color = '#ef2b2b';
        }
        return;
      }

      if (loading) loading.style.display = 'block';
      if (message) {
        message.textContent = '';
        message.style.color = '';
      }

      try {
        const response = await fetch('http://localhost:3000/login', {
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

        if (loading) loading.style.display = 'none';

        if (response.ok) {
          // Salva os dados do usuário logado
          localStorage.setItem('userLogado', JSON.stringify(data.user));
          localStorage.setItem('user', JSON.stringify(data.user));

          if (message) {
            message.textContent = 'Login realizado com sucesso! Redirecionando...';
            message.style.color = '#2e7d32';
          }

          const role = (data.user && data.user.role) ? data.user.role.toString().toLowerCase() : '';
          const matricula = (data.user && data.user.matricula) ? data.user.matricula.toString().toUpperCase() : '';

          // Redirecionamento após sucesso
          setTimeout(() => {
            if (role.includes('admin') || matricula === 'ADM2026') {
              window.location.href = '../deshboard/index.html';
            } else {
              // Tenta navegar para a página principal
              window.location.href = '../deshboard/index.html';
            }
          }, 800);

        } else {
          if (message) {
            message.textContent = data.error || data.message || 'Credenciais inválidas.';
            message.style.color = '#ef2b2b';
          }
        }

      } catch (error) {
        if (loading) loading.style.display = 'none';

        if (message) {
          message.textContent = 'Erro ao conectar com o servidor. Verifique se o backend Node.js está ligado na porta 3000.';
          message.style.color = '#ef2b2b';
        }

        console.error('Erro de requisição:', error);
      }
    });
  }
});