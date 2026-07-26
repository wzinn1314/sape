// Endereço da sua API Node.js/SQLite
const API_URL = 'http://localhost:3000';

// Armazena em memória os dados vindos do backend
let listaProfessores = [];
let listaAlunos = [];
let listaVinculos = []; // NOVO: vínculos reais vindos do backend (GET /vinculos)

// ==========================================
// INICIALIZAÇÃO AO CARREGAR A PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  await carregarUsuariosProfessores();
  await carregarAlunosDoBanco();
  await carregarVinculosDoBanco(); // NOVO: busca vínculos reais antes de renderizar
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
// 2.1 CARREGAR VÍNCULOS REAIS DO BANCO (GET /vinculos) — NOVO
// ==========================================
async function carregarVinculosDoBanco() {
  try {
    const response = await fetch(`${API_URL}/vinculos`);
    if (!response.ok) throw new Error('Erro ao buscar vínculos');

    // Cada item vem como:
    // { professor_id, professor_nome, matricula, alunos_nomes: "A, B, C", alunos_ids: "1,2,3" }
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
  // requesterRole: 'admin' é obrigatório — o backend só cadastra usuários
  // quando a chamada vem do painel administrativo (autocadastro foi removido)
  const payload = {
    name,
    email,
    matricula,
    password,
    specialization,
    role: 'Professor',
    requesterRole: 'admin'
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
// 4. VINCULAR PROFESSOR AOS ALUNOS SELECIONADOS (AGORA PERSISTE NO BANCO)
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

  try {
    const response = await fetch(`${API_URL}/vinculos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professorId: parseInt(profId),
        studentIds: alunosSelecionadosIds
      })
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || 'Erro ao salvar vínculo.');
      return;
    }

    alert('Vínculo realizado com sucesso!');

    // Desmarca os checkboxes e recarrega os vínculos reais do banco
    checkboxes.forEach(cb => (cb.checked = false));
    await carregarVinculosDoBanco();
    renderTabelaVinculos();

  } catch (error) {
    console.error('Erro ao salvar vínculo:', error);
    alert('Não foi possível conectar com o servidor Node.js.');
  }
}

// ==========================================
// 5. RENDERIZAR TABELA DE VÍNCULOS NA TELA (AGORA USA DADOS REAIS DO BANCO)
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
    // Busca o vínculo real desse professor (vindo de GET /vinculos)
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
        ${
          idsAlunos.length > 0
            ? `<button class="btn-danger-small" onclick="desvincularProfessor(${prof.id}, [${idsAlunos.join(',')}])">Desvincular</button>`
            : ''
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 6. DESVINCULAR PROFESSOR DOS ALUNOS (AGORA REMOVE NO BANCO)
// ==========================================
async function desvincularProfessor(profId, alunoIds) {
  if (!confirm('Deseja remover o vínculo de todos os alunos deste professor?')) return;

  try {
    // O backend remove vínculo por par (professor, aluno) — removemos um por um
    await Promise.all(
      alunoIds.map(studentId =>
        fetch(`${API_URL}/vinculos/${profId}/${studentId}`, { method: 'DELETE' })
      )
    );

    await carregarVinculosDoBanco();
    renderTabelaVinculos();

  } catch (error) {
    console.error('Erro ao desvincular professor:', error);
    alert('Não foi possível remover o vínculo. Verifique a conexão com o servidor.');
  }
}