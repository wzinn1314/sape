document.addEventListener('DOMContentLoaded', () => {
    carregarRelatorios();
});

function carregarRelatorios() {
    const tbody = document.getElementById('reportBody');
    const emptyMessage = document.getElementById('emptyMessage');
    const totalReports = document.getElementById('totalReports');
    const totalRows = document.getElementById('totalRows');

    
    const relatorios = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];

    if (totalReports) totalReports.textContent = relatorios.length;
    if (totalRows) totalRows.textContent = relatorios.length;


    if (relatorios.length === 0) {
        tbody.innerHTML = '';
        if (emptyMessage) emptyMessage.style.display = 'block';
        return;
    }

    if (emptyMessage) emptyMessage.style.display = 'none';

    
    tbody.innerHTML = '';

    
    relatorios.forEach((rel) => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>
                <div class="report-cell">
                    <i class="fa-solid fa-file-pdf"></i>
                    <div>
                        <strong>${rel.titulo}</strong>
                        <span>${rel.id}</span>
                    </div>
                </div>
            </td>
            <td>${rel.aluno}</td>
            <td>${rel.professor}</td>
            <td>${rel.data}</td>
            <td><span class="status-badge status-finalizado">${rel.status}</span></td>
            <td>
                <div class="report-buttons">
                    <button class="btn-action btn-view" title="Visualizar" onclick="visualizarRelatorio('${rel.id}')">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="btn-action btn-download" title="Download" onclick="baixarRelatorio('${rel.id}')">
                        <i class="fa-solid fa-download"></i>
                    </button>
                    <button class="btn-action btn-delete" title="Excluir" onclick="deletarRelatorio('${rel.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// Exemplo da ação do botão Olhar (Olho)
function visualizarRelatorio(id) {
    const relatorios = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];
    const relatorio = relatorios.find(r => r.id === id);

    if (relatorio) {
        // Exemplo: Abre modal ou insere os dados para o usuário ler na tela
        alert(`Visualizando Relatório:\n\nAluno: ${relatorio.aluno}\nTexto: ${relatorio.conteudo}`);
    }
}


function deletarRelatorio(id) {
    let relatorios = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];
    relatorios = relatorios.filter(r => r.id !== id);
    localStorage.setItem('relatoriosSAPE', JSON.stringify(relatorios));
    carregarRelatorios();
}