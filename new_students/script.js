const studentForm = document.getElementById('studentForm');

function saveStudent(student) {
  const stored = localStorage.getItem('students');
  const students = stored ? JSON.parse(stored) : [];
  

  students.unshift(student);
  localStorage.setItem('students', JSON.stringify(students));
}

function getStudentGradeValue(turma) {
  if (turma.startsWith('1º')) return '7';
  if (turma.startsWith('2º')) return '8';
  if (turma.startsWith('3º')) return '9';
  return turma;
}

if (studentForm) {
  studentForm.addEventListener('submit', function (event) {
    event.preventDefault();


    const student = {
      id: Date.now(), 
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
      

      pdi: {
        objetivos: document.getElementById('pdiObjetivos').value.trim(),
        estrategias: document.getElementById('pdiEstrategias').value.trim(),
        avaliacao: document.getElementById('pdiAvaliacao').value.trim()
      },
      historico: [],
      
      responsavel: document.getElementById('responsavelNome').value.trim(),
      parentesco: document.getElementById('parentesco').value,
      telefone: document.getElementById('telefone').value.trim(),
      email: document.getElementById('email').value.trim(),
      gradeValue: getStudentGradeValue(document.getElementById('turma').value),
      createdAt: new Date().toISOString()
    };

    
    if (!student.nome || !student.matricula || !student.cpf) {
      alert('Por favor, preencha os dados básicos (Nome, Matrícula e CPF).');
      return;
    }

    if (!document.getElementById('confirm').checked) {
      alert('Por favor, confirme que as informações são verdadeiras.');
      return;
    }

    saveStudent(student);
    alert('Aluno cadastrado com sucesso!');
    
    
    window.location.href = '../students/index.html';
  });
}