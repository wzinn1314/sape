/**
 * SISTEMA SAPE - LÓGICA CORE DO DASHBOARD (REFATORADO COM JWT)
 */

const SAPE_CONFIG = {
  API_URL: 'http://localhost:3000',
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
    // Carregar dados reais do banco de dados
    const [studentsResponse, reportsResponse, usersResponse] = await Promise.all([
      fetch(`${SAPE_CONFIG.API_URL}/students`, { headers: getAuthHeaders() }),
      fetch(`${SAPE_CONFIG.API_URL}/reports`, { headers: getAuthHeaders() }),
      fetch(`${SAPE_CONFIG.API_URL}/users`, { headers: getAuthHeaders() })
    ]);

    if (studentsResponse.status === 401 || reportsResponse.status === 401 || usersResponse.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = '../login/index.html';
      }, 2000);
      return;
    }

    const students = await studentsResponse.json();
    const reports = await reportsResponse.json();
    const users = await usersResponse.json();

    const studentsArray = Array.isArray(students) ? students : (students.data || []);
    const reportsArray = Array.isArray(reports) ? reports : (reports.data || []);
    const usersArray = Array.isArray(users) ? users : (users.data || []);

    // Filtrar apenas professores de AEE
    const teachers = usersArray.filter(u => {
      const role = (u.role || '').toLowerCase();
      return role.includes('prof') || role.includes('teacher') || role.includes('aee');
    });

    const data = {
      total: studentsArray.length,
      recent: studentsArray.slice(-5).reverse(),
      reports: reportsArray.length,
      teachers: teachers.length,
      students: studentsArray
    };
    
    updateStats(data);
    renderRecentList(data.recent);
    updateDiagnosisStats(data.students);
    updateSystemStatus(true);

  } catch (err) {
    console.warn("SAPE Dashboard: Erro ao carregar dados da API.", err);
    showToast("Erro ao carregar dados do dashboard. Verifique sua conexão.", "error");
    updateSystemStatus(false);
  }
}

function updateStats(data) {
  const totalEl = document.getElementById('totalStudents');
  const reportsEl = document.getElementById('totalReports');
  const teachersEl = document.getElementById('totalTeachers');
  
  if (totalEl) totalEl.textContent = data.total || '0';
  if (reportsEl) reportsEl.textContent = data.reports || '0';
  if (teachersEl) teachersEl.textContent = data.teachers || '0';
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

function updateDiagnosisStats(students) {
  const container = document.getElementById('diagnosisStats');
  if (!container || !students || students.length === 0) {
    if (container) container.innerHTML = '<div class="loading-state">Nenhum dado disponível</div>';
    return;
  }

  // Contar diagnósticos
  const diagnosisCount = {};
  students.forEach(student => {
    const diagnosis = (student.diagnostico || 'Não informado').toLowerCase();
    diagnosisCount[diagnosis] = (diagnosisCount[diagnosis] || 0) + 1;
  });

  const total = students.length;
  const sortedDiagnoses = Object.entries(diagnosisCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Top 5 diagnósticos

  if (sortedDiagnoses.length === 0) {
    container.innerHTML = '<div class="loading-state">Nenhum diagnóstico registrado</div>';
    return;
  }

  container.innerHTML = sortedDiagnoses.map(([diagnosis, count]) => {
    const percentage = Math.round((count / total) * 100);
    return `
      <div class="analytics-item">
        <div class="analytics-label-row">
          <span>${diagnosis.charAt(0).toUpperCase() + diagnosis.slice(1)}</span>
          <span>${count} (${percentage}%)</span>
        </div>
        <div class="analytics-bar">
          <div class="analytics-progress" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function updateSystemStatus(isOnline) {
  const container = document.getElementById('systemStatus');
  if (!container) return;

  if (isOnline) {
    container.innerHTML = `
      <div class="aviso-item aviso-green">
        <div class="aviso-content">
          <strong>Sistema Online</strong>
          <p>Conexão com banco de dados estabelecida.</p>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="aviso-item aviso-red">
        <div class="aviso-content">
          <strong>Sistema Offline</strong>
          <p>Não foi possível conectar ao banco de dados.</p>
        </div>
      </div>
    `;
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
  
  // Listener do botão de menu toggle (mobile)
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.querySelector('.sidebar');
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
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
