const API_URL = (window.SAPE_CONFIG && window.SAPE_CONFIG.API_URL) || window.location.origin;

// Tipo de relatório que ativa o checklist (precisa bater com o value do <option> no HTML)
const TIPO_DIAGNOSTICO_INICIAL = "Avaliação Diagnóstica (Inicial)";
const TIPO_ESTUDO_DE_CASO = "Estudo de Caso";
const TIPO_CRONOGRAMA = "Cronograma de Atendimento";
const TIPO_ATIVIDADES_REALIZADAS = "Registro de Atividades Realizadas no Atendimento";

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;

  loadUserProfile();

  const studentSelect = document.getElementById('studentSelect');
  const reportType = document.getElementById('reportType');
  const reportContent = document.getElementById('reportContent');
  const reportRecommendations = document.getElementById('reportRecommendations');
  const reportForm = document.getElementById('reportForm');
  const btnSubmit = document.getElementById('btnSubmit');
  const reportContentWrapper = document.getElementById('reportContentWrapper');
  const diagnosticoWrapper = document.getElementById('diagnosticoChecklistWrapper');
  const estudoCasoWrapper = document.getElementById('estudoCasoWrapper');
  const cronogramaWrapper = document.getElementById('cronogramaWrapper');
  const registroAtividadesWrapper = document.getElementById('registroAtividadesWrapper');
  const diagnosticoChecklist = document.getElementById('diagnosticoChecklist');

  updateDateTime();
  setInterval(updateDateTime, 1000);


  

  function updateDateTime() {
    const now = new Date();
    const dateEl = document.getElementById('currentDate');
    const timeEl = document.getElementById('currentTime');
    
    if (dateEl) dateEl.textContent = now.toLocaleDateString('pt-BR');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  loadStudents();

  // ==========================================
  // CHECKLIST DE AVALIAÇÃO DIAGNÓSTICA
  // ==========================================

  function montarChecklistDiagnostico() {
    if (!diagnosticoChecklist) return;

    diagnosticoChecklist.innerHTML = DIAGNOSTICO_INICIAL.map((bloco, areaIndex) => `
      <div class="diagnostico-area">
        <h3 class="diagnostico-area-titulo">${bloco.area}</h3>
        ${bloco.perguntas.map((pergunta, perguntaIndex) => {
          const nomeCampo = `diag_${areaIndex}_${perguntaIndex}`;
          return `
            <div class="diagnostico-item">
              <p class="diagnostico-pergunta">${pergunta}</p>
              <div class="diagnostico-opcoes">
                ${DIAGNOSTICO_OPCOES.map(op => `
                  <label class="diagnostico-opcao">
                    <input type="checkbox" name="${nomeCampo}" value="${op.valor}" data-area="${bloco.area}" data-pergunta="${pergunta}">
                    ${op.label}
                  </label>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `).join('');

    // Garante que só uma opção por pergunta fique marcada (checkbox se comportando como rádio)
    diagnosticoChecklist.addEventListener('change', (e) => {
      if (e.target.type !== 'checkbox') return;
      const nome = e.target.name;
      if (e.target.checked) {
        diagnosticoChecklist
          .querySelectorAll(`input[name="${nome}"]`)
          .forEach(input => {
            if (input !== e.target) input.checked = false;
          });
      }
    });
  }

  function alternarModoRelatorio() {
    const type = reportType.value;
    const isDiagnosticoInicial = type === TIPO_DIAGNOSTICO_INICIAL;
    const isEstudoCaso = type === TIPO_ESTUDO_DE_CASO;
    const isCronograma = type === TIPO_CRONOGRAMA;
    const isAtividades = type === TIPO_ATIVIDADES_REALIZADAS;

    diagnosticoWrapper.style.display = isDiagnosticoInicial ? 'flex' : 'none';
    reportContentWrapper.style.display = 'none';
    estudoCasoWrapper.style.display = isEstudoCaso ? 'flex' : 'none';
    cronogramaWrapper.style.display = isCronograma ? 'flex' : 'none';
    registroAtividadesWrapper.style.display = isAtividades ? 'flex' : 'none';

    reportContent.removeAttribute('required');
    if (isDiagnosticoInicial && !diagnosticoChecklist.innerHTML) montarChecklistDiagnostico();
  }

  reportType.addEventListener('change', alternarModoRelatorio);
  alternarModoRelatorio(); // aplica o estado correto já na carga da página

  function coletarRespostasDiagnostico() {
    const respostasPorArea = {};

    diagnosticoChecklist.querySelectorAll('input[type="checkbox"]:checked').forEach(input => {
      const area = input.dataset.area;
      const pergunta = input.dataset.pergunta;
      const opcao = DIAGNOSTICO_OPCOES.find(o => o.valor === input.value);

      if (!respostasPorArea[area]) respostasPorArea[area] = [];
      respostasPorArea[area].push(`- ${pergunta} | ${opcao ? opcao.label : input.value}`);
    });

    let texto = '';
    Object.keys(respostasPorArea).forEach(area => {
      texto += `\n${area.toUpperCase()}\n${respostasPorArea[area].join('\n')}\n`;
    });

    return texto.trim();
  }

  function coletarEstudoDeCaso() {
    const alunoIdade = document.getElementById('estudoAlunoIdade')?.value.trim();
    const serieTurma = document.getElementById('estudoSerieTurma')?.value.trim();
    const dataCaso = document.getElementById('estudoData')?.value;
    const demandas = document.getElementById('estudoDemandas')?.value.trim();
    const contexto = document.getElementById('estudoContexto')?.value.trim();
    const potencialidades = document.getElementById('estudoPotencialidades')?.value.trim();
    const estrategias = document.getElementById('estudoEstrategias')?.value.trim();
    const consideracoes = document.getElementById('estudoConsideracoes')?.value.trim();

    if (!alunoIdade) { showToast('Preencha Nome do(a) aluno(a) e Idade.', 'error'); return null; }
    if (!serieTurma) { showToast('Preencha Ano/Série/Turma.', 'error'); return null; }
    if (!dataCaso) { showToast('Preencha a Data do estudo de caso.', 'error'); return null; }
    if (!demandas) { showToast('Preencha a Identificação das demandas individuais e das barreiras enfrentadas.', 'error'); return null; }
    if (!contexto) { showToast('Preencha a Análise do contexto escolar e das barreiras.', 'error'); return null; }
    if (!potencialidades) { showToast('Preencha a Identificação das potencialidades e das demandas de apoio.', 'error'); return null; }
    if (!estrategias) { showToast('Preencha a Definição de estratégias e recursos de acessibilidade.', 'error'); return null; }
    if (!consideracoes) { showToast('Preencha as Considerações Finais e Indicação para PEI.', 'error'); return null; }

    return `ESTUDO DE CASO\n- Nome do(a) aluno(a) e Idade: ${alunoIdade}\n- Ano/Série/Turma: ${serieTurma}\n- Data do estudo de caso: ${dataCaso}\n- Identificação das demandas individuais e das barreiras enfrentadas: ${demandas}\n- Análise do contexto escolar e das barreiras: ${contexto}\n- Identificação das potencialidades e das demandas de apoio: ${potencialidades}\n- Definição de estratégias e recursos de acessibilidade: ${estrategias}\n- Considerações Finais e Indicação para PEI: ${consideracoes}`;
  }

  function coletarCronograma() {
    const horarioDia = document.getElementById('cronogramaHorarioDia')?.value.trim();
    const duracao = document.getElementById('cronogramaDuracao')?.value.trim();
    const frequencia = document.getElementById('cronogramaFrequencia')?.value;
    const tipo = document.getElementById('cronogramaTipo')?.value;
    const composicaoNodes = Array.from(document.querySelectorAll('input[name="cronogramaComposicao"]:checked'));
    const composicao = composicaoNodes.map(input => input.value.trim());

    if (!horarioDia) { showToast('Preencha Hora / Dia da Semana.', 'error'); return null; }
    if (!duracao) { showToast('Preencha a Duração do Atendimento.', 'error'); return null; }
    if (!frequencia) { showToast('Selecione a Frequência do Atendimento Semanal.', 'error'); return null; }
    if (!tipo) { showToast('Selecione o Tipo de Atendimento.', 'error'); return null; }
    if (composicao.length === 0) { showToast('Selecione ao menos uma opção de Composição do Atendimento.', 'error'); return null; }

    return `CRONOGRAMA DE ATENDIMENTO\n- Hora / Dia da Semana: ${horarioDia}\n- Duração do Atendimento (minutos/horas): ${duracao}\n- Frequência do Atendimento Semanal: ${frequencia}\n- Tipo de Atendimento: ${tipo}\n- Composição do Atendimento: ${composicao.join(', ')}`;
  }

  function coletarAtividadesRealizadas() {
    const dataAtividade = document.getElementById('registroDataAtividade')?.value.trim();
    const avancos = document.getElementById('registroAvancos')?.value.trim();
    const dificuldades = document.getElementById('registroDificuldades')?.value.trim();
    const avaliacaoArea = document.getElementById('avaliacaoArea')?.value.trim();
    const avaliacaoEstrategia = document.getElementById('avaliacaoEstrategia')?.value.trim();

    if (!dataAtividade) { showToast('Preencha Data / Atividade.', 'error'); return null; }
    if (!avancos) { showToast('Preencha os Avanços.', 'error'); return null; }
    if (!dificuldades) { showToast('Preencha as Dificuldades na realização.', 'error'); return null; }
    if (!avaliacaoArea) { showToast('Preencha a Área de avaliação.', 'error'); return null; }
    if (!avaliacaoEstrategia) { showToast('Preencha a Estratégia utilizada.', 'error'); return null; }

    return `REGISTRO DE ATIVIDADES REALIZADAS NO ATENDIMENTOS\n- Data / Atividade: ${dataAtividade}\n- Avanços: ${avancos}\n- Dificuldades na realização: ${dificuldades}\n\nESTRATÉGIAS DE AVALIAÇÃO\n- Área: ${avaliacaoArea}\n- Estratégia utilizada: ${avaliacaoEstrategia}`;
  }

  function contarPerguntasRespondidas() {
    return diagnosticoChecklist.querySelectorAll('input[type="checkbox"]:checked').length;
  }

  // ==========================================
  // CARREGAR ALUNOS
  // ==========================================

  async function loadStudents() {
    try {
      const userJSON = localStorage.getItem("sape_user");
      let endpoint = `${API_URL}/students`;

      if (userJSON) {
        const user = JSON.parse(userJSON);
        const role = (user.role || "").toLowerCase();
        
        if (!role.includes("admin") && user.id) {
          endpoint = `${API_URL}/users/${user.id}/students`;
        }
      }

      const response = await fetch(endpoint, {
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        showToast("Sessão expirada. Faça login novamente.", "error");
        setTimeout(() => {
          window.location.href = "../login/index.html";
        }, 2000);
        return;
      }

      if (!response.ok) throw new Error('Erro ao carregar alunos');
      
      const students = await response.json();
      
      if (students.length === 0) {
        studentSelect.innerHTML = '<option value="">Nenhum aluno vinculado a você ou cadastrado.</option>';
        return;
      }

      studentSelect.innerHTML = '<option value="">-- Selecione o Aluno --</option>' + 
        students.map(s => {
          const safeName = (s.name || s.nome || 'Aluno sem nome').replace(/"/g, '&quot;');
          return `
            <option value="${s.id}" data-name="${safeName}" data-disability="${s.disability_type || ''}">
              ${s.name || s.nome || 'Aluno sem nome'} ${s.disability_type ? `(${s.disability_type})` : ''}
            </option>
          `;
        }).join('');
    } catch (error) {
      console.error(error);
      studentSelect.innerHTML = '<option value="">Erro ao conectar com o banco de dados</option>';
      showToast('Erro ao carregar alunos. Verifique sua conexão.', 'error');
    }
  }

  // ==========================================
  // SUBMISSÃO DO FORMULÁRIO
  // ==========================================

  if (reportForm) {
    reportForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const studentId = studentSelect.value;
      const selectedOption = studentSelect.options[studentSelect.selectedIndex];
      const studentName = (selectedOption && selectedOption.getAttribute('data-name')) || 'Aluno';

      const type = reportType.value;
      const isDiagnosticoInicial = type === TIPO_DIAGNOSTICO_INICIAL;
      const recommendations = reportRecommendations.value.trim();

      const currentDate = document.getElementById('currentDate')?.textContent || new Date().toLocaleDateString('pt-BR');
      const currentTime = document.getElementById('currentTime')?.textContent || new Date().toLocaleTimeString('pt-BR');
      const nowFormatted = `${currentDate} às ${currentTime}`;

      if (!studentId) {
        showToast('Selecione um aluno cadastrado.', 'error');
        return;
      }

      let content;

      switch (type) {
        case TIPO_DIAGNOSTICO_INICIAL:
          if (contarPerguntasRespondidas() === 0) {
            showToast('Marque pelo menos uma resposta no checklist.', 'error');
            return;
          }
          content = coletarRespostasDiagnostico();
          break;
        case TIPO_ESTUDO_DE_CASO:
          content = coletarEstudoDeCaso();
          if (!content) return;
          break;
        case TIPO_CRONOGRAMA:
          content = coletarCronograma();
          if (!content) return;
          break;
        case TIPO_ATIVIDADES_REALIZADAS:
          content = coletarAtividadesRealizadas();
          if (!content) return;
          break;
        default:
          showToast('Tipo de relatório inválido.', 'error');
          return;
      }

      let professorName = 'Professor Responsável';
      let professorId = null;
      const userJSON = localStorage.getItem("sape_user");
      if (userJSON) {
        const user = JSON.parse(userJSON);
        professorName = user.name || professorName;
        professorId = user.id;
      }

      setLoading(true);
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="ph ph-spinner"></i> Enviando Relatório...';

      const fullReportText = `[${type}]\nData/Hora: ${nowFormatted}\n\nDESENVOLVIMENTO:\n${content}${recommendations ? `\n\nENCAMINHAMENTOS:\n${recommendations}` : ''}`;

      const localId = 'REF-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
      const novoRelatorio = {
        id: localId,
        titulo: type || 'Relatório de Acompanhamento',
        aluno: studentName,
        professor: professorName,
        professorId: professorId,
        studentId: studentId,
        data: currentDate,
        created_at: new Date().toISOString(),
        status: 'Finalizado',
        conteudo: fullReportText
      };

      let relatoriosLocais = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];
      relatoriosLocais.unshift(novoRelatorio);
      localStorage.setItem('relatoriosSAPE', JSON.stringify(relatoriosLocais));

      try {
        const response = await fetch(`${API_URL}/reports`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            studentId: studentId,
            userId: professorId,
            pdfContent: fullReportText,
            fileName: `Relatorio_${studentName.replace(/\s+/g, '_')}.pdf`
          })
        });

        const saved = await response.json().catch((parseErr) => {
          console.warn('Não foi possível ler o retorno do backend:', parseErr);
          return null;
        });

        if (response.ok) {
          const backendId = saved?.reportId ?? saved?.id ?? saved?.data?.id ?? saved?.report?.id;
          if (backendId) {
            const atualizados = JSON.parse(localStorage.getItem('relatoriosSAPE')) || [];
            const idx = atualizados.findIndex(r => r.id === localId);
            if (idx !== -1) {
              atualizados[idx].id = backendId;
              localStorage.setItem('relatoriosSAPE', JSON.stringify(atualizados));
            }
          }

          showToast('Relatório salvo com sucesso!', 'success');
        } else {
          const errorMessage = saved?.message || saved?.error || 'Erro ao salvar relatório no servidor.';
          showToast(errorMessage, 'warning');
        }

        setTimeout(() => {
          window.location.href = '../report/index.html';
        }, 1500);

      } catch (err) {
        console.warn('Erro ao salvar no banco backend, mas salvo localmente:', err);
        showToast('Relatório salvo localmente. Erro ao salvar no servidor.', 'warning');
        
        setTimeout(() => {
          window.location.href = '../report/index.html';
        }, 1500);
      } finally {
        setLoading(false);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="ph ph-file-pdf"></i> Salvar Relatório';
      }
    });


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

function setLoading(isLoading) {
  const loadingState = document.getElementById('loadingState');
  const formCard = document.querySelector('.form-card');

  if (loadingState) {
    loadingState.style.display = isLoading ? 'flex' : 'none';
  }

  if (formCard) {
    formCard.style.opacity = isLoading ? '0.5' : '1';
    formCard.style.pointerEvents = isLoading ? 'none' : 'all';
  }
}

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
// ==========================================
// DADOS DO CHECKLIST - AVALIAÇÃO DIAGNÓSTICA (INICIAL)
// Extraído a partir do modelo de Relatório Pedagógico (SAPE)
// ==========================================

const DIAGNOSTICO_OPCOES = [
  { valor: 'A', label: 'Alcançado (A)' },
  { valor: 'P', label: 'Em Processo (P)' },
  { valor: 'N', label: 'Não (N)' }
];

const DIAGNOSTICO_INICIAL = [
  {
    area: 'Linguagem - Comunicação',
    perguntas: [
      'Expressa-se com clareza?',
      'Expressa-se espontaneamente?',
      'Possui vocábulo amplo?',
      'Transmite recados?',
      'Faz perguntas oportunas?',
      'Usa linguagem oral para expressar desejos, necessidades e sentimentos?',
      'Participa de interações orais em sala, respeitando turnos de fala?',
      'Narra pequenas experiências pessoais?'
    ]
  },
  {
    area: 'Estruturação Espaço/Temporal',
    perguntas: [
      'Demonstra ter noção de espaço (sala de aula, casa, escola, etc.)?',
      'Demonstra noção de tempo (manhã, tarde e noite)?',
      'Demonstra noção de tempo (hoje, ontem, amanhã)?',
      'Demonstra noção de tempo (semana, meses e anos)?',
      'Demonstra capacidade de organização de história em sequência, através de gravuras?',
      'Observa mudanças de organização da sala?'
    ]
  },
  {
    area: 'Linguagem Escrita',
    perguntas: [
      'Escreve seu nome?',
      'Escreve de forma espontânea as palavras conhecidas com sílabas diretas?',
      'Escreve respeitando a direção espacial?',
      'Copia de forma automática sem atribuição de significado?',
      'Confunde letras parecidas?',
      'Troca ou omite letras?',
      'Escreve letras espelhadas?'
    ]
  },
  {
    area: 'Leitura',
    perguntas: [
      'Associa rótulos de embalagens?',
      'Soletração oral de palavras?',
      'Conhece gibi e livros infantis?',
      'Segue o dedo na leitura da palavra, da esquerda para direita?',
      'Interpreta a partir da sequência de imagens e ilustrações?',
      'Lê palavras simples?',
      'Lê palavras complexas?',
      'Realiza produção de texto a partir do que foi lido?',
      'Compreende que os sinais impressos (?, ., !) correspondem à entonação da fala?'
    ]
  },
  {
    area: 'Atenção e Concentração',
    perguntas: [
      'Detém muito tempo na execução das tarefas?',
      'É disperso e muda o foco da atenção de uma atividade para outra?',
      'É apático, necessitando de muito estímulo para o término das atividades?',
      'É agitado, não concluindo as atividades propostas?',
      'Escuta com atenção textos de diferentes gêneros lidos pelo professor?',
      'Sua atenção é dirigida para detalhes sem importância?',
      'Sua atenção é constante e permanente?'
    ]
  },
  {
    area: 'Psicomotricidade',
    perguntas: [
      'Faz desenhos do corpo humano com riqueza de detalhes?',
      'Identifica direita e esquerda?',
      'Tem noção de espaço (em baixo, em cima, lado, direita, esquerda, frente, trás, longe, perto)?',
      'Tem noção de quantidade (cheio e vazio)?',
      'Tem noção de fino, grosso, largo?',
      'Define a lateralidade em si e no outro?'
    ]
  },
  {
    area: 'Coordenação Visomotora',
    perguntas: [
      'Atira, pega, solta, faz preensão palmar, pinça, rasga, dobra e modela?',
      'Recorta linha reta?',
      'Recorta linha curva?',
      'Abre zíper?',
      'Pega corretamente a caneta, tesoura, lápis, borracha?',
      'Amarra nó?',
      'Abotoa?'
    ]
  },
  {
    area: 'Memória Visual',
    perguntas: [
      'Interpreta gravuras?',
      'Interpreta jogos de memória, monta quebra-cabeças e jogos de encaixe?',
      'Identifica figuras iguais?'
    ]
  },
  {
    area: 'Memória Auditiva',
    perguntas: [
      'Identifica os vários tipos de sons (vozes de animais, gotejamento, chuva, ventania, etc.)?',
      'Percebe estímulos sonoros?',
      'Reproduz sons?',
      'Tem dificuldades de lembrar informações adquiridas oralmente?'
    ]
  },
  {
    area: 'Matemática – Raciocínio Lógico',
    perguntas: [
      'Apresenta noção de seriação (maior para o menor, do menor para o maior)?',
      'Relaciona a quantidade com o numeral?',
      'Conta oralmente?',
      'Tem noção de quantidade?',
      'Realiza adição?',
      'Realiza subtração?',
      'Realiza multiplicação?',
      'Realiza divisão?',
      'Identifica figuras geométricas?',
      'Relaciona objetos iguais?',
      'Resolve situações problema, utilizando diferentes formas de resolução?',
      'Identifica cores?'
    ]
  },
  {
    area: 'Movimento e Artes',
    perguntas: [
      'Desloca-se com destreza progressiva no espaço ao andar, correr, pular, rolar, dançar, etc.?',
      'Produz trabalhos de artes, utilizando diversas formas de expressão como desenho, pintura, colagem, etc.?',
      'Possui gosto, cuidado e respeito pelo processo de produção e criação?'
    ]
  }
];


function getToastIcon(type) {
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };
  return icons[type] || icons.info;
}
  }
});