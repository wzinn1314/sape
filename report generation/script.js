document.addEventListener('DOMContentLoaded', async () => {
    const alunoSelect = document.getElementById('aluno_id');
    const reportForm = document.getElementById('reportForm');
    
    // Preenche a data de hoje por padrão
    document.getElementById('data_relatorio').valueAsDate = new Date();

    // 1. Buscar Alunos do Banco para preencher o Select
    try {
        const response = await fetch('http://localhost:3000/students');
        const students = await response.json();

        alunoSelect.innerHTML = '<option value="">Selecione um aluno...</option>';
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.nome} (Matrícula: ${student.matricula})`;
            alunoSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao carregar alunos:", error);
        alunoSelect.innerHTML = '<option value="">Erro ao carregar lista</option>';
    }

    // 2. Enviar Formulário e Gerar PDF
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = document.getElementById('btnSubmit');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando PDF...';

        const formData = {
            titulo: document.getElementById('titulo').value,
            conteudo: document.getElementById('conteudo').value,
            aluno_id: document.getElementById('aluno_id').value,
            nome_aluno: alunoSelect.options[alunoSelect.selectedIndex].text,
            professor_id: 1, // Aqui você deve pegar o ID do professor logado (LocalStorage ou Sessão)
            data: document.getElementById('data_relatorio').value
        };

        try {
            const response = await fetch('http://localhost:3000/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                alert('Sucesso! Relatório gerado e salvo com sucesso.');
                window.location.href = 'index.html'; // Volta para a tela principal
            } else {
                throw new Error('Erro ao gerar relatório no servidor');
            }
        } catch (error) {
            alert('Erro: ' + error.message);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Gerar e Salvar PDF';
        }
    });
});