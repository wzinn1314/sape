const AUTH_BASE_PATH = (document.currentScript && document.currentScript.dataset.base) || '../';

function getLoginPath() {
  return `${AUTH_BASE_PATH}login/index.html`;
}

function getProfessorHomePath() {
  return `${AUTH_BASE_PATH}professor/index.html`;
}

function loadUserProfile() {
  const user = getCurrentUser();
  if (!user) return;

  const userName = user.name || 'Usuário';
  const userRole = user.role || 'Desenvolvedor(a)';

  const profileName = document.getElementById('professorName');
  const profileRole = document.getElementById('userType');
  const avatarProfile = document.getElementById('avatarProfile');
  const greetingEl = document.getElementById('professorGreeting');

  if (profileName) profileName.textContent = userName;
  if (profileRole) profileRole.textContent = userRole;
  if (avatarProfile) avatarProfile.textContent = userName.charAt(0).toUpperCase();
  if (greetingEl) greetingEl.textContent = userName;

  const subtitleEl = document.getElementById('headerSubtitle');
  if (subtitleEl) {
    subtitleEl.textContent = 'Painel administrativo do sistema SAPE';
  }
}

function checkAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = getLoginPath();
    return;
  }

  if (!isAdmin(user)) {
    window.location.href = getProfessorHomePath();
  }
}

function logout() {
  localStorage.removeItem('user');
  window.location.href = getLoginPath();
}

window.addEventListener('load', function () {
  checkAuth();
  loadUserProfile();
});
