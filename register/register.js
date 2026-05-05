const checkbox = document.getElementById('aceito-termos');
const button = document.getElementById('registrar-btn');

checkbox.addEventListener('change', function() {
    button.disabled = !this.checked;
});