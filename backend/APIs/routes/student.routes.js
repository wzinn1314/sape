const express = require('express');
const router = express.Router();
const db = require('../database');
const fs = require('fs');
const path = require('path');
const html_to_pdf = require('html-pdf-node');

// Configuração da pasta de relatórios
const reportsDir = path.join(__dirname, '../../reports'); 
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

// Helper para mapear alunos
function mapStudentRow(row) {
  return {
    id: row.id,
    nome: row.nome,
    nascimento: row.nascimento,
    matricula: row.matricula,
    cpf: row.cpf,
    turma: row.turma,
    curso: row.curso,
    anoLetivo: row.anoLetivo,
    diagnostico: row.diagnostico,
    pei: !!row.pei,
    suporte: row.suporte,
    hiperfocos: row.hiperfocos,
    gatilhos: row.gatilhos,
    estrategias: row.estrategias,
    responsavel: row.responsavel,
    parentesco: row.parentesco,
    telefone: row.telefone,
    email: row.email,
    gradeValue: row.gradeValue,
    registeredBy: row.registered_by,
    registeredByName: row.registered_by_name || null,
    createdAt: row.created_at ? new Date(row.created_at * 1000).toISOString() : null
  };
}

// Helper para mapear relatórios
function mapReportRow(row) {
    return {
        id: row.id,
        titulo: row.titulo,
        alunoNome: row.aluno_nome,
        professorNome: row.professor_nome,
        arquivoPath: row.arquivo_path,
        data: row.data_criacao ? new Date(row.data_criacao * 1000).toLocaleDateString('pt-BR') : null
    };
}

/* =====================================================
   ROTAS DE ALUNOS
===================================================== */

// Listar todos os alunos (Usada para o Select no formulário de relatório)
router.get('/', (req, res) => {
  db.all(
    `SELECT s.*, u.name AS registered_by_name FROM students s
     LEFT JOIN user u ON u.id = s.registered_by
     ORDER BY s.nome ASC`, // Ordenado por nome para facilitar no Select
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(mapStudentRow));
    }
  );
});

router.get('/dashboard', (req, res) => {
  db.get('SELECT COUNT(*) AS total FROM students', [], (countErr, countRow) => {
      if (countErr) return res.status(500).json({ error: countErr.message });
      db.all(
        `SELECT s.*, u.name AS registered_by_name FROM students s
         LEFT JOIN user u ON u.id = s.registered_by
         ORDER BY s.created_at DESC LIMIT 5`,
        [],
        (listErr, rows) => {
          if (listErr) return res.status(500).json({ error: listErr.message });
          res.json({ total: countRow.total, recent: rows.map(mapStudentRow) });
        }
      );
    }
  );
});

router.post('/', (req, res) => {
  const { nome, nascimento, matricula, cpf, turma, curso, anoLetivo, diagnostico, pei, suporte, hiperfocos, gatilhos, estrategias, responsavel, parentesco, telefone, email, gradeValue, registeredBy } = req.body;
  if (!nome || !matricula) return res.status(400).json({ error: 'Nome e matrícula são obrigatórios' });

  db.run(
    `INSERT INTO students (nome, nascimento, matricula, cpf, turma, curso, anoLetivo, diagnostico, pei, suporte, hiperfocos, gatilhos, estrategias, responsavel, parentesco, telefone, email, gradeValue, registered_by)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [nome, nascimento || null, matricula, cpf || null, turma || null, curso || null, anoLetivo || null, diagnostico || null, pei ? 1 : 0, suporte || null, hiperfocos || null, gatilhos || null, estrategias || null, responsavel || null, parentesco || null, telefone || null, email || null, gradeValue || null, registeredBy || null],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Matrícula já cadastrada' });
        return res.status(500).json({ error: err.message });
      }
      db.get(`SELECT s.*, u.name AS registered_by_name FROM students s LEFT JOIN user u ON u.id=s.registered_by WHERE s.id=?`, [this.lastID], (error,row) => {
          if(error) return res.status(201).json({ message:'Aluno cadastrado' });
          res.status(201).json(mapStudentRow(row));
      });
    }
  );
});

/* =====================================================
   ROTAS DE RELATÓRIOS (NOVO)
===================================================== */

// Rota para Gerar PDF e salvar
router.post('/generate-report', async (req, res) => {
    const { titulo, conteudo, aluno_id, professor_id, nome_aluno, data } = req.body;

    if (!titulo || !conteudo || !aluno_id) {
        return res.status(400).json({ error: 'Título, conteúdo e aluno são obrigatórios.' });
    }

    const htmlContent = `
        <div style="font-family: Arial; padding: 50px;">
            <h1 style="color: #2563eb; text-align: center;">SAPE - Relatório Escolar</h1>
            <hr>
            <p><strong>Documento:</strong> ${titulo}</p>
            <p><strong>Aluno:</strong> ${nome_aluno}</p>
            <p><strong>Data:</strong> ${data}</p>
            <div style="margin-top: 30px; line-height: 1.6; text-align: justify;">
                ${conteudo.replace(/\n/g, '<br>')}
            </div>
            <div style="margin-top: 100px; text-align: center;">
                <div style="border-top: 1px solid #000; width: 200px; margin: 0 auto;"></div>
                <p>Assinatura do Responsável</p>
            </div>
        </div>
    `;

    try {
        let options = { format: 'A4' };
        let file = { content: htmlContent };

        const pdfBuffer = await html_to_pdf.generatePdf(file, options);
        const fileName = `relatorio_${Date.now()}_${aluno_id}.pdf`;
        const filePath = path.join(reportsDir, fileName);

        fs.writeFileSync(filePath, pdfBuffer);

        db.run(
            `INSERT INTO reports (titulo, conteudo, aluno_id, professor_id, arquivo_path) VALUES (?, ?, ?, ?, ?)`,
            [titulo, conteudo, aluno_id, professor_id, fileName],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Relatório gerado com sucesso', file: fileName });
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar o PDF' });
    }
});

// Listar relatórios cadastrados
router.get('/reports-list', (req, res) => {
    const query = `
        SELECT r.*, s.nome as aluno_nome, u.name as professor_nome 
        FROM reports r
        JOIN students s ON r.aluno_id = s.id
        JOIN user u ON r.professor_id = u.id
        ORDER BY r.data_criacao DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(mapReportRow));
    });
});

router.delete('/:matricula',(req,res)=>{
  db.run('DELETE FROM students WHERE matricula=?', [req.params.matricula], function(err){
      if(err) return res.status(500).json({error:err.message});
      if(this.changes===0) return res.status(404).json({ error:'Aluno não encontrado' });
      res.json({ message:'Aluno excluído com sucesso' });
    }
  );
});

module.exports = router;