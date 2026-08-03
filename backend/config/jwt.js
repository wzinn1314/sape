const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(user) {
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
}

function verifyToken(token) {
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
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    }
    throw new Error('Erro na verificação do token');
  }
}

module.exports = { generateToken, verifyToken };

