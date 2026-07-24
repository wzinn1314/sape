document.addEventListener('DOMContentLoaded', () => {
  const studentForm = document.getElementById('studentForm');

  if (!studentForm) return;

  studentForm.addEventListener('submit', async (e) => {
    // 1. IMPEDE O RECARREGAMENTO PADRÃO DA PÁGINA (Fundamental!)
    e.preventDefault();

    // Validação da caixa de confirmação
    const confirmCheckbox = document.getElementById('confirm');
    if (confirmCheckbox && !confirmCheckbox.checked) {
      alert('Por favor, confirme que as informações prestadas são verdadeiras.');
      return;
    }

    // 2. CAPTURA DOS CAMPOS DO SEU HTML
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
      return;
    }

    // 3. MONTAGEM DO OBJETO DE DADOS (Compatível com o backend Node.js)
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
      // 4. ENVIO PARA O BACKEND VIA FETCH
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
        studentForm.reset(); // Limpa o formulário após o envio
        // Opcional: redirecionar para o dashboard
        // window.location.href = "../deshboard/index.html";
      } else {
        alert(`❌ Erro ao cadastrar: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert('⚠️ Não foi possível se conectar ao servidor Backend. Verifique se o servidor Node.js está rodando na porta 3000.');
    }
  });
});