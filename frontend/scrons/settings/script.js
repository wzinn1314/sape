const API_URL = (window.SAPE_CONFIG && window.SAPE_CONFIG.API_URL) || window.location.origin;
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");
const loadingState = document.getElementById("loadingState");
const professoresGrid = document.getElementById("professoresGrid");

let allProfessores = [];
let filteredProfessores = [];
let searchTimeout = null;

function checkAuth() {
  const token = localStorage.getItem("sape_token");
  const user = localStorage.getItem("sape_user");
  if (!token || !user) {
    showToast("Sessão expirada. Faça login novamente.", "error");
    setTimeout(() => {
      window.location.href = "../login/index.html";
    }, 1500);
    return false;
  }
  return true;
}

function getAuthHeaders() {
  const token = localStorage.getItem("sape_token");
  const user = JSON.parse(localStorage.getItem("sape_user") || "{}");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-User-Id": user.id,
    "X-User-Role": user.role
  };
}

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

    if (adminMenu) {
      const role = (user.role || "").toLowerCase();
      if (role.includes("admin")) {
        adminMenu.style.display = "flex";
        if (menuDashboard) menuDashboard.style.display = "flex";
        if (menuNewStudent) menuNewStudent.style.display = "flex";
        if (menuHome) menuHome.style.display = "none";
      } else {
        if (menuDashboard) menuDashboard.style.display = "none";
        if (menuNewStudent) menuNewStudent.style.display = "none";
        if (menuHome) menuHome.style.display = "flex";
      }
    } else {
      const role = (user.role || "").toLowerCase();
      const isAdmin = role.includes("admin");
      if (menuDashboard) menuDashboard.style.display = isAdmin ? "flex" : "none";
      if (menuNewStudent) menuNewStudent.style.display = isAdmin ? "flex" : "none";
      if (menuHome) menuHome.style.display = isAdmin ? "none" : "flex";
    }
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
  }
}

async function fetchProfessores() {
  if (!checkAuth()) return;
  setLoading(true);

  try {
    const response = await fetch(`${API_URL}/professores`, {
      method: "GET",
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = "../login/index.html";
      }, 1500);
      return;
    }

    if (!response.ok) {
      throw new Error("Erro ao carregar professores");
    }

    allProfessores = await response.json();
    filteredProfessores = [...allProfessores];
    renderProfessores();
    showToast(`${allProfessores.length} professor(es) carregado(s).`, "success");
  } catch (error) {
    console.error("Erro ao carregar professores:", error);
    showToast("Erro ao carregar professores. Verifique sua conexão.", "error");
    allProfessores = [];
    filteredProfessores = [];
    renderProfessores();
  } finally {
    setLoading(false);
  }
}

function applySearch() {
  const query = (searchInput?.value || "").trim().toLowerCase();
  filteredProfessores = allProfessores.filter(professor => {
    const name = (professor.name || "").toLowerCase();
    const email = (professor.email || "").toLowerCase();
    const matricula = (professor.matricula || "").toLowerCase();
    return (
      !query ||
      name.includes(query) ||
      email.includes(query) ||
      matricula.includes(query)
    );
  });
  renderProfessores();
}

function handleSearchInput() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applySearch();
  }, 250);
}

function renderProfessores() {
  if (!professoresGrid) return;
  professoresGrid.innerHTML = "";

  if (filteredProfessores.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  filteredProfessores.forEach(professor => {
    professoresGrid.appendChild(createProfessorCard(professor));
  });
}

function createProfessorCard(professor) {
  const card = document.createElement("div");
  card.className = "professor-card";
  card.innerHTML = `
    <div class="card-header">
      <div>
        <h3>${professor.name || "Sem nome"}</h3>
        <p>${professor.email || "Email não informado"}</p>
      </div>
      <span class="badge-role">${professor.matricula || "Sem matrícula"}</span>
    </div>
    <div class="professor-meta">
      <span><i class="fas fa-id-badge"></i> ${professor.matricula || "Sem matrícula"}</span>
      <span><i class="fas fa-envelope"></i> ${professor.email || "Sem e-mail"}</span>
    </div>
  `;
  return card;
}

function getInitials(name) {
  return name
    .split(" ")
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

function setLoading(isLoading) {
  if (loadingState) {
    loadingState.style.display = isLoading ? "flex" : "none";
  }
  if (professoresGrid) {
    professoresGrid.style.opacity = isLoading ? "0.5" : "1";
    professoresGrid.style.pointerEvents = isLoading ? "none" : "all";
  }
  if (emptyState && isLoading) {
    emptyState.style.display = "none";
  }
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const existingToast = container.querySelector(".toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="${getToastIcon(type)}"></i></div>
    <div class="toast-content"><p class="toast-message">${message}</p></div>
    <button class="toast-close" aria-label="Fechar notificação"><i class="fas fa-times"></i></button>
  `;

  const closeBtn = toast.querySelector(".toast-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    });
  }

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
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

if (searchInput) {
  searchInput.addEventListener("input", handleSearchInput);
}

window.addEventListener("load", async () => {
  if (checkAuth()) {
    loadUserProfile();
    await fetchProfessores();
  }
});
 