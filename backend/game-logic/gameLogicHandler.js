/**
 * Este módulo será el nexo entre tu server.js  y las instancias de PartidaGame.
 *  Se encargará de:
Gestionar Partidas Activas: Mantener un registro de todas las partidas en curso.
Crear Nuevas P    const partida = new PartidaGame(
        codigoSala,
        jugadoresInfo,
        tipoPartida,
        puntosVictoria,
        notificarEstadoGlobalCallback,
        persistirPartidaCallback,
        persistirAccionCallback,
        finalizarPartidaCallback
    );
    partida.idEnDB = partidaDBId; // Guardar el ID de la DB en la instancia de la partida

    console.log(`Guardando partida en activeGames con código ${codigoSala}`);
    activeGames[codigoSala] = partida;
    
    console.log(`=== PARTIDA CREADA EXITOSAMENTE ===`);
    debugActiveGames(); // Estado después de crear
    
    // Notificar a los jugadores que la partida ha comenzado
    console.log(`Partida ${codigoSala} creada e iniciada. Jugadores notificados.`);
    return partida;na sala esté lista, instanciar PartidaGame.
Enrutar Acciones: Recibir acciones de los jugadores (desde server.js) y dirigirlas a la instancia correcta de PartidaGame.
Manejar Callbacks: Implementar las funciones de callback que PartidaGame necesita para notificar y persistir.
 */
const PartidaGame = require('./PartidaGame');
const pool = require('../config/db'); // Acceso a la base de datos
const { getIoInstance } = require('../server'); 

let activeGames = {};
let io;

const { debugLog } = require('../utils/debugUtils');

// Función para debuggear el estado de activeGames
function debugActiveGames() {
    debugLog('gameLogicHandler', 'Estado de activeGames', {
        numPartidas: Object.keys(activeGames).length,
        salasCodigos: Object.keys(activeGames),
        detalles: Object.entries(activeGames).map(([codigo, partida]) => ({
            sala: codigo,
            tipoPartida: partida?.tipoPartida,
            estadoPartida: partida?.estadoPartida,
            numeroJugadores: partida?.jugadores?.length || 0,
            idEnDB: partida?.idEnDB
        }))
    });
    
    console.log('=== DEBUG: Estado de activeGames ===');
    console.log('Número de partidas activas:', Object.keys(activeGames).length);
    console.log('Códigos de salas activas:', Object.keys(activeGames));
    for (const [codigo, partida] of Object.entries(activeGames)) {
        console.log(`Sala ${codigo}:`, {
            tipoPartida: partida?.tipoPartida,
            estadoPartida: partida?.estadoPartida,
            numeroJugadores: partida?.jugadores?.length || 0,
            idEnDB: partida?.idEnDB
        });
    }
    console.log('=====================================');
}

/**
 * Inicializa el manejador de lógica del juego, principalmente para obtener la instancia de io.
 * @param {SocketIO.Server} ioInstance La instancia del servidor de Socket.IO.
 */
function initializeGameLogic(ioInstance) {
    io = ioInstance;
    console.log("GameLogicHandler inicializado con instancia de Socket.IO.");
    debugActiveGames(); // Debug inicial
}

/**
 * Crea e inicia una nueva partida.
 * Esta función sería llamada, por ejemplo, desde la ruta que maneja la creación/llenado de salas.
 * @param {string} codigoSala 
 * @param {Array<object>} jugadoresInfo [{id, nombre_usuario}, ...]
 * @param {string} tipoPartida '1v1', '2v2', '3v3'
 * @param {number} puntosVictoria 
 * @returns {PartidaGame | null} La instancia de la partida creada o null si falla.
 */
async function crearNuevaPartida(codigoSala, jugadoresInfo, tipoPartida, puntosVictoria) {
    console.log('=== INICIANDO CREACIÓN DE NUEVA PARTIDA ===');
    console.log('Datos recibidos:', {
        codigoSala,
        jugadoresInfo,
        tipoPartida,
        puntosVictoria
    });
    
    debugActiveGames(); // Estado antes de crear

    if (!io) {
        console.error("Error: Socket.IO no ha sido inicializado en gameLogicHandler.");
        return null;
    }

    if (activeGames[codigoSala]) {
        console.warn(`Ya existe una partida activa para la sala ${codigoSala}.`);
        debugActiveGames();
        return activeGames[codigoSala];
    }

    console.log(`Creando nueva partida para la sala ${codigoSala}`);

    // 1. Persistir la creación de la partida en la DB (tabla partidas_estado)
    let partidaDBId;
    try {
        const connection = await pool.getConnection();
        
        // PRIMERO: Verificar que existe el registro en partidas (para la FK constraint)
        const [partidasRows] = await connection.execute(
            `SELECT codigo_sala FROM partidas WHERE codigo_sala = ?`,
            [codigoSala]
        );
        
        if (partidasRows.length === 0) {
            console.warn(`⚠️ No existe registro en 'partidas' para ${codigoSala}. Creando registro...`);
            // Crear registro básico en partidas
            await connection.execute(
                `INSERT INTO partidas (codigo_sala, estado, fecha_inicio, puntos_victoria, max_jugadores, creador) 
                 VALUES (?, 'en_juego', NOW(), ?, ?, 'gameLogicHandler')`,
                [codigoSala, puntosVictoria, jugadoresInfo.length]
            );
            console.log(`✅ Registro creado en 'partidas' para ${codigoSala}`);
        } else {
            console.log(`✅ Registro ya existe en 'partidas' para ${codigoSala}`);
        }
        
        // AHORA: Insertar en partidas_estado
        const [result] = await connection.execute(
            `INSERT INTO partidas_estado (codigo_sala, tipo_partida, jugadores_configurados, puntaje_objetivo, estado_partida) 
             VALUES (?, ?, ?, ?, ?)`,
            [codigoSala, tipoPartida, jugadoresInfo.length, puntosVictoria, 'en_juego']
        );
        partidaDBId = result.insertId;
        
        // 2. Insertar equipos usando la estructura real de la DB
        const equiposData = crearEquiposSegunTipo(tipoPartida, jugadoresInfo);
        
        for (const equipo of equiposData) {
            const [equipoResult] = await connection.execute(
                `INSERT INTO partidas_equipos (partida_estado_id, nombre_equipo, puntos_partida) 
                 VALUES (?, ?, ?)`,
                [partidaDBId, equipo.nombre, 0]
            );
            
            // Guardar el ID real generado por la DB
            equipo.dbId = equipoResult.insertId;
        }
        
        // 3. Insertar jugadores usando la estructura real de la DB
        for (const jugador of jugadoresInfo) {
            const equipoData = equiposData.find(e => e.jugadores.includes(jugador.id));
            
            await connection.execute(
                `INSERT INTO partidas_jugadores (partida_estado_id, usuario_id, partida_equipo_id, cartas_mano, es_pie_equipo) 
                 VALUES (?, ?, ?, ?, ?)`,
                [partidaDBId, jugador.id, equipoData.dbId, JSON.stringify([]), false]
            );
        }
        
        connection.release();
        console.log(`Partida registrada en DB con ID: ${partidaDBId}`);
        console.log(`Equipos creados:`, equiposData.map(e => ({ id: e.dbId, nombre: e.nombre })));
        
    } catch (error) {
        console.error("Error al registrar la partida en la base de datos:", error);
        // OPCIÓN: Continuar sin persistir en DB por ahora para no bloquear el juego
        console.log("Continuando sin persistir equipos/jugadores en DB...");
        partidaDBId = Math.floor(Math.random() * 1000000); // ID temporal para que funcione
    }

    // Callbacks para PartidaGame
    const notificarEstadoGlobalCallback = (sala, evento, estado) => {
        console.log(`Notificando a sala ${sala}, evento ${evento}`);
        io.to(sala).emit(evento, estado);
    };

    const persistirPartidaCallback = async (partidaId, estadoParaDB) => {
        console.log(`Persistiendo estado de partida ${partidaDBId}:`, estadoParaDB);
        try {
            const connection = await pool.getConnection();
            
            // Convertir undefined a null antes de la consulta
            const parametros = [
                estadoParaDB.estado_partida || null,
                estadoParaDB.ronda_actual_numero || null,
                estadoParaDB.jugador_turno_id || null,
                estadoParaDB.jugador_mano_ronda_id || null,
                estadoParaDB.mazo_estado ? JSON.stringify(estadoParaDB.mazo_estado) : null,
                estadoParaDB.cartas_en_mesa_mano_actual ? JSON.stringify(estadoParaDB.cartas_en_mesa_mano_actual) : null,
                estadoParaDB.estado_envido ? JSON.stringify(estadoParaDB.estado_envido) : null,
                estadoParaDB.estado_truco ? JSON.stringify(estadoParaDB.estado_truco) : null,
                estadoParaDB.orden_juego_ronda_actual ? JSON.stringify(estadoParaDB.orden_juego_ronda_actual) : null,
                partidaDBId
            ];
            
            // Verificar que no haya undefined antes de ejecutar
            if (parametros.includes(undefined)) {
                console.error('Error: Hay parámetros undefined en:', 
                    parametros.map((p, i) => p === undefined ? i : null).filter(p => p !== null)
                );
                throw new Error('No se pueden pasar parámetros undefined a la base de datos');
            }
            
            await connection.execute(
                `UPDATE partidas_estado SET 
                    estado_partida = ?, 
                    ronda_actual_numero = ?, 
                    jugador_turno_id = ?, 
                    jugador_mano_ronda_id = ?,
                    mazo_estado = ?,
                    cartas_en_mesa_mano_actual = ?,
                    estado_envido = ?,
                    estado_truco = ?,
                    orden_juego_ronda_actual = ?
                 WHERE id = ?`,
                parametros
            );
            
            connection.release();
        } catch (error) {
            console.error(`Error al persistir estado de partida ${partidaDBId}:`, error);
        }
    };

    const persistirAccionCallback = async (accion) => {
        console.log(`Persistiendo acción para partida ${partidaDBId}:`, accion);
        try {
            const connection = await pool.getConnection();
            await connection.execute(
                `INSERT INTO partidas_acciones_historial (partida_estado_id, ronda_numero, mano_numero_en_ronda, usuario_id_accion, tipo_accion, detalle_accion)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [partidaDBId, accion.ronda_numero, accion.mano_numero_en_ronda, accion.usuario_id_accion, accion.tipo_accion, JSON.stringify(accion.detalle_accion)]
            );
            connection.release();
        } catch (error) {
            console.error(`Error al persistir acción para partida ${partidaDBId}:`, error);
        }
    };
    
    const finalizarPartidaCallback = async (sala, ganadorEquipoId) => {
        console.log(`Partida en sala ${sala} finalizada. Ganador Equipo ID: ${ganadorEquipoId}. Limpiando...`);
        // Actualizar estado de la sala en DB (e.g., a 'esperando' o 'finalizada')
        // Otorgar recompensas, actualizar estadísticas, etc.
        delete activeGames[sala]; // Eliminar de partidas activas en memoria
        // Podrías notificar a la sala que la partida terminó y se puede volver al lobby, etc.
        io.to(sala).emit('partida_terminada_en_servidor', { codigoSala: sala, ganadorEquipoId });
    };

    console.log(`Creando instancia PartidaGame para sala ${codigoSala} con ${jugadoresInfo.length} jugadores...`);
    const partida = new PartidaGame(
        codigoSala,
        jugadoresInfo,
        tipoPartida,
        puntosVictoria,
        notificarEstadoGlobalCallback,
        persistirPartidaCallback,
        persistirAccionCallback,
        finalizarPartidaCallback
    );
    partida.idEnDB = partidaDBId; // Guardar el ID de la DB en la instancia de la partida

    console.log(`Guardando partida en activeGames con código ${codigoSala}`);
    activeGames[codigoSala] = partida;
    
    // Notificar a los jugadores que la partida ha comenzado
    console.log(`Partida ${codigoSala} creada e iniciada.`);
    debugActiveGames(); // Debug después de crear partida
    
    // Enviar explícitamente el estado inicial a todos los jugadores
    try {
        debugLog('gameLogicHandler', `Enviando estado inicial a todos los jugadores de la sala ${codigoSala}`);
        
        // Primero, enviar a cada jugador su estado personalizado
        for (const jugador of jugadoresInfo) {
            const estadoJuego = partida.obtenerEstadoGlobalParaCliente(jugador.id);
            // Usar socket.to() asegura que sólo ese jugador reciba su estado específico
            const jugadorSocketId = await getSocketIdByUserId(io, jugador.id);
            if (jugadorSocketId) {
                io.to(jugadorSocketId).emit('estado_juego_actualizado', estadoJuego);
                debugLog('gameLogicHandler', `Estado enviado a socket ${jugadorSocketId} (jugador ${jugador.nombre_usuario})`);
            } else {
                // Enviar a toda la sala como fallback, pero no es lo ideal
                io.to(codigoSala).emit('estado_juego_actualizado', estadoJuego);
                debugLog('gameLogicHandler', `Socket no encontrado para jugador ${jugador.nombre_usuario}, enviando a toda la sala`);
            }
        }
        
        // Luego enviar evento de inicio de partida a toda la sala
        io.to(codigoSala).emit('partida_iniciada', { 
            codigo_sala: codigoSala,
            mensaje: 'Partida iniciada exitosamente' 
        });
    } catch (error) {
        debugLog('gameLogicHandler', `Error al enviar estado inicial a jugadores: ${error}`, error);
        console.error(`Error al enviar estado inicial a jugadores: ${error}`);
    }
    
    return partida;
}

// Función auxiliar para crear equipos según el tipo
function crearEquiposSegunTipo(tipoPartida, jugadoresInfo) {
    switch(tipoPartida) {
        case '1v1':
            return [
                { id: 1, nombre: 'Equipo 1', jugadores: [jugadoresInfo[0].id] },
                { id: 2, nombre: 'Equipo 2', jugadores: [jugadoresInfo[1].id] }
            ];
        case '2v2':
            return [
                { id: 1, nombre: 'Equipo 1', jugadores: [jugadoresInfo[0].id, jugadoresInfo[2].id] },
                { id: 2, nombre: 'Equipo 2', jugadores: [jugadoresInfo[1].id, jugadoresInfo[3].id] }
            ];
        case '3v3':
            return [
                { id: 1, nombre: 'Equipo 1', jugadores: [jugadoresInfo[0].id, jugadoresInfo[2].id, jugadoresInfo[4].id] },
                { id: 2, nombre: 'Equipo 2', jugadores: [jugadoresInfo[1].id, jugadoresInfo[3].id, jugadoresInfo[5].id] }
            ];
        default:
            throw new Error('Tipo de partida no soportado');
    }
}

/**
 * Maneja una acción enviada por un jugador.
 * @param {string} codigoSala 
 * @param {number} jugadorId ID del usuario que realiza la acción.
 * @param {string} tipoAccion Ej: 'JUGAR_CARTA', 'CANTO', 'RESPUESTA_CANTO', 'IRSE_AL_MAZO'.
 * @param {object} datosAccion Datos específicos de la acción.
 */
function manejarAccionJugador(codigoSala, jugadorId, tipoAccion, datosAccion) {
    const partida = activeGames[codigoSala];
    if (!partida) {
        console.warn(`No se encontró partida activa para la sala ${codigoSala}`);
        // Notificar error al cliente si es posible
        return;
    }
    if (!io) {
        console.error("Error: Socket.IO no ha sido inicializado en gameLogicHandler al manejar acción.");
        return;
    }

    console.log(`Acción recibida para sala ${codigoSala} de jugador ${jugadorId}: ${tipoAccion}`, datosAccion);
    partida.manejarAccionJugador(jugadorId, tipoAccion, datosAccion);
}

/**
 * Maneja la solicitud de un jugador para obtener el estado actual del juego (ej. al reconectar).
 * @param {string} codigoSala 
 * @param {number} jugadorId 
 * @returns {object | null} El estado del juego para el jugador o null si no se encuentra la partida.
 */
function obtenerEstadoJuegoParaJugador(codigoSala, jugadorId) {
  try {
    console.log(`=== SOLICITANDO ESTADO PARA JUGADOR ===`);
    console.log(`Jugador: ${jugadorId}, Sala: ${codigoSala}`);
    debugActiveGames(); // Mostrar estado actual
    
    // Verificar si existe la partida
    if (!activeGames[codigoSala]) {
      console.log(`❌ No se encontró partida activa con código ${codigoSala}`);
      console.log('Salas disponibles:', Object.keys(activeGames));
      return null;
    }
    
    // Obtener estado usando el método correcto
    const partidaGame = activeGames[codigoSala];
    if (!partidaGame) {
      console.log(`❌ No se pudo obtener la instancia de la partida para la sala ${codigoSala}`);
      return null;
    }

    console.log(`✅ Partida encontrada para sala ${codigoSala}`, {
      estadoPartida: partidaGame.estadoPartida,
      numeroJugadores: partidaGame.jugadores?.length,
      tipoPartida: partidaGame.tipoPartida
    });

    // Verificar que el método existe
    if (typeof partidaGame.obtenerEstadoGlobalParaCliente !== 'function') {
      console.error(`El método obtenerEstadoGlobalParaCliente no está definido en la partida ${codigoSala}`);
      return null;
    }

    const estadoCompleto = partidaGame.obtenerEstadoGlobalParaCliente(jugadorId);
    if (!estadoCompleto) {
      console.log(`No se pudo obtener el estado completo para el jugador ${jugadorId}`);
      return null;
    }

    // Verificar que el estado tenga la estructura esperada
    if (!estadoCompleto.jugadores || !Array.isArray(estadoCompleto.jugadores)) {
      console.error(`Estado inválido: no contiene array de jugadores`);
      return null;
    }
    
    // Verificar si el jugador pertenece a esta partida
    const jugadorExiste = estadoCompleto.jugadores.some(j => j.id === jugadorId);
    if (!jugadorExiste) {
      console.log(`El jugador ${jugadorId} no pertenece a la partida ${codigoSala}`);
      return null;
    }
    
    console.log(`Retornando estado válido para jugador ${jugadorId}`);
    return estadoCompleto;
  } catch (error) {
    console.error(`Error al obtener estado para jugador ${jugadorId} en sala ${codigoSala}:`, error);
    // Intentar recuperar un estado básico si es posible
    try {
      const partidaGame = activeGames[codigoSala];
      if (partidaGame && typeof partidaGame.obtenerEstadoBasico === 'function') {
        console.log('Intentando obtener estado básico como fallback...');
        return partidaGame.obtenerEstadoBasico(jugadorId);
      }
    } catch (fallbackError) {
      console.error('Error al intentar obtener estado básico:', fallbackError);
    }
    return null;
  }
}

/**
 * Maneja la desconexión de un jugador.
 * @param {string} codigoSala 
 * @param {number} jugadorId 
 */
function manejarDesconexionJugador(codigoSala, jugadorId) {
    const partida = activeGames[codigoSala];
    if (partida) {
        partida.manejarDesconexionJugador(jugadorId);
        //Si todos los jugadores se desconectan, podrías finalizar la partida.
        const jugadoresConectados = partida.jugadores.filter(j => j.estadoConexion === 'conectado');
        if (jugadoresConectados.length === 0) {
             console.log(`Todos los jugadores desconectados en ${codigoSala}. Finalizando partida.`);
             // Lógica para finalizar y limpiar la partida
            delete activeGames[codigoSala];
        //     // Notificar que la partida se abandonó
        }
    }
}

/**
 * Obtiene una partida activa por su código de sala.
 * @param {string} codigoSala
 * @returns {PartidaGame | undefined}
 */
function getActiveGame(codigoSala) {
    return activeGames[codigoSala];
}

/**
 * Guarda el estado de la partida en la base de datos
 * @param {string} codigo_sala - Código de la sala
 * @param {Object} estadoPartida - Estado de la partida
 */
async function guardarEstadoPartida(codigo_sala, estadoPartida) {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Asegurar que trucoPendientePorEnvidoPrimero se persista correctamente
        const truco_pendiente_flag = estadoPartida.trucoPendientePorEnvidoPrimero ? 1 : 0;
        
        // Convertir objetos JSON a strings para guardar en la base de datos
        const estado_envido = JSON.stringify(estadoPartida.envidoState);
        const estado_truco = JSON.stringify(estadoPartida.trucoState);
        
        await connection.query(`
            UPDATE partidas_estado 
            SET estado_envido = ?,
                estado_truco = ?,
                truco_pendiente_por_envido_primero = ?, 
                fecha_ultima_modificacion = CURRENT_TIMESTAMP
            WHERE codigo_sala = ?
        `, [estado_envido, estado_truco, truco_pendiente_flag, codigo_sala]);
        
    } catch (error) {
        console.error('Error al guardar estado de la partida:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

/**
 * Función de prueba para crear una partida test
 */
async function crearPartidaPrueba() {
    console.log('=== CREANDO PARTIDA DE PRUEBA ===');
    
    const jugadoresPrueba = [
        { id: 1, nombre_usuario: 'Jugador1' },
        { id: 2, nombre_usuario: 'Jugador2' }
    ];
    
    const resultado = await crearNuevaPartida('TEST123', jugadoresPrueba, '1v1', 15);
    console.log('Resultado de partida de prueba:', resultado ? 'ÉXITO' : 'FALLO');
    
    return resultado;
}

/**
 * Obtiene las partidas activas.
 * @returns {Object} Objeto con partidas activas indexadas por código de sala
 */
function getActiveGames() {
    return activeGames;
}

/**
 * Obtiene una partida específica por su código de sala.
 * @param {string} codigoSala - Código de la sala
 * @returns {Object|null} - La partida encontrada o null si no existe
 */
function getGameById(codigoSala) {
    return activeGames[codigoSala] || null;
}

/**
 * Fuerza una actualización de estado para todos los jugadores en una partida.
 * @param {string} codigoSala - Código de la sala a actualizar
 * @returns {Object} - Resultado de la operación
 */
function forceRefreshGameState(codigoSala) {
    debugLog('gameLogicHandler', `Forzando actualización de estado para sala ${codigoSala}`);
    
    const partida = activeGames[codigoSala];
    if (!partida) {
        return {
            success: false,
            message: `No se encontró partida activa con código ${codigoSala}`
        };
    }
    
    try {
        // Obtener jugadores conectados
        const jugadoresIds = partida.jugadores.map(j => j.id);
        
        // Enviar estado a cada jugador
        const estadosEnviados = [];
        for (const jugadorId of jugadoresIds) {
            const estadoJuego = partida.obtenerEstadoGlobalParaCliente(jugadorId);
            if (estadoJuego) {
                io.to(codigoSala).emit('estado_juego_actualizado', estadoJuego);
                estadosEnviados.push(jugadorId);
                debugLog('gameLogicHandler', `Estado enviado a jugador ${jugadorId}`, 
                    { estadoPartida: estadoJuego.estadoPartida });
            }
        }
        
        // Notificar a todos los clientes que la partida ha iniciado (por si alguno está esperando)
        io.to(codigoSala).emit('partida_iniciada', { codigo_sala: codigoSala });
        
        return {
            success: true,
            message: `Estado actualizado para ${estadosEnviados.length} jugadores en sala ${codigoSala}`,
            jugadoresNotificados: estadosEnviados,
            totalJugadores: jugadoresIds.length
        };
    } catch (error) {
        debugLog('gameLogicHandler', `Error al forzar actualización para sala ${codigoSala}`, error);
        return {
            success: false,
            message: `Error al actualizar estado: ${error.message}`,
            error: error.toString()
        };
    }
}

/**
 * Busca el socket ID de un usuario por su ID de usuario
 * @param {SocketIO.Server} io - Instancia de Socket.IO
 * @param {number} userId - ID del usuario
 * @returns {string|null} - Socket ID o null si no se encuentra
 */
async function getSocketIdByUserId(io, userId) {
    if (!io) return null;
    
    try {
        const sockets = await io.fetchSockets();
        
        for (const socket of sockets) {
            if (socket.currentUserId === userId) {
                return socket.id;
            }
        }
        
        return null;
    } catch (error) {
        console.error(`Error al buscar socket para usuario ${userId}:`, error);
        return null;
    }
}

module.exports = {
    initializeGameLogic,
    crearNuevaPartida,
    manejarAccionJugador,
    obtenerEstadoJuegoParaJugador,
    manejarDesconexionJugador,
    getActiveGame,
    guardarEstadoPartida,
    debugActiveGames, // Agregamos función de debug
    crearPartidaPrueba, // Función de prueba
    getActiveGames,
    getGameById,
    forceRefreshGameState,
    getSocketIdByUserId // Exportar la nueva función
};