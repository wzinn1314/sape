const { verifyToken } = require('../config/jwt');

function createStudentAccessMiddleware(db) {
  function professorTemAcesso(professorId, studentId, callback) {
    db.get(
      'SELECT 1 FROM professor_aluno WHERE professor_id = ? AND student_id = ?',
      [professorId, studentId],
      (err, row) => callback(err, !!row)
    );
  }

  return function verificarAcessoAluno(req, res, next) {
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

      if (requesterRole.includes('admin')) {
        req.user = decoded;
        return next();
      }

      if (requesterRole.includes('prof') || requesterRole.includes('teacher') || requesterRole.includes('aee')) {
        professorTemAcesso(requesterId, studentId, (err, temAcesso) => {
          if (err) {
            return res.status(500).json({
              success: false,
              status: 'error',
              message: 'Erro ao verificar vínculo: ' + err.message,
              timestamp: new Date().toISOString()
            });
          }
          if (!temAcesso) {
            return res.status(403).json({
              success: false,
              status: 'error',
              message: 'Você não tem vínculo com este aluno.',
              timestamp: new Date().toISOString()
            });
          }
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
  };
}

module.exports = { createStudentAccessMiddleware };

