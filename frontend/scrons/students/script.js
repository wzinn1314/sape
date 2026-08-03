const API_URL = (window.SAPE_CONFIG && window.SAPE_CONFIG.API_URL) || window.location.origin;
const searchInput = document.getElementById("searchInput");
const gradeFilter = document.getElementById("gradeFilter");
const typeFilter = document.getElementById("typeFilter");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const studentsGrid = document.getElementById("studentsGrid");
const pagination = document.getElementById("pagination");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");

// Estado da aplicação
let allStudents = [];
let filteredStudents = [];
let currentPage = 1;
const itemsPerPage = 9;
let searchTimeout = null;

// ==========================================
// AUTENTICAÇÃO JWT
// ==========================================
function checkAuth() {
  const token = localStorage.getItem("sape_token");
  const user = localStorage.getItem("sape_user");
  
  if (!token || !user) {
    showToast("Sessão expirada. Faça login novamente.", "error");
    setTimeout(() => {
      window.location.href = "../login/index.html";
    }, 2000);
    return false;
  }
  
  return true;
}

function getAuthHeaders() {
  const token = localStorage.getItem("sape_token");
  const user = JSON.parse(localStorage.getItem("sape_user") || "{}");
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-User-Id': user.id,
    'X-User-Role': user.role
  };
}

// ==========================================
// PERFIL DO USUÁRIO
// ==========================================
function loadUserProfile() {
  const userString = localStorage.getItem("sape_user");
  if (!userString) return;

  try {
    const user = JSON.parse(userString);
    const nameElem = document.getElementById("professorName");
    const roleElem = document.getElementById("userType");
    const avatarElem = document.getElementById("avatarProfile");
    const adminMenu = document.getElementById("abaAdminMenu");
    const menuHome = document.getElementById("menuHome");
    const menuDashboard = document.getElementById("menuDashboard");
    const menuNewStudent = document.getElementById("menuNewStudent");

    if (nameElem) nameElem.textContent = user.name || "Professor(a)";
    if (roleElem) roleElem.textContent = user.role || "Professor(a) AEE";
    if (avatarElem) avatarElem.textContent = (user.name || "P").charAt(0).toUpperCase();
    
    // Mostrar menu admin se for admin
    if (adminMenu) {
      const role = (user.role || "").toLowerCase();
      const matricula = (user.matricula || "").toUpperCase();
      if (role.includes("admin")) {
        adminMenu.style.display = "flex";
        // Se for admin, mostra Dashboard e Novo Aluno, esconde Início
        if (menuDashboard) menuDashboard.style.display = "flex";
        if (menuNewStudent) menuNewStudent.style.display = "flex";
        if (menuHome) menuHome.style.display = "none";
      } else {
        // Se for professor, mostra Início, esconde Dashboard e Novo Aluno
        if (menuDashboard) menuDashboard.style.display = "none";
        if (menuNewStudent) menuNewStudent.style.display = "none";
        if (menuHome) menuHome.style.display = "flex";
      }
    } else {
      // Se não tiver adminMenu, aplica a lógica nos outros menus
      const role = (user.role || "").toLowerCase();
      const matricula = (user.matricula || "").toUpperCase();
      const isAdmin = role.includes("admin");
      
      if (menuDashboard) menuDashboard.style.display = isAdmin ? "flex" : "none";
      if (menuNewStudent) menuNewStudent.style.display = isAdmin ? "flex" : "none";
      if (menuHome) menuHome.style.display = isAdmin ? "none" : "flex";
    }
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
  }
}

// ==========================================
// API CALLS COM JWT
// ==========================================
async function fetchStudents() {
  if (!checkAuth()) return;
  
  setLoading(true);
  
  try {
    const user = JSON.parse(localStorage.getItem("sape_user") || "{}");
    const headers = getAuthHeaders();
    
    // Se for professor, usa rota dedicada de alunos vinculados
    let endpoint = `${API_URL}/students`;
    if (user.role && user.role.toLowerCase().includes("prof")) {
      endpoint = `${API_URL}/users/${user.id}/students`;
    }
    
    const response = await fetch(endpoint, {
      method: "GET",
      headers: headers
    });

    if (response.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = "../login/index.html";
      }, 2000);
      return;
    }

    if (!response.ok) {
      throw new Error("Erro ao carregar alunos");
    }

    const data = await response.json();
    allStudents = Array.isArray(data) ? data : (data.data || []);
    filteredStudents = [...allStudents];
    
    applyFilters();
    showToast(`${allStudents.length} alunos carregados com sucesso!`, "success");
    
  } catch (error) {
    console.error("Erro ao carregar alunos:", error);
    showToast("Erro ao carregar alunos. Verifique sua conexão.", "error");
    
    // Fallback para localStorage se backend falhar
    allStudents = JSON.parse(localStorage.getItem("students") || "[]");
    filteredStudents = [...allStudents];
    applyFilters();
  } finally {
    setLoading(false);
  }
}

async function deleteStudent(studentId, button) {
  if (!confirm("Deseja realmente excluir este aluno?")) return;

  const originalText = button.innerHTML;
  button.innerHTML = '<div class="spinner"></div>';
  button.disabled = true;

  try {
    const response = await fetch(`${API_URL}/students/${studentId}`, {
      method: "DELETE",
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = "../login/index.html";
      }, 2000);
      return;
    }

    if (response.ok) {
      showToast("Aluno excluído com sucesso!", "success");
      await fetchStudents(); // Recarregar lista
    } else {
      throw new Error("Erro ao excluir aluno");
    }
  } catch (error) {
    console.error("Erro ao excluir aluno:", error);
    showToast("Erro ao excluir aluno. Tente novamente.", "error");
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

// ==========================================
// FILTROS E BUSCA REAL-TIME
// ==========================================
function applyFilters() {
  const search = searchInput?.value.toLowerCase() || "";
  const grade = gradeFilter?.value || "";
  const type = typeFilter?.value || "";

  filteredStudents = allStudents.filter(student => {
    const nome = (student.name || student.nome || "").toLowerCase();
    const matricula = (student.registration_number || student.matricula || "").toLowerCase();
    const diagnostico = (student.diagnostico || "").toLowerCase();
    const turma = (student.turma || student.gradeValue || "").toLowerCase();
    const curso = (student.curso || "").toLowerCase();

    // Filtro de busca
    const matchSearch = !search || 
      nome.includes(search) || 
      matricula.includes(search) || 
      diagnostico.includes(search);

    // Filtro de turma
    const matchGrade = !grade || turma.includes(grade.toLowerCase());

    // Filtro de curso
    const matchType = !type || curso.includes(type.toLowerCase());

    return matchSearch && matchGrade && matchType;
  });

  currentPage = 1;
  renderStudents();
  updatePagination();
}

function handleSearchInput() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applyFilters();
  }, 300); // Debounce de 300ms
}

// ==========================================
// PAGINAÇÃO
// ==========================================
function renderStudents() {
  const grid = document.querySelector(".students-grid");
  if (!grid) return;

  // Limpar cards existentes
  grid.querySelectorAll(".student-card").forEach(card => card.remove());

  if (filteredStudents.length === 0) {
    emptyState.style.display = "block";
    pagination.style.display = "none";
    return;
  }

  emptyState.style.display = "none";

  // Calcular paginação
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageStudents = filteredStudents.slice(startIndex, endIndex);

  // Renderizar cards
  pageStudents.forEach(student => {
    const card = createStudentCard(student);
    grid.appendChild(card);
  });

  // Mostrar paginação se necessário
  pagination.style.display = filteredStudents.length > itemsPerPage ? "flex" : "none";
}

function updatePagination() {
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  
  pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage >= totalPages || totalPages === 0;
}

function changePage(direction) {
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const newPage = currentPage + direction;

  if (newPage >= 1 && newPage <= totalPages) {
    currentPage = newPage;
    renderStudents();
    updatePagination();
    
    // Scroll para o topo da grid
    studentsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ==========================================
// CRIAÇÃO DE COMPONENTES
// ==========================================
function createStudentCard(student) {
  const card = document.createElement("div");
  const type = getCourseType(student);
  const initials = getInitials(student.name || student.nome || "Aluno");

  card.className = "student-card";
  card.dataset.studentId = student.id;
  card.dataset.grade = student.turma || student.gradeValue || "";
  card.dataset.type = type;
  card.dataset.matricula = student.registration_number || student.matricula || "";

  card.innerHTML = `
    <div class="card-header">
      <div class="avatar-circle">${initials}</div>
      <div>
        <h3>${student.name || student.nome || "Sem nome"}</h3>
        <p><i class="fas fa-id-card"></i> ${student.registration_number || student.matricula || "Sem matrícula"} • ${formatTurmaText(student.turma, student.curso)}</p>
      </div>
    </div>
    <div class="card-footer">
      <span class="badge ${type}"><i class="${getBadgeIcon(type)}"></i> ${student.diagnostico || "Inclusão"}</span>
      <span class="btn-link" onclick="openStudentModal(${student.id})">Ver Prontuário <i class="fas fa-arrow-right"></i></span>
    </div>
  `;

  return card;
}

function getInitials(name) {
  return name
    .split(" ")
    .map(n => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

function getCourseType(student) {
  const texto = (
    student.diagnostico ||
    student.curso ||
    ""
  ).toLowerCase();

  if (texto.includes("tea") || texto.includes("autismo")) return "autismo";
  if (texto.includes("tdah") || texto.includes(" hiperatividade")) return "tdah";
  if (texto.includes("dislexia")) return "dislexia";
  if (texto.includes("discalculia")) return "discalculia";
  return "outro";
}

function getBadgeIcon(type) {
  const icons = {
    autismo: "fas fa-brain",
    tdah: "fas fa-bolt",
    dislexia: "fas fa-book-open",
    discalculia: "fas fa-calculator",
    outro: "fas fa-user"
  };
  return icons[type] || icons.outro;
}

function formatTurmaText(turma, curso) {
  if (!turma && !curso) return "Não informado";
  if (!curso) return turma;
  if (!turma) return curso;
  return `${turma} • ${curso}`;
}

// ==========================================
// MODAL DINÂMICO
// ==========================================
function openStudentModal(studentId) {
  const student = allStudents.find(s => s.id === studentId);
  if (!student) {
    showToast("Aluno não encontrado", "error");
    return;
  }

  const modalContainer = document.getElementById("dynamicModalContainer");
  const type = getCourseType(student);
  const initials = getInitials(student.name || student.nome || "Aluno");

  // Mapeamento completo de campos do formulário para exibição no modal
  const fieldsMapping = {
    // Dados Pessoais
    'studentName': { label: 'Nome Completo', value: student.name || student.nome || "Não informado" },
    'birthDate': { label: 'Data de Nascimento', value: student.birthDate || student.data_nascimento || "Não informado" },
    'matricula': { label: 'Matrícula', value: student.registration_number || student.matricula || "Não informado" },
    'cpf': { label: 'CPF', value: student.cpf || "Não informado" },
    'turma': { label: 'Turma', value: student.turma || student.gradeValue || "Não informado" },
    'curso': { label: 'Curso', value: student.curso || "Não informado" },
    'anoLetivo': { label: 'Ano Letivo', value: student.anoLetivo || "Não informado" },
    
    // Saúde e Diagnóstico
    'diagnostico': { label: 'Diagnóstico Formal (CID)', value: student.diagnostico || "Não informado" },
    'suporte': { label: 'Nível de Suporte', value: student.suporte || "Não informado" },
    'peiAtivo': { label: 'PEI Ativo', value: student.peiAtivo ? "Sim" : "Não" },
    'obsMedicas': { label: 'Observações Médicas', value: student.obsMedicas || "Não informado" },
    
    // PEI/PDI
    'peiInteresses': { label: 'Pontos Fortes & Interesses', value: student.peiInteresses || "Não informado" },
    'peiObjetivos': { label: 'Objetivos Pedagógicos', value: student.peiObjetivos || "Não informado" },
    'peiAdaptacoes': { label: 'Adaptações Curriculares', value: student.peiAdaptacoes || "Não informado" },
    'pdiEstrategias': { label: 'Estratégias de AEE', value: student.pdiEstrategias || "Não informado" },
    
    // Responsável
    'responsavelNome': { label: 'Nome do Responsável', value: student.responsavelNome || "Não informado" },
    'parentesco': { label: 'Parentesco', value: student.parentesco || "Não informado" },
    'telefone': { label: 'Telefone', value: student.telefone || "Não informado" },
    'email': { label: 'Email', value: student.email || "Não informado" },
    
    // Campos adicionais específicos
    'hiperfocos': { label: 'Hiperfocos', value: student.hiperfocos || "Não informado" },
    'estrategias': { label: 'Estratégias Recomendadas', value: student.estrategias || "Não informado" },
    'gatilhos': { label: 'Gatilhos', value: student.gatilhos || "Não informado" }
  };

  // Construir HTML completo das informações
  const buildInfoHTML = () => {
    let html = '';
    
    // Agrupar informações por categoria
    const categories = {
      'Dados Pessoais': ['studentName', 'birthDate', 'matricula', 'cpf', 'turma', 'curso', 'anoLetivo'],
      'Diagnóstico e Saúde': ['diagnostico', 'suporte', 'peiAtivo', 'obsMedicas'],
      'PEI/PDI': ['peiInteresses', 'peiObjetivos', 'peiAdaptacoes', 'pdiEstrategias'],
      'Responsável': ['responsavelNome', 'parentesco', 'telefone', 'email'],
      'Informações Adicionais': ['hiperfocos', 'estrategias', 'gatilhos']
    };

    for (const [category, fieldKeys] of Object.entries(categories)) {
      let hasContent = false;
      let categoryHTML = `<div class="info-card"><h4><i class="fas fa-info-circle"></i> ${category}</h4>`;
      
      for (const key of fieldKeys) {
        const field = fieldsMapping[key];
        if (field && field.value && field.value !== "Não informado") {
          hasContent = true;
          categoryHTML += `<p><strong>${field.label}:</strong> ${field.value}</p>`;
        }
      }
      
      categoryHTML += '</div>';
      
      if (hasContent) {
        html += categoryHTML;
      }
    }
    
    return html || '<div class="info-card"><p>Nenhuma informação detalhada disponível.</p></div>';
  };

  const modalHTML = `
    <div class="modal active" id="studentModal">
      <div class="modal-content professional-modal">
        
        <!-- Cabeçalho do Prontuário -->
        <header class="modal-pro-header">
          <div class="aluno-identity">
            <div class="avatar-large">${initials}</div>
            <div>
              <h2>${student.name || student.nome || "Sem nome"} <span class="badge ${type}">${student.diagnostico || "Inclusão"}</span></h2>
              <div class="meta-info">
                <span><i class="fas fa-id-card"></i> Matrícula: <strong>${student.registration_number || student.matricula || "Não informada"}</strong></span>
                <span><i class="fas fa-graduation-cap"></i> ${formatTurmaText(student.turma, student.curso)}</span>
                <span><i class="fas fa-calendar-alt"></i> Cadastrado em: ${student.created_at ? new Date(student.created_at).toLocaleDateString('pt-BR') : "Não informado"}</span>
              </div>
            </div>
          </div>
          <button class="close-btn" onclick="closeStudentModal()" title="Fechar Modal">✕</button>
        </header>

        <!-- Painel Principal de Informações -->
        <div class="pro-modal-body">
          <!-- Coluna da Esquerda - Informações Completas -->
          <aside class="pro-sidebar-info">
            ${buildInfoHTML()}
          </aside>

          <!-- Coluna da Direita -->
          <section class="pro-content-area">
            <div class="pro-section">
              <h3><i class="fas fa-bullseye"></i> Plano de Desenvolvimento Individual (PDI)</h3>
              <div class="pdi-box">
                <div class="pdi-field">
                  <label>Estratégias Recomendadas:</label>
                  <p>${student.estrategias || student.pdiEstrategias || "Não informadas"}</p>
                </div>
                <div class="pdi-field">
                  <label>Gatilhos:</label>
                  <p>${student.gatilhos || "Não informados"}</p>
                </div>
              </div>
            </div>

            <div class="pro-section">
              <h3><i class="fas fa-history"></i> Registros de Evolução</h3>
              <div class="timeline-logs" id="evolutionLogs">
                <p style="color: #999;">Carregando histórico...</p>
              </div>
            </div>
          </section>
        </div>

        <!-- Barra Inferior de Ações -->
        <footer class="modal-pro-footer">
          <div class="left-actions">
            <button class="btn-pro secondary" onclick="window.print()"><i class="fas fa-print"></i> Imprimir PEI / PDI</button>
            <a href="../report-generation/index.html?alunoId=${student.id}" class="btn-pro primary"><i class="fas fa-plus"></i> Novo Relatório</a>
          </div>
        </footer>
      </div>
    </div>
  `;

  modalContainer.innerHTML = modalHTML;
  document.body.style.overflow = "hidden";

  // Carregar evoluções do aluno
  loadStudentEvolutions(studentId);
}

function closeStudentModal() {
  const modalContainer = document.getElementById("dynamicModalContainer");
  modalContainer.innerHTML = "";
  document.body.style.overflow = "auto";
}

async function loadStudentEvolutions(studentId) {
  const logsContainer = document.getElementById("evolutionLogs");
  if (!logsContainer) return;

  try {
    const response = await fetch(`${API_URL}/students/${studentId}/evolucoes`, {
      headers: getAuthHeaders()
    });

    if (response.ok) {
      const evolutions = await response.json();
      
      if (evolutions.length === 0) {
        logsContainer.innerHTML = '<p style="color: #999;">Nenhum registro de evolução encontrado.</p>';
        return;
      }

      logsContainer.innerHTML = evolutions.map(evo => `
        <div class="log-item">
          <span class="log-date">${new Date(evo.data).toLocaleDateString('pt-BR')}</span>
          <div class="log-body">
            <strong>Atendimento</strong>
            <p>${evo.relato}</p>
          </div>
        </div>
      `).join("");
    } else {
      logsContainer.innerHTML = '<p style="color: #999;">Erro ao carregar evoluções.</p>';
    }
  } catch (error) {
    console.error("Erro ao carregar evoluções:", error);
    logsContainer.innerHTML = '<p style="color: #999;">Erro ao carregar evoluções.</p>';
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const existingToast = container.querySelector(".toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  const icon = getToastIcon(type);
  
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="${icon}"></i>
    </div>
    <div class="toast-content">
      <p class="toast-message">${message}</p>
    </div>
    <button class="toast-close" aria-label="Fechar notificação">
      <i class="fas fa-times"></i>
    </button>
  `;

  const closeBtn = toast.querySelector(".toast-close");
  closeBtn.addEventListener("click", () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function getToastIcon(type) {
  const icons = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle"
  };
  return icons[type] || icons.info;
}

// ==========================================
// LOADING STATE
// ==========================================
function setLoading(isLoading) {
  if (loadingState) {
    loadingState.style.display = isLoading ? "flex" : "none";
  }
  
  if (studentsGrid) {
    studentsGrid.style.opacity = isLoading ? "0.5" : "1";
    studentsGrid.style.pointerEvents = isLoading ? "none" : "all";
  }
}

// ==========================================
// EVENTOS E INICIALIZAÇÃO
// ==========================================
if (searchInput) searchInput.addEventListener("input", handleSearchInput);
if (gradeFilter) gradeFilter.addEventListener("change", applyFilters);
if (typeFilter) typeFilter.addEventListener("change", applyFilters);
if (prevPageBtn) prevPageBtn.addEventListener("click", () => changePage(-1));
if (nextPageBtn) nextPageBtn.addEventListener("click", () => changePage(1));

// Fechar modal ao clicar fora
document.addEventListener("click", function (event) {
  if (event.target.classList.contains("modal")) {
    closeStudentModal();
  }
});

// Fechar modal com ESC
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    closeStudentModal();
  }
});

// Menu toggle para mobile
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
if (menuToggle && sidebar) {
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
}

window.addEventListener("load", async () => {
  if (checkAuth()) {
    loadUserProfile();
    await fetchStudents();
  }
});

console.log("Sistema de gerenciamento de alunos com JWT e paginação pronto.");
