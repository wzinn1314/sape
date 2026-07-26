/**
 * SISTEMA SAPE - LÓGICA CORE DO DASHBOARD
 */

const SAPE_CONFIG = {
  API_URL: 'http://localhost:3000',
  REFRESH_RATE: 15000,
  STORAGE_KEY: 'userLogado'
};

// --- CONTROLE DE INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  const user = validateAccess();
  if (!user) return;

  setupUI(user);
  renderDashboardData();
  setupEventListeners();
  
  // Timer para atualizar dados
  setInterval(renderDashboardData, SAPE_CONFIG.REFRESH_RATE);
}

// --- AUTENTICAÇÃO E PERMISSÕES ---
function validateAccess() {
  const userJson = localStorage.getItem(SAPE_CONFIG.STORAGE_KEY);
  
  if (!userJson) {
      window.location.href = '../login/index.html';
      return null;
  }

  try {
      const user = JSON.parse(userJson);
      
      // Lógica de Administrador (Obrigatória no seu pedido)
      const abaAdmin = document.getElementById('abaAdminMenu');
      if (abaAdmin) {
          const hasPrivileges = user.role === 'Admin' || user.matricula === 'ADM2026';
          abaAdmin.style.display = hasPrivileges ? 'flex' : 'none';
      }

      return user;
  } catch (e) {
      console.error("SAPE Erro: Falha ao ler dados da sessão.");
      return null;
  }
}

// --- INTERFACE ---
function setupUI(user) {
  // Iniciais para o Avatar
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
      const response = await fetch(`${SAPE_CONFIG.API_URL}/students/dashboard`);
      if (!response.ok) throw new Error("Server Error");
      
      const data = await response.json();
      
      updateStats(data);
      renderRecentList(data.recent);
      updateProgressBars(data.total);

  } catch (err) {
      console.warn("SAPE Dashboard: Rodando em modo offline ou erro na API.");
      // Opcional: preencher com zeros para não ficar vazio
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
              <div class="record-name">${aluno.nome}</div>
              <div class="record-meta">${aluno.turma} • ${aluno.curso}</div>
          </div>
          <div class="status-pill">${formatarDataRelativa(aluno.createdAt)}</div>
      </div>
  `).join('');
}

function updateProgressBars(total) {
  // Exemplo de meta fictícia de 50 alunos para preencher a barra
  const metas = { obs: 85, planos: 70, metas: 33 };
  
  document.querySelectorAll('.analytics-progress').forEach(bar => {
      const width = bar.getAttribute('data-value') || "70%";
      bar.style.width = width;
  });
}

// --- UTILITÁRIOS ---
function formatarDataRelativa(dateStr) {
  const data = new Date(dateStr);
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function logout() {
  localStorage.removeItem(SAPE_CONFIG.STORAGE_KEY);
  window.location.href = '../login/index.html';
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
  // Listener de atalhos de teclado (ex: CTRL+M para abrir Menu)
  document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'm') console.log("Atalho acionado");
  });
}