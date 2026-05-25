const form = document.getElementById('loginForm');
const message = document.getElementById('message');
const loading = document.getElementById('loading');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  loading.style.display = 'block';
  message.textContent = '';

  try {
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    loading.style.display = 'none';

    if (response.ok) {
      localStorage.setItem('user', JSON.stringify(data.user));

      window.location.href = '../deshboard/index.html';
    } else {
      message.textContent = data.error || data.message || 'Login inválido';
      message.style.color = 'red';
    }

  } catch (error) {
    loading.style.display = 'none';

    message.textContent = 'Erro ao conectar com o servidor';
    message.style.color = 'red';

    console.error(error);
  }
});