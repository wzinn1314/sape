require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();
const express = require('express');
<<<<<<< HEAD
const bcrypt = require('bcrypt');
const cors = require('cors');
const https = require('https');
const app = express();

app.use(cors());
app.use(express.json());


=======
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Conexão e Inicialização do Banco de Dados SQLite
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78
const db = new sqlite3.Database('./sapedb.sqlite', (err) => {
  if (err) {
    console.error('Erro ao conectar no DB:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite!');

    db.serialize(() => {
<<<<<<< HEAD
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
                if (alterErr) {
                  console.error(`Erro ao adicionar coluna ${column.name}:`, alterErr.message);
                }
              });
            }
          });
          // tabela para tokens de verificação
          db.run(`CREATE TABLE IF NOT EXISTS email_verification (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL,
            expires_at INTEGER NOT NULL
          )`);
        }
      });
=======
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
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78
    });
  }
});

<<<<<<< HEAD
const nodemailer = require('nodemailer');
const crypto = require('crypto');
// Domínios permitidos para registro (configurar em .env como CSV, ex: "seudominio.edu.br,escola.edu.br")
const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS ? process.env.ALLOWED_EMAIL_DOMAINS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : null;

app.get('/config', (req, res) => {
  res.json({ allowedDomains });
});


app.get('/users', (req, res) => {
  db.all('SELECT id, name, email, cpf, role FROM user', ... [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/register', async (req, res) => {
  const { name, email, cpf, password, role } = req.body;

  if (!name || !email || !cpf || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    // validação de domínio (se configurado)
    if (allowedDomains && allowedDomains.length > 0) {
      const domain = (email.split('@')[1] || '').toLowerCase();
      if (!domain || !allowedDomains.includes(domain)) {
        return res.status(400).json({ error: `Registro permitido somente para domínios: ${allowedDomains.join(', ')}` });
      }
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);

    
    // Para alunos, marcamos emailVerified/approved como true automaticamente
    const isStudent = (role && role.toLowerCase() === 'aluno') || (role && role.toLowerCase() === 'student');
    const emailVerified = isStudent ? 1 : 0;
    const approved = isStudent ? 1 : 0;

    db.run('INSERT INTO user (name, email, password, cpf, role, emailVerified, approved) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, email, hashedPassword, cpf, role || 'Aluno', emailVerified, approved], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(409).json({ error: 'Email já cadastrado' });
        } else {
          res.status(500).json({ error: err.message });
        }
      } else {
        const userId = this.lastID;

        // Se for professor, criar token de verificação e enviar e-mail (ou retornar URL em dev)
        if (!isStudent) {
          const token = crypto.randomBytes(24).toString('hex');
          const expiresAt = Date.now() + (1000 * 60 * 60 * 24); // 24h

          db.run('INSERT INTO email_verification (user_id, token, expires_at) VALUES (?, ?, ?)', [userId, token, expiresAt]);

          const verificationUrl = `${req.protocol}://${req.get('host')}/verify-email?token=${token}`;

          // Se variáveis SMTP estiverem configuradas, enviar email
          if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
              secure: process.env.SMTP_SECURE === 'true',
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
              }
            });

            const mailOptions = {
              from: process.env.SMTP_FROM || process.env.SMTP_USER,
              to: email,
              subject: 'Verificação de email - SAPE',
              html: `<p>Olá ${name},</p><p>Para ativar sua conta de professor, clique no link abaixo:</p><p><a href="${verificationUrl}">Verificar email</a></p><p>O link expira em 24 horas.</p>`
            };

            transporter.sendMail(mailOptions, (mailErr, info) => {
              if (mailErr) {
                console.error('Erro ao enviar email:', mailErr);
                return res.status(201).json({ message: 'Usuário cadastrado. Não foi possível enviar e-mail de verificação.', verifyUrl: verificationUrl });
              }

              return res.status(201).json({ message: 'Usuário cadastrado com sucesso. E-mail de verificação enviado.' });
            });
          } else {
            // Ambiente de desenvolvimento: retornar URL para verificação
            return res.status(201).json({ message: 'Usuário cadastrado com sucesso', id: userId, verifyUrl: verificationUrl });
          }
        }

        // Para alunos ou professores que não precisam de verificação, retornar sucesso simples
        res.status(201).json({ message: 'Usuário cadastrado com sucesso', id: userId });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar senha' });
  }
});


// Rota para verificar email via token
app.get('/verify-email', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Token é obrigatório');

  db.get('SELECT * FROM email_verification WHERE token = ?', [token], (err, row) => {
    if (err) return res.status(500).send('Erro no servidor');
    if (!row) return res.status(400).send('Token inválido ou expirado');

    if (Date.now() > row.expires_at) {
      return res.status(400).send('Token expirado');
    }

    // Atualiza usuário para emailVerified e approved
    db.run('UPDATE user SET emailVerified = 1, approved = 1 WHERE id = ?', [row.user_id], (updateErr) => {
      if (updateErr) return res.status(500).send('Erro ao atualizar usuário');

      // Remove token
      db.run('DELETE FROM email_verification WHERE id = ?', [row.id]);

      return res.send('Email verificado com sucesso. Você já pode entrar como Professor.');
=======
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
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78
    });
  });
});

<<<<<<< HEAD

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  db.get('SELECT * FROM user WHERE email = ?', [email], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // valida domínio do email no login (se configurado)
    if (allowedDomains && allowedDomains.length > 0) {
      const domain = (email.split('@')[1] || '').toLowerCase();
      if (!domain || !allowedDomains.includes(domain)) {
        return res.status(403).json({ error: `Acesso permitido somente para domínios: ${allowedDomains.join(', ')}` });
      }
    }

    try {
      const passwordMatches = await bcrypt.compare(password, row.password);

      if (!passwordMatches) {
        return res.status(401).json({ error: 'Email ou senha inválidos' });
      }

      // Se for professor, exige email verificado e aprovação
      const roleLower = (row.role || '').toString().toLowerCase();
      if (roleLower.includes('prof') || roleLower.includes('teacher')) {
        if (!row.emailVerified) {
          return res.status(403).json({ error: 'Email não verificado. Verifique seu email.' });
        }
        if (!row.approved) {
          return res.status(403).json({ error: 'Aprovação pendente. Aguarde aprovação do administrador.' });
        }
      }

      res.json({
        message: 'Login bem-sucedido',
        user: { id: row.id, name: row.name, email: row.email, cpf: row.cpf, role: row.role, emailVerified: !!row.emailVerified, approved: !!row.approved }
      });
    } catch (compareError) {
      res.status(500).json({ error: 'Erro ao verificar a senha' });
    }
  });
});

=======
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
>>>>>>> e18d27e601234c2d5bf140e1551208a141c18e78
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});