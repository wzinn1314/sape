require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Conexão e Inicialização do Banco de Dados SQLite
const db = new sqlite3.Database('./sapedb.sqlite', (err) => {
  if (err) {
    console.error('Erro ao conectar no DB:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite!');

    db.serialize(() => {
      // 1. Tabela de Alunos Completa do SAPE
      db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        birth_date TEXT,
        registration_number TEXT UNIQUE,
        cpf TEXT,
        turma TEXT,
        curso TEXT,
        ano_letivo TEXT,
        diagnostico TEXT,
        pei INTEGER DEFAULT 0,
        suporte TEXT,
        hiperfocos TEXT,
        gatilhos TEXT,
        estrategias TEXT,
        responsavel_nome TEXT,
        parentesco TEXT,
        telefone TEXT,
        email TEXT,
        grade_value TEXT,
        registered_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // 2. Tabela de Relatórios do AEE
      db.run(`CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        pdf_content TEXT NOT NULL,
        file_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id)
      )`);
    });
  }
});

// ==========================================
// ROTA: CADASTRAR ALUNO (POST /students)
// ==========================================
app.post('/students', (req, res) => {
  const {
    nome,
    nascimento,
    matricula,
    cpf,
    turma,
    curso,
    anoLetivo,
    diagnostico,
    pei,
    suporte,
    hiperfocos,
    gatilhos,
    estrategias,
    responsavel,
    parentesco,
    telefone,
    email,
    gradeValue,
    registeredBy
  } = req.body;

  // Validação flexível: apenas exige que o campo nome não esteja em branco
  if (!nome || nome.trim() === '') {
    return res.status(400).json({ error: 'O nome do aluno é obrigatório.' });
  }

  const query = `
    INSERT INTO students (
      name, birth_date, registration_number, cpf, turma, curso, ano_letivo,
      diagnostico, pei, suporte, hiperfocos, gatilhos, estrategias,
      responsavel_nome, parentesco, telefone, email, grade_value, registered_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    nome.trim(),
    nascimento || null,
    matricula ? matricula.trim() : null,
    cpf ? cpf.trim() : null,
    turma || null,
    curso || null,
    anoLetivo || null,
    diagnostico || null,
    pei ? 1 : 0,
    suporte || null,
    hiperfocos || null,
    gatilhos || null,
    estrategias || null,
    responsavel || null,
    parentesco || null,
    telefone || null,
    email || null,
    gradeValue || null,
    registeredBy || null
  ];

  db.run(query, params, function (err) {
    if (err) {
      console.error('Erro ao salvar aluno:', err.message);
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Já existe um aluno cadastrado com esta Matrícula.' });
      }
      return res.status(500).json({ error: 'Erro ao salvar no banco de dados: ' + err.message });
    }

    res.status(201).json({
      message: 'Aluno cadastrado com sucesso!',
      studentId: this.lastID
    });
  });
});

// ==========================================
// ROTA: LISTAR ALUNOS (GET /students)
// ==========================================
app.get('/students', (req, res) => {
  const query = 'SELECT * FROM students ORDER BY name ASC';
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // Mapeia para que o Frontend consiga ler .nome, .name, .matricula, etc.
    const studentsFormatted = rows.map((student) => ({
      ...student,
      nome: student.name,
      matricula: student.registration_number,
      nascimento: student.birth_date,
      responsavel: student.responsavel_nome,
      anoLetivo: student.ano_letivo,
      gradeValue: student.grade_value
    }));

    res.json(studentsFormatted);
  });
});

// ==========================================
// ROTAS DE RELATÓRIOS
// ==========================================
app.post('/reports', (req, res) => {
  const { studentId, pdfContent, fileName } = req.body;

  if (!studentId || !pdfContent) {
    return res.status(400).json({ error: 'Selecione um aluno válido e envie o relatório.' });
  }

  const query = 'INSERT INTO reports (student_id, pdf_content, file_name) VALUES (?, ?, ?)';
  db.run(query, [studentId, pdfContent, fileName || 'relatorio.pdf'], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Relatório salvo com sucesso!', reportId: this.lastID });
  });
});

app.get('/reports', (req, res) => {
  const query = `
    SELECT 
      r.id, 
      s.name AS student_name, 
      s.diagnostico,
      r.pdf_content, 
      r.file_name, 
      r.created_at 
    FROM reports r
    INNER JOIN students s ON r.student_id = s.id
    ORDER BY r.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Inicialização do Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});