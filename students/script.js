
function openModal(studentId) {
  const modal = document.getElementById('modal' + studentId.charAt(0).toUpperCase() + studentId.slice(1));
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(studentId) {
  const modal = document.getElementById('modal' + studentId.charAt(0).toUpperCase() + studentId.slice(1));
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

document.addEventListener('click', function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
});


document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    });
  }
});


const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  const host = hostname && hostname !== '' ? hostname : '127.0.0.1';
  return `http://${host}:3000`;
})();
const searchInput = document.getElementById('searchInput');
const gradeFilter = document.getElementById('gradeFilter');
const typeFilter = document.getElementById('typeFilter');
const statusBar = document.getElementById('statusBar');
const headerSubtitle = document.getElementById('headerSubtitle');
const emptyState = document.getElementById('emptyState');

function setStatusMessage(message, type = 'info') {
  if (!statusBar) return;
  statusBar.textContent = message;
  statusBar.className = `status-bar ${type}`;
}

function setHeaderSubtitle(count) {
  if (!headerSubtitle) return;
  headerSubtitle.textContent = count === 0
    ? 'Nenhum aluno encontrado'
    : `Total de ${count} aluno${count === 1 ? '' : 's'} encontrado${count === 1 ? '' : 's'}`;
}

function getDiagnosticoType(diagnostico) {
  if (!diagnostico) return 'outro';
  const value = diagnostico.toLowerCase();
  if (value.includes('tdah')) return 'tdah';
  if (value.includes('dislexia')) return 'dislexia';
  if (value.includes('discalculia')) return 'discalculia';
  if (value.includes('tea') || value.includes('autismo')) return 'autismo';
  return 'outro';
}

function formatTurmaText(turma, curso) {
  if (turma && curso) return `${turma} - Turma ${curso}`;
  if (turma) return turma;
  if (curso) return `Turma ${curso}`;
  return 'Turma não informada';
}

function clearStudentGrid() {
  const grid = document.querySelector('.students-grid');
  if (!grid) return;
  grid.querySelectorAll('.student-card').forEach(card => card.remove());
  document.querySelectorAll('.modal[data-dynamic="true"]').forEach(modal => modal.remove());
}

function createStudentCardFromDb(student) {
  const card = document.createElement('div');
  card.className = 'student-card';
  card.dataset.grade = '7';
  card.dataset.type = 'aluno';
  card.dataset.matricula = student.id;

  const type = 'aluno';
  card.innerHTML = `
    <div class="card-header">
      <div class="badge-type ${type}">Aluno</div>
      <div class="card-actions">
        <button class="info-btn" onclick="openModal('dbAluno${student.id}')">
          <i class="fas fa-info-circle"></i>
        </button>
      </div>
    </div>
    <div class="student-avatar">
      <i class="fas fa-user-circle"></i>
    </div>
    <h3>${student.name}</h3>
    <p class="matricula">ID: ${student.id}</p>
    <p class="turma">CPF: ${student.cpf || 'Não informado'}</p>
    <div class="quick-info">
      <div class="info-item">
        <span class="label">Email:</span>
        <span class="value">${student.email || 'Não informado'}</span>
      </div>
      <div class="info-item">
        <span class="label">Perfil:</span>
        <span class="value">${student.perfil || student.role || 'Aluno'}</span>
      </div>
      <div class="info-item">
        <span class="label">Características:</span>
        <span class="value">${student.caracteristicas || 'Não informado'}</span>
      </div>
      <div class="info-item">
        <span class="label">Observação:</span>
        <span class="value">${student.observacao || 'Não informado'}</span>
      </div>
    </div>
    <button class="btn-details" onclick="openModal('dbAluno${student.id}')">Ver Detalhes Completos</button>
  `;

  return card;
}

function createStudentModalFromDb(student) {
  const modal = document.createElement('div');
  modal.id = `modalDbAluno${student.id}`;
  modal.className = 'modal';
  modal.dataset.dynamic = 'true';
  modal.innerHTML = `
    <div class="modal-content">
      <button class="close-btn" onclick="closeModal('dbAluno${student.id}')">✕</button>
      <div class="modal-header">
        <div class="modal-avatar"><i class="fas fa-user-circle"></i></div>
        <div class="modal-title">
          <h2>${student.name}</h2>
          <p>ID: ${student.id} | CPF: ${student.cpf || 'Não informado'}</p>
        </div>
        <div class="badge-large aluno">Aluno</div>
      </div>
      <div class="modal-grid">
        <section class="modal-section">
          <h3>📋 Informações Básicas</h3>
          <div class="info-box">
            <p><strong>Nome:</strong> ${student.name || 'Não informado'}</p>
            <p><strong>Email:</strong> ${student.email || 'Não informado'}</p>
            <p><strong>CPF:</strong> ${student.cpf || 'Não informado'}</p>
            <p><strong>Perfil:</strong> ${student.role || 'Aluno'}</p>
          </div>
        </section>
        <section class="modal-section">
          <h3>📝 Perfil e Observações</h3>
          <div class="info-box">
            <p><strong>Perfil:</strong> ${student.perfil || student.role || 'Aluno'}</p>
            <p><strong>Características:</strong> ${student.caracteristicas || 'Não informado'}</p>
            <p><strong>Observação:</strong> ${student.observacao || 'Não informado'}</p>
          </div>
        </section>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('dbAluno${student.id}')">Fechar</button>
      </div>
    </div>
  `;

  return modal;
}

function renderStudentsFromDb() {
  const grid = document.querySelector('.students-grid');
  if (!grid) return;

  setStatusMessage('Carregando alunos...', 'info');

  fetch(`${API_BASE_URL}/users`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`API retornou status ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const students = Array.isArray(data)
        ? data.filter(user => user.role && user.role.toLowerCase() === 'aluno')
        : [];

      clearStudentGrid();

      if (students.length === 0) {
        setStatusMessage('Nenhum aluno encontrado.', 'warning');
        setHeaderSubtitle(0);
        updateEmptyState();
        return;
      }

      setStatusMessage(`Foram encontrados ${students.length} aluno(s).`, 'success');
      setHeaderSubtitle(students.length);

      students.forEach(student => {
        const card = createStudentCardFromDb(student);
        grid.insertBefore(card, grid.firstChild);
        const modal = createStudentModalFromDb(student);
        document.body.appendChild(modal);
      });

      addDeleteButtons();
      updateEmptyState();

      const cards = updateStudentCards();
      cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
          card.style.transition = 'all 0.3s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, index * 50);
      });
    })
    .catch((error) => {
      setStatusMessage('Não foi possível carregar os alunos. Usando dados locais.', 'error');
      console.error('Erro ao carregar alunos:', error);
      renderStoredStudents();
    });
}

function updateStudentCards() {
  return document.querySelectorAll('.student-card');
}

function updateEmptyState() {
  const cards = updateStudentCards();
  if (!emptyState) return;
  emptyState.style.display = cards.length === 0 ? 'block' : 'none';
}

function filterStudents() {
  const searchTerm = searchInput?.value.toLowerCase() || '';
  const selectedGrade = gradeFilter?.value || '';
  const selectedType = typeFilter?.value || '';
  const cards = updateStudentCards();

  cards.forEach(card => {
    let matches = true;
    const nameText = card.querySelector('h3')?.textContent.toLowerCase() || '';
    const matriculaText = card.querySelector('.matricula')?.textContent.toLowerCase() || '';

    if (searchTerm) {
      matches = nameText.includes(searchTerm) || matriculaText.includes(searchTerm);
    }

    if (selectedGrade && matches) {
      matches = card.getAttribute('data-grade') === selectedGrade;
    }

    if (selectedType && matches) {
      matches = card.getAttribute('data-type') === selectedType;
    }

    card.style.display = matches ? '' : 'none';
  });
}

function createStudentCard(student) {
  const card = document.createElement('div');
  const type = getDiagnosticoType(student.diagnostico);
  card.className = 'student-card';
  card.dataset.grade = student.gradeValue || '7';
  card.dataset.type = type;
  card.dataset.matricula = student.matricula;

  card.innerHTML = `
    <div class="card-header">
      <div class="badge-type ${type}">${student.diagnostico || 'Inclusão'}</div>
      <div class="card-actions">
        <button class="info-btn" onclick="openModal('novoAluno${student.matricula}')">
          <i class="fas fa-info-circle"></i>
        </button>
        <button type="button" class="delete-btn" title="Excluir aluno" onclick="deleteStudent('${student.matricula}', this)">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>
    <div class="student-avatar">
      <i class="fas fa-user-circle"></i>
    </div>
    <h3>${student.nome}</h3>
    <p class="matricula">Matrícula: ${student.matricula}</p>
    <p class="turma">${formatTurmaText(student.turma, student.curso)}</p>
    <div class="quick-info">
      <div class="info-item">
        <span class="label">Perfil:</span>
        <span class="value">${student.perfil || student.role || 'Aluno'}</span>
      </div>
      <div class="info-item">
        <span class="label">Características:</span>
        <span class="value">${student.caracteristicas || 'Não informado'}</span>
      </div>
      <div class="info-item">
        <span class="label">Observação:</span>
        <span class="value">${student.observacao || 'Não informado'}</span>
      </div>
      <div class="info-item">
        <span class="label">Dificuldades:</span>
        <span class="value">${student.gatilhos || 'Não informado'}</span>
      </div>
      <div class="info-item">
        <span class="label">Pontos fortes:</span>
        <span class="value">${student.hiperfocos || 'Não informado'}</span>
      </div>
      <div class="info-item">
        <span class="label">Adaptações:</span>
        <span class="value">${student.estrategias || 'Não informado'}</span>
      </div>
    </div>
    <button class="btn-details" onclick="openModal('novoAluno${student.matricula}')">Ver Detalhes Completos</button>
  `;

  return card;
}

function createStudentModal(student) {
  const modal = document.createElement('div');
  const type = getDiagnosticoType(student.diagnostico);
  modal.id = `modalNovoAluno${student.matricula}`;
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <button class="close-btn" onclick="closeModal('novoAluno${student.matricula}')">✕</button>
      <div class="modal-header">
        <div class="modal-avatar"><i class="fas fa-user-circle"></i></div>
        <div class="modal-title">
          <h2>${student.nome}</h2>
          <p>Matrícula: ${student.matricula} | ${formatTurmaText(student.turma, student.curso)}</p>
        </div>
        <div class="badge-large ${type}">${student.diagnostico || 'Inclusão'}</div>
      </div>
      <div class="modal-grid">
        <section class="modal-section">
          <h3>📋 Diagnóstico e Avaliação</h3>
          <div class="info-box">
            <p><strong>Diagnóstico:</strong> ${student.diagnostico || 'Não informado'}</p>
            <p><strong>PEI:</strong> ${student.pei ? 'Sim' : 'Não'}</p>
            <p><strong>Nível de Suporte:</strong> ${student.suporte || 'Não informado'}</p>
          </div>
        </section>
        <section class="modal-section">
          <h3>� Perfil e Características</h3>
          <div class="info-box">
            <p><strong>Perfil:</strong> ${student.perfil || student.role || 'Aluno'}</p>
            <p><strong>Características:</strong> ${student.caracteristicas || 'Não informado'}</p>
            <p><strong>Observação:</strong> ${student.observacao || 'Não informado'}</p>
          </div>
        </section>
        <section class="modal-section">
          <h3>�💬 Responsável</h3>
          <div class="info-box">
            <p><strong>Nome:</strong> ${student.responsavel || 'Não informado'}</p>
            <p><strong>Parentesco:</strong> ${student.parentesco || 'Não informado'}</p>
            <p><strong>Telefone:</strong> ${student.telefone || 'Não informado'}</p>
            <p><strong>Email:</strong> ${student.email || 'Não informado'}</p>
          </div>
        </section>
        <section class="modal-section">
          <h3>📝 Estratégias e Observações</h3>
          <div class="info-box">
            <p><strong>Hiperfocos:</strong> ${student.hiperfocos || 'Não informado'}</p>
            <p><strong>Gatilhos:</strong> ${student.gatilhos || 'Não informado'}</p>
            <p><strong>Estratégias de calma:</strong> ${student.estrategias || 'Não informado'}</p>
          </div>
        </section>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal('novoAluno${student.matricula}')">Fechar</button>
      </div>
    </div>
  `;

  return modal;
}

function deleteStudent(matricula, button) {
  if (!confirm('Deseja realmente excluir este aluno?')) return;

  const card = button ? button.closest('.student-card') : document.querySelector(`.student-card[data-matricula="${matricula}"]`);
  if (card) card.remove();

  const stored = localStorage.getItem('students');
  if (stored) {
    const students = JSON.parse(stored);
    const filtered = students.filter(student => student.matricula !== matricula);
    localStorage.setItem('students', JSON.stringify(filtered));
  }

  updateEmptyState();
}

function addDeleteButtons() {
  const cards = document.querySelectorAll('.student-card');
  cards.forEach(card => {
    if (card.querySelector('.delete-btn')) return;
    const header = card.querySelector('.card-header');
    const matricula = card.querySelector('.matricula')?.textContent.replace('Matrícula:', '').trim();
    if (!header || !matricula) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'delete-btn';
    btn.title = 'Excluir aluno';
    btn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    btn.addEventListener('click', function (event) {
      event.stopPropagation();
      deleteStudent(matricula, this);
    });

    const actionGroup = document.createElement('div');
    actionGroup.className = 'card-actions';
    const infoBtn = header.querySelector('.info-btn');
    if (infoBtn) {
      actionGroup.appendChild(infoBtn);
    }
    actionGroup.appendChild(btn);
    header.appendChild(actionGroup);
  });
}

function renderStoredStudents() {
  const stored = localStorage.getItem('students');
  if (!stored) return;

  const students = JSON.parse(stored);
  const grid = document.querySelector('.students-grid');
  if (!grid) return;

  students.forEach(student => {
    if (!student || !student.matricula) return;

    const card = createStudentCard(student);
    grid.insertBefore(card, grid.firstChild);

    const modal = createStudentModal(student);
    document.body.appendChild(modal);
  });

  updateEmptyState();
}

if (searchInput) searchInput.addEventListener('input', filterStudents);
if (gradeFilter) gradeFilter.addEventListener('change', filterStudents);
if (typeFilter) typeFilter.addEventListener('change', filterStudents);

window.addEventListener('load', function() {
  renderStudentsFromDb();
});

const infoButtons = document.querySelectorAll('.info-btn');
infoButtons.forEach(btn => {
  btn.title = 'Ver detalhes completos do aluno';
});
