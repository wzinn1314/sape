<<<<<<< HEAD
=======
const API_URL = 'http://localhost:3000';
const REFRESH_INTERVAL_MS = 8000;
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78

function updateDate() {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Date();
<<<<<<< HEAD
  const dateString = today.toLocaleDateString('pt-BR', options);
  document.getElementById('currentDate').textContent = dateString;
}


function loadProfessorData() {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const userName = user.name || 'Usuário';
      const userRole = user.role || 'Professor(a)';
      
    
      document.getElementById('professorGreeting').textContent = userName;
      
      
      document.getElementById('professorName').textContent = userName;
      
      
      if (document.getElementById('userType')) {
        document.getElementById('userType').textContent = userRole;
      }
      
     
      const firstLetter = userName.charAt(0).toUpperCase();
      document.getElementById('avatarProfile').textContent = firstLetter;
      
      
      const subtitleEl = document.getElementById('headerSubtitle');
      if (subtitleEl) {
        if (userRole.toLowerCase().includes('aluno') || userRole.toLowerCase().includes('Aluno')) {
          subtitleEl.textContent = 'Acompanhe seu desempenho e evolução';
        } else {
          subtitleEl.textContent = 'Painel de controle e gerenciamento de alunos';
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  }
}


function checkAuth() {
  const user = localStorage.getItem('user');
  if (!user) {
    window.location.href = '../../login/index.html';
  }
}


function animateCards() {
  const cards = document.querySelectorAll('.card, .box');
  cards.forEach((card, index) => {
=======
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    dateEl.textContent = today.toLocaleDateString('pt-BR', options);
  }
}

function loadProfessorData() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return;

  try {
    const user = JSON.parse(userStr);
    const userName = user.name || 'Usuário';
    const userRole = user.role || 'Professor(a)';

    const greetingEl = document.getElementById('professorGreeting');
    const nameEl = document.getElementById('professorName');
    const typeEl = document.getElementById('userType');
    const avatarEl = document.getElementById('avatarProfile');

    if (greetingEl) greetingEl.textContent = userName;
    if (nameEl) nameEl.textContent = userName;
    if (typeEl) typeEl.textContent = userRole;
    if (avatarEl) avatarEl.textContent = userName.charAt(0).toUpperCase();

    const subtitleEl = document.getElementById('headerSubtitle');
    if (subtitleEl) {
      const isStudent = userRole.toLowerCase().includes('aluno');
      subtitleEl.textContent = isStudent
        ? 'Acompanhe seu desempenho e evolução'
        : 'Painel de controle e gerenciamento de alunos';
    }
  } catch (error) {
    console.error('Erro ao carregar dados do usuário:', error);
  }
}

function checkAuth() {
  if (!localStorage.getItem('user')) {
    window.location.href = '../login/index.html';
  }
}

function animateCards() {
  document.querySelectorAll('.card, .box').forEach((card, index) => {
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'all 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 50);
  });
}

<<<<<<< HEAD

function logout() {
  localStorage.removeItem('user');
  window.location.href = '../../login/index.html';
}


window.addEventListener('load', function() {
  checkAuth();
  loadProfessorData();
  updateDate();
  animateCards();
});


setInterval(updateDate, 60000);

const menuLinks = document.querySelectorAll('.menu a');
menuLinks.forEach(link => {
  link.addEventListener('click', function(e) {
  
    if (this.href === '#') {
      e.preventDefault();
    }
  });
});




const avisoItems = document.querySelectorAll('.aviso-item');
avisoItems.forEach(item => {
  item.addEventListener('mouseenter', function() {
    this.style.transform = 'translateX(8px)';
  });
  item.addEventListener('mouseleave', function() {
    this.style.transform = 'translateX(0)';
  });
});


function animateProgressBars() {
  const bars = document.querySelectorAll('.analytics-progress');
  bars.forEach(bar => {
=======
function logout() {
  localStorage.removeItem('user');
  window.location.href = '../login/index.html';
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
}

function formatRelativeDate(isoDate) {
  if (!isoDate) return 'Data não informada';

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return 'Data inválida';

  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Agora mesmo';
  if (diffMinutes < 60) return `Há ${diffMinutes} min`;
  if (diffHours < 24 && date.toDateString() === now.toDateString()) {
    return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays === 1) {
    return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTurmaText(turma, curso) {
  if (turma && curso) return `${turma} • ${curso}`;
  return turma || curso || 'Turma não informada';
}

/* RENDERIZA OS ÚLTIMOS ALUNOS REGISTRADOS */
function renderRecentStudents(students) {
  const listEl = document.getElementById('recentStudentsList');
  const emptyEl = document.getElementById('recentStudentsEmpty');
  if (!listEl) return;

  listEl.querySelectorAll('.record-item').forEach(item => item.remove());

  if (!students || !students.length) {
    if (emptyEl) {
      emptyEl.textContent = 'Nenhum aluno cadastrado ainda.';
      emptyEl.style.display = 'block';
    }
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  students.forEach(student => {
    const item = document.createElement('div');
    item.className = 'record-item';
    
    const studentName = student.nome || student.name || 'Aluno sem nome';
    const registeredBy = student.registeredByName || student.createdBy || 'Usuário';

    item.innerHTML = `
      <div class="record-info">
        <div class="record-name">${studentName}</div>
        <div class="record-meta">
          ${formatTurmaText(student.turma, student.curso)}
          • Cadastrado por ${registeredBy}
        </div>
      </div>
      <div class="record-date">${formatRelativeDate(student.createdAt)}</div>
    `;
    listEl.appendChild(item);
  });
}

/* RENDERIZA OS ALUNOS EM FOCO */
function renderStudentsFocus(students) {
  const listEl = document.getElementById('studentsFocusList');
  const emptyEl = document.getElementById('studentsFocusEmpty');
  if (!listEl) return;

  listEl.querySelectorAll('.student-focus-item').forEach(item => item.remove());

  const focusStudents = (students || []).slice(0, 3);

  if (!focusStudents.length) {
    if (emptyEl) {
      emptyEl.textContent = 'Nenhum aluno cadastrado ainda.';
      emptyEl.style.display = 'block';
    }
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  focusStudents.forEach(student => {
    const item = document.createElement('div');
    item.className = 'student-focus-item';
    const studentName = student.nome || student.name || 'Aluno sem nome';

    item.innerHTML = `
      <div class="student-focus-avatar">${getInitials(studentName)}</div>
      <div class="student-focus-content">
        <strong>${studentName}</strong>
        <span>${formatTurmaText(student.turma, student.curso)} • ${student.diagnostico || 'Inclusão'}</span>
      </div>
      <div class="student-focus-status green">Novo</div>
    `;
    listEl.appendChild(item);
  });
}

/* CARREGA DADOS DO DASHBOARD VIA API */
async function loadDashboardData() {
  const totalEl = document.getElementById('totalStudents');

  try {
    const response = await fetch(`${API_URL}/students/dashboard`);
    if (!response.ok) throw new Error('Falha ao buscar dados');

    const data = await response.json();

    if (totalEl) {
      totalEl.textContent = data.total ?? (data.recent ? data.recent.length : 0);
    }

    renderRecentStudents(data.recent || []);
    renderStudentsFocus(data.recent || []);
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    if (totalEl) totalEl.textContent = '—';

    const recentEmpty = document.getElementById('recentStudentsEmpty');
    const focusEmpty = document.getElementById('studentsFocusEmpty');

    if (recentEmpty) {
      recentEmpty.textContent = 'Não foi possível conectar ao servidor.';
      recentEmpty.style.display = 'block';
    }
    if (focusEmpty) {
      focusEmpty.textContent = 'Não foi possível conectar ao servidor.';
      focusEmpty.style.display = 'block';
    }
  }
}

function animateProgressBars() {
  document.querySelectorAll('.analytics-progress').forEach(bar => {
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78
    const width = bar.style.width;
    bar.style.width = '0';
    setTimeout(() => {
      bar.style.transition = 'width 1s ease';
      bar.style.width = width;
    }, 100);
  });
}

<<<<<<< HEAD

window.addEventListener('load', animateProgressBars);

document.querySelectorAll('.card-link').forEach(link => {
  link.addEventListener('click', function(e) {
    if (this.href !== '#') {
      // Se for um link real, deixar passar normalmente
      return;
    }
    e.preventDefault();
  });
});


console.log('Dashboard SAPE carregada com sucesso!');
console.log('Hora da página:', new Date().toLocaleTimeString('pt-BR'));
=======
window.addEventListener('load', function () {
  checkAuth();
  loadProfessorData();
  updateDate();
  animateCards();
  loadDashboardData();
  animateProgressBars();

  setInterval(loadDashboardData, REFRESH_INTERVAL_MS);
});

setInterval(updateDate, 60000);

document.querySelectorAll('.menu a').forEach(link => {
  link.addEventListener('click', function (e) {
    if (this.getAttribute('href') === '#') e.preventDefault();
  });
});

document.querySelectorAll('.aviso-item').forEach(item => {
  item.addEventListener('mouseenter', function () {
    this.style.transform = 'translateX(8px)';
  });
  item.addEventListener('mouseleave', function () {
    this.style.transform = 'translateX(0)';
  });
});
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78
