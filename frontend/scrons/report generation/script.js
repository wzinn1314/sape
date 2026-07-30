const API_URL = (window.SAPE_CONFIG && window.SAPE_CONFIG.API_URL) || window.API_URL || 'http://localhost:3000';

// Tipo de relatório que ativa o checklist (precisa bater com o value do <option> no HTML)
const TIPO_DIAGNOSTICO_INICIAL = "Avaliação Diagnóstica (Inicial)";

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;

  loadUserProfile();

  const studentSelect = document.getElementById('studentSelect');
  const reportType = document.getElementById('reportType');
  const reportContent = document.getElementById('reportContent');
  const reportRecommendations = document.getElementById('reportRecommendations');
  const reportForm = document.getElementById('reportForm');
  const btnSubmit = document.getElementById('btnSubmit');
  const reportContentWrapper = document.getElementById('reportContentWrapper');
  const diagnosticoWrapper = document.getElementById('diagnosticoChecklistWrapper');
  const diagnosticoChecklist = document.getElementById('diagnosticoChecklist');

  updateDateTime();
  setInterval(updateDateTime, 1000);


  

  function updateDateTime() {
    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    
    if (dateEl) dateEl.textContent = now.toLocaleDateString('pt-BR');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  loadStudents();

  // ==========================================
  // CHECKLIST DE AVALIAÇÃO DIAGNÓSTICA
  // ==========================================

  function montarChecklistDiagnostico() {
    if (!diagnosticoChecklist) return;

    diagnosticoChecklist.innerHTML = DIAGNOSTICO_INICIAL.map((bloco, areaIndex) => `
      <div class="diagnostico-area">
        <h3 class="diagnostico-area-titulo">${bloco.area}</h3>
        ${bloco.perguntas.map((pergunta, perguntaIndex) => {
          const nomeCampo = `diag_${areaIndex}_${perguntaIndex}`;
          return `
            <div class="diagnostico-item">
              <p class="diagnostico-pergunta">${pergunta}</p>
              <div class="diagnostico-opcoes">
                ${DIAGNOSTICO_OPCOES.map(op => `
                  <label class="diagnostico-opcao">
                    <input type="checkbox" name="${nomeCampo}" value="${op.valor}" data-area="${bloco.area}" data-pergunta="${pergunta}">
                    ${op.label}
                  </label>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `).join('');

    // Garante que só uma opção por pergunta fique marcada (checkbox se comportando como rádio)
    diagnosticoChecklist.addEventListener('change', (e) => {
      if (e.target.type !== 'checkbox') return;
      const nome = e.target.name;
      if (e.target.checked) {
        diagnosticoChecklist
          .querySelectorAll(`input[name="${nome}"]`)
          .forEach(input => {
            if (input !== e.target) input.checked = false;
          });
      }
    });
  }

  function alternarModoRelatorio() {
    const isDiagnosticoInicial = reportType.value === TIPO_DIAGNOSTICO_INICIAL;

    if (isDiagnosticoInicial) {
      diagnosticoWrapper.style.display = 'flex';
      reportContentWrapper.style.display = 'none';
      reportContent.removeAttribute('required');
      if (!diagnosticoChecklist.innerHTML) montarChecklistDiagnostico();
    } else {
      diagnosticoWrapper.style.display = 'none';
      reportContentWrapper.style.display = 'flex';
      reportContent.setAttribute('required', 'required');
    }
  }

  reportType.addEventListener('change', alternarModoRelatorio);
  alternarModoRelatorio(); // aplica o estado correto já na carga da página

  function coletarRespostasDiagnostico() {
    const respostasPorArea = {};

    diagnosticoChecklist.querySelectorAll('input[type="checkbox"]:checked').forEach(input => {
      const area = input.dataset.area;
      const pergunta = input.dataset.pergunta;
      const opcao = DIAGNOSTICO_OPCOES.find(o => o.valor === input.value);

      if (!respostasPorArea[area]) respostasPorArea[area] = [];
      respostasPorArea[area].push(`- ${pergunta} → ${opcao ? opcao.label : input.value}`);
    });

    let texto = '';
    Object.keys(respostasPorArea).forEach(area => {
      texto += `\n${area.toUpperCase()}\n${respostasPorArea[area].join('\n')}\n`;
    });

    return texto.trim();
  }

  function contarPerguntasRespondidas() {
    return diagnosticoChecklist.querySelectorAll('input[type="checkbox"]:checked').length;
  }

  // ==========================================
  // CARREGAR ALUNOS
  // ==========================================

  async function loadStudents() {
    try {
      const userJSON = localStorage.getItem("sape_user");
      let endpoint = `${API_URL}/students`;

      if (userJSON) {
        const user = JSON.parse(userJSON);
        const role = (user.role || "").toLowerCase();
        
        if (!role.includes("admin") && user.id) {
          endpoint = `${API_URL}/users/${user.id}/students`;
        }
      }

      const response = await fetch(endpoint, {
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        showToast("Sessão expirada. Faça login novamente.", "error");
        setTimeout(() => {
          window.location.href = "../login/index.html";
        }, 2000);
        return;
      }

      if (!response.ok) throw new Error('Erro ao carregar alunos');
      
      const students = await response.json();
      
      if (students.length === 0) {
        studentSelect.innerHTML = '<option value="">Nenhum aluno vinculado a você ou cadastrado.</option>';
        return;
      }

      studentSelect.innerHTML = '<option value="">-- Selecione o Aluno --</option>' + 
        students.map(s => {
          const safeName = (s.name || s.nome || 'Aluno sem nome').replace(/"/g, '&quot;');
          return `
            <option value="${s.id}" data-name="${safeName}" data-disability="${s.disability_type || ''}">
              ${s.name || s.nome || 'Aluno sem nome'} ${s.disability_type ? `(${s.disability_type})` : ''}
            </option>
          `;
        }).join('');
    } catch (error) {
      console.error(error);
      studentSelect.innerHTML = '<option value="">Erro ao conectar com o banco de dados</option>';
      showToast('Erro ao carregar alunos. Verifique sua conexão.', 'error');
    }
  }

  // ==========================================
  // SUBMISSÃO DO FORMULÁRIO
  // ==========================================

  if (reportForm) {
    reportForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const studentId = studentSelect.value;
      const selectedOption = studentSelect.options[studentSelect.selectedIndex];
      const studentName = (selectedOption && selectedOption.getAttribute('data-name')) || 'Aluno';

      const type = reportType.value;
      const isDiagnosticoInicial = type === TIPO_DIAGNOSTICO_INICIAL;
      const recommendations = reportRecommendations.value.trim();

      const currentDate = document.getElementById('currentDate')?.textContent || new Date().toLocaleDateString('pt-BR');
      const currentTime = document.getElementById('currentTime')?.textContent || new Date().toLocaleTimeString('pt-BR');
      const nowFormatted = `${currentDate} às ${currentTime}`;

      if (!studentId) {
        showToast('Selecione um aluno cadastrado.', 'error');
        return;
      }

      let content;

      if (isDiagnosticoInicial) {
        if (contarPerguntasRespondidas() === 0) {
          showToast('Marque pelo menos uma resposta no checklist.', 'error');
          return;
        }
        content = coletarRespostasDiagnostico();
      } else {
        content = reportContent.value.trim();
        if (!content || content.length < 10) {
          showToast('O relatório deve ter pelo menos 10 caracteres.', 'error');
          return;
        }
      }

      let professorName = 'Professor Responsável';
      let professorId = null;
      const userJSON = localStorage.getItem("sape_user");
      if (userJSON) {
        const user = JSON.parse(userJSON);
        professorName = user.name || professorName;
        professorId = user.id;
      }

      setLoading(true);
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="ph ph-spinner"></i> Enviando Relatório...';

      const fullReportText = `[${type}]\nData/Hora: ${nowFormatted}\n\nDESENVOLVIMENTO:\n${content}${recommendations ? `\n\nENCAMINHAMENTOS:\n${recommendations}` : ''}`;

      const localId = 'REF-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
      const novoRelatorio = {
        id: localId,
        titulo: type || 'Relatório de Acompanhamento',
        aluno: studentName,
        professor: professorName,
        professorId: professorId,
        studentId: studentId,
        data: currentDate,
        created_at: new Date().toISOString(),
        status: 'Finalizado',
        conteudo: fullReportText
      };

      let relatoriosLocais = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];
      relatoriosLocais.unshift(novoRelatorio);
      localStorage.setItem('relatoriosSAPE', JSON.stringify(relatoriosLocais));

      try {
        const response = await fetch(`${API_URL}/reports`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            studentId: studentId,
            userId: professorId,
            pdfContent: fullReportText,
            fileName: `Relatorio_${studentName.replace(/\s+/g, '_')}.pdf`
          })
        });

        if (response.ok) {
          try {
            const saved = await response.json();
            const backendId = saved?.id ?? saved?.data?.id;
            if (backendId) {
              const atualizados = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];
              const idx = atualizados.findIndex(r => r.id === localId);
              if (idx !== -1) {
                atualizados[idx].id = backendId;
                localStorage.setItem('relatoriosSAPE', JSON.stringify(atualizados));
              }
            }
          } catch (parseErr) {
            console.warn('Não foi possível ler o retorno do backend:', parseErr);
          }
        }

        showToast('Relatório salvo com sucesso!', 'success');

        setTimeout(() => {
          window.location.href = '../report/index.html';
        }, 1500);

      } catch (err) {
        console.warn('Erro ao salvar no banco backend, mas salvo localmente:', err);
        showToast('Relatório salvo localmente. Erro ao salvar no servidor.', 'warning');
        
        setTimeout(() => {
          window.location.href = '../report/index.html';
        }, 1500);
      } finally {
        setLoading(false);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="ph ph-file-pdf"></i> Salvar Relatório';
      }
    });
  }
});

function checkAuth() {
  const token = localStorage.getItem("sape_token");
  const user = localStorage.getItem("sape_user");
  
  if (!token || !user) {
    showToast("Sessão expirada. Faça login novamente.", "error");
    setTimeout(() => {
      window.location.href = "../login/index.html";
    }, 2000);
    return false;
  }
  
  return true;
}

function getAuthHeaders() {
  const token = localStorage.getItem("sape_token");
  const user = JSON.parse(localStorage.getItem("sape_user") || "{}");
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-User-Id': user.id,
    'X-User-Role': user.role
  };
}

function loadUserProfile() {
  const userString = localStorage.getItem("sape_user");
  if (!userString) return;

  try {
    const user = JSON.parse(userString);
    const nameElem = document.getElementById("professorName");
    const roleElem = document.getElementById("userType");
    const avatarElem = document.getElementById("avatarProfile");
    const adminMenu = document.getElementById("abaAdminMenu");
    const menuHome = document.getElementById("menuHome");
    const menuDashboard = document.getElementById("menuDashboard");
    const menuNewStudent = document.getElementById("menuNewStudent");

    if (nameElem) nameElem.textContent = user.name || "Professor(a)";
    if (roleElem) roleElem.textContent = user.role || "Professor(a) AEE";
    if (avatarElem) avatarElem.textContent = (user.name || "P").charAt(0).toUpperCase();
    
    if (adminMenu) {
      const role = (user.role || "").toLowerCase();
      if (role.includes("admin")) {
        adminMenu.style.display = "flex";
        if (menuDashboard) menuDashboard.style.display = "flex";
        if (menuNewStudent) menuNewStudent.style.display = "flex";
        if (menuHome) menuHome.style.display = "none";
      } else {
        if (menuDashboard) menuDashboard.style.display = "none";
        if (menuNewStudent) menuNewStudent.style.display = "none";
        if (menuHome) menuHome.style.display = "flex";
      }
    } else {
      const role = (user.role || "").toLowerCase();
      const isAdmin = role.includes("admin");
      
      if (menuDashboard) menuDashboard.style.display = isAdmin ? "flex" : "none";
      if (menuNewStudent) menuNewStudent.style.display = isAdmin ? "flex" : "none";
      if (menuHome) menuHome.style.display = isAdmin ? "none" : "flex";
    }
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
  }
}

function setLoading(isLoading) {
  const loadingState = document.getElementById('loadingState');
  const formCard = document.querySelector('.form-card');

  if (loadingState) {
    loadingState.style.display = isLoading ? 'flex' : 'none';
  }

  if (formCard) {
    formCard.style.opacity = isLoading ? '0.5' : '1';
    formCard.style.pointerEvents = isLoading ? 'none' : 'all';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const existingToast = container.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = getToastIcon(type);
  
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="${icon}"></i>
    </div>
    <div class="toast-content">
      <p class="toast-message">${message}</p>
    </div>
    <button class="toast-close" aria-label="Fechar notificação">
      <i class="fas fa-times"></i>
    </button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}


function getToastIcon(type) {
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  return icons[type] || icons.info;
}