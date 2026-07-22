const API_URL = 'http://localhost:3000';
const studentForm = document.getElementById('studentForm');

function getLoggedUserId() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    const user = JSON.parse(userStr);
    return user.id || null;
  } catch {
    return null;
  }
}

function getStudentGradeValue(turma) {
  if (turma.startsWith('1º')) return '7';
  if (turma.startsWith('2º')) return '8';
  if (turma.startsWith('3º')) return '9';
  return turma;
}

if (studentForm) {
  studentForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const student = {
      nome: document.getElementById('studentName').value.trim(),
      nascimento: document.getElementById('birthDate').value,
      matricula: document.getElementById('matricula').value.trim(),
      cpf: document.getElementById('cpf').value.trim(),
      turma: document.getElementById('turma').value,
      curso: document.getElementById('curso').value,
      anoLetivo: document.getElementById('anoLetivo').value.trim(),
      diagnostico: document.getElementById('diagnostico').value,
      pei: document.getElementById('pei').checked,
      suporte: document.getElementById('suporte').value,
      hiperfocos: document.getElementById('hiperfocos').value.trim(),
      gatilhos: document.getElementById('gatilhos').value.trim(),
      estrategias: document.getElementById('estrategias').value.trim(),
      responsavel: document.getElementById('responsavelNome').value.trim(),
      parentesco: document.getElementById('parentesco').value,
      telefone: document.getElementById('telefone').value.trim(),
      email: document.getElementById('email').value.trim(),
      gradeValue: getStudentGradeValue(document.getElementById('turma').value),
      registeredBy: getLoggedUserId()
    };

    if (!student.nome || !student.matricula || !student.cpf || !student.responsavel) {
      alert('Por favor, preencha os dados obrigatórios antes de salvar.');
      return;
    }

    if (!document.getElementById('confirm').checked) {
      alert('Por favor, confirme que as informações são verdadeiras.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student)
      });

      const result = await response.json();

      if (response.ok) {
        alert('Aluno cadastrado com sucesso!');
       
        window.location.href = '../deshboard/index.html';
        return;
      }

      alert(result.error || 'Erro ao cadastrar aluno.');
    } catch (error) {
      console.error(error);
      alert('Erro ao conectar com o servidor. Verifique se o backend está rodando.');
    }
  });
}