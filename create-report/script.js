 // Função para atualizar o preview do aluno quando selecionado
 function atualizarInfoAluno() {
    const select = document.getElementById('aluno-select');
    const selectedOption = select.options[select.selectedIndex];
    const previewBox = document.getElementById('aluno-preview');

    if (select.value) {
        const nome = selectedOption.text.split(' (')[0];
        const turma = selectedOption.getAttribute('data-turma');
        const neuro = selectedOption.getAttribute('data-neuro');

        document.getElementById('preview-nome').innerText = nome;
        document.getElementById('preview-turma').innerText = "Turma: " + turma;
        
        const badge = document.getElementById('preview-badge');
        badge.className = 'badge-type ' + neuro;
        badge.innerText = neuro.toUpperCase();

        previewBox.classList.remove('hidden');
    }
}

// Simulação do salvamento do formulário
function salvarRelatorio(event) {
    event.preventDefault();
    alert('Relatório pedagógico criado e salvo com sucesso!');
}