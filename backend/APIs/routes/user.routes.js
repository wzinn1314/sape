app.get('/users', (req, res) => {
    db.all('SELECT id, name, email, cpf, role FROM user', ... [], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    });
  });
  
  
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