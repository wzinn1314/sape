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