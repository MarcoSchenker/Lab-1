const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  // Revisión del formato del token
  let token = req.headers['authorization'];
  
  console.log('[AUTH] Token recibido:', token ? `${token.substring(0, 20)}...` : 'No token');

  if (!token) {
    console.log('[AUTH] ❌ Token no proporcionado');
    return res.status(401).json({ 
      error: 'Token no proporcionado',
      details: 'Se requiere autenticación para acceder a este recurso'
    });
  }

  // Manejar el caso donde el token viene con el prefijo "Bearer "
  if (token.startsWith('Bearer ')) {
    token = token.slice(7); // Remover "Bearer " del string
  }

  // Verificar que el token no sea 'undefined' o 'null'
  if (token === 'undefined' || token === 'null' || token.trim() === '') {
    console.log('[AUTH] ❌ Token inválido recibido:', token);
    return res.status(401).json({ 
      error: 'Token inválido',
      details: 'El token recibido no es válido. Posible problema de almacenamiento en modo incógnito.'
    });
  }

  try {
    // Asegurarnos de que JWT_SECRET esté definido
    if (!process.env.JWT_SECRET) {
      console.error('[AUTH] ❌ JWT_SECRET no está definido en las variables de entorno');
      return res.status(500).json({ error: 'Error en la configuración del servidor' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Agrega los datos del usuario al objeto `req`
    
    console.log('[AUTH] ✅ Token verificado correctamente para usuario:', decoded.id);
    next();
  } catch (err) {
    console.error('[AUTH] ❌ Error al verificar el token:', err.message);
    
    // Proporcionar más contexto sobre el error
    let errorDetails = 'Token inválido o expirado';
    if (err.name === 'TokenExpiredError') {
      errorDetails = 'El token ha expirado. Por favor, inicia sesión nuevamente.';
    } else if (err.name === 'JsonWebTokenError') {
      errorDetails = 'Token malformado. Posible problema de almacenamiento en modo incógnito.';
    }
    
    return res.status(401).json({ 
      error: 'Token inválido o expirado',
      details: errorDetails
    });
  }
};

module.exports = { authenticateToken };