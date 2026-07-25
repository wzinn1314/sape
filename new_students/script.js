document.addEventListener('DOMContentLoaded', () => {
  const studentForm = document.getElementById('studentForm');
  if (!studentForm) return;

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
          updateTabs(currentTabIndex + 1);
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
  // 2. ENVIO DO FORMULÁRIO PARA O BACKEND (FETCH)
  // ====================================================
  studentForm.addEventListener('submit', async (e) => {
      // Impede o recarregamento padrão da página
      e.preventDefault();

      // Validação da caixa de confirmação
      const confirmCheckbox = document.getElementById('confirm');
      if (confirmCheckbox && !confirmCheckbox.checked) {
          alert('Por favor, confirme que as informações prestadas são verdadeiras.');
          return;
      }

      // Captura dos campos
      const studentName = document.getElementById('studentName')?.value.trim();
      const birthDate = document.getElementById('birthDate')?.value;
      const matricula = document.getElementById('matricula')?.value.trim();
      const cpf = document.getElementById('cpf')?.value.trim();

      const turma = document.getElementById('turma')?.value;
      const curso = document.getElementById('curso')?.value;
      const anoLetivo = document.getElementById('anoLetivo')?.value;

      const diagnostico = document.getElementById('diagnostico')?.value;
      const pei = document.getElementById('pei')?.checked ? 1 : 0;
      const suporte = document.getElementById('suporte')?.value;

      const responsavelNome = document.getElementById('responsavelNome')?.value.trim();
      const parentesco = document.getElementById('parentesco')?.value;
      const telefone = document.getElementById('telefone')?.value.trim();
      const email = document.getElementById('email')?.value.trim();

      // Validação básica
      if (!studentName) {
          alert('O campo Nome Completo do Aluno é obrigatório!');
          updateTabs(0); // Redireciona o usuário para a primeira aba se faltar o nome
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
          pei: pei,
          suporte: suporte || null,
          responsavel: responsavelNome || null,
          parentesco: parentesco || null,
          telefone: telefone || null,
          email: email || null
      };

      try {
          const response = await fetch('http://localhost:3000/students', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
          });

          const data = await response.json();

          if (response.ok) {
              alert('✅ Aluno cadastrado com sucesso!');
              studentForm.reset();
              updateTabs(0); // Volta para a primeira aba após resetar
              // window.location.href = "../deshboard/index.html"; // Opcional
          } else {
              alert(`❌ Erro ao cadastrar: ${data.error || 'Erro desconhecido'}`);
          }
      } catch (error) {
          console.error('Erro na requisição:', error);
          alert('⚠️ Não foi possível se conectar ao servidor Backend. Verifique se o servidor Node.js está rodando na porta 3000.');
      }
  });

  // ====================================================
  // 3. FERRAMENTAS DE ACESSIBILIDADE
  // ====================================================
  let fontSize = 100;

  document.getElementById('btnIncreaseFont')?.addEventListener('click', () => {
      if (fontSize < 130) {
          fontSize += 10;
          document.body.style.fontSize = `${fontSize}%`;
      }
  });

  document.getElementById('btnDecreaseFont')?.addEventListener('click', () => {
      if (fontSize > 80) {
          fontSize -= 10;
          document.body.style.fontSize = `${fontSize}%`;
      }
  });

  document.getElementById('btnResetFont')?.addEventListener('click', () => {
      fontSize = 100;
      document.body.style.fontSize = '100%';
  });

  document.getElementById('btnToggleContrast')?.addEventListener('click', () => {
      document.body.classList.toggle('high-contrast');
  });
});