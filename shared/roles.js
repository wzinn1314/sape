function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Erro ao ler usuário:', error);
    return null;
  }
}

function getRole(user) {
  return (user && user.role ? user.role : '').toString().toLowerCase();
}

function isAdmin(user) {
  const role = getRole(user);
  return role.includes('desenvolvedor')
    || role.includes('admin')
    || role.includes('administrador');
}

function isProfessor(user) {
  const role = getRole(user);
  return role.includes('prof') || role.includes('professor');
}

function isStudent(user) {
  const role = getRole(user);
  return role.includes('aluno') || role.includes('student');
}

function getHomePathForUser(user) {
  if (isAdmin(user)) return 'deshboard/index.html';
  if (isProfessor(user)) return 'professor/index.html';
  if (isStudent(user)) return 'professor/alunos/index.html';
  return 'login/index.html';
}
