app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get(
    'SELECT id, name, email, cpf, password FROM user WHERE email = ?',
    [email],
    async (err, user) => {

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      const senhaValida = await bcrypt.compare(password, user.password);

      if (!senhaValida) {
        return res.status(401).json({
          success: false,
          message: 'Senha incorreta'
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          cpf: user.cpf
        }
      });
    }
  );
});