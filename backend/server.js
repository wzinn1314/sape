require('dotenv').config();

const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
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
        cpf TEXT NOT NULL
      )`);

      db.all('PRAGMA table_info(user)', [], (err, columns) => {
        if (!err && columns) {
          const requiredColumns = [
            { name: 'password', addSql: 'ALTER TABLE user ADD COLUMN password TEXT DEFAULT ""' },
            { name: 'cpf', addSql: 'ALTER TABLE user ADD COLUMN cpf TEXT DEFAULT ""' }
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
        }
      });
    });
  }
});


app.get('/users', (req, res) => {
<<<<<<< HEAD
  db.all('SELECT id, name, email, cpf FROM user', ... [], (err, rows) => {
=======
  db.all('SELECT id, name, email, cpf, password FROM user', [], (err, rows) => {
>>>>>>> 146ac3d (banco de dados feito e funcionando, para colocar para rodar so da cd backend e depois npm run dev)
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/register', async (req, res) => {
  const { name, email, cpf, password } = req.body;

  if (!name || !email || !cpf || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  try {
    
    const hashedPassword = await bcrypt.hash(password, 10);

    
    db.run('INSERT INTO user (name, email, password, cpf) VALUES (?, ?, ?, ?)', [name, email, hashedPassword, cpf], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(409).json({ error: 'Email já cadastrado' });
        } else {
          res.status(500).json({ error: err.message });
        }
      } else {
        res.status(201).json({ message: 'Usuário cadastrado com sucesso', id: this.lastID });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar senha' });
  }
});


app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM user WHERE email = ?', [email], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const passwordMatch = await bcrypt.compare(password, row.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    res.json({ message: 'Login bem-sucedido', user: { id: row.id, name: row.name, email: row.email } });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});