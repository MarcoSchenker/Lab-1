const gameLogicHandler = require('../../game-logic/gameLogicHandler');

/**
 * Configura los manejadores de eventos relacionados con el juego
 * @param {SocketIO.Socket} socket - El socket del cliente
 * @param {SocketIO.Server} io - El servidor Socket.IO
 */
function setupGameHandlers(socket, io) {
  socket.on('unirse_sala_juego', (codigo_sala) => {
    if (!socket.currentUserId) {
      return socket.emit('error_juego', { message: 'Socket no autenticado.' });
    }
    
    if (socket.currentRoom) {
      socket.leave(socket.currentRoom);
    }
    
    socket.join(codigo_sala);
    socket.currentRoom = codigo_sala;
    socket.datosUsuarioSala = { codigo_sala, usuario_id: socket.currentUserId };
    
    console.log(`Socket ${socket.id} (Usuario ${socket.currentUserId}) se unió a la sala de juego ${codigo_sala}`);
  });
  
  socket.on('cliente_jugar_carta', async (data) => {
    const { codigo_sala, usuario_id } = socket.datosUsuarioSala || {};
    if (!codigo_sala || !usuario_id) {
      return socket.emit('error_juego', { message: 'No autenticado o no en una sala.' });
    }
    
    const { carta } = data;
    gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'JUGAR_CARTA', { idUnicoCarta: carta.idUnico });
  });
  
  socket.on('cliente_cantar', async (data) => {
    const { codigo_sala, usuario_id } = socket.datosUsuarioSala || {};
    if (!codigo_sala || !usuario_id) {
      return socket.emit('error_juego', { message: 'No autenticado o no en una sala.' });
    }
    
    const { tipo_canto, detalle_adicional } = data;
    gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'CANTO', { 
      tipoCanto: tipo_canto, 
      detalleCanto: detalle_adicional 
    });
  });
  
  socket.on('cliente_responder_canto', async (data) => {
    const { codigo_sala, usuario_id } = socket.datosUsuarioSala || {};
    if (!codigo_sala || !usuario_id) {
      return socket.emit('error_juego', { message: 'No autenticado o no en una sala.' });
    }
    
    const { respuesta, canto_respondido_tipo, nuevo_canto_si_mas, puntos_envido } = data;
    
    // Si es "Son Buenas" para el envido
    if (respuesta === 'SON_BUENAS_ENVIDO') {
      gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'RESPUESTA_CANTO', { 
        respuesta, 
        cantoRespondidoTipo: 'ENVIDO'
      });
    } 
    // Si son puntos declarados para el envido
    else if (!isNaN(parseInt(respuesta)) && respuesta > 0) {
      gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'RESPUESTA_CANTO', { 
        respuesta: parseInt(respuesta),
        cantoRespondidoTipo: 'ENVIDO',
        puntos: parseInt(respuesta)
      });
    }
    // Si es una respuesta normal
    else {
      gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'RESPUESTA_CANTO', { 
        respuesta, 
        cantoRespondidoTipo: canto_respondido_tipo,
        nuevoCantoSiMas: nuevo_canto_si_mas 
      });
    }
  });
  
  socket.on('cliente_son_buenas_envido', async (data) => {
    const { codigo_sala, usuario_id } = socket.datosUsuarioSala || {};
    if (!codigo_sala || !usuario_id) {
      return socket.emit('error_juego', { message: 'No autenticado o no en una sala.' });
    }
    
    gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'RESPUESTA_CANTO', { 
      respuesta: 'SON_BUENAS_ENVIDO', 
      cantoRespondidoTipo: 'ENVIDO'
    });
  });
  
  socket.on('retomar_truco_pendiente', (data) => {
    socket.emit('retomar_truco_pendiente', data);
  });
  
  socket.on('cliente_irse_al_mazo', async () => {
    const { codigo_sala, usuario_id } = socket.datosUsuarioSala || {};
    if (!codigo_sala || !usuario_id) {
      return socket.emit('error_juego', { message: 'No autenticado o no en una sala.' });
    }
    
    gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'IRSE_AL_MAZO', {});
  });
  
  socket.on('cliente_solicitar_estado_juego', async () => {
    const { codigo_sala, usuario_id } = socket.datosUsuarioSala || {};
    if (!codigo_sala || !usuario_id) {
      return socket.emit('error_juego', { message: 'No autenticado o no en una sala.' });
    }
    
    const estadoJuego = gameLogicHandler.obtenerEstadoJuegoParaJugador(codigo_sala, usuario_id);
    if (estadoJuego) {
      socket.emit('estado_juego_actualizado', estadoJuego);
    } else {
      socket.emit('error_juego', { message: 'No se pudo obtener el estado del juego o la partida no existe.' });
    }
  });
}

module.exports = {
  setupGameHandlers
};