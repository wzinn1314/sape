function professorTemAcesso(db, professorId, studentId, callback) {
  db.get(
    'SELECT 1 FROM professor_aluno WHERE professor_id = ? AND student_id = ?',
    [professorId, studentId],
    (err, row) => callback(err, !!row)
  );
}

module.exports = { professorTemAcesso };

