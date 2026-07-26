const API_URL = 'http://localhost:3000';

// Estado da aplicação
let allReports = [];
let filteredReports = [];
let allStudents = [];
let allTeachers = [];
let currentPage = 1;
const itemsPerPage = 10;
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar autenticação
  if (!checkAuth()) return;

  // Carregar perfil do usuário
  loadUserProfile();

  // Definir data atual
  const today = new Date().toLocaleDateString('pt-BR');
  const todayDateElement = document.getElementById('todayDate');
  if (todayDateElement) todayDateElement.textContent = today;

  // Configurar eventos
  setupEventListeners();

  // Carregar dados
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

  if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
  }

  if (filterProfessor) {
    filterProfessor.addEventListener('change', applyFilters);
  }

  if (filterAluno) {
    filterAluno.addEventListener('change', applyFilters);
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearFilters);
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', clearSearch);
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => changePage(-1));
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => changePage(1));
  }
}

async function loadInitialData() {
  try {
    // Carregar relatórios
    await loadReports();
    
    // Carregar alunos para filtros
    await loadStudents();
    
    // Carregar professores para filtros
    await loadTeachers();
    
    // Aplicar filtros iniciais
    applyFilters();
    
    // Atualizar estatísticas
    updateStats();
    
  } catch (error) {
    console.error('Erro ao carregar dados iniciais:', error);
    showToast('Erro ao carregar dados. Verifique sua conexão.', 'error');
  }
}

async function loadReports() {
  try {
    const userJSON = localStorage.getItem("sape_user");
    let endpoint = `${API_URL}/reports`;
    
    if (userJSON) {
      const user = JSON.parse(userJSON);
      const role = (user.role || "").toLowerCase();
      const matricula = (user.matricula || "").toUpperCase();
      const isAdmin = role.includes("admin") || matricula === "ADM2026";
      
      // Se não for admin, busca apenas relatórios do professor
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
    allReports = Array.isArray(data) ? data : (data.data || []);
    
    // Também carregar relatórios do localStorage e combinar
    const localReports = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];
    
    // Combinar relatórios do backend com locais, evitando duplicatas pelo ID
    const existingIds = new Set(allReports.map(r => r.id));
    const newLocalReports = localReports.filter(r => !existingIds.has(r.id));
    
    allReports = [...newLocalReports, ...allReports];
    filteredReports = [...allReports];
    
  } catch (error) {
    console.error('Erro ao carregar relatórios:', error);
    // Fallback para localStorage
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
      const matricula = (user.matricula || "").toUpperCase();
      const isAdmin = role.includes("admin") || matricula === "ADM2026";
      
      // Se não for admin, busca apenas alunos vinculados
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
    
    // Preencher select de alunos
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
    
    // Preencher select de professores
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
  }, 300); // Debounce de 300ms
}

function applyFilters() {
  const search = document.getElementById('searchReport')?.value.toLowerCase() || '';
  const professorId = document.getElementById('filterProfessor')?.value || '';
  const alunoId = document.getElementById('filterAluno')?.value || '';

  filteredReports = allReports.filter(report => {
    // Filtro de busca
    const matchSearch = !search || 
      (report.titulo || '').toLowerCase().includes(search) ||
      (report.aluno || '').toLowerCase().includes(search) ||
      (report.professor || '').toLowerCase().includes(search);

    // Filtro de professor
    const matchProfessor = !professorId || report.professorId == professorId;

    // Filtro de aluno
    const matchAluno = !alunoId || report.studentId == alunoId;

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

  // Limpar tabela
  tbody.innerHTML = '';

  if (filteredReports.length === 0) {
    if (emptyMessage) emptyMessage.style.display = 'block';
    return;
  }

  if (emptyMessage) emptyMessage.style.display = 'none';

  // Calcular paginação
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageReports = filteredReports.slice(startIndex, endIndex);

  // Renderizar linhas
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
      <td>${report.aluno || report.studentName || 'Não informado'}</td>
      <td>${report.professor || report.professorName || 'Não informado'}</td>
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
  const startItem = filteredReports.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, filteredReports.length);

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

  // Calcular relatórios de hoje
  const today = new Date().toISOString().split('T')[0];
  const todayCount = allReports.filter(r => {
    const reportDate = new Date(r.created_at).toISOString().split('T')[0];
    return reportDate === today;
  }).length;

  if (todayReports) todayReports.textContent = todayCount;
}

function formatDate(dateString) {
  if (!dateString) return 'Não informado';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

// Funções de ação
function visualizarRelatorio(id) {
  const report = allReports.find(r => r.id == id);
  if (report) {
    // Criar modal simples para visualizar o conteúdo
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
      <p><strong>Aluno:</strong> ${report.aluno || report.studentName || 'Não informado'}</p>
      <p><strong>Professor:</strong> ${report.professor || report.professorName || 'Não informado'}</p>
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
  const report = allReports.find(r => r.id == id);
  if (report) {
    // Criar arquivo texto para download
    const content = report.conteudo || `${report.titulo}\n\nAluno: ${report.aluno || report.studentName}\nProfessor: ${report.professor || report.professorName}\nData: ${formatDate(report.created_at || report.data)}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_${report.aluno || report.studentName || 'aluno'}_${formatDate(report.created_at || report.data)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Baixando relatório: ${report.titulo}`, 'success');
  } else {
    showToast('Relatório não encontrado', 'error');
  }
}

async function deletarRelatorio(id) {
  if (!confirm('Deseja realmente excluir este relatório?')) return;

  try {
    // Tentar deletar do backend
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

    // Deletar do localStorage independente da resposta do backend
    const localReports = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];
    const updatedLocalReports = localReports.filter(r => r.id !== id);
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
    
    // Ainda tentar deletar do localStorage mesmo com erro
    const localReports = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];
    const updatedLocalReports = localReports.filter(r => r.id !== id);
    localStorage.setItem('relatoriosSAPE', JSON.stringify(updatedLocalReports));
    
    await loadReports();
    applyFilters();
    updateStats();
    
    showToast('Relatório excluído localmente. Erro ao excluir do servidor.', 'warning');
  }
}

// Funções de autenticação
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
    
    // Mostrar menu admin se for admin
    if (adminMenu) {
      const role = (user.role || "").toLowerCase();
      const matricula = (user.matricula || "").toUpperCase();
      if (role.includes("admin") || matricula === "ADM2026") {
        adminMenu.style.display = "flex";
        // Se for admin, mostra Dashboard e Novo Aluno, esconde Início
        if (menuDashboard) menuDashboard.style.display = "flex";
        if (menuNewStudent) menuNewStudent.style.display = "flex";
        if (menuHome) menuHome.style.display = "none";
      } else {
        // Se for professor, mostra Início, esconde Dashboard e Novo Aluno
        if (menuDashboard) menuDashboard.style.display = "none";
        if (menuNewStudent) menuNewStudent.style.display = "none";
        if (menuHome) menuHome.style.display = "flex";
      }
    } else {
      // Se não tiver adminMenu, aplica a lógica nos outros menus
      const role = (user.role || "").toLowerCase();
      const matricula = (user.matricula || "").toUpperCase();
      const isAdmin = role.includes("admin") || matricula === "ADM2026";
      
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

// Toast notifications
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

// Menu toggle para mobile
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
if (menuToggle && sidebar) {
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
}
