const express = require('express');
const router = express.Router();
const pool = require('./config/db');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('./middleware/authMiddleware');
const gameLogicHandler = require('./game-logic/gameLogicHandler'); // Importar gameLogicHandler

// Middleware de diagnóstico para ver todas las solicitudes
router.use((req, res, next) => {
  next();
});

// Obtener todas las salas disponibles con filtros
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { filtro = 'todas' } = req.query;
    let query = `
      SELECT 
        p.codigo_sala, 
        p.tipo, 
        p.puntos_victoria, 
        p.max_jugadores, 
        p.tiempo_expiracion,
        p.fecha_inicio,
        p.creador,
        COUNT(jp.id) as jugadores_actuales
      FROM partidas p
      LEFT JOIN jugadores_partidas jp ON p.codigo_sala = jp.partida_id
      WHERE p.estado = 'en_juego'
    `;

    if (filtro === 'publicas') {
      query += ` AND p.tipo = 'publica'`;
    } else if (filtro === 'privadas') {
      query += ` AND p.tipo = 'privada'`;
    }

    query += `
      GROUP BY p.codigo_sala
      ORDER BY p.fecha_inicio DESC
    `;

    const [salas] = await pool.query(query);

    // Eliminar salas expiradas
    const ahora = new Date();
    const salasActualizadas = salas.filter(sala => {
      if (sala.tiempo_expiracion) {
        const expiracion = new Date(sala.tiempo_expiracion);
        return expiracion > ahora;
      }
      return true;
    });

    res.json(salasActualizadas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener salas', detalle: error.message });
  }
});

// Crear una nueva sala
router.post('/crear', authenticateToken, async (req, res) => {
  let connection;
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'El cuerpo de la solicitud está vacío' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const { tipo, puntos_victoria, max_jugadores, codigo_acceso } = req.body;
    const usuarioId = req.user.id;
    const usuarioNombre = req.user.nombre_usuario;
    const codigoSala = uuidv4().substring(0, 8);

    // Tiempo de expiración para TODAS las salas (30 minutos)
    const ahora = new Date();
    const expiracion = new Date(ahora.getTime() + (30 * 60 * 1000));
    function toMySQLDatetime(date) {
      const pad = (n) => n < 10 ? '0' + n : n;
      return date.getFullYear() + '-' +
        pad(date.getMonth() + 1) + '-' +
        pad(date.getDate()) + ' ' +
        pad(date.getHours()) + ':' +
        pad(date.getMinutes()) + ':' +
        pad(date.getSeconds());
    }
    const tiempoExpiracion = toMySQLDatetime(expiracion);

    if (!tipo || (tipo !== 'publica' && tipo !== 'privada')) {
      await connection.rollback();
      return res.status(400).json({ error: 'Tipo de sala inválido' });
    }

    if (tipo === 'privada' && (!codigo_acceso || codigo_acceso.length < 4)) {
      await connection.rollback();
      return res.status(400).json({ error: 'El código de acceso debe tener al menos 4 caracteres' });
    }

    const puntosVictoria = parseInt(puntos_victoria) || 15;
    const maxJugadores = parseInt(max_jugadores) || 4;
    const fechaInicio = new Date();

    await connection.query(
      `INSERT INTO partidas 
       (codigo_sala, tipo, puntos_victoria, max_jugadores, codigo_acceso, tiempo_expiracion, estado, fecha_inicio, creador) 
       VALUES (?, ?, ?, ?, ?, ?, 'en_juego', ?, ?)`,
      [codigoSala, tipo, puntosVictoria, maxJugadores, codigo_acceso, tiempoExpiracion, fechaInicio, usuarioNombre]
    );

    await connection.query(
      `INSERT INTO jugadores_partidas (partida_id, usuario_id, es_anfitrion) VALUES (?, ?, true)`,
      [codigoSala, usuarioId]
    );

    await connection.commit();

    res.setHeader('Content-Type', 'application/json');
    return res.status(201).json({
      mensaje: 'Sala creada con éxito',
      codigo_sala: codigoSala
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Error al crear sala', detalle: error.message });
  } finally {
    if (connection) {
      try { connection.release(); } catch {}
    }
  }
});

// Unirse a una sala pública
router.post('/unirse', authenticateToken, async (req, res) => {
  let connection;
  try {
    console.log('Intentando unir usuario a sala:', req.body);
    const { codigo_sala } = req.body;
    const usuarioId = req.user.id;
    
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // Verificar si la sala existe
    const [salas] = await connection.query(
      `SELECT s.*, 
              (SELECT COUNT(*) FROM jugadores_partidas jp WHERE jp.partida_id = s.codigo_sala) AS jugadores_actuales
       FROM partidas s 
       WHERE s.codigo_sala = ?`,
      [codigo_sala]
    );
    
    if (salas.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Sala no encontrada' });
    }
    
    const sala = salas[0];
    
    // Verificar si el jugador ya está en la sala
    const [jugadorExistente] = await connection.query(
      `SELECT * FROM jugadores_partidas WHERE partida_id = ? AND usuario_id = ?`,
      [codigo_sala, usuarioId]
    );
    
    if (jugadorExistente.length > 0) {
      await connection.commit();
      return res.status(200).json({ mensaje: 'Ya estás en esta sala' });
    }
    
    // Verificar si la sala está llena
    if (sala.jugadores_actuales >= sala.max_jugadores) {
      await connection.rollback();
      return res.status(400).json({ error: 'La sala está llena' });
    }
    
    // Verificar si la sala es privada (solo se puede acceder con código)
    if (sala.tipo === 'privada' && !req.body.codigo_acceso) {
      await connection.rollback();
      return res.status(403).json({ error: 'Esta es una sala privada, necesitas un código de acceso' });
    }
    
    // Insertar al usuario como jugador de la sala
    await connection.query(
      `INSERT INTO jugadores_partidas (partida_id, usuario_id, es_anfitrion) VALUES (?, ?, false)`,
      [codigo_sala, usuarioId]
    );
    
    // Verificar si ahora la sala está llena para iniciar la partida
    const nuevaCantidadJugadores = sala.jugadores_actuales + 1;
    if (nuevaCantidadJugadores === sala.max_jugadores) {
      console.log(`[salasRoute] La sala ${codigo_sala} está llena. Iniciando la partida...`);
      
      // Cambiar estado de la sala a 'en_juego'
      await connection.query(
        `UPDATE partidas SET estado = 'en_juego' WHERE codigo_sala = ?`,
        [codigo_sala]
      );
      
      // Obtener todos los jugadores de la sala
      const [jugadores] = await connection.query(
        `SELECT jp.usuario_id, u.nombre_usuario 
         FROM jugadores_partidas jp 
         JOIN usuarios u ON jp.usuario_id = u.id 
         WHERE jp.partida_id = ?`,
        [codigo_sala]
      );
      
      await connection.commit();
      
      // Crear jugadoresInfo para gameLogicHandler
      const jugadoresInfo = jugadores.map(j => ({
        id: j.usuario_id,
        nombre_usuario: j.nombre_usuario
      }));
      
      // Iniciar la partida con gameLogicHandler
      const tipoPartida = sala.max_jugadores === 2 ? '1v1' : 
                          sala.max_jugadores === 4 ? '2v2' : '3v3';
      
      console.log(`[salasRoute] Creando instancia de partida para sala ${codigo_sala}`);
      console.log('[salasRoute] Datos para gameLogicHandler:', {
        codigo_sala,
        jugadoresInfo,
        tipoPartida,
        puntos_victoria: sala.puntos_victoria || 15
      });
      
      try {
        // 1. Crear la instancia de la partida en el backend
        const partidaCreada = await gameLogicHandler.crearNuevaPartida(
          codigo_sala, 
          jugadoresInfo, 
          tipoPartida, 
          sala.puntos_victoria || 15
        );
        
        if (partidaCreada) {
          console.log(`[salasRoute] ✅ Partida creada exitosamente para sala ${codigo_sala}`);
          
          // 2. Notificar a TODOS los sockets en esa sala de lobby para que se redirijan
          const io = req.app.get('io');
          if (io) {
            console.log(`[salasRoute] Emitiendo 'iniciar_redireccion_juego' a la sala ${codigo_sala}`);
            // ✅ Small delay to ensure frontend sockets have joined the lobby room
            setTimeout(() => {
              io.to(codigo_sala).emit('iniciar_redireccion_juego', { codigoSala: codigo_sala });
            }, 100);
          }
          
          return res.status(200).json({ 
            message: 'Te has unido a la sala exitosamente.',
            codigo_sala,
            juego_iniciado: true  // Flag para indicar que el juego fue iniciado
          });
        } else {
          console.log(`[salasRoute] ❌ Error: partida no pudo ser creada para sala ${codigo_sala}`);
          return res.status(500).json({ error: 'Error al crear la partida' });
        }
      } catch (error) {
        console.error('[salasRoute] Error al iniciar la partida:', error);
        return res.status(500).json({ error: 'Error al iniciar la partida' });
      }
    } else {
      await connection.commit();
      return res.status(200).json({ message: 'Te has unido a la sala exitosamente.', codigo_sala });
    }
    
  } catch (error) {
    console.error('Error detallado al unirse a sala:', error);
    if (connection) await connection.rollback();
    return res.status(500).json({ error: 'Error al unirse a la sala' });
  } finally {
    if (connection) connection.release();
  }
});

// Unirse a una sala privada mediante código de acceso
router.post('/unirse-privada', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const { codigo_acceso } = req.body;
    const usuarioId = req.user.id;
    
    // Validar el código de acceso
    if (!codigo_acceso || codigo_acceso.trim() === '') {
      await connection.rollback();
      return res.status(400).json({ error: 'El código de acceso es requerido' });
    }
    
    // Buscar la sala por código de acceso
    const [salas] = await connection.query(
      `SELECT p.*, COUNT(jp.id) as jugadores_actuales 
       FROM partidas p 
       LEFT JOIN jugadores_partidas jp ON p.codigo_sala = jp.partida_id 
       WHERE p.codigo_acceso = ? AND p.estado = 'en_juego' AND p.tipo = 'privada'
       GROUP BY p.codigo_sala`,
      [codigo_acceso]
    );

    if (salas.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Código de acceso inválido o sala no disponible' });
    }

    const sala = salas[0];
    
    // Verificar si la sala ha expirado
    if (sala.tiempo_expiracion) {
      const ahora = new Date();
      const expiracion = new Date(sala.tiempo_expiracion);
      if (expiracion <= ahora) {
        await connection.rollback();
        return res.status(400).json({ error: 'Esta sala ha expirado' });
      }
    }
    
    // Verificar si el usuario ya está en la sala
    const [jugadorExistente] = await connection.query(
      `SELECT * FROM jugadores_partidas WHERE partida_id = ? AND usuario_id = ?`,
      [sala.codigo_sala, usuarioId]
    );

    if (jugadorExistente.length > 0) {
      await connection.commit();
      return res.status(200).json({ 
        mensaje: 'Ya estás en esta sala',
        codigo_sala: sala.codigo_sala
      });
    }
    
    // Verificar si la sala está llena
    if (sala.jugadores_actuales >= sala.max_jugadores) {
      await connection.rollback();
      return res.status(400).json({ error: 'La sala está llena' });
    }
    
    // Insertar al usuario como jugador de la sala
    await connection.query(
      `INSERT INTO jugadores_partidas (partida_id, usuario_id, es_anfitrion) VALUES (?, ?, false)`,
      [sala.codigo_sala, usuarioId]
    );

    await connection.commit();
    res.status(200).json({ 
      mensaje: 'Te has unido a la sala privada con éxito',
      codigo_sala: sala.codigo_sala
    });
  } catch (error) {
    console.error('Error al unirse a la sala privada:', error);
    if (connection) {
      await connection.rollback();
    }
    return res.status(500).json({ error: 'Error al unirse a la sala privada' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Abandonar una sala
router.post('/abandonar', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const { codigo_sala } = req.body;
    const usuarioId = req.user.id;
    
    // Verificar si el usuario está en la sala
    const [jugadores] = await connection.query(
      `SELECT * FROM jugadores_partidas WHERE partida_id = ? AND usuario_id = ?`,
      [codigo_sala, usuarioId]
    );

    if (jugadores.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'No estás en esta sala' });
    }
    
    const esAnfitrion = jugadores[0].es_anfitrion;
    
    // Eliminar al jugador de la sala
    await connection.query(
      `DELETE FROM jugadores_partidas WHERE partida_id = ? AND usuario_id = ?`,
      [codigo_sala, usuarioId]
    );
    
    // Si era el anfitrión, cerrar la sala o transferir el rol a otro jugador
    if (esAnfitrion) {
      // Buscar otro jugador en la sala
      const [otrosJugadores] = await connection.query(
        `SELECT * FROM jugadores_partidas WHERE partida_id = ? LIMIT 1`,
        [codigo_sala]
      );
      
      if (otrosJugadores.length === 0) {
        // No hay más jugadores, cerrar la sala
        await connection.query(
          `UPDATE partidas SET estado = 'finalizada' WHERE codigo_sala = ?`,
          [codigo_sala]
        );
      } else {
        // Transferir rol de anfitrión a otro jugador
        await connection.query(
          `UPDATE jugadores_partidas SET es_anfitrion = true WHERE id = ?`,
          [otrosJugadores[0].id]
        );
      }
    }

    await connection.commit();
    res.status(200).json({ mensaje: 'Has abandonado la sala' });
  } catch (error) {
    console.error('Error al abandonar la sala:', error);
    if (connection) {
      await connection.rollback();
    }
    return res.status(500).json({ error: 'Error al abandonar la sala' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;