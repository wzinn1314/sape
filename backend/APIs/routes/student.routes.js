const express = require('express');
const router = express.Router();
const db = require('../database');

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
    createdAt: row.created_at
      ? new Date(row.created_at * 1000).toISOString()
      : null
  };
}

router.get('/', (req, res) => {
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

router.get('/dashboard', (req, res) => {
  db.get(
    'SELECT COUNT(*) AS total FROM students',
    [],
    (countErr, countRow) => {

      if (countErr)
        return res.status(500).json({ error: countErr.message });

      db.all(
        `SELECT s.*, u.name AS registered_by_name
         FROM students s
         LEFT JOIN user u ON u.id = s.registered_by
         ORDER BY s.created_at DESC
         LIMIT 5`,
        [],
        (listErr, rows) => {

          if (listErr)
            return res.status(500).json({ error: listErr.message });

          res.json({
            total: countRow.total,
            recent: rows.map(mapStudentRow)
          });

        }
      );
    }
  );
});

router.post('/', (req, res) => {

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

  if (!nome || !matricula) {
    return res
      .status(400)
      .json({ error: 'Nome e matrícula são obrigatórios' });
  }

  db.run(
    `INSERT INTO students (
      nome,nascimento,matricula,cpf,turma,curso,
      anoLetivo,diagnostico,pei,suporte,
      hiperfocos,gatilhos,estrategias,
      responsavel,parentesco,telefone,email,
      gradeValue,registered_by
    )
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      nome,
      nascimento || null,
      matricula,
      cpf || null,
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
    ],
    function (err) {

      if (err) {

        if (err.message.includes('UNIQUE')) {
          return res
            .status(409)
            .json({ error: 'Matrícula já cadastrada' });
        }

        return res.status(500).json({ error: err.message });

      }

      db.get(
        `SELECT s.*,u.name AS registered_by_name
         FROM students s
         LEFT JOIN user u
         ON u.id=s.registered_by
         WHERE s.id=?`,
        [this.lastID],
        (error,row)=>{

          if(error)
            return res.status(201).json({
              message:'Aluno cadastrado'
            });

          res.status(201).json(mapStudentRow(row));

        }
      );

    }
  );

});

router.delete('/:matricula',(req,res)=>{

  db.run(
    'DELETE FROM students WHERE matricula=?',
    [req.params.matricula],
    function(err){

      if(err)
        return res.status(500).json({error:err.message});

      if(this.changes===0)
        return res.status(404).json({
          error:'Aluno não encontrado'
        });

      res.json({
        message:'Aluno excluído com sucesso'
      });

    }
  );

});

module.exports = router;