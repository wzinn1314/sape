const AUTH_BASE_PATH = (document.currentScript && document.currentScript.dataset.base) || '../';

function getLoginPath() {
  return `${AUTH_BASE_PATH}login/index.html`;
}

function getAdminHomePath() {
  return `${AUTH_BASE_PATH}deshboard/index.html`;
}

function loadUserProfile() {
  const user = getCurrentUser();
  if (!user) return;

  const userName = user.name || 'Usuário';
  const userRole = user.role || 'Professor(a)';

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
    if (isStudent(user)) {
      subtitleEl.textContent = 'Acompanhe informações de apoio pedagógico';
    } else {
      subtitleEl.textContent = 'Portal do Apoio Especializado';
    }
  }
}

function checkAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = getLoginPath();
    return;
  }

  if (isAdmin(user)) {
    window.location.href = getAdminHomePath();
    return;
  }

  if (!isProfessor(user) && !isStudent(user)) {
    window.location.href = getLoginPath();
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
