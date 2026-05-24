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
        cpf TEXT NOT NULL
      )`);

      db.all('PRAGMA table_info(user)', [], (err, columns) => {
        if (!err && columns) {
          const requiredColumns = [
            { name: 'password', addSql: 'ALTER TABLE user ADD COLUMN password TEXT DEFAULT ""' },
            { name: 'cpf', addSql: 'ALTER TABLE user ADD COLUMN cpf TEXT DEFAULT ""' },
            { name: 'role', addSql: 'ALTER TABLE user ADD COLUMN role TEXT DEFAULT "teacher"' }
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


function requestPortalCidadaoAuth(cpf, password) {
  return new Promise((resolve, reject) => {
    const portalUrl = process.env.PORTAL_CIDADAO_URL;
    if (!portalUrl) {
      return reject(new Error('PORTAL_CIDADAO_URL não configurado'));
    }

    const url = new URL(portalUrl);
    const payload = JSON.stringify({ cpf, password });

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const request = (url.protocol === 'https:' ? https : require('http')).request(options, (response) => {
      let body = '';
      response.on('data', (chunk) => body += chunk);
      response.on('end', () => {
        try {
          const json = JSON.parse(body || '{}');
          resolve({ statusCode: response.statusCode, body: json });
        } catch (error) {
          reject(new Error('Resposta inválida do Portal Cidadão'));
        }
      });
    });

    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

function parsePortalCidadaoResult(result) {
  const data = result.body || {};
  const valueToLower = (text) => typeof text === 'string' ? text.toLowerCase() : '';
  const role = valueToLower(data.role || data.userType || data.profession || '');
  const roles = Array.isArray(data.roles) ? data.roles : [];
  const isTeacher = role.includes('professor') || role.includes('docente') || roles.some((r) => valueToLower(r).includes('professor') || valueToLower(r).includes('docente'));

  return {
    success: result.statusCode === 200,
    isTeacher,
    name: data.name || data.fullName || data.nome || '',
    email: data.email || '',
    message: data.message || data.error || ''
  };
}

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


app.post('/login', async (req, res) => {
  const { cpf, password } = req.body;

  if (!cpf || !password) {
    return res.status(400).json({ error: 'CPF e senha são obrigatórios' });
  }

  try {
    const portalResult = await requestPortalCidadaoAuth(cpf, password);
    const parsed = parsePortalCidadaoResult(portalResult);

    if (!parsed.success) {
      return res.status(401).json({ error: parsed.message || 'Não foi possível autenticar no Portal Cidadão' });
    }

    if (!parsed.isTeacher) {
      return res.status(403).json({ error: 'Acesso permitido apenas para professores' });
    }

    db.get('SELECT * FROM user WHERE cpf = ?', [cpf], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const name = parsed.name || 'Professor';
      const email = parsed.email ? parsed.email : `teacher-${cpf}@sape.local`;
      const role = 'teacher';

      if (row) {
        db.run('UPDATE user SET name = ?, email = ?, role = ? WHERE cpf = ?', [name, email, role, cpf], (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ error: updateErr.message });
          }

          res.json({ message: 'Login bem-sucedido', user: { id: row.id, name, email, cpf, role } });
        });
      } else {
        db.run('INSERT INTO user (name, email, cpf, password, role) VALUES (?, ?, ?, ?, ?)', [name, email, cpf, '', role], function(insertErr) {
          if (insertErr) {
            return res.status(500).json({ error: insertErr.message });
          }

          res.json({ message: 'Login bem-sucedido', user: { id: this.lastID, name, email, cpf, role } });
        });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Erro interno ao se comunicar com o Portal Cidadão' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});