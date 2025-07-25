const gameLogicHandler = require('../../game-logic/gameLogicHandler');
const { debugLog, getSocketRoomInfo } = require('../../utils/debugUtils');
const { verificarEstadoJuegoCompleto, reconstruirEstadoMinimo } = require('../../utils/stateRecovery');

// ✅ CACHÉ DE ÚLTIMO ESTADO POR JUGADOR
const lastPlayerStates = {}; // Formato: `${codigo_sala}_${jugadorId}` -> estadoJuego

/**
 * Función auxiliar para enviar estado a jugador y guardarlo en caché
 * @param {Socket} socket - Socket del jugador
 * @param {string} codigo_sala - Código de la sala
 * @param {number} jugadorId - ID del jugador
 * @param {Object} estado - Estado del juego
 */
function enviarEstadoAJugador(socket, codigo_sala, jugadorId, estado) {
  socket.emit('estado_juego_actualizado', estado);
  
  // Guardar en caché
  const cacheKey = `${codigo_sala}_${jugadorId}`;
  lastPlayerStates[cacheKey] = estado;
  console.log(`[gameSocketHandlers] 💾 Estado guardado en caché para jugador ${jugadorId} en sala ${codigo_sala}`);
}

/**
 * Función auxiliar para obtener estado desde caché
 * @param {string} codigo_sala - Código de la sala
 * @param {number} jugadorId - ID del jugador
 * @returns {Object|null} - Estado en caché o null
 */
function obtenerEstadoDesdeCache(codigo_sala, jugadorId) {
  const cacheKey = `${codigo_sala}_${jugadorId}`;
  return lastPlayerStates[cacheKey] || null;
}

/**
 * Configura los manejadores de eventos relacionados con el juego
 * @param {SocketIO.Socket} socket - El socket del cliente
 * @param {SocketIO.Server} io - El servidor Socket.IO
 */
function setupGameHandlers(socket, io) {
  // Evento para unirse a la sala de juego (disparado desde OnlineGamePage)
  socket.on('unirse_sala_juego', (codigo_sala) => {
    if (!socket.currentUserId) {
      console.error(`[gameSocketHandlers] Error: Socket ${socket.id} intentó unirse sin autenticar.`);
      return socket.emit('error_unirse_sala', { message: 'Socket no autenticado.' });
    }
    
    socket.join(codigo_sala);
    socket.currentRoom = codigo_sala;
    console.log(`[gameSocketHandlers] Socket ${socket.id} (Usuario ${socket.currentUserId}) se unió a la sala de juego: ${codigo_sala}`);

    // ✅ IMPORTANTE: Emitir confirmación de unión exitosa
    socket.emit('unido_sala_juego', { 
      codigo_sala: codigo_sala, 
      mensaje: 'Unido a la sala exitosamente' 
    });

    // ✅ 1. Verificar si tenemos un estado guardado en caché para este jugador
    const estadoCache = obtenerEstadoDesdeCache(codigo_sala, socket.currentUserId);
    if (estadoCache) {
      console.log(`[gameSocketHandlers] CACHÉ: Enviando estado en caché para jugador ${socket.currentUserId} en sala ${codigo_sala}`);
      socket.emit('estado_juego_actualizado', estadoCache);
      return;
    }

    // ✅ 2. Si no hay caché, intentar obtener de la partida activa
    const partidaActiva = gameLogicHandler.getActiveGame(codigo_sala);

    if (partidaActiva) {
      console.log(`[gameSocketHandlers] Partida para ${codigo_sala} ya está activa. Obteniendo estado para jugador ${socket.currentUserId}.`);
      const estadoJuego = gameLogicHandler.obtenerEstadoJuegoParaJugador(codigo_sala, socket.currentUserId);
      
      if (estadoJuego) {
        console.log(`[gameSocketHandlers] Enviando 'estado_juego_actualizado' a ${socket.id}`);
        enviarEstadoAJugador(socket, codigo_sala, socket.currentUserId, estadoJuego);
      } else {
        console.error(`[gameSocketHandlers] Error: Partida activa encontrada pero no se pudo generar el estado para el jugador ${socket.currentUserId}`);
        socket.emit('error_estado_juego', { message: 'No se pudo obtener el estado de la partida.' });
      }
    } else {
      console.log(`[gameSocketHandlers] Partida para ${codigo_sala} aún no ha sido creada en memoria. Emitiendo esperando_inicio_partida.`);
      socket.emit('esperando_inicio_partida', { 
        codigo_sala: codigo_sala,
        mensaje: 'Esperando que inicie la partida...' 
      });
    }
  });

  // ✅ LOBBY ROOM JOINING - For receiving redirection events
  socket.on('unirse_sala_lobby', (codigo_sala) => {
    if (!socket.currentUserId) {
      console.error(`[gameSocketHandlers] Error: Socket ${socket.id} intentó unirse a lobby sin autenticar.`);
      return;
    }
    
    console.log(`[gameSocketHandlers] Socket ${socket.id} (Usuario ${socket.currentUserId}) uniéndose a sala de lobby: ${codigo_sala}`);
    socket.join(codigo_sala);
    console.log(`[gameSocketHandlers] Socket ${socket.id} unido a sala de lobby ${codigo_sala} para recibir notificaciones de redirección.`);
  });
  
  // ✅ Nuevo manejador para solicitar estado del juego con caché
  socket.on('solicitar_estado_juego_ws', () => {
    try {
      if (!socket.currentRoom || !socket.currentUserId) {
        socket.emit('error_juego', { message: 'No estás en una sala válida.' });
        return;
      }
      
      const cacheKey = `${socket.currentRoom}_${socket.currentUserId}`;
      console.log(`[gameSocketHandlers] Solicitud de estado del juego - Usuario ${socket.currentUserId} - Sala ${socket.currentRoom}`);
      
      // ✅ 1. Verificar caché primero
      if (lastPlayerStates[cacheKey]) {
        console.log(`[gameSocketHandlers] CACHÉ: Enviando estado en caché para solicitud explícita`);
        socket.emit('estado_juego_actualizado', lastPlayerStates[cacheKey]);
        return;
      }
      
      // ✅ 2. Si no hay caché, intentar obtener de la partida activa
      const estadoJuego = gameLogicHandler.obtenerEstadoJuegoParaJugador(socket.currentRoom, socket.currentUserId);
      
      if (estadoJuego) {
        console.log(`[gameSocketHandlers] Enviando estado tras solicitud explícita`);
        enviarEstadoAJugador(socket, socket.currentRoom, socket.currentUserId, estadoJuego);
      } else {
        socket.emit('error_juego', { message: 'No se pudo obtener el estado del juego.' });
      }
    } catch (error) {
      console.error(`[gameSocketHandlers] Error obteniendo estado del juego: ${error.message}`, error);
      socket.emit('error_juego', { message: 'Error obteniendo el estado del juego.' });
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

  // Manejador para declarar puntos de envido
  socket.on('declarar_puntos_envido_ws', (datos) => {
    try {
      const { puntos } = datos;
      if (socket.currentRoom && socket.currentUserId) {
        debugLog('gameSocketHandlers', `Declarando puntos envido: ${puntos} - Usuario ${socket.currentUserId}`);
        gameLogicHandler.manejarAccionJugador(socket.currentRoom, socket.currentUserId, 'DECLARAR_PUNTOS_ENVIDO', { puntos });
      } else {
        socket.emit('error_juego', { message: 'No estás en una sala válida.' });
      }
    } catch (error) {
      debugLog('gameSocketHandlers', `Error declarando puntos envido: ${error.message}`, error);
      socket.emit('error_juego', { message: 'Error declarando puntos envido.' });
    }
  });

  // Manejador para declarar "son buenas"
  socket.on('declarar_son_buenas_ws', () => {
    try {
      if (socket.currentRoom && socket.currentUserId) {
        debugLog('gameSocketHandlers', `Declarando son buenas - Usuario ${socket.currentUserId}`);
        gameLogicHandler.manejarAccionJugador(socket.currentRoom, socket.currentUserId, 'DECLARAR_SON_BUENAS', {});
      } else {
        socket.emit('error_juego', { message: 'No estás en una sala válida.' });
      }
    } catch (error) {
      debugLog('gameSocketHandlers', `Error declarando son buenas: ${error.message}`, error);
      socket.emit('error_juego', { message: 'Error declarando son buenas.' });
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

  // ✅ Manejador para abandonar partida
  socket.on('abandonar_partida_ws', () => {
    try {
      if (socket.currentRoom && socket.currentUserId) {
        debugLog('gameSocketHandlers', `🚪 Abandono de partida - Usuario ${socket.currentUserId} en sala ${socket.currentRoom}`);
        
        // Manejar el abandono como una acción especial
        gameLogicHandler.manejarAccionJugador(socket.currentRoom, socket.currentUserId, 'ABANDONAR_PARTIDA', {});
        
        // Opcional: Desconectar al jugador de la sala inmediatamente
        socket.leave(socket.currentRoom);
        socket.currentRoom = null;
        
        debugLog('gameSocketHandlers', `✅ Usuario ${socket.currentUserId} abandonó la partida y salió de la sala`);
      } else {
        socket.emit('error_juego', { message: 'No estás en una sala válida.' });
      }
    } catch (error) {
      debugLog('gameSocketHandlers', `❌ Error al abandonar partida: ${error.message}`, error);
      socket.emit('error_juego', { message: 'Error al abandonar la partida.' });
    }
  });
}

module.exports = {
  setupGameHandlers,
  lastPlayerStates, // ✅ Exportar caché para conectarlo con gameLogicHandler
  enviarEstadoAJugador, // ✅ Exportar función auxiliar
  obtenerEstadoDesdeCache // ✅ Exportar función de obtener caché
};