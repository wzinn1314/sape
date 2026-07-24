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

      // LIBERAÇÃO AUTOMÁTICA DE PROFESSORES JÁ CADASTRADOS (ex: Wallisson)
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
          const hashedPassword = await bcrypt.hash(adminPassword, 10);
          const queryAdmin = `
            INSERT INTO user (name, email, password, cpf, role, emailVerified, approved) 
            VALUES (?, ?, ?, ?, ?, 1, 1)
          `;

          db.run(queryAdmin, ['Administrador SAPE', adminEmail.toLowerCase(), hashedPassword, adminMatricula, 'Admin'], function (err) {
            if (err) {
              console.error('Erro ao criar usuário Admin padrão:', err.message);
            } else {
              console.log(`✅ Usuário Administrador padrão pronto! Matrícula/CPF: ${adminMatricula}`);
            }
          });
        }
      });
    });
  }
});

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

app.put('/users/:id/approve', (req, res) => {
  const { id } = req.params;
  const { approved, role } = req.body;

  const isApproved = approved ? 1 : 0;

  // Atualiza 'approved' e 'emailVerified' simultaneamente ao aprovar
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

app.post('/register', async (req, res) => {
  const { name, email, cpf, password, role } = req.body;

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
    const roleLower = roleNormalized.toLowerCase();

    // Professores, Alunos e Administradores cadastrados já entram liberados e aprovados
    const isTeacher = roleLower.includes('prof') || roleLower.includes('teacher');
    const isStudent = ['aluno', 'student'].includes(roleLower);
    const isAdmin = roleLower === 'admin';

    const autoApprove = isTeacher || isStudent || isAdmin;
    const emailVerified = autoApprove ? 1 : 0;
    const approved = autoApprove ? 1 : 0;

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
// ROTA DE LOGIN (COM SUPORTE A TEXTO PURO E BCRYPT)
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

    // 1. Tenta validar via bcrypt se já for um hash
    try {
      if (row.password.startsWith('$2b$') || row.password.startsWith('$2a$')) {
        passwordMatches = await bcrypt.compare(password, row.password);
      }
    } catch (e) {
      passwordMatches = false;
    }

    // 2. Se falhar, checa se a senha antiga estava em texto puro (ex: AdminSAPE2026)
    if (!passwordMatches && row.password === password) {
      passwordMatches = true;
      // Converte e criptografa a senha no banco automaticamente no primeiro acesso!
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

    // Trava de verificação apenas para professores/usuários comuns
    if (roleLower.includes('prof') || roleLower.includes('teacher')) {
      if (!row.emailVerified) {
        return res.status(403).json({ error: 'E-mail não verificado. Por favor, valide seu e-mail.' });
      }
      if (!row.approved) {
        return res.status(403).json({ error: 'Sua conta ainda pendente de aprovação por um administrador.' });
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

app.get('/students', (req, res) => {
  db.all('SELECT * FROM students ORDER BY name ASC', [], (err, rows) => {
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