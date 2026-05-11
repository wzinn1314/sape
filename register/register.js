/* register.js
   Validação do formulário de cadastro e envio ao backend.

   Funcionalidade:
   - Valida campos em tempo real (nome, email, CPF, senha e aceite de termos).
   - Habilita/desabilita o botão de envio (`#registrar-btn`).
   - Envia requisição POST para `/register` do backend.
*/

// Elementos do formulário (script é carregado no final do body)
const nome = document.getElementById('nome');
const email = document.getElementById('email');
const cpf = document.getElementById('cpf');
const senha = document.getElementById('senha');
const confirmarSenha = document.getElementById('confirmar-senha');
const checkbox = document.getElementById('aceito-termos');
const buttonLink = document.getElementById('registrar-btn');

// Validação de CPF (formato e dígitos verificadores)
function validarCPF(cpfValue) {
    const digits = cpfValue.replace(/\D/g, '');
    if (digits.length !== 11 || /^([0-9])\1{10}$/.test(digits)) {
        return false;
    }

    const calcularDigito = (base) => {
        const soma = base.split('').reduce((total, num, index) => total + Number(num) * ((base.length + 1) - index), 0);
        const resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    };

    const base = digits.slice(0, 9);
    const digito1 = calcularDigito(base);
    const digito2 = calcularDigito(base + digito1);

    return digits === `${base}${digito1}${digito2}`;
}

// Verifica se o formulário está válido e atualiza o estado do botão
function validarFormulario() {
    const nomeValido = nome.value.trim() !== '';
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
    const cpfValido = validarCPF(cpf.value);
    const senhaValida = senha.value.length >= 6;
    const confirmarValido = confirmarSenha.value === senha.value && confirmarSenha.value !== '';
    const termosAceitos = checkbox.checked;

    const formularioValido = nomeValido && emailValido && cpfValido && senhaValida && confirmarValido && termosAceitos;

    if (formularioValido) {
        buttonLink.classList.remove('disabled');
        buttonLink.setAttribute('aria-disabled', 'false');
        buttonLink.removeAttribute('tabindex');
    } else {
        buttonLink.classList.add('disabled');
        buttonLink.setAttribute('aria-disabled', 'true');
        buttonLink.setAttribute('tabindex', '-1');
    }
}

// Liga os event listeners quando o DOM estiver pronto e faz a submissão
document.addEventListener('DOMContentLoaded', () => {
    // Atualiza validação ao digitar e ao mudar campos
    [nome, email, cpf, senha, confirmarSenha, checkbox].forEach(field => {
        field.addEventListener('input', validarFormulario);
        field.addEventListener('change', validarFormulario);
    });

    // Validação inicial para ajustar estado do botão ao carregar a página
    validarFormulario();

    // Envio do formulário (via fetch para o backend)
    buttonLink.addEventListener('click', async (e) => {
        e.preventDefault();

        if (buttonLink.classList.contains('disabled')) {
            return;
        }

        const userData = {
            name: nome.value.trim(),
            email: email.value.trim(),
            cpf: cpf.value.replace(/\D/g, ''), // Remove formatação
            password: senha.value
        };

        try {
            const response = await fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
                alert('Cadastro realizado com sucesso!');
                window.location.href = '../login/index.html';
            } else {
                alert('Erro no cadastro: ' + result.error);
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao conectar com o servidor. Tente novamente.');
        }
    });
});