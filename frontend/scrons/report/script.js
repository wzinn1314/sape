const API_URL = (window.SAPE_CONFIG && window.SAPE_CONFIG.API_URL) || window.API_URL || 'http://localhost:3000';

let allReports = [];
let filteredReports = [];
let allStudents = [];
let allTeachers = [];
let currentPage = 1;
const itemsPerPage = 10;
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuth()) return;

  loadUserProfile();

  const today = new Date().toLocaleDateString('pt-BR');
  const todayDateElement = document.getElementById('todayDate');
  if (todayDateElement) todayDateElement.textContent = today;

  setupEventListeners();

  setLoading(true);
  await loadInitialData();
  setLoading(false);
});

function setupEventListeners() {
  const searchInput = document.getElementById('searchReport');
  const filterProfessor = document.getElementById('filterProfessor');
  const filterAluno = document.getElementById('filterAluno');
  const clearFiltersBtn = document.querySelector('.btn-clear-filters');
  const clearSearchBtn = document.querySelector('.clear-search');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');

  if (searchInput) searchInput.addEventListener('input', handleSearchInput);
  if (filterProfessor) filterProfessor.addEventListener('change', applyFilters);
  if (filterAluno) filterAluno.addEventListener('change', applyFilters);
  if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
  if (clearSearchBtn) clearSearchBtn.addEventListener('click', clearSearch);
  if (prevPageBtn) prevPageBtn.addEventListener('click', () => changePage(-1));
  if (nextPageBtn) nextPageBtn.addEventListener('click', () => changePage(1));
}

async function loadInitialData() {
  try {
    await loadReports();
    await loadStudents();
    await loadTeachers();
    applyFilters();
    updateStats();
  } catch (error) {
    console.error('Erro ao carregar dados iniciais:', error);
    showToast('Erro ao carregar dados. Verifique sua conexão.', 'error');
  }
}

// Normaliza um relatório vindo do backend (snake_case) para o formato que a tela usa
function normalizeReport(r) {
  return {
    id: r.id,
    titulo: r.titulo || r.file_name || 'Relatório AEE',
    aluno: r.aluno || r.student_name || r.studentName || 'Não informado',
    professor: r.professor || r.professorName || 'Não informado',
    professorId: r.professorId ?? r.user_id ?? r.userId ?? null,
    studentId: r.studentId ?? r.student_id ?? null,
    data: r.data,
    created_at: r.created_at,
    status: r.status || 'Finalizado',
    conteudo: r.conteudo || r.pdf_content || r.pdfContent || 'Sem conteúdo'
  };
}

async function loadReports() {
  try {
    const userJSON = localStorage.getItem("sape_user");
    let endpoint = `${API_URL}/reports`;
    
    if (userJSON) {
      const user = JSON.parse(userJSON);
      const role = (user.role || "").toLowerCase();
      const isAdmin = role.includes("admin");
      
      if (!isAdmin && user.id) {
        endpoint = `${API_URL}/users/${user.id}/reports`;
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

    if (!response.ok) throw new Error('Erro ao buscar relatórios');

    const data = await response.json();
    const rawBackendReports = Array.isArray(data) ? data : (data.data || []);
    const backendReports = rawBackendReports.map(normalizeReport);

    const localReports = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];

    const existingIds = new Set(backendReports.map(r => String(r.id)));
    const newLocalReports = localReports.filter(r => !existingIds.has(String(r.id)));

    allReports = [...newLocalReports, ...backendReports];
    filteredReports = [...allReports];
    
  } catch (error) {
    console.error('Erro ao carregar relatórios:', error);
    allReports = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];
    filteredReports = [...allReports];
  }
}

async function loadStudents() {
  try {
    const userJSON = localStorage.getItem("sape_user");
    let endpoint = `${API_URL}/students`;
    
    if (userJSON) {
      const user = JSON.parse(userJSON);
      const role = (user.role || "").toLowerCase();
      const isAdmin = role.includes("admin");
      
      if (!isAdmin && user.id) {
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

    if (!response.ok) throw new Error('Erro ao buscar alunos');

    allStudents = await response.json();
    
    const filterAluno = document.getElementById('filterAluno');
    if (filterAluno) {
      filterAluno.innerHTML = '<option value="">Todos os Alunos</option>';
      allStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.name || student.nome || 'Sem nome';
        filterAluno.appendChild(option);
      });
    }
    
  } catch (error) {
    console.error('Erro ao carregar alunos:', error);
  }
}

async function loadTeachers() {
  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = "../login/index.html";
      }, 2000);
      return;
    }

    if (!response.ok) throw new Error('Erro ao buscar professores');

    const allUsers = await response.json();
    allTeachers = allUsers.filter(u => {
      const role = (u.role || '').toLowerCase();
      return role.includes('prof') || role.includes('teacher') || role.includes('aee');
    });
    
    const filterProfessor = document.getElementById('filterProfessor');
    if (filterProfessor) {
      filterProfessor.innerHTML = '<option value="">Todos os Professores</option>';
      allTeachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.id;
        option.textContent = teacher.name || 'Sem nome';
        filterProfessor.appendChild(option);
      });
    }
    
  } catch (error) {
    console.error('Erro ao carregar professores:', error);
  }
}

function handleSearchInput() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applyFilters();
  }, 300);
}

function applyFilters() {
  const search = document.getElementById('searchReport')?.value.toLowerCase() || '';
  const professorId = document.getElementById('filterProfessor')?.value || '';
  const alunoId = document.getElementById('filterAluno')?.value || '';

  filteredReports = allReports.filter(report => {
    const matchSearch = !search || 
      (report.titulo || '').toLowerCase().includes(search) ||
      (report.aluno || '').toLowerCase().includes(search) ||
      (report.professor || '').toLowerCase().includes(search);

    const matchProfessor = !professorId || String(report.professorId) === String(professorId);
    const matchAluno = !alunoId || String(report.studentId) === String(alunoId);

    return matchSearch && matchProfessor && matchAluno;
  });

  currentPage = 1;
  renderReports();
  updatePagination();
}

function clearFilters() {
  const searchInput = document.getElementById('searchReport');
  const filterProfessor = document.getElementById('filterProfessor');
  const filterAluno = document.getElementById('filterAluno');

  if (searchInput) searchInput.value = '';
  if (filterProfessor) filterProfessor.value = '';
  if (filterAluno) filterAluno.value = '';

  applyFilters();
  showToast('Filtros limpos!', 'info');
}

function clearSearch() {
  const searchInput = document.getElementById('searchReport');
  if (searchInput) {
    searchInput.value = '';
    applyFilters();
  }
}

function renderReports() {
  const tbody = document.getElementById('reportBody');
  const emptyMessage = document.getElementById('emptyMessage');
  
  if (!tbody) return;

  tbody.innerHTML = '';

  if (filteredReports.length === 0) {
    if (emptyMessage) emptyMessage.style.display = 'block';
    return;
  }

  if (emptyMessage) emptyMessage.style.display = 'none';

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageReports = filteredReports.slice(startIndex, endIndex);

  pageReports.forEach(report => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="report-cell">
          <i class="fa-solid fa-file-pdf"></i>
          <div>
            <strong>${report.titulo || 'Sem título'}</strong>
            <span>${report.id || 'REF-' + (report.id || 'unknown')}</span>
          </div>
        </div>
      </td>
      <td>${report.aluno || 'Não informado'}</td>
      <td>${report.professor || 'Não informado'}</td>
      <td>${formatDate(report.created_at || report.data)}</td>
      <td><span class="status-badge status-finalizado">${report.status || 'Finalizado'}</span></td>
      <td>
        <div class="report-buttons">
          <button class="btn-action btn-view" title="Visualizar" onclick="visualizarRelatorio('${report.id}')">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="btn-action btn-download" title="Download" onclick="baixarRelatorio('${report.id}')">
            <i class="fa-solid fa-download"></i>
          </button>
          <button class="btn-action btn-delete" title="Excluir" onclick="deletarRelatorio('${report.id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updatePagination() {
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;

  const totalRows = document.getElementById('totalRows');
  const currentPageElement = document.getElementById('currentPage');
  const totalPagesElement = document.getElementById('totalPages');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');

  if (totalRows) totalRows.textContent = filteredReports.length;
  if (currentPageElement) currentPageElement.textContent = currentPage;
  if (totalPagesElement) totalPagesElement.textContent = totalPages;
  if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
}

function changePage(direction) {
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const newPage = currentPage + direction;

  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderReports();
    updatePagination();
  }
}

function updateStats() {
  const totalReports = document.getElementById('totalReports');
  const totalStudents = document.getElementById('totalStudents');
  const totalTeachers = document.getElementById('totalTeachers');
  const todayReports = document.getElementById('todayReports');

  if (totalReports) totalReports.textContent = allReports.length;
  if (totalStudents) totalStudents.textContent = allStudents.length;
  if (totalTeachers) totalTeachers.textContent = allTeachers.length;

  const today = new Date().toISOString().split('T')[0];
  const todayCount = allReports.filter(r => {
    if (!r.created_at) return false;
    const parsedDate = new Date(r.created_at);
    if (isNaN(parsedDate.getTime())) return false;
    const reportDate = parsedDate.toISOString().split('T')[0];
    return reportDate === today;
  }).length;

  if (todayReports) todayReports.textContent = todayCount;
}

function formatDate(dateString) {
  if (!dateString) return 'Não informado';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Não informado';
  return date.toLocaleDateString('pt-BR');
}

function visualizarRelatorio(id) {
  const report = allReports.find(r => String(r.id) === String(id));
  if (report) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
      z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white; padding: 30px; border-radius: 12px; max-width: 600px;
      max-height: 80vh; overflow-y: auto; width: 90%;
    `;
    
    modalContent.innerHTML = `
      <h2 style="margin-bottom: 15px;">${report.titulo || 'Relatório'}</h2>
      <p><strong>Aluno:</strong> ${report.aluno || 'Não informado'}</p>
      <p><strong>Professor:</strong> ${report.professor || 'Não informado'}</p>
      <p><strong>Data:</strong> ${formatDate(report.created_at || report.data)}</p>
      <hr style="margin: 15px 0;">
      <pre style="white-space: pre-wrap; font-family: inherit;">${report.conteudo || 'Sem conteúdo'}</pre>
      <button onclick="this.closest('.modal').remove()" style="margin-top: 20px; padding: 10px 20px; background: #1b66d2; color: white; border: none; border-radius: 6px; cursor: pointer;">Fechar</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  } else {
    showToast('Relatório não encontrado', 'error');
  }
}

function baixarRelatorio(id) {
  const report = allReports.find(r => String(r.id) === String(id));
  if (!report) {
    showToast('Relatório não encontrado', 'error');
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    const marginLeft = 45;
    const marginRight = 45;
    const marginBottom = 45;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - marginLeft - marginRight;
    let y = 55;

    const alunoNome = report.aluno || 'Não informado';
    const professorNome = report.professor || 'Não informado';
    const dataFormatada = formatDate(report.created_at || report.data);
    const titulo = report.titulo || 'Relatório AEE';
    const conteudo = report.conteudo || 'Sem conteúdo';

    function novaLinhaSeNecessario(alturaLinha) {
      if (y + alturaLinha > pageHeight - marginBottom) {
        doc.addPage();
        y = 55;
      }
    }

    function escreverTexto(texto, x, larguraDisponivel, alturaLinha) {
      const linhasQuebradas = doc.splitTextToSize(String(texto), larguraDisponivel);
      linhasQuebradas.forEach(l => {
        novaLinhaSeNecessario(alturaLinha);
        doc.text(l, x, y);
        y += alturaLinha;
      });
    }

    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Sistema SAPE - Relatório Pedagógico', marginLeft, y);
    y += 20;

    doc.setDrawColor(200);
    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 16;

    // Metadados
    const lhMeta = 13;
    doc.setFontSize(9);

    doc.setFont('helvetica', 'bold');
    doc.text('Título:', marginLeft, y);
    doc.setFont('helvetica', 'normal');
    escreverTexto(titulo, marginLeft + 55, usableWidth - 55, lhMeta);

    doc.setFont('helvetica', 'bold');
    doc.text('Aluno:', marginLeft, y);
    doc.setFont('helvetica', 'normal');
    escreverTexto(alunoNome, marginLeft + 55, usableWidth - 55, lhMeta);

    doc.setFont('helvetica', 'bold');
    doc.text('Professor:', marginLeft, y);
    doc.setFont('helvetica', 'normal');
    escreverTexto(professorNome, marginLeft + 55, usableWidth - 55, lhMeta);

    doc.setFont('helvetica', 'bold');
    doc.text('Data:', marginLeft, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dataFormatada, marginLeft + 55, y);
    y += lhMeta + 4;

    doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 16;

    // Conteúdo organizado por tópicos
    const lineHeight = 10;
    const paragrafoEspaco = 5;
    doc.setFontSize(7.5);

    const blocos = conteudo.split(/\n\s*\n/).filter(b => b.trim() !== '');

    blocos.forEach(bloco => {
      const linhasDoBloco = bloco.split('\n').filter(l => l.trim() !== '');

      linhasDoBloco.forEach(linhaOriginal => {
        const linha = linhaOriginal.trim();
        if (!linha) return;

        const ehTopico = linha === linha.toUpperCase() &&
                          /[A-ZÀ-Ú]/.test(linha) &&
                          !linha.includes('|') &&
                          !linha.startsWith('-') &&
                          !linha.startsWith('[') &&
                          linha.length < 80;

        const ehCabecalhoSecao = linha.startsWith('[') && linha.endsWith(']');
        const ehRotulo = /^[A-ZÀ-Ú/]+:$/.test(linha) || linha.startsWith('Data/Hora:');

        if (ehCabecalhoSecao) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10.5);
          escreverTexto(linha.replace(/^\[|\]$/g, ''), marginLeft, usableWidth, lineHeight + 2);
          y += 2;
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
        } else if (ehTopico) {
          y += 3;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(37, 99, 235);
          escreverTexto(linha, marginLeft, usableWidth, lineHeight + 1);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
        } else if (ehRotulo) {
          doc.setFont('helvetica', 'bold');
          escreverTexto(linha, marginLeft, usableWidth, lineHeight);
          doc.setFont('helvetica', 'normal');
        } else if (linha.startsWith('-')) {
          escreverTexto(linha, marginLeft + 10, usableWidth - 10, lineHeight);
        } else {
          escreverTexto(linha, marginLeft, usableWidth, lineHeight);
        }
      });

      y += paragrafoEspaco;
    });

    const nomeArquivo = `Relatorio_${alunoNome.replace(/\s+/g, '_')}_${dataFormatada.replace(/\//g, '-')}.pdf`;
    doc.save(nomeArquivo);

    showToast(`Baixando relatório: ${titulo}`, 'success');
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    showToast('Erro ao gerar o PDF do relatório.', 'error');
  }
}
async function deletarRelatorio(id) {
  if (!confirm('Deseja realmente excluir este relatório?')) return;

  try {
    const response = await fetch(`${API_URL}/reports/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = "../login/index.html";
      }, 2000);
      return;
    }

    const localReports = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];
    const updatedLocalReports = localReports.filter(r => String(r.id) !== String(id));
    localStorage.setItem('relatoriosSAPE', JSON.stringify(updatedLocalReports));

    if (response.ok) {
      showToast('Relatório excluído com sucesso!', 'success');
    } else {
      showToast('Relatório excluído localmente. Erro ao excluir do servidor.', 'warning');
    }
    
    await loadReports();
    applyFilters();
    updateStats();
  } catch (error) {
    console.error('Erro ao excluir relatório:', error);
    
    const localReports = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];
    const updatedLocalReports = localReports.filter(r => String(r.id) !== String(id));
    localStorage.setItem('relatoriosSAPE', JSON.stringify(updatedLocalReports));
    
    await loadReports();
    applyFilters();
    updateStats();
    
    showToast('Relatório excluído localmente. Erro ao excluir do servidor.', 'warning');
  }
}

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
  const tableCard = document.querySelector('.table-card');
  const statsGrid = document.querySelector('.stats-grid');

  if (loadingState) {
    loadingState.style.display = isLoading ? 'flex' : 'none';
  }

  if (tableCard) {
    tableCard.style.opacity = isLoading ? '0.5' : '1';
    tableCard.style.pointerEvents = isLoading ? 'none' : 'all';
  }

  if (statsGrid) {
    statsGrid.style.opacity = isLoading ? '0.5' : '1';
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