// Endereço da sua API Node.js/SQLite
const API_URL = 'http://localhost:3000';

// Armazena em memória os dados vindos do backend
let listaProfessores = [];
let listaAlunos = [];

// ==========================================
// INICIALIZAÇÃO AO CARREGAR A PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  await carregarUsuariosProfessores();
  await carregarAlunosDoBanco();
  renderTabelaVinculos();

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
// 1. CARREGAR PROFESSORES DO BANCO (GET /users)
// ==========================================
async function carregarUsuariosProfessores() {
  const selectProf = document.getElementById('selectProfessor');
  if (!selectProf) return;

  try {
    const response = await fetch(`${API_URL}/users`);
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
    const response = await fetch(`${API_URL}/students`);
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
  const passwordInput = document.getElementById('profSenha'); // Campo dinâmico de senha
  const espInput = document.getElementById('profEspecializacao');

  const name = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const matricula = matriculaInput ? matriculaInput.value.trim() : '';
  const password = passwordInput && passwordInput.value ? passwordInput.value : 'Mudar@123';
  const specialization = espInput ? espInput.value : '';

  if (!name || !email || !matricula) {
    alert('Por favor, preencha todos os campos obrigatórios (Nome, E-mail e Matrícula).');
    return;
  }

  // Objeto enviado para o backend
  const payload = {
    name,
    email,
    matricula,
    password,
    specialization,
    role: 'Professor'
  };

  try {
    // Tenta primeiro a rota direta de admin, se não existir recorre ao /register
    const endpoint = `${API_URL}/admin/create-user`;
    let response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.status === 404) {
      // Fallback caso a rota específica de admin não esteja registrada
      response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, cpf: matricula })
      });
    }

    const result = await response.json();

    if (response.ok || response.status === 201) {
      alert('Professor cadastrado com sucesso!');

      // Reseta o formulário
      document.getElementById('profForm').reset();

      // Recarrega do banco a lista atualizada de professores
      await carregarUsuariosProfessores();
      renderTabelaVinculos();

    } else {
      alert(result.error || 'Erro ao cadastrar professor.');
    }
  } catch (error) {
    console.error('Erro na requisição de cadastro:', error);
    alert('Não foi possível conectar com o servidor Node.js.');
  }
}

// ==========================================
// 4. VINCULAR PROFESSOR AOS ALUNOS SELECIONADOS
// ==========================================
async function salvarVinculo(event) {
  event.preventDefault();

  const profId = document.getElementById('selectProfessor').value;
  if (!profId) {
    alert('Selecione um professor para realizar o vínculo.');
    return;
  }

  const checkboxes = document.querySelectorAll('.chk-aluno:checked');
  const alunosSelecionadosIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

  if (alunosSelecionadosIds.length === 0) {
    alert('Selecione pelo menos um aluno para vincular.');
    return;
  }

  // Atualiza localmente a referência do registered_by para renderização imediata
  listaAlunos.forEach(aluno => {
    if (alunosSelecionadosIds.includes(aluno.id)) {
      aluno.registered_by = parseInt(profId);
    }
  });

  alert('Vínculo realizado com sucesso!');
  renderTabelaVinculos();
}

// ==========================================
// 5. RENDERIZAR TABELA DE VÍNCULOS NA TELA
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
    // Procura na lista de alunos quais pertencem a este professor
    const alunosDoProfessor = listaAlunos.filter(a => Number(a.registered_by) === Number(prof.id));

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
          alunosDoProfessor.length > 0 
            ? `<ul style="margin:0; padding-left:18px;">${alunosDoProfessor.map(a => `<li>${a.nome || a.name} (Turma: ${a.turma || 'N/I'})</li>`).join('')}</ul>`
            : '<em style="color:#999">Nenhum aluno vinculado</em>'
        }
      </td>
      <td>
        <button class="btn-danger-small" onclick="desvincularProfessor(${prof.id})">Desvincular</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 6. DESVINCULAR PROFESSOR DOS ALUNOS
// ==========================================
function desvincularProfessor(profId) {
  if (confirm('Deseja remover o vínculo de todos os alunos deste professor?')) {
    listaAlunos.forEach(aluno => {
      if (Number(aluno.registered_by) === Number(profId)) {
        aluno.registered_by = null;
      }
    });
    renderTabelaVinculos();
  }
}