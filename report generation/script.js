const API_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
  const studentSelect = document.getElementById('studentSelect');
  const reportType = document.getElementById('reportType');
  const reportContent = document.getElementById('reportContent');
  const reportRecommendations = document.getElementById('reportRecommendations');
  const reportForm = document.getElementById('reportForm');
  const reportList = document.getElementById('reportList');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnSubmit = document.getElementById('btnSubmit');

  // Atualizar Data e Hora no Topo do Formulário
  updateDateTime();
  setInterval(updateDateTime, 1000);

  function updateDateTime() {
    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    
    if (dateEl) dateEl.textContent = now.toLocaleDateString('pt-BR');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // Carregar Alunos e Histórico
  loadStudents();
  if (reportList) fetchReports();

  // Buscar alunos no Banco SQLite
  async function loadStudents() {
    try {
      const response = await fetch(`${API_URL}/students`);
      if (!response.ok) throw new Error('Erro ao carregar alunos');
      
      const students = await response.json();
      
      if (students.length === 0) {
        studentSelect.innerHTML = '<option value="">Nenhum aluno cadastrado no sistema</option>';
        return;
      }

      studentSelect.innerHTML = '<option value="">-- Selecione o Aluno --</option>' + 
        students.map(s => `
          <option value="${s.id}" data-name="${s.name}" data-disability="${s.disability_type || ''}">
            ${s.name} ${s.disability_type ? `(${s.disability_type})` : ''}
          </option>
        `).join('');
    } catch (error) {
      console.error(error);
      studentSelect.innerHTML = '<option value="">Erro ao conectar com o banco de dados</option>';
    }
  }

  // Submeter Formulário: Salva os dados e Redireciona para a pasta report
  if (reportForm) {
    reportForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const studentId = studentSelect.value;
      const selectedOption = studentSelect.options[studentSelect.selectedIndex];
      const studentName = selectedOption.getAttribute('data-name');
      const disability = selectedOption.getAttribute('data-disability');
      
      const type = reportType.value;
      const content = reportContent.value.trim();
      const recommendations = reportRecommendations.value.trim();
      const currentDate = document.getElementById('currentDate')?.textContent || new Date().toLocaleDateString('pt-BR');
      const currentTime = document.getElementById('currentTime')?.textContent || new Date().toLocaleTimeString('pt-BR');
      const nowFormatted = `${currentDate} às ${currentTime}`;

      if (!studentId) {
        alert('Selecione um aluno cadastrado.');
        return;
      }

      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="ph ph-spinner"></i> Enviando Relatório...';

      // 1. Montar Texto Consolidado
      const fullReportText = `[${type}]\nData/Hora: ${nowFormatted}\n\nDESENVOLVIMENTO:\n${content}${recommendations ? `\n\nENCAMINHAMENTOS:\n${recommendations}` : ''}`;

      // 2. Salvar no LocalStorage para a tela na pasta report conseguir ler
      const novoRelatorio = {
        id: 'REF-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
        titulo: type || 'Relatório de Acompanhamento',
        aluno: studentName,
        professor: 'Professor Responsável',
        data: currentDate,
        status: 'Finalizado',
        conteudo: fullReportText
      };

      let relatoriosLocais = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];
      relatoriosLocais.unshift(novoRelatorio);
      localStorage.setItem('relatoriosSAPE', JSON.stringify(relatoriosLocais));

      // 3. Salvar no Backend SQLite
      try {
        await fetch(`${API_URL}/reports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: studentId,
            pdfContent: fullReportText,
            fileName: `Relatorio_${studentName.replace(/\s+/g, '_')}.pdf`
          })
        });
      } catch (err) {
        console.warn('Erro ao salvar no banco backend, mas salvo localmente:', err);
      }

      // 4. REDIRECIONAR PARA A TELA REPORT/INDEX.HTML (Sem baixar PDF)
      // Ajuste o caminho de acordo com a localização do formulário:
      // - Se o formulário está em uma subpasta (ex: /pages/): '../report/index.html'
      // - Se o formulário está na raiz do projeto: 'report/index.html'
      window.location.href = '../report/index.html'; 
    });
  }

  // Listar Histórico de Relatórios (se houver essa lista na tela)
  async function fetchReports() {
    if (!reportList) return;
    try {
      const response = await fetch(`${API_URL}/reports`);
      const reports = await response.json();

      if (!reports || reports.length === 0) {
        reportList.innerHTML = '<li class="empty-state">Nenhum relatório cadastrado ainda.</li>';
        return;
      }

      reportList.innerHTML = reports.map(r => `
        <li class="report-item">
          <div class="report-header-info">
            <span class="student-name"><i class="ph ph-user"></i> ${r.student_name}</span>
            <span class="report-badge">${new Date(r.created_at).toLocaleString('pt-BR')}</span>
          </div>
          <div class="report-body">${r.pdf_content}</div>
        </li>
      `).join('');
    } catch (err) {
      reportList.innerHTML = '<li class="empty-state">Erro ao buscar histórico.</li>';
    }
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', fetchReports);
  }
});