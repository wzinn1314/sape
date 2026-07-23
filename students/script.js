const API_URL = "http://localhost:3000";
const searchInput = document.getElementById("searchInput");
const gradeFilter = document.getElementById("gradeFilter");
const typeFilter = document.getElementById("typeFilter");
const emptyState = document.getElementById("emptyState");


function openModal(studentId) {
  const modalId = "modal" + studentId.charAt(0).toUpperCase() + studentId.slice(1);
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(studentId) {
  const modalId = "modal" + studentId.charAt(0).toUpperCase() + studentId.slice(1);
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}

document.addEventListener("click", function (event) {
  if (event.target.classList.contains("modal")) {
    event.target.classList.remove("active");
    document.body.style.overflow = "auto";
  }
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal.active").forEach((modal) => {
      modal.classList.remove("active");
    });
    document.body.style.overflow = "auto";
  }
});

/* ==========================================
   AUTENTICAÇÃO E PERFIL
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
    const nameElem = document.getElementById("professorName");
    const roleElem = document.getElementById("userType");
    const avatarElem = document.getElementById("avatarProfile");

    if (nameElem) nameElem.textContent = user.name || "Professor(a)";
    if (roleElem) roleElem.textContent = user.role || "Professor(a) AEE";
    if (avatarElem) avatarElem.textContent = (user.name || "P").charAt(0).toUpperCase();
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
  }
}

/* ==========================================
   FUNÇÕES AUXILIARES E FILTROS
========================================== */
function getCourseType(student) {
  const texto = (
    student.diagnostico ||
    student.curso ||
    ""
  ).toLowerCase();

  if (texto.includes("tea") || texto.includes("autismo")) return "tea";
  if (texto.includes("tdah") || texto.includes("log")) return "tdah";
  if (texto.includes("dislexia") || texto.includes("tds")) return "dislexia";
  return "outro";
}

function formatTurmaText(turma, curso) {
  if (!turma && !curso) return "Não informado";
  if (!curso) return turma;
  if (!turma) return curso;
  return `${turma} • ${curso}`;
}

function updateEmptyState() {
  if (!emptyState) return;
  const cards = document.querySelectorAll('.student-card:not([style*="display: none"])');
  emptyState.style.display = cards.length === 0 ? "block" : "none";
}

function filterStudents() {
  const search = searchInput?.value.toLowerCase() || "";
  const grade = gradeFilter?.value || "";
  const type = typeFilter?.value || "";
  const cards = document.querySelectorAll(".student-card");

  let visible = 0;

  cards.forEach((card) => {
    let show = true;
    const nome = card.querySelector("h3")?.textContent.toLowerCase() || "";
    const matricula = card.dataset.matricula?.toLowerCase() || "";

    if (search) {
      show = nome.includes(search) || matricula.includes(search);
    }

    if (show && grade) {
      show = card.dataset.grade === grade;
    }

    if (show && type) {
      show = card.dataset.type === type;
    }

    card.style.display = show ? "" : "none";
    if (show) visible++;
  });

  if (emptyState) {
    emptyState.style.display = visible === 0 ? "block" : "none";
  }
}

/* ==========================================
   PDI E REGISTRO DE EVOLUÇÃO
========================================== */
function saveEvolucaoDinamica(matricula) {
  const dataInput = document.getElementById(`evDate_${matricula}`);
  const textoInput = document.getElementById(`evText_${matricula}`);

  const data = dataInput?.value;
  const texto = textoInput?.value;

  if (!texto) return alert("Por favor, descreva a evolução.");

  let students = JSON.parse(localStorage.getItem("students") || "[]");
  const idx = students.findIndex((s) => s.matricula === matricula);

  if (idx !== -1) {
    if (!students[idx].historico) students[idx].historico = [];
    students[idx].historico.unshift({ data, texto });
    localStorage.setItem("students", JSON.stringify(students));

    const historyBox = document.getElementById(`historyBox_${matricula}`);
    if (historyBox) {
      historyBox.innerHTML = students[idx].historico
        .map(
          (h) => `
        <div style="border-bottom: 1px solid #eee; padding: 6px 0; font-size: 0.85rem;">
          <strong>${h.data}:</strong> ${h.texto}
        </div>
      `
        )
        .join("");
    }

    textoInput.value = "";
    alert("Registro de evolução salvo com sucesso!");
  }
}

/* ==========================================
   CRIAÇÃO DE COMPONENTES DÁ INTERFACE
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
      <div class="badge-type ${type}">${student.diagnostico || "Inclusão"}</div>
      <div class="card-actions">
        <button class="info-btn" title="Ver detalhes" onclick="openModal('novoAluno${student.matricula}')">
          <i class="fas fa-info-circle"></i>
        </button>
        <button class="delete-btn" title="Excluir aluno" onclick="deleteStudent('${student.matricula}', this)">
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
        <span class="label">Diagnóstico:</span>
        <span class="value">${student.diagnostico || "Não informado"}</span>
      </div>
      <div class="info-item">
        <span class="label">Dificuldades:</span>
        <span class="value">${student.gatilhos || "Não informado"}</span>
      </div>
      <div class="info-item">
        <span class="label">Adaptações:</span>
        <span class="value">${student.estrategias || "Não informado"}</span>
      </div>
    </div>
    <button class="btn-details" onclick="openModal('novoAluno${student.matricula}')">Ver Detalhes Completos</button>
  `;

  return card;
}

function createStudentModal(student) {
  const modal = document.createElement("div");
  const type = getCourseType(student);

  modal.id = `modalNovoAluno${student.matricula}`;
  modal.className = "modal";

  const hoje = new Date().toISOString().split("T")[0];

  modal.innerHTML = `
    <div class="modal-content">
      <button class="close-btn" onclick="closeModal('novoAluno${student.matricula}')">✕</button>
      <div class="modal-header">
        <div class="modal-avatar"><i class="fas fa-user-circle"></i></div>
        <div class="modal-title">
          <h2>${student.nome}</h2>
          <p>Matrícula: ${student.matricula} | ${formatTurmaText(student.turma, student.curso)}</p>
        </div>
        <div class="badge-large ${type}">${student.diagnostico || "Inclusão"}</div>
      </div>
      
      <div class="modal-grid">
        <section class="modal-section full-width">
          <h3>🎯 Planejamento PEI (Definido no Cadastro)</h3>
          <div class="info-box" style="background-color: #f8fafc;">
            <p><strong>Objetivos:</strong><br> ${student.pdi?.objetivos || "Não informados no cadastro."}</p>
            <p style="margin-top:10px;"><strong>Estratégias:</strong><br> ${student.pdi?.estrategias || "Não informadas no cadastro."}</p>
          </div>
        </section>

        <section class="modal-section">
          <h3>📝 Registrar Atendimento de Hoje</h3>
          <div class="info-box">
            <input type="date" id="evDate_${student.matricula}" value="${hoje}" style="margin-bottom: 10px; width:100%;">
            <textarea id="evText_${student.matricula}" placeholder="O que foi trabalhado hoje?" style="width:100%; border-radius:8px; padding:8px; border:1px solid #ddd;" rows="3"></textarea>
            <button class="btn btn-success" style="width:100%; margin-top: 10px;" onclick="saveEvolucaoDinamica('${student.matricula}')">
              Salvar no Diário
            </button>
          </div>
        </section>

        <section class="modal-section">
          <h3>📋 Histórico de Evolução</h3>
          <div class="info-box" id="historyBox_${student.matricula}" style="max-height: 200px; overflow-y: auto;">
            ${
              (student.historico || [])
                .map(
                  (h) => `
              <div style="border-bottom: 1px solid #eee; padding: 5px 0; font-size: 0.85rem;">
                <strong>${h.data}:</strong> ${h.texto}
              </div>
            `
                )
                .join("") || '<p style="color: #999;">Nenhum registro ainda.</p>'
            }
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

/* ==========================================
   GERENCIAMENTO DE DADOS (BACKEND / LOCALSTORAGE)
========================================== */
async function deleteStudent(matricula, button) {
  if (!confirm("Deseja realmente excluir este aluno?")) return;

  // Remoção Local
  let students = JSON.parse(localStorage.getItem("students") || "[]");
  students = students.filter((s) => s.matricula !== matricula);
  localStorage.setItem("students", JSON.stringify(students));

  // Tentativa de remoção no Backend
  try {
    await fetch(`${API_URL}/students/${encodeURIComponent(matricula)}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.warn("Backend indisponível. Aluno excluído localmente.");
  }

  const card = button.closest(".student-card");
  if (card) card.remove();

  const modal = document.getElementById(`modalNovoAluno${matricula}`);
  if (modal) modal.remove();

  filterStudents();
  updateEmptyState();
}

async function loadStudents() {
  const grid = document.querySelector(".students-grid");
  if (!grid) return;

  let students = [];

  // Tenta carregar via API
  try {
    const response = await fetch(`${API_URL}/students`);
    if (response.ok) {
      students = await response.json();
    }
  } catch (error) {
    console.warn("Backend não detectado. Carregando dados do localStorage...");
    students = JSON.parse(localStorage.getItem("students") || "[]");
  }

  // Limpa elementos antigos
  grid.querySelectorAll(".student-card").forEach((card) => card.remove());
  document.querySelectorAll('.modal[id^="modalNovoAluno"]').forEach((modal) => modal.remove());

  // Renderiza novos cards e modais
  students.forEach((student) => {
    if (!student.matricula) return;

    const card = createStudentCard(student);
    const modal = createStudentModal(student);

    grid.appendChild(card);
    document.body.appendChild(modal);
  });

  filterStudents();
  updateEmptyState();
  animateCards();
}

function animateCards() {
  const cards = document.querySelectorAll(".student-card");
  cards.forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    setTimeout(() => {
      card.style.transition = "all .35s ease";
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, index * 50);
  });
}

/* ==========================================
   EVENTOS E INICIALIZAÇÃO
========================================== */
if (searchInput) searchInput.addEventListener("input", filterStudents);
if (gradeFilter) gradeFilter.addEventListener("change", filterStudents);
if (typeFilter) typeFilter.addEventListener("change", filterStudents);

window.addEventListener("load", async () => {
  checkAuth();
  loadUserProfile();
  await loadStudents();
});

console.log("Sistema de gerenciamento de alunos unificado e pronto.");