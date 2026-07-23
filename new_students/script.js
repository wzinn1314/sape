<<<<<<< HEAD
const studentForm = document.getElementById('studentForm');

function saveStudent(student) {
  const stored = localStorage.getItem('students');
  const students = stored ? JSON.parse(stored) : [];
  

  students.unshift(student);
  localStorage.setItem('students', JSON.stringify(students));
=======
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
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78
}

function getStudentGradeValue(turma) {
  if (turma.startsWith('1º')) return '7';
  if (turma.startsWith('2º')) return '8';
  if (turma.startsWith('3º')) return '9';
  return turma;
}

if (studentForm) {
<<<<<<< HEAD
  studentForm.addEventListener('submit', function (event) {
    event.preventDefault();


    const student = {
      id: Date.now(), 
=======
  studentForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const student = {
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78
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
<<<<<<< HEAD
      

      pdi: {
        objetivos: document.getElementById('pdiObjetivos').value.trim(),
        estrategias: document.getElementById('pdiEstrategias').value.trim(),
        avaliacao: document.getElementById('pdiAvaliacao').value.trim()
      },
      historico: [],
      
=======
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78
      responsavel: document.getElementById('responsavelNome').value.trim(),
      parentesco: document.getElementById('parentesco').value,
      telefone: document.getElementById('telefone').value.trim(),
      email: document.getElementById('email').value.trim(),
      gradeValue: getStudentGradeValue(document.getElementById('turma').value),
<<<<<<< HEAD
      createdAt: new Date().toISOString()
    };

    
    if (!student.nome || !student.matricula || !student.cpf) {
      alert('Por favor, preencha os dados básicos (Nome, Matrícula e CPF).');
=======
      registeredBy: getLoggedUserId()
    };

    if (!student.nome || !student.matricula || !student.cpf || !student.responsavel) {
      alert('Por favor, preencha os dados obrigatórios antes de salvar.');
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78
      return;
    }

    if (!document.getElementById('confirm').checked) {
      alert('Por favor, confirme que as informações são verdadeiras.');
      return;
    }

<<<<<<< HEAD
    saveStudent(student);
    alert('Aluno cadastrado com sucesso!');
    
    
    window.location.href = '../students/index.html';
=======
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
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78
  });
}