const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

function resolveDbPath() {
  const configured = process.env.DB_PATH;
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }
  return path.resolve(__dirname, '..', 'sapedb.sqlite');
}

const dbPath = resolveDbPath();

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar no DB:', err.message);
    return;
  }

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

    db.all('PRAGMA table_info(user)', [], (tableErr, columns) => {
      if (tableErr || !columns) return;

      const requiredColumns = [
        { name: 'password', addSql: 'ALTER TABLE user ADD COLUMN password TEXT DEFAULT ""' },
        { name: 'cpf', addSql: 'ALTER TABLE user ADD COLUMN cpf TEXT DEFAULT ""' },
        { name: 'role', addSql: "ALTER TABLE user ADD COLUMN role TEXT DEFAULT 'Aluno'" },
        { name: 'emailVerified', addSql: 'ALTER TABLE user ADD COLUMN emailVerified INTEGER DEFAULT 0' },
        { name: 'approved', addSql: 'ALTER TABLE user ADD COLUMN approved INTEGER DEFAULT 0' }
      ];

      requiredColumns.forEach((column) => {
        if (!columns.some((col) => col.name === column.name)) {
          db.run(column.addSql);
        }
      });
    });

    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_user_cpf_unique ON user(cpf)', (indexErr) => {
      if (indexErr) {
        console.warn('Aviso: não foi possível criar índice único para cpf:', indexErr.message);
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS email_verification (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )`);

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

    db.run('ALTER TABLE students ADD COLUMN adaptacoes TEXT', (alterErr) => {
      if (alterErr && !alterErr.message.includes('duplicate column name')) {
        console.warn('Aviso de migração (adaptacoes):', alterErr.message);
      }
    });

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

    db.all('PRAGMA table_info(reports)', (reportsErr, columns) => {
      if (reportsErr || !columns) return;

      const hasUserId = columns.some((col) => col.name === 'user_id');
      if (!hasUserId) {
        db.run('ALTER TABLE reports ADD COLUMN user_id INTEGER');
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS evolucoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      relato TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS professor_aluno (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      professor_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(professor_id, student_id),
      FOREIGN KEY (professor_id) REFERENCES user (id),
      FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE
    )`);

    const isProduction = process.env.NODE_ENV === 'production';
    const adminEmail = process.env.ADMIN_EMAIL || (isProduction ? null : 'admin@escola.edu.br');
    const adminMatricula = process.env.ADMIN_MATRICULA || (isProduction ? null : 'ADM2026');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminPassword && adminEmail && adminMatricula) {
      db.get(
        'SELECT * FROM user WHERE LOWER(email) = LOWER(?) OR LOWER(cpf) = LOWER(?)',
        [adminEmail, adminMatricula],
        async (getErr, row) => {
          if (getErr) {
            console.error('Erro ao verificar usuário Admin:', getErr.message);
            return;
          }

          if (!row) {
            try {
              const hashedPassword = await bcrypt.hash(adminPassword, 10);
              db.run(
                `INSERT INTO user (name, email, password, cpf, role, emailVerified, approved) 
                 VALUES (?, ?, ?, ?, ?, 1, 1)`,
                ['Administrador SAPE', adminEmail.toLowerCase(), hashedPassword, adminMatricula, 'Admin'],
                (insertErr) => {
                  if (insertErr) {
                    console.error('Erro ao criar usuário Admin padrão:', insertErr.message);
                  }
                }
              );
            } catch (hashError) {
              console.error('Erro ao gerar hash para o Admin padrão:', hashError);
            }
          }
        }
      );
    } else {
      console.warn('Aviso: ADMIN_PASSWORD/ADMIN_EMAIL/ADMIN_MATRICULA não configuradas; admin automático não semeado.');
    }
  });
});

module.exports = { db, dbPath };

