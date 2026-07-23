<<<<<<< HEAD

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
function savePDIDinamico(matricula) {
  let students = JSON.parse(localStorage.getItem('students') || '[]');
  const idx = students.findIndex(s => s.matricula === matricula);
  
  if (idx !== -1) {
    students[idx].pdi = {
      objetivos: document.getElementById(`pdiObj_${matricula}`).value,
      estrategias: document.getElementById(`pdiEst_${matricula}`).value
    };
    localStorage.setItem('students', JSON.stringify(students));
    alert('PDI atualizado com sucesso!');
  }
}

// Função para salvar uma nova Evolução no histórico
function saveEvolucaoDinamica(matricula) {
  const data = document.getElementById(`evDate_${matricula}`).value;
  const texto = document.getElementById(`evText_${matricula}`).value;

  if (!texto) return alert("Por favor, descreva a evolução.");

  let students = JSON.parse(localStorage.getItem('students') || '[]');
  const idx = students.findIndex(s => s.matricula === matricula);

  if (idx !== -1) {
    if (!students[idx].historico) students[idx].historico = [];
    
    // Adiciona o novo registro ao início da lista
    students[idx].historico.unshift({ data, texto });
    localStorage.setItem('students', JSON.stringify(students));

    // Atualiza a visualização do histórico no modal sem precisar fechar
    const historyBox = document.getElementById(`historyBox_${matricula}`);
    historyBox.innerHTML = students[idx].historico.map(h => `
      <div style="border-bottom: 1px solid #eee; padding: 5px 0; font-size: 0.85rem;">
        <strong>${h.data}:</strong> ${h.texto}
      </div>
    `).join('');
    
    document.getElementById(`evText_${matricula}`).value = ''; // Limpa o campo
    alert('Registro de evolução salvo!');
  }
}

function loadUserProfile() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return;

  try {
    const user = JSON.parse(userStr);
    const userName = user.name || 'Usuário';
    const userRole = user.role || 'Professor(a)';
    const profileName = document.getElementById('professorName');
    const profileRole = document.getElementById('userType');
    const avatarProfile = document.getElementById('avatarProfile');

    if (profileName) profileName.textContent = userName;
    if (profileRole) profileRole.textContent = userRole;
    if (avatarProfile) avatarProfile.textContent = userName.charAt(0).toUpperCase();
  } catch (error) {
    console.error('Erro ao carregar perfil do usuário:', error);
  }
}

function checkAuth() {
  const user = localStorage.getItem('user');
  if (!user) {
    window.location.href = '../login/index.html';
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


const searchInput = document.getElementById('searchInput');
const gradeFilter = document.getElementById('gradeFilter');
const typeFilter = document.getElementById('typeFilter');
const emptyState = document.getElementById('emptyState');

function getCourseType(course) {
  if (!course) return 'outro';
  const value = course.toLowerCase();
  if (value.includes('log')) return 'tdah';
  if (value.includes('tds')) return 'dislexia';
  return 'outro';
}

function formatTurmaText(turma, curso) {
  return `${turma} - Turma ${curso}`;
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
  const type = getCourseType(student.curso);
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
  const type = getCourseType(student.curso);
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
        <!-- PDI: APENAS LEITURA (Conforme sua regra) -->
        <section class="modal-section full-width">
          <h3>🎯 Planejamento PEI (Definido no Cadastro)</h3>
          <div class="info-box" style="background-color: #f8fafc;">
            <p><strong>Objetivos:</strong><br> ${student.pdi?.objetivos || 'Não informados no cadastro.'}</p>
            <p style="margin-top:10px;"><strong>Estratégias:</strong><br> ${student.pdi?.estrategias || 'Não informadas no cadastro.'}</p>
          </div>
        </section>

        <!-- REGISTRO DE EVOLUÇÃO (DIÁRIO) -->
        <section class="modal-section">
          <h3>📝 Registrar Atendimento de Hoje</h3>
          <div class="info-box">
            <input type="date" id="evDate_${student.matricula}" value="${new Date().toISOString().split('T')[0]}" style="margin-bottom: 10px; width:100%;">
            <textarea id="evText_${student.matricula}" placeholder="O que foi trabalhado hoje?" style="width:100%; border-radius:8px; padding:8px; border:1px solid #ddd;" rows="3"></textarea>
            <button class="btn btn-success" style="width:100%; margin-top: 10px;" onclick="saveEvolucaoDinamica('${student.matricula}')">
              Salvar no Diário
            </button>
          </div>
        </section>

        <!-- HISTÓRICO DE EVOLUÇÃO -->
        <section class="modal-section">
          <h3>📋 Histórico de Evolução</h3>
          <div class="info-box" id="historyBox_${student.matricula}" style="max-height: 200px; overflow-y: auto;">
            ${(student.historico || []).map(h => `
              <div style="border-bottom: 1px solid #eee; padding: 5px 0; font-size: 0.85rem;">
                <strong>${h.data}:</strong> ${h.texto}
              </div>
            `).join('') || '<p style="color: #999;">Nenhum registro ainda.</p>'}
          </div>
        </section>
      </div>

      <div class="modal-actions">
        <button class="btn btn-info" onclick="window.print()">🖨️ Imprimir PEI e Diário</button>
        <button class="btn btn-secondary" onclick="closeModal('novoAluno${student.matricula}')">Fechar</button>
      </div>
    </div>
  `;

  return modal;
}

// Mantenha a função saveEvolucaoDinamica que te mandei antes para o diário funcionar

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
  checkAuth();
  loadUserProfile();
  renderStoredStudents();
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
});

const infoButtons = document.querySelectorAll('.info-btn');
infoButtons.forEach(btn => {
  btn.title = 'Ver detalhes completos do aluno';
});
=======
const API_URL = "http://localhost:3000";

const searchInput = document.getElementById("searchInput");
const gradeFilter = document.getElementById("gradeFilter");
const typeFilter = document.getElementById("typeFilter");
const emptyState = document.getElementById("emptyState");

/* ==========================================
   MODAIS
========================================== */

function openModal(studentId) {

    const modal = document.getElementById(
        "modal" + studentId.charAt(0).toUpperCase() + studentId.slice(1)
    );

    if (!modal) return;

    modal.classList.add("active");
    document.body.style.overflow = "hidden";

}

function closeModal(studentId) {

    const modal = document.getElementById(
        "modal" + studentId.charAt(0).toUpperCase() + studentId.slice(1)
    );

    if (!modal) return;

    modal.classList.remove("active");
    document.body.style.overflow = "auto";

}

document.addEventListener("click", function (event) {

    if (event.target.classList.contains("modal")) {

        event.target.classList.remove("active");

        document.body.style.overflow = "auto";

    }

});

document.addEventListener("keydown", function (event) {

    if (event.key !== "Escape") return;

    document.querySelectorAll(".modal.active").forEach(modal => {

        modal.classList.remove("active");

    });

    document.body.style.overflow = "auto";

});


/* ==========================================
   LOGIN
========================================== */

function checkAuth() {

    const user = localStorage.getItem("user");

    if (!user) {

        window.location.href = "../login/index.html";

    }

}

function loadUserProfile() {

    const userString = localStorage.getItem("user");

    if (!userString) return;

    try {

        const user = JSON.parse(userString);

        document.getElementById("professorName").textContent =
            user.name || "Professor";

        document.getElementById("userType").textContent =
            user.role || "Professor AEE";

        document.getElementById("avatarProfile").textContent =
            (user.name || "P").charAt(0).toUpperCase();

    } catch (error) {

        console.error(error);

    }

}


/* ==========================================
   AUXILIARES
========================================== */

function getCourseType(student) {

    const texto = (
        student.diagnostico ||
        student.curso ||
        ""
    ).toLowerCase();

    if (texto.includes("tea")) return "tea";

    if (texto.includes("autismo")) return "tea";

    if (texto.includes("tdah")) return "tdah";

    if (texto.includes("dislexia")) return "dislexia";

    return "outro";

}

function formatTurmaText(turma, curso) {

    if (!turma && !curso)
        return "Não informado";

    if (!curso)
        return turma;

    if (!turma)
        return curso;

    return `${turma} • ${curso}`;

}

function updateStudentCards() {

    return document.querySelectorAll(".student-card");

}

function updateEmptyState() {

    if (!emptyState) return;

    const visibleCards = document.querySelectorAll(
        '.student-card:not([style*="display: none"])'
    );

    emptyState.style.display =
        visibleCards.length === 0
            ? "block"
            : "none";

}


/* ==========================================
   FILTROS
========================================== */

function filterStudents() {

    const search =
        searchInput?.value.toLowerCase() || "";

    const grade =
        gradeFilter?.value || "";

    const type =
        typeFilter?.value || "";

    const cards =
        document.querySelectorAll(".student-card");

    let visible = 0;

    cards.forEach(card => {

        let show = true;

        const nome =
            card.querySelector("h3")
                ?.textContent
                .toLowerCase() || "";

        const matricula =
            card.dataset.matricula
                ?.toLowerCase() || "";

        if (search) {

            show =
                nome.includes(search) ||
                matricula.includes(search);

        }

        if (show && grade) {

            show = card.dataset.grade === grade;

        }

        if (show && type) {

            show = card.dataset.type === type;

        }

        card.style.display =
            show ? "" : "none";

        if (show)
            visible++;

    });

    emptyState.style.display =
        visible === 0
            ? "block"
            : "none";

}
/* ==========================================
   CRIAÇÃO DOS CARDS
========================================== */

function createStudentCard(student) {

  const card = document.createElement("div");

  const type = getCourseType(student);

  card.className = "student-card";
  card.dataset.grade = student.gradeValue || student.turma || "";
  card.dataset.type = type;
  card.dataset.matricula = student.matricula || "";

  card.innerHTML = `

      <div class="card-header">

          <div class="badge-type ${type}">
              ${student.diagnostico || "Inclusão"}
          </div>

          <div class="card-actions">

              <button
                  class="info-btn"
                  title="Ver detalhes"
                  onclick="openModal('novoAluno${student.matricula}')">

                  <i class="fas fa-info-circle"></i>

              </button>

              <button
                  class="delete-btn"
                  title="Excluir aluno"
                  onclick="deleteStudent('${student.matricula}', this)">

                  <i class="fas fa-trash-alt"></i>

              </button>

          </div>

      </div>

      <div class="student-avatar">

          <i class="fas fa-user-circle"></i>

      </div>

      <h3>${student.nome}</h3>

      <p class="matricula">

          Matrícula: ${student.matricula}

      </p>

      <p class="turma">

          ${formatTurmaText(student.turma, student.curso)}

      </p>

      <div class="quick-info">

          <div class="info-item">

              <span class="label">Diagnóstico</span>

              <span class="value">

                  ${student.diagnostico || "Não informado"}

              </span>

          </div>

          <div class="info-item">

              <span class="label">Gatilhos</span>

              <span class="value">

                  ${student.gatilhos || "Não informado"}

              </span>

          </div>

          <div class="info-item">

              <span class="label">Estratégias</span>

              <span class="value">

                  ${student.estrategias || "Não informado"}

              </span>

          </div>

      </div>

      <button
          class="btn-details"
          onclick="openModal('novoAluno${student.matricula}')">

          Ver detalhes completos

      </button>

  `;

  return card;

}


/* ==========================================
 MODAL DO ALUNO
========================================== */

function createStudentModal(student) {

  const modal = document.createElement("div");

  const type = getCourseType(student);

  modal.id = `modalNovoAluno${student.matricula}`;

  modal.className = "modal";

  modal.innerHTML = `

  <div class="modal-content">

      <button
          class="close-btn"
          onclick="closeModal('novoAluno${student.matricula}')">

          ✕

      </button>

      <div class="modal-header">

          <div class="modal-avatar">

              <i class="fas fa-user-circle"></i>

          </div>

          <div class="modal-title">

              <h2>${student.nome}</h2>

              <p>

                  Matrícula: ${student.matricula}

                  <br>

                  ${formatTurmaText(student.turma, student.curso)}

              </p>

          </div>

          <div class="badge-large ${type}">

              ${student.diagnostico || "Inclusão"}

          </div>

      </div>

      <div class="modal-grid">

          <section class="modal-section">

              <h3>Diagnóstico</h3>

              <div class="info-box">

                  <p><strong>Diagnóstico:</strong> ${student.diagnostico || "Não informado"}</p>

                  <p><strong>PEI:</strong> ${student.pei ? "Sim" : "Não"}</p>

                  <p><strong>Nível de suporte:</strong> ${student.suporte || "Não informado"}</p>

              </div>

          </section>

          <section class="modal-section">

              <h3>Responsável</h3>

              <div class="info-box">

                  <p><strong>Nome:</strong> ${student.responsavel || "Não informado"}</p>

                  <p><strong>Parentesco:</strong> ${student.parentesco || "Não informado"}</p>

                  <p><strong>Telefone:</strong> ${student.telefone || "Não informado"}</p>

                  <p><strong>E-mail:</strong> ${student.email || "Não informado"}</p>

              </div>

          </section>

          <section class="modal-section">

              <h3>Observações</h3>

              <div class="info-box">

                  <p><strong>Hiperfocos:</strong> ${student.hiperfocos || "Não informado"}</p>

                  <p><strong>Gatilhos:</strong> ${student.gatilhos || "Não informado"}</p>

                  <p><strong>Estratégias:</strong> ${student.estrategias || "Não informado"}</p>

              </div>

          </section>

      </div>

      <div class="modal-actions">

          <button
              class="btn btn-secondary"
              onclick="closeModal('novoAluno${student.matricula}')">

              Fechar

          </button>

      </div>

  </div>

  `;

  return modal;

}


/* ==========================================
 EXCLUIR ALUNO
========================================== */

async function deleteStudent(matricula, button) {

  const confirmar = confirm(
      "Deseja realmente excluir este aluno?"
  );

  if (!confirmar) return;

  try {

      const response = await fetch(

          `${API_URL}/students/${encodeURIComponent(matricula)}`,

          {
              method: "DELETE"
          }

      );

      if (!response.ok) {

          throw new Error("Erro ao excluir aluno.");

      }

      const card = button.closest(".student-card");

      if (card) {

          card.remove();

      }

      const modal = document.getElementById(

          `modalNovoAluno${matricula}`

      );

      if (modal) {

          modal.remove();

      }

      filterStudents();

      updateEmptyState();

      console.log("Aluno removido com sucesso.");

  }

  catch (error) {

      console.error(error);

      alert("Não foi possível excluir o aluno.");

  }

}
/* ==========================================
   CARREGAR ALUNOS
========================================== */

async function loadStudentsFromBackend() {

  const grid = document.querySelector(".students-grid");

  if (!grid) return;

  try {

      const response = await fetch(`${API_URL}/students`);

      if (!response.ok) {
          throw new Error("Falha ao carregar alunos.");
      }

      const students = await response.json();

      grid.querySelectorAll(".student-card").forEach(card => card.remove());

      document
          .querySelectorAll('.modal[id^="modalNovoAluno"]')
          .forEach(modal => modal.remove());

      students.forEach(student => {

          if (!student.matricula) return;

          const card = createStudentCard(student);

          grid.appendChild(card);

          document.body.appendChild(
              createStudentModal(student)
          );

      });

      filterStudents();

      updateEmptyState();

      animateCards();

  }

  catch (error) {

      console.error(error);

      if (emptyState) {

          emptyState.style.display = "block";

          emptyState.innerHTML = `
              <h3>Erro ao conectar</h3>
              <p>Não foi possível carregar os alunos.</p>
          `;

      }

  }

}


/* ==========================================
 ANIMAÇÃO
========================================== */

function animateCards() {

  const cards = document.querySelectorAll(".student-card");

  cards.forEach((card, index) => {

      card.style.opacity = "0";

      card.style.transform = "translateY(20px)";

      setTimeout(() => {

          card.style.transition = "all .35s ease";

          card.style.opacity = "1";

          card.style.transform = "translateY(0)";

      }, index * 60);

  });

}


/* ==========================================
 EVENTOS
========================================== */

if (searchInput) {

  searchInput.addEventListener("input", filterStudents);

}

if (gradeFilter) {

  gradeFilter.addEventListener("change", filterStudents);

}

if (typeFilter) {

  typeFilter.addEventListener("change", filterStudents);

}


/* ==========================================
 INICIALIZAÇÃO
========================================== */

window.addEventListener("load", async () => {

  checkAuth();

  loadUserProfile();

  await loadStudentsFromBackend();

});


/* ==========================================
 ATUALIZAÇÃO AUTOMÁTICA
========================================== */

setInterval(async () => {

  try {

      await loadStudentsFromBackend();

  }

  catch (e) {

      console.error(e);

  }

}, 30000);


/* ==========================================
 TOOLTIPS
========================================== */

document.addEventListener("mouseover", function(e){

  const btn = e.target.closest(".info-btn");

  if(btn){

      btn.title = "Ver detalhes completos";

  }

});


/* ==========================================
 FUNÇÃO PARA RECARREGAR A LISTA
========================================== */

async function refreshStudents(){

  await loadStudentsFromBackend();

}


/* ==========================================
 LOG
========================================== */

console.log("Sistema de alunos carregado com sucesso.");
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78
