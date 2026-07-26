/**
 * SISTEMA SAPE - LÓGICA CORE DO DASHBOARD (REFATORADO COM JWT)
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
    
    // Lógica de Administrador - esconder itens de menu para professores
    const abaAdmin = document.getElementById('abaAdminMenu');
    const menuNovoAluno = document.querySelector('a[href="../new_students/index.html"]');
    const menuDashboard = document.querySelector('a[href="../deshboard/index.html"]');
    
    if (abaAdmin) {
      const role = (user.role || "").toLowerCase();
      const matricula = (user.matricula || "").toUpperCase();
      const hasPrivileges = role.includes("admin") || matricula === "ADM2026";
      abaAdmin.style.display = hasPrivileges ? 'flex' : 'none';
    }
    
    // Esconder "Novo Aluno" para professores
    if (menuNovoAluno) {
      const role = (user.role || "").toLowerCase();
      const matricula = (user.matricula || "").toUpperCase();
      const hasPrivileges = role.includes("admin") || matricula === "ADM2026";
      menuNovoAluno.style.display = hasPrivileges ? 'flex' : 'none';
    }

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

  if (elements.name) elements.name.textContent = user.nome || user.name || "Usuário";
  if (elements.greeting) elements.greeting.textContent = (user.nome || user.name || "Colega").split(' ')[0];
  if (elements.type) elements.type.textContent = user.role || "Docente";
  if (elements.avatar) elements.avatar.textContent = getInitials(user.nome || user.name || "US");

  // Data por extenso
  if (elements.date) {
      const agora = new Date();
      elements.date.innerHTML = `<i class="fas fa-calendar-day mr-2"></i> ${agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`;
  }

  animateEntry();
}

// --- CARREGAMENTO DE DADOS (DASHBOARD REAL) ---
async function renderDashboardData() {
  try {
    // Usar rota dedicada do dashboard
    const response = await fetch(`${SAPE_CONFIG.API_URL}/students/dashboard`, {
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = '../login/index.html';
      }, 2000);
      return;
    }

    if (!response.ok) throw new Error("Server Error");
    
    const result = await response.json();
    const data = result.data || {
      total: 0,
      recent: [],
      reports: 0
    };
    
    updateStats(data);
    renderRecentList(data.recent);
    updateProgressBars(data);

  } catch (err) {
    console.warn("SAPE Dashboard: Erro ao carregar dados da API.");
    showToast("Erro ao carregar dados do dashboard. Verifique sua conexão.", "error");
  }
}

function updateStats(data) {
  const totalEl = document.getElementById('totalStudents');
  if (totalEl) totalEl.textContent = data.total || '0';
}

function renderRecentList(students) {
  const container = document.getElementById('recentStudentsList');
  if (!container) return;

  if (!students || students.length === 0) {
      container.innerHTML = '<p class="text-muted text-center py-4">Nenhum registro encontrado.</p>';
      return;
  }

  container.innerHTML = students.slice(0, 5).map(aluno => `
      <div class="record-item">
          <div class="record-info">
              <div class="record-name">${aluno.name || aluno.nome || 'Sem nome'}</div>
              <div class="record-meta">${aluno.turma || 'Sem turma'} • ${aluno.curso || 'Sem curso'}</div>
          </div>
          <div class="status-pill">${formatarDataRelativa(aluno.created_at)}</div>
      </div>
  `).join('');
}

function updateProgressBars(data) {
  // Calcular métricas reais baseadas nos dados
  const totalStudents = data.total || 0;
  const totalReports = data.reports || 0;
  
  // Porcentagem de alunos com relatórios
  const reportsPercentage = totalStudents > 0 ? Math.round((totalReports / totalStudents) * 100) : 0;
  
  // Simular outras métricas (em um sistema real, viriam do backend)
  const plansPercentage = totalStudents > 0 ? Math.round((totalStudents * 0.6) / totalStudents * 100) : 60;
  const obsPercentage = totalStudents > 0 ? Math.round((totalStudents * 0.85) / totalStudents * 100) : 85;
  
  const progressBars = document.querySelectorAll('.analytics-progress');
  if (progressBars.length >= 3) {
    progressBars[0].style.width = `${obsPercentage}%`;
    progressBars[1].style.width = `${plansPercentage}%`;
    progressBars[2].style.width = `${reportsPercentage}%`;
    
    // Atualizar labels
    const labels = document.querySelectorAll('.analytics-label-row span:last-child');
    if (labels.length >= 3) {
      labels[0].textContent = `${obsPercentage}%`;
      labels[1].textContent = `${plansPercentage}%`;
      labels[2].textContent = `${reportsPercentage}%`;
    }
  }
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
  // Listener de atalhos de teclado
  document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'm') console.log("Atalho acionado");
  });

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
