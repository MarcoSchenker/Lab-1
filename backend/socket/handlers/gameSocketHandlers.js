const gameLogicHandler = require('../../game-logic/gameLogicHandler');
const { debugLog, getSocketRoomInfo } = require('../../utils/debugUtils');
const { verificarEstadoJuegoCompleto, reconstruirEstadoMinimo } = require('../../utils/stateRecovery');

/**
 * Configura los manejadores de eventos relacionados con el juego
 * @param {SocketIO.Socket} socket - El socket del cliente
 * @param {SocketIO.Server} io - El servidor Socket.IO
 */
function setupGameHandlers(socket, io) {
  socket.on('unirse_sala_juego', (codigo_sala) => {
    debugLog('gameSocketHandlers', `Socket ${socket.id} intentando unirse a sala ${codigo_sala}`, 
        { usuario: socket.currentUserId });
    
    if (!socket.currentUserId) {
      debugLog('gameSocketHandlers', 'Socket no autenticado intentando unirse a sala');
      return socket.emit('error_juego', { 
        message: 'Socket no autenticado.',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Verificar estado anterior para posible reconexión
    const wasInRoom = socket.currentRoom === codigo_sala;
    
    if (socket.currentRoom && socket.currentRoom !== codigo_sala) {
      debugLog('gameSocketHandlers', `Socket ${socket.id} saliendo de sala anterior: ${socket.currentRoom}`);
      socket.leave(socket.currentRoom);
    }
    
    // Unir al socket a la sala y guardar información
    try {
      const previousRooms = getSocketRoomInfo(socket);
      
      // Verificar si ya está en la sala antes de unir
      if (!previousRooms.rooms.includes(codigo_sala)) {
        socket.join(codigo_sala);
        debugLog('gameSocketHandlers', `Socket ${socket.id} unido a sala ${codigo_sala}`);
      } else {
        debugLog('gameSocketHandlers', `Socket ${socket.id} ya estaba en sala ${codigo_sala}`);
      }
      
      socket.currentRoom = codigo_sala;
      socket.datosUsuarioSala = { codigo_sala, usuario_id: socket.currentUserId };
      
      const roomInfo = getSocketRoomInfo(socket);
      debugLog('gameSocketHandlers', `Estado de sala para socket ${socket.id}`, roomInfo);
      
      // Notificar al usuario que se unió exitosamente a la sala (frontend está esperando este evento)
      socket.emit('unido_sala_juego', { 
        codigo_sala,
        wasReconnection: wasInRoom
      });
      
      // Mostrar estado de partidas activas y emitir evento de unión a los demás en la sala
      gameLogicHandler.debugActiveGames();
      
      // Verificar si es una reconexión o una nueva conexión
      if (wasInRoom) {
        // Este es un caso de reconexión - notificamos a todos en la sala
        socket.to(codigo_sala).emit('jugador_reconectado', { 
          jugadorId: socket.currentUserId,
          mensaje: `Jugador ${socket.currentUserId} se ha reconectado a la sala`
        });
      } else {
        // Nueva conexión - notificar a los demás en la sala
        socket.to(codigo_sala).emit('jugador_conectado', { 
          jugadorId: socket.currentUserId,
          mensaje: `Jugador ${socket.currentUserId} se ha unido a la sala`
        });
      }
      
      // Intentar obtener el estado del juego para este jugador
      debugLog('gameSocketHandlers', `Solicitando estado del juego para usuario ${socket.currentUserId} en sala ${codigo_sala}`);
      
      // Esperar un momento para asegurarnos que la unión a la sala se completó
      setTimeout(() => {
        const estadoJuego = gameLogicHandler.obtenerEstadoJuegoParaJugador(codigo_sala, socket.currentUserId);
        
        if (estadoJuego) {
          debugLog('gameSocketHandlers', `Enviando estado del juego a usuario ${socket.currentUserId}`, 
              { estadoPartida: estadoJuego.estadoPartida });
          socket.emit('estado_juego_actualizado', estadoJuego);
          
          // Si la partida ya está en curso, enviar evento adicional para asegurar transición de UI
          if (estadoJuego.estadoPartida === 'en_juego') {
            socket.emit('partida_iniciada', { 
              codigo_sala: codigo_sala,
              mensaje: 'La partida ya está en curso' 
            });
            
            // Notificar a la sala que el jugador se ha reconectado
            io.to(codigo_sala).emit('jugador_reconectado', { 
              jugadorId: socket.currentUserId,
              nombre: estadoJuego.jugadores.find(j => j.id === socket.currentUserId)?.nombreUsuario
            });
          }
        } else {
          debugLog('gameSocketHandlers', `No se encontró partida activa para sala ${codigo_sala}`, 
              { usuario: socket.currentUserId });
          socket.emit('esperando_inicio_partida', { 
            mensaje: 'Esperando que la partida inicie...',
            codigo_sala 
          });
        }
      }, 300);
    } catch (error) {
      debugLog('gameSocketHandlers', `Error al unir socket ${socket.id} a sala ${codigo_sala}`, error);
      socket.emit('error_juego', { 
        message: 'Error al unirse a la sala de juego.',
        details: error.message
      });
    }
  });
  
  socket.on('cliente_solicitar_estado_juego', async () => {
    try {
      const { codigo_sala, usuario_id } = socket.datosUsuarioSala || {};
      debugLog('gameSocketHandlers', `Cliente solicita estado del juego`, 
          { usuario: usuario_id, sala: codigo_sala, socketId: socket.id });
      
      if (!codigo_sala || !usuario_id) {
        debugLog('gameSocketHandlers', 'Solicitud de estado sin autenticación o sala', 
            { socketId: socket.id });
        return socket.emit('error_juego', { 
          message: 'No autenticado o no en una sala.',
          code: 'AUTH_REQUIRED'
        });
      }
      
      // Verificar que el socket esté realmente en la sala que dice estar
      const roomInfo = getSocketRoomInfo(socket);
      if (!roomInfo.rooms.includes(codigo_sala)) {
        debugLog('gameSocketHandlers', `Socket ${socket.id} no está en la sala ${codigo_sala} que solicita`, roomInfo);
        
        // Re-unir al socket a la sala si es necesario
        debugLog('gameSocketHandlers', `Re-uniendo socket ${socket.id} a sala ${codigo_sala}`);
        socket.join(codigo_sala);
        socket.currentRoom = codigo_sala;
        
        // Confirmar unión exitosa
        socket.emit('unido_sala_juego', { codigo_sala });
        
        // Dar un poco de tiempo para que la sala se actualice completamente
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Debug: Mostrar estado antes de obtener
      gameLogicHandler.debugActiveGames();
      
      // Intentar múltiples veces obtener el estado si es necesario
      let intentos = 0;
      const maxIntentos = 5; // Aumentar número de intentos
      let estadoJuego = null;
      
      while (!estadoJuego && intentos < maxIntentos) {
        intentos++;
        debugLog('gameSocketHandlers', `Intento ${intentos}/${maxIntentos} de obtener estado para sala ${codigo_sala}, usuario ${usuario_id}`);
        
        // Obtener el estado actual del juego para este jugador
        estadoJuego = gameLogicHandler.obtenerEstadoJuegoParaJugador(codigo_sala, usuario_id);
        
        // Verificar validez básica del estado
        if (estadoJuego && (!estadoJuego.jugadores || !estadoJuego.equipos)) {
          debugLog('gameSocketHandlers', `Estado obtenido pero incompleto en intento ${intentos}`, 
              { tieneJugadores: !!estadoJuego.jugadores, tieneEquipos: !!estadoJuego.equipos });
          estadoJuego = null; // Reintentar si el estado es incompleto
        }
        
        if (!estadoJuego && intentos < maxIntentos) {
          // Esperar un poco más entre intentos (tiempo creciente)
          const waitTime = 300 * intentos;
          debugLog('gameSocketHandlers', `Esperando ${waitTime}ms antes del siguiente intento`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      if (estadoJuego) {
        debugLog('gameSocketHandlers', `Enviando estado del juego a usuario ${usuario_id} en sala ${codigo_sala}`, 
            { estadoPartida: estadoJuego.estadoPartida, jugadoresCount: estadoJuego.jugadores?.length });
        
        // Verificar validez del estado
        const verificacionEstado = verificarEstadoJuegoCompleto(estadoJuego);
        if (!verificacionEstado.valido) {
          debugLog('gameSocketHandlers', `Estado incompleto para sala ${codigo_sala}`, 
              { problemas: verificacionEstado.problemas });
          
          // Intentar reconstruir un estado mínimo utilizando la utilidad de recuperación
          const estadoReconstruido = reconstruirEstadoMinimo(estadoJuego);
          
          if (estadoReconstruido) {
            // Informar sobre el problema de estado incompleto
            debugLog('gameSocketHandlers', `Enviando estado reconstruido`, { 
              estadoPartida: estadoReconstruido.estadoPartida,
              jugadores: estadoReconstruido.jugadores?.length,
              equipos: estadoReconstruido.equipos?.length
            });
            
            // Enviar estado reconstruido y notificar para reconexión posterior
            socket.emit('estado_juego_actualizado', estadoReconstruido);
            
            // Notificar a todos los jugadores de la sala que hay un problema de estado
            socket.to(codigo_sala).emit('error_estado_juego', {
              message: 'Detectado estado de juego incompleto. Se está recuperando automáticamente.',
              codigo_sala,
              recovery: true
            });
            
            // Programar una reconexión automática para que el cliente intente obtener estado actualizado
            setTimeout(() => {
              socket.emit('solicitar_reconexion', {
                codigo_sala,
                mensaje: 'Reconexión necesaria para recuperar estado completo'
              });
            }, 5000);
            
            return;
          } else {
            // No se pudo reconstruir el estado
            debugLog('gameSocketHandlers', `No se pudo reconstruir estado para sala ${codigo_sala}`);
            socket.emit('error_juego', {
              message: 'No se pudo recuperar el estado de la partida.',
              details: 'Estado de juego corrupto o incompleto',
              codigo_sala
            });
            return;
          }
        }
        
        // Enviar el estado al cliente solicitante (solo si es válido)
        socket.emit('estado_juego_actualizado', estadoJuego);
        
        // Si la partida está en curso pero el cliente parece estar esperando,
        // enviar un evento de inicio de partida para asegurar que se actualice
        if (estadoJuego.estadoPartida === 'en_juego') {
          socket.emit('partida_iniciada', { 
            codigo_sala, 
            mensaje: 'La partida ya está en curso' 
          });
          
          // También notificar a todos en la sala por si alguien más necesita actualizarse
          socket.to(codigo_sala).emit('estado_actualizado_disponible', {
            codigo_sala,
            solicitante: usuario_id,
            timestamp: Date.now()
          });
        }
      } else {
        // Si no hay partida activa o está en proceso de configuración
        debugLog('gameSocketHandlers', `No se encontró partida activa para sala ${codigo_sala}`, 
            { usuario: usuario_id });
        
        // Verificar si hay otros sockets en la sala
        const roomSockets = io.sockets.adapter.rooms.get(codigo_sala);
        const roomSize = roomSockets ? roomSockets.size : 0;
        
        debugLog('gameSocketHandlers', `Sala ${codigo_sala} tiene ${roomSize} sockets conectados`);
        
        if (roomSize > 1) {
          // Si hay otros jugadores, intentar obtener el estado de ellos
          const otrosSockets = [...roomSockets].filter(id => id !== socket.id);
          
          debugLog('gameSocketHandlers', `Solicitando estado a otros jugadores en sala ${codigo_sala}`, 
              { otrosSockets });
              
          // Pedir a otros jugadores que compartan su estado
          socket.to(codigo_sala).emit('solicitar_compartir_estado', {
            solicitanteId: usuario_id,
            socketId: socket.id
          });
          
          // Mensaje de espera más informativo
          socket.emit('esperando_inicio_partida', { 
            mensaje: 'Recuperando estado de otros jugadores... Por favor, espera.',
            codigo_sala,
            otrosJugadores: roomSize - 1
          });
        } else {
          // Si está solo, enviar mensaje de espera
          socket.emit('esperando_inicio_partida', { 
            mensaje: 'Esperando que la partida inicie o se configure correctamente...',
            codigo_sala 
          });
        }
      }
    } catch (error) {
      debugLog('gameSocketHandlers', 'Error al solicitar estado del juego', error);
      socket.emit('error_juego', { 
        message: 'Error al solicitar estado del juego.',
        details: error.message
      });
    }
  });

  // Test message handler for debugging
  socket.on('test_message', (data) => {
    console.log('TEST MESSAGE RECEIVED FROM CLIENT:', data);
    socket.emit('test_message_response', { message: 'Test message received!', echo: data });
  });
  
  // Compartir estado entre jugadores
  socket.on('solicitar_compartir_estado', (data) => {
    debugLog('gameSocketHandlers', `Solicitud de compartir estado recibida de ${data.solicitanteId}`, data);
    
    if (!socket.currentUserId || !socket.datosUsuarioSala?.codigo_sala) {
      return;
    }
    
    // Emitir directamente nuestro estado al jugador solicitante
    const estadoJuego = gameLogicHandler.obtenerEstadoJuegoParaJugador(
      socket.datosUsuarioSala.codigo_sala, 
      socket.currentUserId
    );
    
    if (estadoJuego) {
      debugLog('gameSocketHandlers', `Compartiendo estado con jugador ${data.solicitanteId}`, 
        { estadoPartida: estadoJuego.estadoPartida });
      
      // Emitimos directamente al socket del solicitante
      io.to(data.socketId).emit('estado_compartido_por_jugador', {
        estadoJuego,
        compartidoPorId: socket.currentUserId
      });
    }
  });
  
  // Recibir estado compartido por otro jugador
  socket.on('estado_compartido_por_jugador', (data) => {
    debugLog('gameSocketHandlers', `Estado recibido del jugador ${data.compartidoPorId}`, 
        { estadoPartida: data.estadoJuego?.estadoPartida });
    
    if (!socket.currentUserId || !data.estadoJuego) {
      return;
    }
    
    // Emitir el estado al jugador
    socket.emit('estado_juego_actualizado', data.estadoJuego);
  });

  // 🟢 NUEVOS MANEJADORES SEGÚN TU PLAN DE WEBSOCKETS

  // El cliente solicita su estado inicial después de recibir 'partida_iniciada'
  socket.on('solicitar_estado_inicial', () => {
    try {
      if (!socket.currentRoom || !socket.currentUserId) {
        socket.emit('error_juego', { message: 'No estás en una sala o no estás autenticado.' });
        return;
      }

      debugLog('gameSocketHandlers', `Solicitud de estado inicial de usuario ${socket.currentUserId} en sala ${socket.currentRoom}`);
      
      const estadoJuego = gameLogicHandler.obtenerEstadoJuegoParaJugador(socket.currentRoom, socket.currentUserId);

      if (estadoJuego) {
        debugLog('gameSocketHandlers', `Enviando estado inicial a usuario ${socket.currentUserId}`);
        socket.emit('estado_juego_actualizado', estadoJuego);
      } else {
        socket.emit('error_juego', { message: 'No se pudo obtener el estado del juego.' });
      }
    } catch (error) {
      debugLog('gameSocketHandlers', `Error al solicitar estado inicial: ${error.message}`, error);
      socket.emit('error_juego', { message: 'Error al obtener el estado inicial del juego.' });
    }
  });

  // Manejador específico para jugar una carta
  socket.on('jugar_carta_ws', (datos) => {
    try {
      const { carta } = datos;
      if (socket.currentRoom && socket.currentUserId) {
        debugLog('gameSocketHandlers', `Jugando carta: ${carta.idUnico} - Usuario ${socket.currentUserId}`);
        gameLogicHandler.manejarAccionJugador(socket.currentRoom, socket.currentUserId, 'JUGAR_CARTA', { idUnicoCarta: carta.idUnico });
      } else {
        socket.emit('error_juego', { message: 'No estás en una sala válida.' });
      }
    } catch (error) {
      debugLog('gameSocketHandlers', `Error jugando carta: ${error.message}`, error);
      socket.emit('error_juego', { message: 'Error al jugar la carta.' });
    }
  });

  // Manejador para cantos (envido/truco)
  socket.on('cantar_ws', (datos) => {
    try {
      const { canto, detalle } = datos;
      if (socket.currentRoom && socket.currentUserId) {
        debugLog('gameSocketHandlers', `Canto ${canto} - Usuario ${socket.currentUserId}`, detalle);
        gameLogicHandler.manejarAccionJugador(socket.currentRoom, socket.currentUserId, 'CANTO', { tipoCanto: canto, detalle });
      } else {
        socket.emit('error_juego', { message: 'No estás en una sala válida.' });
      }
    } catch (error) {
      debugLog('gameSocketHandlers', `Error procesando canto: ${error.message}`, error);
      socket.emit('error_juego', { message: 'Error procesando el canto.' });
    }
  });

  // Manejador para respuestas a cantos
  socket.on('responder_canto_ws', (datos) => {
    try {
      const { respuesta, nuevo_canto, puntos_envido } = datos;
      if (socket.currentRoom && socket.currentUserId) {
        debugLog('gameSocketHandlers', `Respuesta a canto: ${respuesta} - Usuario ${socket.currentUserId}`);
        gameLogicHandler.manejarAccionJugador(socket.currentRoom, socket.currentUserId, 'RESPUESTA_CANTO', { 
          respuesta, 
          nuevo_canto, 
          puntos_envido 
        });
      } else {
        socket.emit('error_juego', { message: 'No estás en una sala válida.' });
      }
    } catch (error) {
      debugLog('gameSocketHandlers', `Error procesando respuesta a canto: ${error.message}`, error);
      socket.emit('error_juego', { message: 'Error procesando la respuesta al canto.' });
    }
  });

  // Manejador para irse al mazo
  socket.on('irse_al_mazo_ws', () => {
    try {
      if (socket.currentRoom && socket.currentUserId) {
        debugLog('gameSocketHandlers', `Irse al mazo - Usuario ${socket.currentUserId}`);
        gameLogicHandler.manejarAccionJugador(socket.currentRoom, socket.currentUserId, 'IRSE_AL_MAZO', {});
      } else {
        socket.emit('error_juego', { message: 'No estás en una sala válida.' });
      }
    } catch (error) {
      debugLog('gameSocketHandlers', `Error al irse al mazo: ${error.message}`, error);
      socket.emit('error_juego', { message: 'Error al irse al mazo.' });
    }
  });

  // Manejador para solicitar el estado del juego (reconexiones)
  socket.on('solicitar_estado_juego_ws', () => {
    try {
      if (socket.currentRoom && socket.currentUserId) {
        debugLog('gameSocketHandlers', `Solicitando estado del juego - Usuario ${socket.currentUserId}`);
        const estadoJuego = gameLogicHandler.obtenerEstadoJuegoParaJugador(socket.currentRoom, socket.currentUserId);
        
        if (estadoJuego) {
          socket.emit('estado_juego_actualizado', estadoJuego);
        } else {
          socket.emit('error_juego', { message: 'No se pudo obtener el estado del juego.' });
        }
      } else {
        socket.emit('error_juego', { message: 'No estás en una sala válida.' });
      }
    } catch (error) {
      debugLog('gameSocketHandlers', `Error obteniendo estado del juego: ${error.message}`, error);
      socket.emit('error_juego', { message: 'Error obteniendo el estado del juego.' });
    }
  });
}

module.exports = {
  setupGameHandlers
};