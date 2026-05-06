const nome = document.getElementById('nome');
const email = document.getElementById('email');
const cpf = document.getElementById('cpf');
const senha = document.getElementById('senha');
const confirmarSenha = document.getElementById('confirmar-senha');
const checkbox = document.getElementById('aceito-termos');
const buttonLink = document.getElementById('registrar-btn');

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
        buttonLink.setAttribute('href', '../login/index.html');
        buttonLink.setAttribute('aria-disabled', 'false');
        buttonLink.removeAttribute('tabindex');
    } else {
        buttonLink.classList.add('disabled');
        buttonLink.removeAttribute('href');
        buttonLink.setAttribute('aria-disabled', 'true');
        buttonLink.setAttribute('tabindex', '-1');
    }
}

[nome, email, cpf, senha, confirmarSenha, checkbox].forEach(element => {
    element.addEventListener('input', validarFormulario);
    element.addEventListener('change', validarFormulario);
});

buttonLink.addEventListener('click', function(event) {
    if (buttonLink.classList.contains('disabled')) {
        event.preventDefault();
    }
});

validarFormulario(); 