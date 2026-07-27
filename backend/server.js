const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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

// JWT Configuration - Sem fallbacks hardcoded no código
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Validação em produção
if (process.env.NODE_ENV === 'production') {
  if (!JWT_SECRET || !process.env.ADMIN_PASSWORD) {
    console.error('❌ ERRO CRÍTICO DE SEGURANÇA: JWT_SECRET e ADMIN_PASSWORD devem estar definidas no arquivo .env em produção!');
    process.exit(1);
  }
}

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

      // 6. Tabela de Vínculo Professor <-> Aluno
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
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (adminPassword) {
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
      } else {
        console.warn('⚠️ ATENÇÃO: ADMIN_PASSWORD não definida no .env. Admin automático não semeado.');
      }
    });
  }
});

// ==========================================
// JWT HELPER FUNCTIONS & MIDDLEWARES
// ==========================================

const generateToken = (user) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não está configurada no servidor.');
  }
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
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não está configurada no servidor.');
  }
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

// Middleware para verificar se o usuário autenticado é Admin
const requireAdmin = (req, res, next) => {
  const role = (req.user && req.user.role ? req.user.role : '').toLowerCase();
  const matricula = (req.user && req.user.matricula ? req.user.matricula : '').toUpperCase();

  if (role.includes('admin') || matricula === 'ADM2026') {
    return next();
  }

  return res.status(403).json({
    success: false,
    status: 'error',
    message: 'Acesso negado. Apenas administradores têm permissão para esta ação.',
    timestamp: new Date().toISOString()
  });
};

// ==========================================
// HELPERS DE VÍNCULO / CONTROLE DE ACESSO
// ==========================================

function professorTemAcesso(professorId, studentId, callback) {
  db.get(
    'SELECT 1 FROM professor_aluno WHERE professor_id = ? AND student_id = ?',
    [professorId, studentId],
    (err, row) => callback(err, !!row)
  );
}

// Middleware: protege rotas que expõem/alteram dados de UM aluno específico (/students/:id/...)
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
    const requesterMatricula = (decoded.matricula || '').toUpperCase();
    const requesterId = decoded.id;

    // Admin tem acesso total
    if (requesterRole.includes('admin') || requesterMatricula === 'ADM2026') {
      req.user = decoded;
      return next();
    }

    // Professor precisa ter vínculo
    if (requesterRole.includes('prof') || requesterRole.includes('teacher') || requesterRole.includes('aee')) {
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

// GET /users - Protegido por JWT e restrito a Admin
app.get('/users', authenticateMiddleware, requireAdmin, (req, res) => {
  db.all('SELECT id, name, email, cpf AS matricula, role, emailVerified, approved FROM user', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /users/pending - Protegido por JWT e restrito a Admin
app.get('/users/pending', authenticateMiddleware, requireAdmin, (req, res) => {
  db.all('SELECT id, name, email, cpf AS matricula, role FROM user WHERE approved = 0', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /professores - Lista somente professores (usado no select do painel de vínculos). Protegido por JWT.
app.get('/professores', authenticateMiddleware, (req, res) => {
  db.all(
    "SELECT id, name, email, cpf AS matricula FROM user WHERE LOWER(role) LIKE '%prof%' OR LOWER(role) LIKE '%teacher%' OR LOWER(role) LIKE '%aee%' ORDER BY name ASC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// PUT /users/:id/approve - Aprovar usuário. Protegido por JWT e restrito a Admin.
app.put('/users/:id/approve', authenticateMiddleware, requireAdmin, (req, res) => {
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

// DELETE /users/:id - Excluir usuário. Protegido por JWT e restrito a Admin.
app.delete('/users/:id', authenticateMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    // 1. Remover vínculos do professor
    db.run('DELETE FROM professor_aluno WHERE professor_id = ?', [id], (err) => {
      if (err) console.error('Erro ao desvincular usuário:', err.message);
    });

    // 2. Excluir o usuário
    db.run('DELETE FROM user WHERE id = ?', [id], function (err) {
      if (err) {
        return res.status(500).json({ 
          success: false,
          status: 'error',
          error: 'Erro ao excluir usuário: ' + err.message,
          timestamp: new Date().toISOString()
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          status: 'error',
          error: 'Usuário não encontrado.',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        status: 'success',
        message: 'Usuário excluído com sucesso!',
        timestamp: new Date().toISOString()
      });
    });
  });
});

// POST /register - Cadastro de novos usuários. Protegido por JWT + check req.user.role (Admin).
// NÃO confia em requesterRole no body!
app.post('/register', authenticateMiddleware, requireAdmin, async (req, res) => {
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
    const roleNormalized = (role || 'Professor').trim();

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

// Rota auxiliar de criação de usuário admin (alias para /register)
app.post('/admin/create-user', authenticateMiddleware, requireAdmin, async (req, res) => {
  const { name, email, matricula, password, role } = req.body;
  const cpf = matricula || req.body.cpf;

  if (!name || !email || !cpf || !password) {
    return res.status(400).json({ error: 'Campos nome, email, matrícula/cpf e senha são obrigatórios' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const roleNormalized = (role || 'Professor').trim();

    db.run(
      'INSERT INTO user (name, email, password, cpf, role, emailVerified, approved) VALUES (?, ?, ?, ?, ?, 1, 1)',
      [name.trim(), email.toLowerCase().trim(), hashedPassword, cpf.trim(), roleNormalized],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Email ou Matrícula já cadastrados' });
          }
          return res.status(500).json({ error: err.message });
        }

        return res.status(201).json({ message: 'Professor cadastrado com sucesso!', id: this.lastID });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cadastrar professor' });
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
// ROTAS DE VÍNCULO PROFESSOR <-> ALUNO
// ==========================================

// POST /vinculos - Protegido por JWT e restrito a Admin
app.post('/vinculos', authenticateMiddleware, requireAdmin, (req, res) => {
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

// GET /vinculos - Protegido por JWT
app.get('/vinculos', authenticateMiddleware, (req, res) => {
  const userRole = (req.user.role || '').toLowerCase();
  const userMatricula = (req.user.matricula || '').toUpperCase();
  const isAdmin = userRole.includes('admin') || userMatricula === 'ADM2026';

  let query = `
    SELECT 
      u.id AS professor_id, 
      u.name AS professor_nome, 
      u.cpf AS matricula, 
      GROUP_CONCAT(s.name, ', ') AS alunos_nomes,
      GROUP_CONCAT(s.id) AS alunos_ids
    FROM professor_aluno pa
    INNER JOIN user u ON u.id = pa.professor_id
    INNER JOIN students s ON s.id = pa.student_id
  `;

  const params = [];
  if (!isAdmin) {
    query += ' WHERE pa.professor_id = ?';
    params.push(req.user.id);
  }

  query += ' GROUP BY u.id ORDER BY u.name ASC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// DELETE /vinculos/:professorId/:studentId - Protegido por JWT e restrito a Admin
app.delete('/vinculos/:professorId/:studentId', authenticateMiddleware, requireAdmin, (req, res) => {
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

// POST /students - Cadastrar aluno. Protegido por JWT.
app.post('/students', authenticateMiddleware, (req, res) => {
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

  const userRole = (req.user.role || '').toLowerCase();
  const userMatricula = (req.user.matricula || '').toUpperCase();
  const isAdmin = userRole.includes('admin') || userMatricula === 'ADM2026';

  const query = `
    INSERT INTO students (
      name, birth_date, registration_number, cpf, turma, curso, ano_letivo,
      diagnostico, pei, suporte, hiperfocos, gatilhos, estrategias, adaptacoes,
      responsavel_nome, parentesco, telefone, email, grade_value, registered_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const creatorId = req.user.id || registeredBy || null;

  const params = [
    nome.trim(), nascimento || null, matricula ? matricula.trim() : null,
    cpf ? cpf.trim() : null, turma || null, curso || null, anoLetivo || null,
    diagnostico || null, pei ? 1 : 0, suporte || null, hiperfocos || null,
    gatilhos || null, estrategias || null, adaptacoes || null, responsavel || null, 
    parentesco || null, telefone || null, email || null, gradeValue || null, creatorId
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

    const newStudentId = this.lastID;

    // Se criado por um professor, cria vínculo automático em professor_aluno
    if (!isAdmin && creatorId) {
      db.run(
        'INSERT OR IGNORE INTO professor_aluno (professor_id, student_id) VALUES (?, ?)',
        [creatorId, newStudentId],
        (linkErr) => {
          if (linkErr) console.error('Erro ao criar vínculo automático:', linkErr.message);
        }
      );
    }

    res.status(201).json({ 
      success: true,
      status: 'success',
      message: 'Aluno cadastrado com sucesso!',
      timestamp: new Date().toISOString(),
      studentId: newStudentId
    });
  });
});

// GET /students - Lista alunos. Protegido por JWT.
// Admin vê todos; Professor vê somente os seus alunos vinculados.
app.get('/students', authenticateMiddleware, (req, res) => {
  const userRole = (req.user.role || '').toLowerCase();
  const userMatricula = (req.user.matricula || '').toUpperCase();
  const isAdmin = userRole.includes('admin') || userMatricula === 'ADM2026';

  let query = 'SELECT s.* FROM students s';
  const params = [];

  if (!isAdmin) {
    // Professor vê apenas vinculados
    query += ' INNER JOIN professor_aluno pa ON pa.student_id = s.id AND pa.professor_id = ?';
    params.push(req.user.id);
  } else if (req.query.professorId) {
    // Admin pode filtrar por um professor específico
    query += ' INNER JOIN professor_aluno pa ON pa.student_id = s.id AND pa.professor_id = ?';
    params.push(req.query.professorId);
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

// GET /students/dashboard - Dados do dashboard. Protegido por JWT.
app.get('/students/dashboard', authenticateMiddleware, (req, res) => {
  const userRole = (req.user.role || '').toLowerCase();
  const userMatricula = (req.user.matricula || '').toUpperCase();
  const isAdmin = userRole.includes('admin') || userMatricula === 'ADM2026';

  let countQuery = 'SELECT COUNT(*) as total FROM students';
  let recentQuery = 'SELECT * FROM students ORDER BY created_at DESC LIMIT 5';
  let reportsQuery = 'SELECT COUNT(*) as total FROM reports';
  const params = [];

  if (!isAdmin) {
    countQuery = `
      SELECT COUNT(DISTINCT s.id) as total 
      FROM students s
      INNER JOIN professor_aluno pa ON s.id = pa.student_id 
      WHERE pa.professor_id = ?
    `;
    recentQuery = `
      SELECT s.* 
      FROM students s
      INNER JOIN professor_aluno pa ON s.id = pa.student_id 
      WHERE pa.professor_id = ?
      ORDER BY s.created_at DESC LIMIT 5
    `;
    reportsQuery = `
      SELECT COUNT(DISTINCT r.id) as total 
      FROM reports r
      INNER JOIN professor_aluno pa ON r.student_id = pa.student_id 
      WHERE pa.professor_id = ? OR r.user_id = ?
    `;
    params.push(req.user.id);
  }

  db.get(countQuery, params, (err, countResult) => {
    if (err) {
      return res.status(500).json({
        success: false,
        status: 'error',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }

    const totalStudents = countResult ? countResult.total : 0;

    db.all(recentQuery, params, (err, recentStudents) => {
      if (err) {
        return res.status(500).json({
          success: false,
          status: 'error',
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }

      const reportParams = !isAdmin ? [req.user.id, req.user.id] : [];
      db.get(reportsQuery, reportParams, (err, reportsResult) => {
        if (err) {
          return res.status(500).json({
            success: false,
            status: 'error',
            error: err.message,
            timestamp: new Date().toISOString()
          });
        }

        const totalReports = reportsResult ? reportsResult.total : 0;

        res.json({
          success: true,
          status: 'success',
          data: {
            total: totalStudents,
            recent: recentStudents || [],
            reports: totalReports
          },
          timestamp: new Date().toISOString()
        });
      });
    });
  });
});

// Busca UM aluno específico — protegida pelo vínculo
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

// ATUALIZAR PDI / ESTRATÉGIAS DO ALUNO — protegida pelo vínculo
app.put('/students/:id/pdi', verificarAcessoAluno, (req, res) => {
  const { id } = req.params;
  const { objetivos, estrategias } = req.body;

  const query = `UPDATE students SET hiperfocos = ?, estrategias = ? WHERE id = ?`;
  
  db.run(query, [objetivos, estrategias, id], function (err) {
    if (err) return res.status(500).json({ error: 'Erro ao atualizar PDI: ' + err.message });
    res.json({ message: 'PDI atualizado com sucesso!' });
  });
});

// REGISTRAR EVOLUÇÃO / ATENDIMENTO NO DIÁRIO — protegida pelo vínculo
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

// BUSCAR HISTÓRICO DE EVOLUÇÕES DO ALUNO — protegida pelo vínculo
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

// GET /users/:userId/students - Buscar alunos vinculados a um professor específico. Protegido por JWT.
app.get('/users/:userId/students', authenticateMiddleware, (req, res) => {
  const { userId } = req.params;

  const userRole = (req.user.role || '').toLowerCase();
  const userMatricula = (req.user.matricula || '').toUpperCase();
  const isAdmin = userRole.includes('admin') || userMatricula === 'ADM2026';

  // Se for professor, só pode consultar seus próprios alunos
  if (!isAdmin && Number(req.user.id) !== Number(userId)) {
    return res.status(403).json({
      success: false,
      status: 'error',
      message: 'Acesso negado. Você só pode visualizar seus próprios alunos.',
      timestamp: new Date().toISOString()
    });
  }

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

// GET /users/:userId/reports - Buscar relatórios de um professor específico. Protegido por JWT.
app.get('/users/:userId/reports', authenticateMiddleware, (req, res) => {
  const { userId } = req.params;

  const userRole = (req.user.role || '').toLowerCase();
  const userMatricula = (req.user.matricula || '').toUpperCase();
  const isAdmin = userRole.includes('admin') || userMatricula === 'ADM2026';

  if (!isAdmin && Number(req.user.id) !== Number(userId)) {
    return res.status(403).json({
      success: false,
      status: 'error',
      message: 'Acesso negado. Você só pode visualizar seus próprios relatórios.',
      timestamp: new Date().toISOString()
    });
  }

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

    const formattedRows = rows.map(row => ({
      ...row,
      status: 'Finalizado',
      titulo: row.file_name || 'Relatório AEE'
    }));

    res.json(formattedRows);
  });
});

// ==========================================
// ROTAS DE RELATÓRIOS
// ==========================================

// POST /reports - Criar relatório. Protegido por JWT.
app.post('/reports', authenticateMiddleware, (req, res) => {
  const { studentId, pdfContent, fileName } = req.body;
  const userId = req.user.id;

  if (!studentId || !pdfContent) {
    return res.status(400).json({ 
      success: false,
      status: 'error',
      error: 'Selecione um aluno válido e envie o relatório.',
      timestamp: new Date().toISOString()
    });
  }

  const userRole = (req.user.role || '').toLowerCase();
  const userMatricula = (req.user.matricula || '').toUpperCase();
  const isAdmin = userRole.includes('admin') || userMatricula === 'ADM2026';

  const saveReport = () => {
    const query = 'INSERT INTO reports (student_id, user_id, pdf_content, file_name) VALUES (?, ?, ?, ?)';
    db.run(query, [studentId, userId, pdfContent, fileName || 'relatorio.pdf'], function (err) {
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
  };

  if (!isAdmin) {
    professorTemAcesso(userId, studentId, (err, temAcesso) => {
      if (err) return res.status(500).json({ success: false, error: 'Erro ao verificar acesso: ' + err.message });
      if (!temAcesso) return res.status(403).json({ success: false, error: 'Você não tem permissão para criar relatório para este aluno.' });
      saveReport();
    });
  } else {
    saveReport();
  }
});

// GET /reports - Listar relatórios. Protegido por JWT.
app.get('/reports', authenticateMiddleware, (req, res) => {
  const userRole = (req.user.role || '').toLowerCase();
  const userMatricula = (req.user.matricula || '').toUpperCase();
  const isAdmin = userRole.includes('admin') || userMatricula === 'ADM2026';

  let query = `
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
  `;
  
  const params = [];
  if (!isAdmin) {
    query += ` WHERE r.user_id = ? OR r.student_id IN (SELECT student_id FROM professor_aluno WHERE professor_id = ?)`;
    params.push(req.user.id, req.user.id);
  }

  query += ` ORDER BY r.created_at DESC`;
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ 
      success: false,
      status: 'error',
      error: err.message,
      timestamp: new Date().toISOString()
    });
    
    const formattedRows = rows.map(row => ({
      ...row,
      status: 'Finalizado',
      titulo: row.file_name || 'Relatório AEE'
    }));
    
    res.json(formattedRows);
  });
});

// DELETE /reports/:id - Deletar relatório. Protegido por JWT.
app.delete('/reports/:id', authenticateMiddleware, (req, res) => {
  const { id } = req.params;
  const userRole = (req.user.role || '').toLowerCase();
  const userMatricula = (req.user.matricula || '').toUpperCase();
  const isAdmin = userRole.includes('admin') || userMatricula === 'ADM2026';

  if (isAdmin) {
    db.run('DELETE FROM reports WHERE id = ?', [id], function (err) {
      if (err) return res.status(500).json({ error: 'Erro ao deletar relatório: ' + err.message });
      res.json({
        success: true,
        status: 'success',
        message: 'Relatório deletado com sucesso!',
        timestamp: new Date().toISOString()
      });
    });
  } else {
    // Professor só pode deletar se criou o relatório ou está vinculado ao aluno do relatório
    db.get(
      `SELECT r.* FROM reports r
       LEFT JOIN professor_aluno pa ON r.student_id = pa.student_id AND pa.professor_id = ?
       WHERE r.id = ? AND (r.user_id = ? OR pa.id IS NOT NOT NULL)`,
      [req.user.id, id, req.user.id],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(403).json({ error: 'Sem permissão para deletar este relatório.' });

        db.run('DELETE FROM reports WHERE id = ?', [id], function (delErr) {
          if (delErr) return res.status(500).json({ error: 'Erro ao deletar relatório: ' + delErr.message });
          res.json({
            success: true,
            status: 'success',
            message: 'Relatório deletado com sucesso!',
            timestamp: new Date().toISOString()
          });
        });
      }
    );
  }
});

// ==========================================
// INICIALIZAÇÃO DO SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
