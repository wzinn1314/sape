require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const https = require('https');
const app = express();

app.use(cors());
app.use(express.json());


const db = new sqlite3.Database('./sapedb.sqlite', (err) => {
  if (err) {
    console.error('Erro ao conectar no DB:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite!');

    db.serialize(() => {
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

          db.run(`CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            nascimento TEXT,
            matricula TEXT NOT NULL UNIQUE,
            cpf TEXT,
            turma TEXT,
            curso TEXT,
            anoLetivo TEXT,
            diagnostico TEXT,
            pei INTEGER DEFAULT 0,
            suporte TEXT,
            hiperfocos TEXT,
            gatilhos TEXT,
            estrategias TEXT,
            responsavel TEXT,
            parentesco TEXT,
            telefone TEXT,
            email TEXT,
            gradeValue TEXT,
            registered_by INTEGER,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
          )`);
        }
      });
    });
  }
});

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

app.get('/students', (req, res) => {
  db.all(
    `SELECT s.*, u.name AS registered_by_name
     FROM students s
     LEFT JOIN user u ON u.id = s.registered_by
     ORDER BY s.created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(mapStudentRow));
    }
  );
});

app.get('/students/dashboard', (req, res) => {
  db.get('SELECT COUNT(*) AS total FROM students', [], (countErr, countRow) => {
    if (countErr) return res.status(500).json({ error: countErr.message });

    db.all(
      `SELECT s.*, u.name AS registered_by_name
       FROM students s
       LEFT JOIN user u ON u.id = s.registered_by
       ORDER BY s.created_at DESC
       LIMIT 5`,
      [],
      (listErr, rows) => {
        if (listErr) return res.status(500).json({ error: listErr.message });
        res.json({
          total: countRow.total,
          recent: rows.map(mapStudentRow)
        });
      }
    );
  });
});

app.post('/students', (req, res) => {
  const {
    nome, nascimento, matricula, cpf, turma, curso, anoLetivo,
    diagnostico, pei, suporte, hiperfocos, gatilhos, estrategias,
    responsavel, parentesco, telefone, email, gradeValue, registeredBy
  } = req.body;

  if (!nome || !matricula) {
    return res.status(400).json({ error: 'Nome e matrícula são obrigatórios' });
  }

  db.run(
    `INSERT INTO students (
      nome, nascimento, matricula, cpf, turma, curso, anoLetivo,
      diagnostico, pei, suporte, hiperfocos, gatilhos, estrategias,
      responsavel, parentesco, telefone, email, gradeValue, registered_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nome, nascimento || null, matricula, cpf || null, turma || null, curso || null,
      anoLetivo || null, diagnostico || null, pei ? 1 : 0, suporte || null,
      hiperfocos || null, gatilhos || null, estrategias || null,
      responsavel || null, parentesco || null, telefone || null, email || null,
      gradeValue || null, registeredBy || null
    ],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Matrícula já cadastrada' });
        }
        return res.status(500).json({ error: err.message });
      }

      db.get(
        `SELECT s.*, u.name AS registered_by_name
         FROM students s
         LEFT JOIN user u ON u.id = s.registered_by
         WHERE s.id = ?`,
        [this.lastID],
        (getErr, row) => {
          if (getErr) return res.status(201).json({ message: 'Aluno cadastrado', id: this.lastID });
          res.status(201).json(mapStudentRow(row));
        }
      );
    }
  );
});

app.delete('/students/:matricula', (req, res) => {
  db.run('DELETE FROM students WHERE matricula = ?', [req.params.matricula], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Aluno não encontrado' });
    res.json({ message: 'Aluno excluído com sucesso' });
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
    });
  });
});


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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});