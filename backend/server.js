require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Domínios permitidos para registro
const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS 
  ? process.env.ALLOWED_EMAIL_DOMAINS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) 
  : null;

// ==========================================
// CONEXÃO E INICIALIZAÇÃO DO BANCO DE DADOS
// ==========================================
const db = new sqlite3.Database('./sapedb.sqlite', (err) => {
  if (err) {
    console.error('Erro ao conectar no DB:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite!');

    db.serialize(() => {
      // 1. Tabela de Usuários (Login / Cadastro)
      db.run(`CREATE TABLE IF NOT EXISTS user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        cpf TEXT NOT NULL,
        role TEXT DEFAULT 'Aluno',
        emailVerified INTEGER DEFAULT 0,
        approved INTEGER DEFAULT 0
      )`);

      // Verifica e adiciona colunas faltantes se a tabela já existir
      db.all('PRAGMA table_info(user)', [], (err, columns) => {
        if (!err && columns) {
          const requiredColumns = [
            { name: 'password', addSql: 'ALTER TABLE user ADD COLUMN password TEXT DEFAULT ""' },
            { name: 'cpf', addSql: 'ALTER TABLE user ADD COLUMN cpf TEXT DEFAULT ""' },
            { name: 'role', addSql: "ALTER TABLE user ADD COLUMN role TEXT DEFAULT 'Aluno'" },
            { name: 'emailVerified', addSql: "ALTER TABLE user ADD COLUMN emailVerified INTEGER DEFAULT 0" },
            { name: 'approved', addSql: "ALTER TABLE user ADD COLUMN approved INTEGER DEFAULT 0" }
          ];

          requiredColumns.forEach((column) => {
            if (!columns.some((col) => col.name === column.name)) {
              db.run(column.addSql, (alterErr) => {
                if (alterErr) console.error(`Erro ao adicionar coluna ${column.name}:`, alterErr.message);
              });
            }
          });
        }
      });

      // LIBERAÇÃO AUTOMÁTICA DE PROFESSORES JÁ CADASTRADOS
      db.run("UPDATE user SET approved = 1, emailVerified = 1 WHERE LOWER(role) LIKE '%prof%' OR LOWER(role) LIKE '%teacher%'");

      // 2. Tabela de Tokens de Verificação de E-mail
      db.run(`CREATE TABLE IF NOT EXISTS email_verification (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      )`);

      // 3. Tabela de Alunos do SAPE
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

      // 4. Tabela de Relatórios do AEE
      db.run(`CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        pdf_content TEXT NOT NULL,
        file_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id)
      )`);

      // 5. Tabela de Diário de Evolução / Atendimentos
      db.run(`CREATE TABLE IF NOT EXISTS evolucoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        data TEXT NOT NULL,
        relato TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
      )`);

      // 6. Tabela de Vínculo Professor <-> Aluno (NOVO)
      db.run(`CREATE TABLE IF NOT EXISTS professor_aluno (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professor_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(professor_id, student_id),
        FOREIGN KEY (professor_id) REFERENCES user (id),
        FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
      )`);

      // ==========================================
      // SEMEADURA AUTOMÁTICA DO ADMINISTRADOR
      // ==========================================
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@escola.edu.br';
      const adminMatricula = process.env.ADMIN_MATRICULA || 'ADM2026';
      const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSAPE2026';

      db.get('SELECT * FROM user WHERE LOWER(email) = LOWER(?) OR LOWER(cpf) = LOWER(?)', [adminEmail, adminMatricula], async (err, row) => {
        if (err) {
          console.error('Erro ao verificar usuário Admin:', err.message);
          return;
        }

        if (!row) {
          try {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            const queryAdmin = `
              INSERT INTO user (name, email, password, cpf, role, emailVerified, approved) 
              VALUES (?, ?, ?, ?, ?, 1, 1)
            `;

            db.run(queryAdmin, ['Administrador SAPE', adminEmail.toLowerCase(), hashedPassword, adminMatricula, 'Admin'], function (insertErr) {
              if (insertErr) {
                console.error('Erro ao criar usuário Admin padrão:', insertErr.message);
              } else {
                console.log(`✅ Usuário Administrador padrão pronto! Matrícula/CPF: ${adminMatricula}`);
              }
            });
          } catch (hashError) {
            console.error('Erro ao gerar hash para o Admin padrão:', hashError);
          }
        }
      });
    });
  }
});

// ==========================================
// HELPERS DE VÍNCULO / CONTROLE DE ACESSO (NOVO)
// ==========================================

// Verifica no banco se um professor tem vínculo ativo com um aluno
function professorTemAcesso(professorId, studentId, callback) {
  db.get(
    'SELECT 1 FROM professor_aluno WHERE professor_id = ? AND student_id = ?',
    [professorId, studentId],
    (err, row) => callback(err, !!row)
  );
}

// Middleware: protege rotas que expõem/alteram dados de UM aluno específico (/students/:id/...)
// Espera receber requesterId e requesterRole (via query string ou body) informando quem está pedindo.
// - Admin: acesso liberado
// - Professor: só passa se existir vínculo com o aluno da rota
// - Qualquer outro caso: bloqueado
function verificarAcessoAluno(req, res, next) {
  const studentId = req.params.id;
  const requesterId = req.body.requesterId || req.query.requesterId;
  const requesterRole = (req.body.requesterRole || req.query.requesterRole || '').toLowerCase();

  if (requesterRole === 'admin') {
    return next();
  }

  if (!requesterRole.includes('prof')) {
    return res.status(403).json({ error: 'Acesso não permitido.' });
  }

  if (!requesterId) {
    return res.status(400).json({ error: 'Identificação do professor (requesterId) não informada.' });
  }

  professorTemAcesso(requesterId, studentId, (err, temAcesso) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar vínculo: ' + err.message });
    if (!temAcesso) return res.status(403).json({ error: 'Você não tem vínculo com este aluno.' });
    next();
  });
}

// ==========================================
// ROTAS DE CONFIGURAÇÃO E USUÁRIOS
// ==========================================
app.get('/config', (req, res) => {
  res.json({ allowedDomains });
});

app.get('/users', (req, res) => {
  db.all('SELECT id, name, email, cpf AS matricula, role, emailVerified, approved FROM user', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/users/pending', (req, res) => {
  db.all('SELECT id, name, email, cpf AS matricula, role FROM user WHERE approved = 0', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Lista somente professores (usado no select do painel de vínculos)
app.get('/professores', (req, res) => {
  db.all(
    "SELECT id, name, email, cpf AS matricula FROM user WHERE LOWER(role) LIKE '%prof%' OR LOWER(role) LIKE '%teacher%' ORDER BY name ASC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.put('/users/:id/approve', (req, res) => {
  const { id } = req.params;
  const { approved, role } = req.body;

  const isApproved = approved ? 1 : 0;

  db.run(
    `UPDATE user 
     SET approved = ?, 
         emailVerified = CASE WHEN ? = 1 THEN 1 ELSE emailVerified END, 
         role = COALESCE(?, role) 
     WHERE id = ?`,
    [isApproved, isApproved, role, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Status do usuário atualizado com sucesso!' });
    }
  );
});

// NOTA IMPORTANTE: o autocadastro público foi removido do sistema — só a
// administração da escola cria contas (professor, aluno, responsável).
// Por isso esta rota agora exige requesterRole = 'admin', enviado pelo
// próprio painel administrativo. Sem isso, qualquer chamada direta à API
// poderia criar uma conta de professor sem passar por ninguém — é a mesma
// brecha que identificamos antes, agora fechada.
app.post('/register', async (req, res) => {
  const { name, email, cpf, password, role, requesterRole } = req.body;

  if ((requesterRole || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Somente a administração pode cadastrar novos usuários.' });
  }

  if (!name || !email || !cpf || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    if (allowedDomains && allowedDomains.length > 0) {
      const domain = (email.split('@')[1] || '').toLowerCase();
      if (!domain || !allowedDomains.includes(domain)) {
        return res.status(400).json({ error: `Registro permitido somente para domínios: ${allowedDomains.join(', ')}` });
      }
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const roleNormalized = (role || 'Aluno').trim();

    // Como a conta só existe se um admin a criou, ela já nasce aprovada —
    // não faz sentido colocar na fila de aprovação pendente.
    const emailVerified = 1;
    const approved = 1;

    db.run(
      'INSERT INTO user (name, email, password, cpf, role, emailVerified, approved) VALUES (?, ?, ?, ?, ?, ?, ?)', 
      [name.trim(), email.toLowerCase().trim(), hashedPassword, cpf.trim(), roleNormalized, emailVerified, approved], 
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Email já cadastrado' });
          }
          return res.status(500).json({ error: err.message });
        }

        const userId = this.lastID;
        return res.status(201).json({ message: 'Usuário cadastrado com sucesso!', id: userId });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar requisição de cadastro' });
  }
});

app.get('/verify-email', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Token é obrigatório');

  db.get('SELECT * FROM email_verification WHERE token = ?', [token], (err, row) => {
    if (err) return res.status(500).send('Erro no servidor');
    if (!row) return res.status(400).send('Token inválido ou não encontrado');

    if (Date.now() > row.expires_at) {
      return res.status(400).send('Token expirado');
    }

    db.run('UPDATE user SET emailVerified = 1, approved = 1 WHERE id = ?', [row.user_id], (updateErr) => {
      if (updateErr) return res.status(500).send('Erro ao atualizar usuário');

      db.run('DELETE FROM email_verification WHERE id = ?', [row.id]);
      return res.send('E-mail verificado com sucesso. Você já pode acessar o sistema.');
    });
  });
});

// ==========================================
// ROTA DE LOGIN
// ==========================================
app.post('/login', (req, res) => {
  const { email, matricula, password } = req.body;
  const loginIdentifier = (email || matricula || '').trim();

  if (!loginIdentifier || !password) {
    return res.status(400).json({ error: 'Informe a identificação (e-mail/matrícula) e a senha.' });
  }

  const query = 'SELECT * FROM user WHERE LOWER(email) = LOWER(?) OR LOWER(cpf) = LOWER(?)';

  db.get(query, [loginIdentifier, loginIdentifier], async (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro de banco de dados: ' + err.message });
    if (!row) return res.status(401).json({ error: 'Credenciais inválidas.' });

    let passwordMatches = false;

    try {
      if (row.password.startsWith('$2b$') || row.password.startsWith('$2a$')) {
        passwordMatches = await bcrypt.compare(password, row.password);
      }
    } catch (e) {
      passwordMatches = false;
    }

    // Suporte para migração de senhas antigas em texto plano
    if (!passwordMatches && row.password === password) {
      passwordMatches = true;
      try {
        const newHash = await bcrypt.hash(password, 10);
        db.run('UPDATE user SET password = ? WHERE id = ?', [newHash, row.id]);
      } catch (hashErr) {
        console.error('Erro ao migrar senha antiga:', hashErr);
      }
    }

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const roleLower = (row.role || '').toLowerCase();

    if (roleLower.includes('prof') || roleLower.includes('teacher')) {
      if (!row.emailVerified) {
        return res.status(403).json({ error: 'E-mail não verificado. Por favor, valide seu e-mail.' });
      }
      if (!row.approved) {
        return res.status(403).json({ error: 'Sua conta ainda está pendente de aprovação por um administrador.' });
      }
    }

    res.json({
      message: 'Login bem-sucedido',
      user: { 
        id: row.id, 
        name: row.name, 
        email: row.email, 
        matricula: row.cpf, 
        role: row.role || 'Admin', 
        emailVerified: !!row.emailVerified, 
        approved: !!row.approved 
      }
    });
  });
});

// ==========================================
// ROTAS DE VÍNCULO PROFESSOR <-> ALUNO (NOVO)
// ==========================================

// Salva o vínculo entre um professor e uma lista de alunos
app.post('/vinculos', (req, res) => {
  const { professorId, studentIds } = req.body;

  if (!professorId || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'Professor e ao menos um aluno são obrigatórios.' });
  }

  db.serialize(() => {
    const stmt = db.prepare('INSERT OR IGNORE INTO professor_aluno (professor_id, student_id) VALUES (?, ?)');
    studentIds.forEach((studentId) => stmt.run(professorId, studentId));
    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: 'Erro ao salvar vínculo: ' + err.message });
      res.status(201).json({ message: 'Vínculo(s) salvo(s) com sucesso!' });
    });
  });
});

// Lista todos os vínculos existentes, agrupados por professor (para a tabela do admin)
app.get('/vinculos', (req, res) => {
  const query = `
    SELECT 
      u.id AS professor_id, 
      u.name AS professor_nome, 
      u.cpf AS matricula, 
      GROUP_CONCAT(s.name, ', ') AS alunos_nomes,
      GROUP_CONCAT(s.id) AS alunos_ids
    FROM professor_aluno pa
    INNER JOIN user u ON u.id = pa.professor_id
    INNER JOIN students s ON s.id = pa.student_id
    GROUP BY u.id
    ORDER BY u.name ASC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Remove o vínculo entre um professor específico e um aluno específico
app.delete('/vinculos/:professorId/:studentId', (req, res) => {
  const { professorId, studentId } = req.params;
  db.run(
    'DELETE FROM professor_aluno WHERE professor_id = ? AND student_id = ?',
    [professorId, studentId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Vínculo removido com sucesso!' });
    }
  );
});

// ==========================================
// ROTAS DE ALUNOS
// ==========================================
app.post('/students', (req, res) => {
  const {
    nome, nascimento, matricula, cpf, turma, curso, anoLetivo,
    diagnostico, pei, suporte, hiperfocos, gatilhos, estrategias,
    responsavel, parentesco, telefone, email, gradeValue, registeredBy
  } = req.body;

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
    nome.trim(), nascimento || null, matricula ? matricula.trim() : null,
    cpf ? cpf.trim() : null, turma || null, curso || null, anoLetivo || null,
    diagnostico || null, pei ? 1 : 0, suporte || null, hiperfocos || null,
    gatilhos || null, estrategias || null, responsavel || null, parentesco || null,
    telefone || null, email || null, gradeValue || null, registeredBy || null
  ];

  db.run(query, params, function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Já existe um aluno cadastrado com esta Matrícula.' });
      }
      return res.status(500).json({ error: 'Erro ao salvar no banco de dados: ' + err.message });
    }

    res.status(201).json({ message: 'Aluno cadastrado com sucesso!', studentId: this.lastID });
  });
});

// Lista alunos. Se professorId + role=professor forem enviados, retorna SÓ os alunos vinculados a ele.
// Admin (ou nenhum filtro enviado) continua vendo todos.
app.get('/students', (req, res) => {
  const { professorId, role } = req.query;
  const isProfessor = (role || '').toLowerCase().includes('prof');

  let query = 'SELECT s.* FROM students s';
  const params = [];

  if (isProfessor && professorId) {
    query += ' INNER JOIN professor_aluno pa ON pa.student_id = s.id AND pa.professor_id = ?';
    params.push(professorId);
  }

  query += ' ORDER BY s.name ASC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

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

// Busca UM aluno específico — protegida pelo vínculo (NOVO)
app.get('/students/:id', verificarAcessoAluno, (req, res) => {
  db.get('SELECT * FROM students WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Aluno não encontrado.' });

    res.json({
      ...row,
      nome: row.name,
      matricula: row.registration_number,
      nascimento: row.birth_date,
      responsavel: row.responsavel_nome,
      anoLetivo: row.ano_letivo,
      gradeValue: row.grade_value
    });
  });
});

// ATUALIZAR PDI / ESTRATÉGIAS DO ALUNO — agora protegida pelo vínculo
app.put('/students/:id/pdi', verificarAcessoAluno, (req, res) => {
  const { id } = req.params;
  const { objetivos, estrategias } = req.body;

  const query = `UPDATE students SET hiperfocos = ?, estrategias = ? WHERE id = ?`;
  
  db.run(query, [objetivos, estrategias, id], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar PDI: ' + err.message });
    res.json({ message: 'PDI atualizado com sucesso!' });
  });
});

// REGISTRAR EVOLUÇÃO / ATENDIMENTO NO DIÁRIO — agora protegida pelo vínculo
app.post('/students/:id/evolucao', verificarAcessoAluno, (req, res) => {
  const { id } = req.params;
  const { data, relato } = req.body;

  if (!data || !relato) {
    return res.status(400).json({ error: 'Data e relato são obrigatórios.' });
  }

  const query = `INSERT INTO evolucoes (student_id, data, relato) VALUES (?, ?, ?)`;
  
  db.run(query, [id, data, relato], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao registrar evolução: ' + err.message });
    res.status(201).json({ message: 'Evolução registrada com sucesso!', id: this.lastID });
  });
});

// BUSCAR HISTÓRICO DE EVOLUÇÕES DO ALUNO — agora protegida pelo vínculo
app.get('/students/:id/evolucoes', verificarAcessoAluno, (req, res) => {
  const { id } = req.params;

  const query = `SELECT * FROM evolucoes WHERE student_id = ? ORDER BY data DESC`;
  
  db.all(query, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar evoluções: ' + err.message });
    res.json(rows);
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

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});