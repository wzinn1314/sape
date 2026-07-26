const API_URL = "http://localhost:3000";

document.addEventListener('DOMContentLoaded', () => {
  const studentForm = document.getElementById('studentForm');
  if (!studentForm) return;

  // Verificar autenticação
  if (!checkAuth()) return;

  // Carregar perfil do usuário
  loadUserProfile();

  // ====================================================
  // 1. CONTROLE DE NAVEGAÇÃO POR ABAS (ETAPAS)
  // ====================================================
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnSubmit = document.getElementById('btnSubmit');

  let currentTabIndex = 0;

  function updateTabs(index) {
    currentTabIndex = index;

    // Atualiza abas do topo
    tabs.forEach((tab, i) => {
      tab.classList.toggle('active', i === currentTabIndex);
    });

    // Atualiza exibições dos conteúdos
    tabContents.forEach((content, i) => {
      content.classList.toggle('active', i === currentTabIndex);
    });

    // Controle dos botões do rodapé
    if (btnPrev) btnPrev.style.display = currentTabIndex === 0 ? 'none' : 'inline-block';

    if (currentTabIndex === tabContents.length - 1) {
      if (btnNext) btnNext.style.display = 'none';
      if (btnSubmit) btnSubmit.style.display = 'inline-block';
    } else {
      if (btnNext) btnNext.style.display = 'inline-block';
      if (btnSubmit) btnSubmit.style.display = 'none';
    }

    // Rola suavemente para o topo do painel
    window.scrollTo({ top: 100, behavior: 'smooth' });
  }

  // Clique direto nas abas superiores
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => updateTabs(index));
  });

  // Botão Avançar
  btnNext?.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentTabIndex < tabContents.length - 1) {
      // Validar aba atual antes de avançar
      if (validateCurrentTab(currentTabIndex)) {
        updateTabs(currentTabIndex + 1);
      }
    }
  });

  // Botão Voltar
  btnPrev?.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentTabIndex > 0) {
      updateTabs(currentTabIndex - 1);
    }
  });

  // ====================================================
  // 2. VALIDAÇÃO DE CAMPOS POR ABA
  // ====================================================
  function validateCurrentTab(tabIndex) {
    const tab = tabContents[tabIndex];
    const requiredFields = tab.querySelectorAll('input[required], select[required]');
    let isValid = true;
    let firstInvalidField = null;

    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        isValid = false;
        field.style.borderColor = '#ef4444';
        if (!firstInvalidField) firstInvalidField = field;
      } else {
        field.style.borderColor = '';
      }
    });

    if (!isValid) {
      showToast('Por favor, preencha todos os campos obrigatórios (*) antes de avançar.', 'error');
      if (firstInvalidField) {
        firstInvalidField.focus();
        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return isValid;
  }

  // Limpar validação ao digitar
  document.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', () => {
      field.style.borderColor = '';
    });
  });

  // ====================================================
  // 3. ENVIO DO FORMULÁRIO PARA O BACKEND (FETCH COM JWT)
  // ====================================================
  studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validação da caixa de confirmação
    const confirmCheckbox = document.getElementById('confirm');
    if (confirmCheckbox && !confirmCheckbox.checked) {
      showToast('Por favor, confirme que as informações prestadas são verdadeiras.', 'error');
      return;
    }

    // Validação final de todos os campos obrigatórios
    if (!validateCurrentTab(0) || !validateCurrentTab(3)) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }

    setLoading(true);

    // Captura dos campos
    const studentName = document.getElementById('studentName')?.value.trim();
    const birthDate = document.getElementById('birthDate')?.value;
    const matricula = document.getElementById('matricula')?.value.trim();
    const cpf = document.getElementById('cpf')?.value.trim();

    const turma = document.getElementById('turma')?.value;
    const curso = document.getElementById('curso')?.value;
    const anoLetivo = document.getElementById('anoLetivo')?.value;

    const diagnostico = document.getElementById('diagnostico')?.value;
    const peiAtivo = document.getElementById('peiAtivo')?.checked ? 1 : 0;
    const suporte = document.getElementById('suporte')?.value;

    const peiInteresses = document.getElementById('peiInteresses')?.value.trim();
    const peiObjetivos = document.getElementById('peiObjetivos')?.value.trim();
    const peiAdaptacoes = document.getElementById('peiAdaptacoes')?.value.trim();
    const pdiEstrategias = document.getElementById('pdiEstrategias')?.value.trim();

    const responsavelNome = document.getElementById('responsavelNome')?.value.trim();
    const parentesco = document.getElementById('parentesco')?.value;
    const telefone = document.getElementById('telefone')?.value.trim();
    const email = document.getElementById('email')?.value.trim();

    // Validação básica
    if (!studentName) {
      showToast('O campo Nome Completo do Aluno é obrigatório!', 'error');
      updateTabs(0);
      setLoading(false);
      return;
    }

    // Montagem do payload
    const payload = {
      nome: studentName,
      nascimento: birthDate || null,
      matricula: matricula || null,
      cpf: cpf || null,
      turma: turma || null,
      curso: curso || null,
      anoLetivo: anoLetivo || null,
      diagnostico: diagnostico || null,
      pei: peiAtivo,
      suporte: suporte || null,
      hiperfocos: peiInteresses || null,
      gatilhos: peiObjetivos || null,
      estrategias: pdiEstrategias || null,
      adaptacoes: peiAdaptacoes || null,
      responsavel: responsavelNome || null,
      parentesco: parentesco || null,
      telefone: telefone || null,
      email: email || null,
      registeredBy: getUserId()
    };

    try {
      const response = await fetch(`${API_URL}/students`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.status === 401) {
        showToast('Sessão expirada. Faça login novamente.', 'error');
        setTimeout(() => {
          window.location.href = "../login/index.html";
        }, 2000);
        return;
      }

      if (response.ok) {
        showToast('✅ Aluno cadastrado com sucesso!', 'success');
        studentForm.reset();
        updateTabs(0);
        
        // Redirecionar para lista de alunos após sucesso
        setTimeout(() => {
          window.location.href = "../students/index.html";
        }, 1500);
      } else {
        showToast(`❌ Erro ao cadastrar: ${data.error || data.message || 'Erro desconhecido'}`, 'error');
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      showToast('⚠️ Não foi possível se conectar ao servidor Backend. Verifique se o servidor Node.js está rodando na porta 3000.', 'error');
    } finally {
      setLoading(false);
    }
  });

  // ====================================================
  // 4. FUNÇÕES DE AUTENTICAÇÃO
  // ====================================================
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

    // Validar se é admin - apenas admins podem criar alunos
    try {
      const userObj = JSON.parse(user);
      const role = (userObj.role || "").toLowerCase();
      const matricula = (userObj.matricula || "").toUpperCase();
      const isAdmin = role.includes("admin") || matricula === "ADM2026";
      
      if (!isAdmin) {
        showToast("Apenas administradores podem criar novos alunos.", "error");
        setTimeout(() => {
          window.location.href = "../teacher-home/index.html";
        }, 2000);
        return false;
      }
    } catch (error) {
      console.error("Erro ao verificar permissões:", error);
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

  function getUserId() {
    const user = JSON.parse(localStorage.getItem("sape_user") || "{}");
    return user.id;
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

      if (nameElem) nameElem.textContent = user.name || "Professor(a)";
      if (roleElem) roleElem.textContent = user.role || "Professor(a) AEE";
      if (avatarElem) avatarElem.textContent = (user.name || "P").charAt(0).toUpperCase();
      
      // Mostrar menu admin se for admin
      if (adminMenu) {
        const role = (user.role || "").toLowerCase();
        const matricula = (user.matricula || "").toUpperCase();
        if (role.includes("admin") || matricula === "ADM2026") {
          adminMenu.style.display = "flex";
        }
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  }

  // ====================================================
  // 5. LOADING STATE
  // ====================================================
  function setLoading(isLoading) {
    const loadingState = document.getElementById('loadingState');
    const form = document.getElementById('studentForm');
    const btnSubmit = document.getElementById('btnSubmit');

    if (loadingState) {
      loadingState.style.display = isLoading ? 'flex' : 'none';
    }

    if (form) {
      form.style.opacity = isLoading ? '0.5' : '1';
      form.style.pointerEvents = isLoading ? 'none' : 'all';
    }

    if (btnSubmit) {
      btnSubmit.disabled = isLoading;
      if (isLoading) {
        btnSubmit.innerHTML = '<div class="spinner"></div> Processando...';
      } else {
        btnSubmit.innerHTML = '💾 Concluir e Salvar Cadastro';
      }
    }
  }

  // ====================================================
  // 6. TOAST NOTIFICATIONS
  // ====================================================
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
});
