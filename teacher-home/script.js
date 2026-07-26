/**
 * SISTEMA SAPE - TELA DE INÍCIO DO PROFESSOR AEE
 */

const SAPE_CONFIG = {
  API_URL: 'http://localhost:3000',
  REFRESH_RATE: 30000,
  STORAGE_KEY: 'sape_user',
  TOKEN_KEY: 'sape_token'
};

// --- CONTROLE DE INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  const user = validateAccess();
  if (!user) return;

  setupUI(user);
  setLoading(true);
  renderDashboardData().finally(() => {
    setLoading(false);
  });
  setupEventListeners();
  
  // Timer para atualizar dados
  setInterval(() => {
    renderDashboardData();
  }, SAPE_CONFIG.REFRESH_RATE);
}

// --- AUTENTICAÇÃO E PERMISSÕES ---
function validateAccess() {
  const token = localStorage.getItem(SAPE_CONFIG.TOKEN_KEY);
  const userJson = localStorage.getItem(SAPE_CONFIG.STORAGE_KEY);
  
  if (!token || !userJson) {
    showToast("Sessão expirada. Faça login novamente.", "error");
    setTimeout(() => {
      window.location.href = '../login/index.html';
    }, 2000);
    return null;
  }

  try {
    const user = JSON.parse(userJson);
    
    // Identificar tipo de usuário para adaptar interface (sem redirecionamento)
    const role = (user.role || "").toLowerCase();
    const matricula = (user.matricula || "").toUpperCase();
    const isAdmin = role.includes("admin") || matricula === "ADM2026";
    
    // Apenas log para debug - não expulsa usuário
    console.log("Tipo de usuário:", isAdmin ? "Admin" : "Professor");

    return user;
  } catch (e) {
    console.error("SAPE Erro: Falha ao ler dados da sessão.");
    return null;
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem(SAPE_CONFIG.TOKEN_KEY);
  const user = JSON.parse(localStorage.getItem(SAPE_CONFIG.STORAGE_KEY) || "{}");
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-User-Id': user.id,
    'X-User-Role': user.role
  };
}

// --- INTERFACE ---
function setupUI(user) {
  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  
  const elements = {
      name: document.getElementById('professorName'),
      greeting: document.getElementById('professorGreeting'),
      type: document.getElementById('userType'),
      avatar: document.getElementById('avatarProfile'),
      date: document.getElementById('currentDate')
  };

  if (elements.name) elements.name.textContent = user.nome || user.name || "Professor";
  if (elements.greeting) elements.greeting.textContent = (user.nome || user.name || "Colega").split(' ')[0];
  if (elements.type) elements.type.textContent = user.role || "Professor AEE";
  if (elements.avatar) elements.avatar.textContent = getInitials(user.nome || user.name || "PR");

  // Data por extenso
  if (elements.date) {
      const agora = new Date();
      elements.date.innerHTML = `<i class="fas fa-calendar-day mr-2"></i> ${agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`;
  }

  animateEntry();
}

// --- CARREGAMENTO DE DADOS (DASHBOARD DO PROFESSOR) ---
async function renderDashboardData() {
  try {
    const user = JSON.parse(localStorage.getItem(SAPE_CONFIG.STORAGE_KEY) || "{}");
    
    // Carregar alunos vinculados ao professor
    const studentsResponse = await fetch(`${SAPE_CONFIG.API_URL}/users/${user.id}/students`, {
      headers: getAuthHeaders()
    });

    if (studentsResponse.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = '../login/index.html';
      }, 2000);
      return;
    }

    if (!studentsResponse.ok) throw new Error("Server Error");
    
    const linkedStudents = await studentsResponse.json();
    
    // Carregar relatórios do professor
    const reportsResponse = await fetch(`${SAPE_CONFIG.API_URL}/users/${user.id}/reports`, {
      headers: getAuthHeaders()
    });

    if (reportsResponse.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = '../login/index.html';
      }, 2000);
      return;
    }

    const reports = reportsResponse.ok ? await reportsResponse.json() : [];
    
    // Montar dados do dashboard
    const dashboardData = {
      linkedStudents: linkedStudents,
      reports: reports,
      totalStudents: linkedStudents.length,
      completedReports: reports.length
    };
    
    updateStats(dashboardData);
    renderLinkedStudents(dashboardData.linkedStudents);
    renderAttentionStudents(dashboardData.linkedStudents, dashboardData.reports);
    renderRecentReports(dashboardData.reports);

  } catch (err) {
    console.warn("SAPE Dashboard: Erro ao carregar dados da API.");
    showToast("Erro ao carregar dados. Verifique sua conexão.", "error");
  }
}

function updateStats(data) {
  const totalStudentsEl = document.getElementById('totalStudents');
  const completedReportsEl = document.getElementById('completedReports');
  const pendingReportsEl = document.getElementById('pendingReports');
  
  if (totalStudentsEl) totalStudentsEl.textContent = data.totalStudents || '0';
  if (completedReportsEl) completedReportsEl.textContent = data.completedReports || '0';
  
  // Calcular alunos sem relatório (alunos totais - alunos com relatório)
  const studentsWithReports = new Set(data.reports.map(r => r.student_id)).size;
  const pendingCount = data.totalStudents - studentsWithReports;
  if (pendingReportsEl) pendingReportsEl.textContent = pendingCount > 0 ? pendingCount : '0';
}

function renderLinkedStudents(students) {
  const container = document.getElementById('linkedStudentsList');
  if (!container) return;

  if (!students || students.length === 0) {
      container.innerHTML = '<p class="text-muted text-center py-4">Você não tem alunos vinculados ainda.</p>';
      return;
  }

  container.innerHTML = students.slice(0, 5).map(aluno => `
      <div class="record-item">
          <div class="record-info">
              <div class="record-name">${aluno.name || aluno.nome || 'Sem nome'}</div>
              <div class="record-meta">${aluno.turma || 'Sem turma'} • ${aluno.curso || 'Sem curso'}</div>
          </div>
          <a href="../report generation/index.html?studentId=${aluno.id}" class="action-btn">
              <i class="fas fa-file-medical"></i>
          </a>
      </div>
  `).join('');
}

function renderAttentionStudents(students, reports) {
  const container = document.getElementById('attentionStudentsList');
  if (!container) return;

  // Encontrar alunos sem relatório
  const studentsWithReports = new Set(reports.map(r => r.student_id));
  const studentsWithoutReports = students.filter(s => !studentsWithReports.has(s.id));

  if (!studentsWithoutReports || studentsWithoutReports.length === 0) {
      container.innerHTML = '<p class="text-muted text-center py-4">Todos os alunos têm relatórios recentes.</p>';
      return;
  }

  container.innerHTML = studentsWithoutReports.slice(0, 5).map(aluno => `
      <div class="record-item attention">
          <div class="record-info">
              <div class="record-name">${aluno.name || aluno.nome || 'Sem nome'}</div>
              <div class="record-meta">Sem relatório recente</div>
          </div>
          <a href="../report generation/index.html?studentId=${aluno.id}" class="action-btn urgent">
              <i class="fas fa-exclamation-circle"></i>
          </a>
      </div>
  `).join('');
}

function renderRecentReports(reports) {
  const container = document.getElementById('recentReportsList');
  if (!container) return;

  if (!reports || reports.length === 0) {
      container.innerHTML = '<p class="text-muted text-center py-4">Nenhum relatório realizado ainda.</p>';
      return;
  }

  container.innerHTML = reports.slice(0, 5).map(report => `
      <div class="record-item">
          <div class="record-info">
              <div class="record-name">${report.titulo || 'Relatório'}</div>
              <div class="record-meta">${report.aluno || 'Aluno'} • ${formatarDataRelativa(report.created_at)}</div>
          </div>
          <span class="status-pill success">Concluído</span>
      </div>
  `).join('');
}

// --- UTILITÁRIOS ---
function formatarDataRelativa(dateStr) {
  if (!dateStr) return 'N/A';
  const data = new Date(dateStr);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function logout() {
  localStorage.removeItem(SAPE_CONFIG.STORAGE_KEY);
  localStorage.removeItem(SAPE_CONFIG.TOKEN_KEY);
  showToast("Sessão encerrada com sucesso.", "success");
  setTimeout(() => {
    window.location.href = '../login/index.html';
  }, 1000);
}

function animateEntry() {
  const cards = document.querySelectorAll('.card, .box');
  cards.forEach((c, i) => {
      c.style.opacity = '0';
      c.style.transform = 'translateY(20px)';
      setTimeout(() => {
          c.style.transition = 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
          c.style.opacity = '1';
          c.style.transform = 'translateY(0)';
      }, i * 100);
  });
}

function setupEventListeners() {
  // Listener do botão de logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

function setLoading(isLoading) {
  const loadingState = document.getElementById('loadingState');
  const mainContent = document.querySelector('.stats-cards, .dashboard-grid');

  if (loadingState) {
    loadingState.style.display = isLoading ? 'flex' : 'none';
  }

  if (mainContent) {
    mainContent.style.opacity = isLoading ? '0.5' : '1';
    mainContent.style.pointerEvents = isLoading ? 'none' : 'all';
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
