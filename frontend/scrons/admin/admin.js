// Endereço da sua API Node.js/SQLite vindo do config.js dinâmico
const API_URL = (window.SAPE_CONFIG && window.SAPE_CONFIG.API_URL) || window.API_URL || 'http://localhost:3000';

// Armazena em memória os dados vindos do backend
let listaProfessores = [];
let listaAlunos = [];
let listaVinculos = [];

// ==========================================
// INICIALIZAÇÃO AO CARREGAR A PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // VALIDAÇÃO DUPLA: JWT + Matrícula ADM2026
  if (!checkAdminAccess()) return;

  // Carregar perfil do usuário
  loadUserProfile();

  // Carregar dados do sistema
  setLoading(true);
  await carregarUsuariosProfessores();
  await carregarAlunosDoBanco();
  await carregarVinculosDoBanco();
  renderTabelaVinculos();
  setLoading(false);

  // Escutador do Formulário 1: Cadastro de Professor
  const profForm = document.getElementById('profForm');
  if (profForm) {
    profForm.addEventListener('submit', cadastrarProfessor);
  }

  // Escutador do Formulário 2: Salvar Vínculo
  const vinculoForm = document.getElementById('vinculoForm');
  if (vinculoForm) {
    vinculoForm.addEventListener('submit', salvarVinculo);
  }
});

// ==========================================
// VALIDAÇÃO DUPLA: JWT + Matrícula ADM2026
// ==========================================
function checkAdminAccess() {
  const token = localStorage.getItem("sape_token");
  const userString = localStorage.getItem("sape_user");
  
  if (!token || !userString) {
    showToast("Sessão expirada. Faça login novamente.", "error");
    setTimeout(() => {
      window.location.href = "../login/index.html";
    }, 2000);
    return false;
  }

  try {
    const user = JSON.parse(userString);
    const role = (user.role || "").toLowerCase();
    const matricula = (user.matricula || "").toUpperCase();

    // Validação dupla: JWT (role admin) + Matrícula ADM2026
    if (!role.includes("admin") && matricula !== "ADM2026") {
      showToast("Acesso negado. Apenas administradores podem acessar esta página.", "error");
      setTimeout(() => {
        window.location.href = "../login/index.html";
      }, 2000);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao verificar acesso admin:", error);
    showToast("Erro ao verificar acesso. Faça login novamente.", "error");
    setTimeout(() => {
      window.location.href = "../login/index.html";
    }, 2000);
    return false;
  }
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

    if (nameElem) nameElem.textContent = user.name || "Admin";
    if (roleElem) roleElem.textContent = user.role || "Administrador";
    if (avatarElem) avatarElem.textContent = (user.name || "A").charAt(0).toUpperCase();
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
  }
}

// ==========================================
// 1. CARREGAR PROFESSORES DO BANCO (GET /users)
// ==========================================
async function carregarUsuariosProfessores() {
  const selectProf = document.getElementById('selectProfessor');
  if (!selectProf) return;

  try {
    const response = await fetch(`${API_URL}/users`, {
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = "../login/index.html";
      }, 2000);
      return;
    }

    if (!response.ok) throw new Error('Erro ao buscar usuários do sistema');

    const todosUsuarios = await response.json();

    // Filtra apenas usuários com perfil de Professor / Teacher / AEE
    listaProfessores = todosUsuarios.filter(u => {
      const r = (u.role || '').toLowerCase();
      return r.includes('prof') || r.includes('teacher') || r.includes('aee');
    });

    // Preenche o Select/Dropdown de Professores
    selectProf.innerHTML = '<option value="">-- Escolha um Professor --</option>';
    listaProfessores.forEach(prof => {
      const opt = document.createElement('option');
      opt.value = prof.id;
      opt.textContent = `${prof.name} (${prof.email})`;
      selectProf.appendChild(opt);
    });

  } catch (error) {
    console.error('Erro ao carregar professores:', error);
    showToast('Erro ao carregar professores. Verifique sua conexão.', 'error');
  }
}

// ==========================================
// 2. CARREGAR ALUNOS DO BANCO (GET /students)
// ==========================================
async function carregarAlunosDoBanco() {
  const container = document.getElementById('listaAlunosCheckboxes');
  if (!container) return;

  container.innerHTML = '<p style="font-size: 0.8rem; color: #888;">Carregando alunos do banco...</p>';

  try {
    const response = await fetch(`${API_URL}/students`, {
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = "../login/index.html";
      }, 2000);
      return;
    }

    if (!response.ok) throw new Error('Erro ao buscar alunos');

    listaAlunos = await response.json();
    container.innerHTML = '';

    if (listaAlunos.length === 0) {
      container.innerHTML = '<p style="font-size: 0.8rem; color: #888;">Nenhum aluno cadastrado no banco de dados.</p>';
      return;
    }

    // Preenche a lista de checkboxes com os alunos reais
    listaAlunos.forEach(aluno => {
      const div = document.createElement('div');
      div.className = 'checkbox-item';
      div.innerHTML = `
        <input type="checkbox" id="aluno_${aluno.id}" value="${aluno.id}" class="chk-aluno">
        <label for="aluno_${aluno.id}">
          <strong>${aluno.nome || aluno.name}</strong> 
          — <span>Matrícula: ${aluno.matricula || 'N/A'}</span> 
          <span>(${aluno.turma || 'Sem Turma'})</span>
        </label>
      `;
      container.appendChild(div);
    });

  } catch (error) {
    console.error('Erro ao carregar alunos:', error);
    container.innerHTML = '<p style="font-size: 0.8rem; color: #ef2b2b;">Erro ao conectar com o banco de dados.</p>';
    showToast('Erro ao carregar alunos. Verifique sua conexão.', 'error');
  }
}

// ==========================================
// 2.1 CARREGAR VÍNCULOS REAIS DO BANCO (GET /vinculos)
// ==========================================
async function carregarVinculosDoBanco() {
  try {
    const response = await fetch(`${API_URL}/vinculos`, {
      headers: getAuthHeaders()
    });

    if (response.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = "../login/index.html";
      }, 2000);
      return;
    }

    if (!response.ok) throw new Error('Erro ao buscar vínculos');

    listaVinculos = await response.json();
  } catch (error) {
    console.error('Erro ao carregar vínculos:', error);
    listaVinculos = [];
  }
}

// ==========================================
// 3. CADASTRAR NOVO PROFESSOR
// ==========================================
async function cadastrarProfessor(event) {
  event.preventDefault();

  const nameInput = document.getElementById('profNome');
  const emailInput = document.getElementById('profEmail');
  const matriculaInput = document.getElementById('profMatricula');
  const passwordInput = document.getElementById('profSenha');
  const espInput = document.getElementById('profEspecializacao');

  const name = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const matricula = matriculaInput ? matriculaInput.value.trim() : '';
  const password = passwordInput && passwordInput.value ? passwordInput.value : 'Mudar@123';
  const specialization = espInput ? espInput.value : '';

  if (!name || !email || !matricula) {
    showToast('Por favor, preencha todos os campos obrigatórios (Nome, E-mail e Matrícula).', 'error');
    return;
  }

  const payload = {
    name,
    email,
    matricula,
    password,
    specialization,
    role: 'Professor',
    requesterRole: 'admin'
  };

  setLoading(true);

  try {
    // Tenta primeiro a rota direta de admin
    const endpoint = `${API_URL}/admin/create-user`;
    let response = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (response.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = "../login/index.html";
      }, 2000);
      return;
    }

    if (response.status === 404) {
      // Fallback caso a rota específica de admin não esteja registrada
      response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...payload, cpf: matricula })
      });
    }

    const result = await response.json();

    if (response.ok || response.status === 201) {
      showToast('Professor cadastrado com sucesso!', 'success');

      // Reseta o formulário
      document.getElementById('profForm').reset();

      // Recarrega do banco a lista atualizada de professores
      await carregarUsuariosProfessores();
      renderTabelaVinculos();

    } else {
      showToast(result.error || 'Erro ao cadastrar professor.', 'error');
    }
  } catch (error) {
    console.error('Erro na requisição de cadastro:', error);
    showToast('Não foi possível conectar com o servidor Node.js.', 'error');
  } finally {
    setLoading(false);
  }
}

// ==========================================
// 4. VINCULAR PROFESSOR AOS ALUNOS SELECIONADOS
// ==========================================
async function salvarVinculo(event) {
  event.preventDefault();

  const profId = document.getElementById('selectProfessor').value;
  if (!profId) {
    showToast('Selecione um professor para realizar o vínculo.', 'error');
    return;
  }

  const checkboxes = document.querySelectorAll('.chk-aluno:checked');
  const alunosSelecionadosIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

  if (alunosSelecionadosIds.length === 0) {
    showToast('Selecione pelo menos um aluno para vincular.', 'error');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_URL}/vinculos`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        professorId: parseInt(profId),
        studentIds: alunosSelecionadosIds
      })
    });

    if (response.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = "../login/index.html";
      }, 2000);
      return;
    }

    const result = await response.json();

    if (!response.ok) {
      showToast(result.error || 'Erro ao salvar vínculo.', 'error');
      return;
    }

    showToast('Vínculo realizado com sucesso!', 'success');

    // Desmarca os checkboxes e recarrega os vínculos reais do banco
    checkboxes.forEach(cb => (cb.checked = false));
    await carregarVinculosDoBanco();
    renderTabelaVinculos();

  } catch (error) {
    console.error('Erro ao salvar vínculo:', error);
    showToast('Não foi possível conectar com o servidor Node.js.', 'error');
  } finally {
    setLoading(false);
  }
}

// ==========================================
// 5. RENDERIZAR TABELA DE VÍNCULOS
// ==========================================
function renderTabelaVinculos() {
  const tbody = document.getElementById('tabelaVinculos');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (listaProfessores.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum professor cadastrado no banco.</td></tr>';
    return;
  }

  listaProfessores.forEach(prof => {
    // Busca o vínculo real desse professor
    const vinculo = listaVinculos.find(v => Number(v.professor_id) === Number(prof.id));
    const nomesAlunos = vinculo ? vinculo.alunos_nomes.split(', ') : [];
    const idsAlunos = vinculo ? vinculo.alunos_ids.split(',') : [];

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${prof.name}</strong><br>
        <small style="color:#666">${prof.email}</small>
      </td>
      <td>${prof.matricula || prof.cpf || 'N/A'}</td>
      <td><span class="badge" style="background:#e3f2fd; color:#0d47a1; padding:4px 8px; border-radius:4px;">${prof.role}</span></td>
      <td>
        ${
          nomesAlunos.length > 0
            ? `<ul style="margin:0; padding-left:18px;">${nomesAlunos.map(nome => `<li>${nome}</li>`).join('')}</ul>`
            : '<em style="color:#999">Nenhum aluno vinculado</em>'
        }
      </td>
      <td>
        <div class="action-buttons">
          ${
            idsAlunos.length > 0
              ? `<button class="btn-danger-small" onclick="desvincularProfessor(${prof.id}, [${idsAlunos.join(',')}])">Desvincular</button>`
              : ''
          }
          <button class="btn-danger-small" onclick="deletarProfessor(${prof.id})" style="margin-left: 5px;">Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 6. DESVINCULAR PROFESSOR DOS ALUNOS
// ==========================================
async function desvincularProfessor(profId, alunoIds) {
  if (!confirm('Deseja remover o vínculo de todos os alunos deste professor?')) return;

  setLoading(true);

  try {
    await Promise.all(
      alunoIds.map(studentId =>
        fetch(`${API_URL}/vinculos/${profId}/${studentId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        })
      )
    );

    await carregarVinculosDoBanco();
    renderTabelaVinculos();
    showToast('Vínculos removidos com sucesso!', 'success');

  } catch (error) {
    console.error('Erro ao desvincular professor:', error);
    showToast('Não foi possível remover o vínculo. Verifique a conexão com o servidor.', 'error');
  } finally {
    setLoading(false);
  }
}

// ==========================================
// 7. DELETAR PROFESSOR
// ==========================================
async function deletarProfessor(profId) {
  if (!confirm('Deseja realmente excluir este professor? Esta ação não pode ser desfeita.')) return;

  setLoading(true);

  try {
    // Primeiro, remover todos os vínculos deste professor
    const vinculosResponse = await fetch(`${API_URL}/vinculos`, {
      headers: getAuthHeaders()
    });

    if (vinculosResponse.ok) {
      const vinculos = await vinculosResponse.json();
      const vinculosDoProfessor = vinculos.filter(v => Number(v.professor_id) === Number(profId));

      if (vinculosDoProfessor.length > 0) {
        await Promise.all(
          vinculosDoProfessor.map(vinculo =>
            fetch(`${API_URL}/vinculos/${vinculo.professor_id}/${vinculo.student_id}`, {
              method: 'DELETE',
              headers: getAuthHeaders()
            })
          )
        );
      }
    }

    // Depois, deletar o professor
    const deleteResponse = await fetch(`${API_URL}/users/${profId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (deleteResponse.status === 401) {
      showToast("Sessão expirada. Faça login novamente.", "error");
      setTimeout(() => {
        window.location.href = "../login/index.html";
      }, 2000);
      return;
    }

    if (deleteResponse.ok) {
      showToast('Professor excluído com sucesso!', 'success');
      // Recarregar dados
      await carregarUsuariosProfessores();
      await carregarVinculosDoBanco();
      renderTabelaVinculos();
    } else {
      const errorData = await deleteResponse.json();
      showToast(errorData.error || 'Erro ao excluir professor.', 'error');
    }

  } catch (error) {
    console.error('Erro ao excluir professor:', error);
    showToast('Não foi possível excluir o professor. Verifique a conexão com o servidor.', 'error');
  } finally {
    setLoading(false);
  }
}

// ==========================================
// LOADING STATE
// ==========================================
function setLoading(isLoading) {
  const loadingState = document.getElementById('loadingState');
  const panel = document.querySelector('.registration-panel');

  if (loadingState) {
    loadingState.style.display = isLoading ? 'flex' : 'none';
  }

  if (panel) {
    panel.style.opacity = isLoading ? '0.5' : '1';
    panel.style.pointerEvents = isLoading ? 'none' : 'all';
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const existingToast = container.querySelector('.toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
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

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function getToastIcon(type) {
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  return icons[type] || icons.info;
}

// Menu toggle para mobile
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
if (menuToggle && sidebar) {
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
}
