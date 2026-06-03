// ========== DATA ATUAL ==========
function updateDate() {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Date();
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
      
      // Atualiza saudação no header
      document.getElementById('professorGreeting').textContent = userName;
      
      // Atualiza nome no perfil da sidebar
      document.getElementById('professorName').textContent = userName;
      
      // Atualiza tipo de usuário
      if (document.getElementById('userType')) {
        document.getElementById('userType').textContent = userRole;
      }
      
      // Atualiza avatar com primeira letra do nome
      const firstLetter = userName.charAt(0).toUpperCase();
      document.getElementById('avatarProfile').textContent = firstLetter;
      
      // Atualiza subtítulo baseado no tipo de usuário
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
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.transition = 'all 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 50);
  });
}


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
    const width = bar.style.width;
    bar.style.width = '0';
    setTimeout(() => {
      bar.style.transition = 'width 1s ease';
      bar.style.width = width;
    }, 100);
  });
}


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
