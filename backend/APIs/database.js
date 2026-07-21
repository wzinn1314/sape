const sqlite3 = require('sqlite3').verbose();

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

          db.run(`CREATE TABLE IF NOT EXISTS email_verification (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL,
            expires_at INTEGER NOT NULL
          )`);

          db.run(`
            CREATE TABLE IF NOT EXISTS reports (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              titulo TEXT NOT NULL,
              conteudo TEXT NOT NULL,
              aluno_id INTEGER NOT NULL,
              professor_id INTEGER NOT NULL,
              arquivo_path TEXT NOT NULL,
              data_criacao INTEGER NOT NULL DEFAULT (strftime('%s','now')),
              FOREIGN KEY (aluno_id) REFERENCES students (id),
              FOREIGN KEY (professor_id) REFERENCES user (id)
            )
          `);

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

module.exports = db;