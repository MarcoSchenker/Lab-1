const jwt = require('jsonwebtoken');

/**
 * Configura los manejadores de eventos relacionados con la autenticación del socket
 * @param {SocketIO.Socket} socket - El socket del cliente
 */
function setupAuthHandlers(socket) {
  socket.on('autenticar_socket', async (token) => {
    try {
      // Validar el token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Guardar información del usuario en el objeto socket
      socket.currentUserId = decoded.id;
      socket.nombreUsuario = decoded.nombre_usuario;
      
      console.log(`Socket ${socket.id} autenticado como usuario ${socket.currentUserId} (${socket.nombreUsuario})`);
      socket.emit('autenticacion_exitosa', { 
        userId: socket.currentUserId,
        username: socket.nombreUsuario 
      });
    } catch (err) {
      console.error('Error de autenticación de socket:', err);
      socket.emit('autenticacion_fallida', { message: 'Error de autenticación' });
      socket.disconnect(); // Desconectar si la autenticación falla
    }
  });
}

module.exports = {
  setupAuthHandlers
};