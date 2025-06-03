/**
 * Este módulo será el nexo entre tu server.js  y las instancias de PartidaGame.
 *  Se encargará de:
Gestionar Partidas Activas: Mantener un registro de todas las partidas en curso.
Crear Nuevas Partidas: Cuando una sala esté lista, instanciar PartidaGame.
Enrutar Acciones: Recibir acciones de los jugadores (desde server.js) y dirigirlas a la instancia correcta de PartidaGame.
Manejar Callbacks: Implementar las funciones de callback que PartidaGame necesita para notificar y persistir.
 */
const PartidaGame = require('./PartidaGame');
const pool = require('../config/db'); // Acceso a la base de datos
const { getIoInstance } = require('../server'); 

let activeGames = {};
let io;

/**
 * Inicializa el manejador de lógica del juego, principalmente para obtener la instancia de io.
 * @param {SocketIO.Server} ioInstance La instancia del servidor de Socket.IO.
 */
function initializeGameLogic(ioInstance) {
    io = ioInstance;
    console.log("GameLogicHandler inicializado con instancia de Socket.IO.");
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
    console.log('Creando nueva partida:', {
        codigoSala,
        jugadoresInfo,
        tipoPartida,
        puntosVictoria
    });

    if (!io) {
        console.error("Error: Socket.IO no ha sido inicializado en gameLogicHandler.");
        return null;
    }

    if (activeGames[codigoSala]) {
        console.warn(`Ya existe una partida activa para la sala ${codigoSala}.`);
        return activeGames[codigoSala];
    }

    console.log(`Creando nueva partida para la sala ${codigoSala}`);

    // 1. Persistir la creación de la partida en la DB (tabla partidas_estado)
    let partidaDBId;
    try {
        const connection = await pool.getConnection();
        
        // 1. Insertar en partidas_estado
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

    activeGames[codigoSala] = partida;
    
    // Notificar a los jugadores que la partida ha comenzado
    console.log(`Partida ${codigoSala} creada e iniciada. Jugadores notificados.`);
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
    console.log(`Obteniendo estado para jugador ${jugadorId} en sala ${codigoSala}`);
    
    // Verificar si existe la partida
    if (!activeGames[codigoSala]) {
      console.log(`No se encontró partida activa con código ${codigoSala}`);
      return null;
    }
    
    // Obtener estado usando el método correcto
    const partidaGame = activeGames[codigoSala];
    if (!partidaGame) {
      console.log(`No se pudo obtener la instancia de la partida para la sala ${codigoSala}`);
      return null;
    }

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
        // Si todos los jugadores se desconectan, podrías finalizar la partida.
        // const jugadoresConectados = partida.jugadores.filter(j => j.estadoConexion === 'conectado');
        // if (jugadoresConectados.length === 0) {
        //     console.log(`Todos los jugadores desconectados en ${codigoSala}. Finalizando partida.`);
        //     // Lógica para finalizar y limpiar la partida
        //     delete activeGames[codigoSala];
        //     // Notificar que la partida se abandonó
        // }
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

module.exports = {
    initializeGameLogic,
    crearNuevaPartida,
    manejarAccionJugador,
    obtenerEstadoJuegoParaJugador,
    manejarDesconexionJugador,
    getActiveGame,
    guardarEstadoPartida,
};