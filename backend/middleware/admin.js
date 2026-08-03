function requireAdmin(req, res, next) {
  const role = (req.user && req.user.role ? req.user.role : '').toLowerCase();

  if (role.includes('admin')) {
    return next();
  }

  return res.status(403).json({
    success: false,
    status: 'error',
    message: 'Acesso negado. Apenas administradores têm permissão para esta ação.',
    timestamp: new Date().toISOString()
  });
}

module.exports = { requireAdmin };

