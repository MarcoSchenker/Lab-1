const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // Revisión del formato del token
  let token = req.headers['authorization'];
  
  console.log('Token recibido:', token);

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  // Manejar el caso donde el token viene con el prefijo "Bearer "
  if (token.startsWith('Bearer ')) {
    token = token.slice(7); // Remover "Bearer " del string
  }

  try {
    // Asegurarnos de que JWT_SECRET esté definido
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET no está definido en las variables de entorno');
      return res.status(500).json({ error: 'Error en la configuración del servidor' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Agrega los datos del usuario al objeto `req`
    
    console.log('Token verificado correctamente para usuario:', decoded.id);
    next();
  } catch (err) {
    console.error('Error al verificar el token:', err.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = { authenticateToken };