const { verifyToken } = require('../config/jwt');

function authenticateMiddleware(req, res, next) {
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
}

module.exports = { authenticateMiddleware };

