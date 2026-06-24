const nome = document.getElementById('nome');
const email = document.getElementById('email');
const cpf = document.getElementById('cpf');
const senha = document.getElementById('senha');
const confirmarSenha = document.getElementById('confirmar-senha');
const checkbox = document.getElementById('aceito-termos');
const buttonLink = document.getElementById('registrar-btn');
const role = document.getElementById('role');
let allowedDomains = null;

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
    const roleValido = role && role.value !== '';
    // validação de domínio (cliente) se allowedDomains estiver configurado
    let dominioValido = true;
    if (allowedDomains && allowedDomains.length > 0) {
        const dominio = (email.value.split('@')[1] || '').toLowerCase();
        dominioValido = dominio && allowedDomains.includes(dominio);
        const messageEl = document.getElementById('message');
        if (!dominioValido) {
            messageEl.style.color = 'red';
            messageEl.textContent = `Cadastro permitido somente para domínios: ${allowedDomains.join(', ')}`;
        } else {
            // limpa mensagem se tudo ok
            if (messageEl && messageEl.textContent && messageEl.textContent.includes('Cadastro permitido')) {
                messageEl.textContent = '';
            }
        }
    }

    const formularioValido = nomeValido && emailValido && cpfValido && senhaValida && confirmarValido && termosAceitos && roleValido && dominioValido;

    if (formularioValido) {
        buttonLink.classList.remove('disabled');
        buttonLink.disabled = false;
        buttonLink.setAttribute('aria-disabled', 'false');
        buttonLink.removeAttribute('tabindex');
    } else {
        buttonLink.classList.add('disabled');
        buttonLink.disabled = true;
        buttonLink.setAttribute('aria-disabled', 'true');
        buttonLink.setAttribute('tabindex', '-1');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    [nome, email, cpf, senha, confirmarSenha, checkbox, role].forEach(field => {
        field.addEventListener('input', validarFormulario);
        field.addEventListener('change', validarFormulario);
    });

    // busca domínios permitidos do backend (se configurado)
    fetch('http://localhost:3000/config')
        .then(r => r.json())
        .then(cfg => {
            if (cfg && Array.isArray(cfg.allowedDomains) && cfg.allowedDomains.length > 0) {
                allowedDomains = cfg.allowedDomains.map(d => d.toLowerCase());
            }
        })
        .catch(() => {
            // falha ao buscar config: continuar sem validação de domínio no cliente
            allowedDomains = null;
        });

    buttonLink.addEventListener('click', async (e) => {
        e.preventDefault();

        if (buttonLink.classList.contains('disabled')) {
            return;
        }

        // Coletar dados
        const userData = {
            name: nome.value.trim(),
            email: email.value.trim(),
            cpf: cpf.value.replace(/\D/g, ''), 
            password: senha.value,
            role: role ? role.value : 'Professor'
        };

        try {
            // Enviar para o backend
            const response = await fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
               
                if (result.verifyUrl) {
                    const messageEl = document.getElementById('message');
                    messageEl.style.color = 'green';
                    messageEl.innerHTML = `Cadastro realizado! Verifique seu e-mail para ativar a conta de professor. (Teste: <a href="${result.verifyUrl}">Verificar agora</a>)`;
                } else {
                    alert('Cadastro realizado com sucesso!');
                    window.location.href = '../login/index.html';
                }
            } else {
                alert('Erro no cadastro: ' + result.error);
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao conectar com o servidor. Tente novamente.');
        }
    });
});

[nome, email, cpf, senha, confirmarSenha, checkbox, role].forEach(element => {
    element.addEventListener('input', validarFormulario);
    element.addEventListener('change', validarFormulario);
});

buttonLink.addEventListener('click', function(event) {
    if (buttonLink.classList.contains('disabled')) {
        event.preventDefault();
    }
});

validarFormulario(); 