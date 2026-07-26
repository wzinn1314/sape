require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Domínios permitidos para registro
const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS 
  ? process.env.ALLOWED_EMAIL_DOMAINS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) 
  : null;

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'sape-super-secret-jwt-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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
        adaptacoes TEXT,
        responsavel_nome TEXT,
        parentesco TEXT,
        telefone TEXT,
        email TEXT,
        grade_value TEXT,
        registered_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Adicionar coluna adaptacoes se não existir (migração)
      db.run(`ALTER TABLE students ADD COLUMN adaptacoes TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.log('Migração de adaptacoes:', err.message);
        }
      });

      // 4. Tabela de Relatórios do AEE
      db.run(`CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        user_id INTEGER,
        pdf_content TEXT NOT NULL,
        file_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students (id),
        FOREIGN KEY (user_id) REFERENCES user (id)
      )`);

      // MIGRAÇÃO: Adicionar coluna user_id se não existir
      db.all("PRAGMA table_info(reports)", (err, columns) => {
        if (err) {
          console.error("Erro ao verificar estrutura da tabela reports:", err);
          return;
        }
        
        const hasUserId = columns.some((col) => col.name === "user_id");
        if (!hasUserId) {
          db.run("ALTER TABLE reports ADD COLUMN user_id INTEGER", (alterErr) => {
            if (alterErr) console.error("Erro ao adicionar coluna user_id:", alterErr.message);
          });
        }
      });

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
// JWT HELPER FUNCTIONS
// ==========================================

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      matricula: user.cpf
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'sape-system',
      audience: 'sape-users'
    }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'sape-system',
      audience: 'sape-users'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    } else {
      throw new Error('Erro na verificação do token');
    }
  }
};

const authenticateMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      status: 'error',
      message: 'Token não fornecido. Faça login para continuar.',
      timestamp: new Date().toISOString()
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      status: 'error',
      message: error.message || 'Token inválido',
      timestamp: new Date().toISOString()
    });
  }
};

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
// Usa JWT token para identificar o usuário
// - Admin: acesso liberado
// - Professor: só passa se existir vínculo com o aluno da rota
// - Qualquer outro caso: bloqueado
function verificarAcessoAluno(req, res, next) {
  const studentId = req.params.id;
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      status: 'error',
      message: 'Token não fornecido',
      timestamp: new Date().toISOString()
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);
    const requesterRole = (decoded.role || '').toLowerCase();
    const requesterId = decoded.id;

    // Admin tem acesso total
    if (requesterRole.includes('admin')) {
      req.user = decoded;
      return next();
    }

    // Professor precisa ter vínculo
    if (requesterRole.includes('prof')) {
      professorTemAcesso(requesterId, studentId, (err, temAcesso) => {
        if (err) return res.status(500).json({ 
          success: false,
          status: 'error',
          message: 'Erro ao verificar vínculo: ' + err.message,
          timestamp: new Date().toISOString()
        });
        if (!temAcesso) return res.status(403).json({ 
          success: false,
          status: 'error',
          message: 'Você não tem vínculo com este aluno.',
          timestamp: new Date().toISOString()
        });
        req.user = decoded;
        next();
      });
    } else {
      return res.status(403).json({ 
        success: false,
        status: 'error',
        message: 'Acesso não permitido.',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      status: 'error',
      message: 'Token inválido',
      timestamp: new Date().toISOString()
    });
  }
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
// ROTA DE LOGIN COM JWT
// ==========================================
app.post('/login', async (req, res) => {
  const { email, matricula, password } = req.body;
  const loginIdentifier = (email || matricula || '').trim();

  if (!loginIdentifier || !password) {
    return res.status(400).json({ 
      success: false,
      status: 'error',
      message: 'Informe a identificação (e-mail/matrícula) e a senha.',
      timestamp: new Date().toISOString()
    });
  }

  const query = 'SELECT * FROM user WHERE LOWER(email) = LOWER(?) OR LOWER(cpf) = LOWER(?)';

  db.get(query, [loginIdentifier, loginIdentifier], async (err, row) => {
    if (err) return res.status(500).json({ 
      success: false,
      status: 'error',
      message: 'Erro de banco de dados: ' + err.message,
      timestamp: new Date().toISOString()
    });
    if (!row) return res.status(401).json({ 
      success: false,
      status: 'error',
      message: 'Credenciais inválidas.',
      timestamp: new Date().toISOString()
    });

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
      return res.status(401).json({ 
        success: false,
        status: 'error',
        message: 'Credenciais inválidas.',
        timestamp: new Date().toISOString()
      });
    }

    const roleLower = (row.role || '').toLowerCase();

    if (roleLower.includes('prof') || roleLower.includes('teacher')) {
      if (!row.emailVerified) {
        return res.status(403).json({ 
          success: false,
          status: 'error',
          message: 'E-mail não verificado. Por favor, valide seu e-mail.',
          timestamp: new Date().toISOString()
        });
      }
      if (!row.approved) {
        return res.status(403).json({ 
          success: false,
          status: 'error',
          message: 'Sua conta ainda está pendente de aprovação por um administrador.',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Gerar JWT token
    const token = generateToken(row);

    res.json({
      success: true,
      status: 'success',
      message: 'Login bem-sucedido',
      timestamp: new Date().toISOString(),
      data: {
        user: { 
          id: row.id, 
          name: row.name, 
          email: row.email, 
          matricula: row.cpf, 
          role: row.role || 'Admin', 
          emailVerified: !!row.emailVerified, 
          approved: !!row.approved 
        },
        token
      }
    });
  });
});

// Rota para verificar token e obter dados do usuário atual
app.get('/me', authenticateMiddleware, (req, res) => {
  db.get('SELECT id, name, email, cpf AS matricula, role, emailVerified, approved FROM user WHERE id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ 
      success: false,
      status: 'error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
    if (!row) return res.status(404).json({ 
      success: false,
      status: 'error',
      message: 'Usuário não encontrado',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      status: 'success',
      message: 'Dados do usuário recuperados com sucesso',
      timestamp: new Date().toISOString(),
      data: row
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
    diagnostico, pei, suporte, hiperfocos, gatilhos, estrategias, adaptacoes,
    responsavel, parentesco, telefone, email, gradeValue, registeredBy
  } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ 
      success: false,
      status: 'error',
      message: 'O nome do aluno é obrigatório.',
      timestamp: new Date().toISOString()
    });
  }

  const query = `
    INSERT INTO students (
      name, birth_date, registration_number, cpf, turma, curso, ano_letivo,
      diagnostico, pei, suporte, hiperfocos, gatilhos, estrategias, adaptacoes,
      responsavel_nome, parentesco, telefone, email, grade_value, registered_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    nome.trim(), nascimento || null, matricula ? matricula.trim() : null,
    cpf ? cpf.trim() : null, turma || null, curso || null, anoLetivo || null,
    diagnostico || null, pei ? 1 : 0, suporte || null, hiperfocos || null,
    gatilhos || null, estrategias || null, adaptacoes || null, responsavel || null, 
    parentesco || null, telefone || null, email || null, gradeValue || null, registeredBy || null
  ];

  db.run(query, params, function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ 
          success: false,
          status: 'error',
          message: 'Já existe um aluno cadastrado com esta Matrícula.',
          timestamp: new Date().toISOString()
        });
      }
      return res.status(500).json({ 
        success: false,
        status: 'error',
        message: 'Erro ao salvar no banco de dados: ' + err.message,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({ 
      success: true,
      status: 'success',
      message: 'Aluno cadastrado com sucesso!',
      timestamp: new Date().toISOString(),
      studentId: this.lastID 
    });
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

// DELETAR ALUNO — protegida pelo vínculo
app.delete('/students/:id', verificarAcessoAluno, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM students WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao deletar aluno: ' + err.message });
    
    res.json({
      success: true,
      status: 'success',
      message: 'Aluno deletado com sucesso!',
      timestamp: new Date().toISOString()
    });
  });
});

// ==========================================
// ROTAS PARA PROFESSORES (ALUNOS VINCULADOS)
// ==========================================

// Buscar alunos vinculados a um professor específico
app.get('/users/:userId/students', (req, res) => {
  const { userId } = req.params;

  const query = `
    SELECT s.*
    FROM students s
    INNER JOIN professor_aluno pa ON s.id = pa.student_id
    WHERE pa.professor_id = ?
    ORDER BY s.created_at DESC
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        status: 'error',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }

    res.json(rows);
  });
});

// Buscar relatórios de um professor específico
app.get('/users/:userId/reports', (req, res) => {
  const { userId } = req.params;

  const query = `
    SELECT 
      r.id, 
      r.student_id,
      s.name AS student_name, 
      s.name as aluno,
      r.pdf_content, 
      r.file_name, 
      r.created_at
    FROM reports r
    LEFT JOIN students s ON r.student_id = s.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        status: 'error',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }

    // Formatar resposta com status
    const formattedRows = rows.map(row => ({
      ...row,
      status: 'Finalizado',
      titulo: row.file_name || 'Relatório AEE'
    }));

    res.json(formattedRows);
  });
});

// ==========================================
// ROTA DO DASHBOARD
// ==========================================
app.get('/students/dashboard', (req, res) => {
  // Contar total de alunos
  db.get('SELECT COUNT(*) as total FROM students', (err, countResult) => {
    if (err) {
      return res.status(500).json({
        success: false,
        status: 'error',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }

    const totalStudents = countResult.total;

    // Buscar alunos recentes (últimos 5)
    db.all('SELECT * FROM students ORDER BY created_at DESC LIMIT 5', (err, recentStudents) => {
      if (err) {
        return res.status(500).json({
          success: false,
          status: 'error',
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }

      // Contar total de relatórios
      db.get('SELECT COUNT(*) as total FROM reports', (err, reportsResult) => {
        if (err) {
          return res.status(500).json({
            success: false,
            status: 'error',
            error: err.message,
            timestamp: new Date().toISOString()
          });
        }

        const totalReports = reportsResult.total;

        res.json({
          success: true,
          status: 'success',
          data: {
            total: totalStudents,
            recent: recentStudents,
            reports: totalReports
          },
          timestamp: new Date().toISOString()
        });
      });
    });
  });
});

// ==========================================
// ROTAS DE RELATÓRIOS
// ==========================================
app.post('/reports', (req, res) => {
  const { studentId, userId, pdfContent, fileName } = req.body;

  if (!studentId || !pdfContent) {
    return res.status(400).json({ 
      success: false,
      status: 'error',
      error: 'Selecione um aluno válido e envie o relatório.',
      timestamp: new Date().toISOString()
    });
  }

  const query = 'INSERT INTO reports (student_id, user_id, pdf_content, file_name) VALUES (?, ?, ?, ?)';
  db.run(query, [studentId, userId || null, pdfContent, fileName || 'relatorio.pdf'], function (err) {
    if (err) return res.status(500).json({ 
      success: false,
      status: 'error',
      error: err.message,
      timestamp: new Date().toISOString()
    });
    
    res.status(201).json({ 
      success: true,
      status: 'success',
      message: 'Relatório salvo com sucesso!', 
      reportId: this.lastID,
      timestamp: new Date().toISOString()
    });
  });
});

app.get('/reports', (req, res) => {
  const query = `
    SELECT 
      r.id, 
      r.student_id,
      r.user_id,
      s.name AS student_name, 
      s.name as aluno,
      u.name as professor,
      s.diagnostico,
      r.pdf_content, 
      r.file_name, 
      r.created_at
    FROM reports r
    LEFT JOIN students s ON r.student_id = s.id
    LEFT JOIN user u ON r.user_id = u.id
    ORDER BY r.created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ 
      success: false,
      status: 'error',
      error: err.message,
      timestamp: new Date().toISOString()
    });
    
    // Formatar resposta com status
    const formattedRows = rows.map(row => ({
      ...row,
      status: 'Finalizado',
      titulo: row.file_name || 'Relatório AEE'
    }));
    
    res.json(formattedRows);
  });
});

app.delete('/reports/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM reports WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao deletar relatório: ' + err.message });
    
    res.json({
      success: true,
      status: 'success',
      message: 'Relatório deletado com sucesso!',
      timestamp: new Date().toISOString()
    });
  });
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
