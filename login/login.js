const form = document.getElementById('loginForm');
const message = document.getElementById('message');
const loading = document.getElementById('loading');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const cpf = document.getElementById('cpf').value;
  const password = document.getElementById('password').value;

  // mostra spinner
  loading.style.display = 'block';
  message.textContent = '';

  try {
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cpf, password })
    });

    const data = await response.json();

    if (response.ok) {
      loading.style.display = 'none';

      localStorage.setItem('user', JSON.stringify(data.user));

      window.location.href = '../deshboard/index.html';
    } else {
      loading.style.display = 'none';

      message.textContent = data.message || 'Login inválido';
      message.style.color = 'red';
    }

  } catch (error) {
    loading.style.display = 'none';

    message.textContent = 'Erro ao conectar com o servidor';
    message.style.color = 'red';

    console.error(error);
  }
});