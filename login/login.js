const form = document.getElementById('loginForm');
const message = document.getElementById('message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  message.textContent = 'Verificando dados...';
  message.style.color = 'green';

  try {
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      localStorage.setItem('user', JSON.stringify(data.user));

     
      window.location.href = '../pag3/index.html';
    } else {
      message.textContent = data.message || 'Login inválido';
      message.style.color = 'red';
    }

  } catch (error) {
    message.textContent = 'Erro ao conectar com o servidor';
    message.style.color = 'red';
    console.error(error);
  }
});