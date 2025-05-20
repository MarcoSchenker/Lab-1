const express = require('express');
const router = express.Router();
const pool = require('./config/db');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('./middleware/authMiddleware');
const gameLogicHandler = require('./game_logic/gameLogicHandler');

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
      WHERE p.estado = 'en curso'
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

    // Tiempo de expiración para TODAS las salas (5 minutos)
    const ahora = new Date();
    const expiracion = new Date(ahora.getTime() + (3 * 60 * 1000));
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
       VALUES (?, ?, ?, ?, ?, ?, 'en curso', ?, ?)`,
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

// Endpoint para unirse a una sala
router.post('/unirse', authenticateToken, async (req, res) => {
  const { codigo_sala, codigo_acceso } = req.body;
  const usuario_id = req.user.id;

  try {
    const connection = await pool.getConnection();

    // Verificar si la sala existe y no está llena
    let query = `
        SELECT s.*, 
               (SELECT COUNT(*) FROM jugadores_partidas jp WHERE jp.codigo_sala = s.codigo_sala) AS jugadores_actuales
        FROM partidas s
        WHERE s.codigo_sala = ?
    `;
    const [salas] = await connection.query(query, [codigo_sala]);

    if (salas.length === 0) {
      await connection.release();
      return res.status(404).json({ error: 'Sala no encontrada' });
    }

    const sala = salas[0];

    // Verificar si la partida ya está en curso
    if (sala.estado === 'en_curso') {
      // Verificar si el usuario ya está en la partida (posible reconexión)
      const [jugadorExistente] = await connection.query(
        'SELECT * FROM jugadores_partidas WHERE codigo_sala = ? AND usuario_id = ?',
        [codigo_sala, usuario_id]
      );

      if (jugadorExistente.length > 0) {
        await connection.release();
        return res.json({ mensaje: 'Reconexión a la partida', codigo_sala });
      } else {
        await connection.release();
        return res.status(400).json({ error: 'La partida ya está en curso' });
      }
    }

    // Verificar si la sala está llena
    if (sala.jugadores_actuales >= sala.max_jugadores) {
      await connection.release();
      return res.status(400).json({ error: 'La sala está llena' });
    }

    // Si es sala privada, verificar código de acceso
    if (sala.tipo === 'privada' && (!codigo_acceso || sala.codigo_acceso !== codigo_acceso)) {
      await connection.release();
      return res.status(401).json({ error: 'Código de acceso incorrecto' });
    }

    // Verificar que el usuario no esté ya en la sala
    const [jugadorExistente] = await connection.query(
      'SELECT * FROM jugadores_partidas WHERE codigo_sala = ? AND usuario_id = ?',
      [codigo_sala, usuario_id]
    );

    if (jugadorExistente.length > 0) {
      await connection.release();
      return res.status(400).json({ error: 'Ya estás en esta sala' });
    }

    // Obtener información del usuario
    const [usuarios] = await connection.query(
      'SELECT nombre_usuario FROM usuarios WHERE id = ?',
      [usuario_id]
    );

    if (usuarios.length === 0) {
      await connection.release();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Añadir usuario a la sala
    await connection.query(
      'INSERT INTO jugadores_partidas (codigo_sala, usuario_id) VALUES (?, ?)',
      [codigo_sala, usuario_id]
    );

    // Verificar si la sala ahora está llena para iniciar la partida
    const [actualizadoSalas] = await connection.query(query, [codigo_sala]);
    const salaActualizada = actualizadoSalas[0];

    if (salaActualizada.jugadores_actuales === salaActualizada.max_jugadores) {
      // Cambiar estado a 'en_curso'
      await connection.query(
        'UPDATE partidas SET estado = ? WHERE codigo_sala = ?',
        ['en_curso', codigo_sala]
      );

      // Obtener todos los jugadores en la sala
      const [jugadores] = await connection.query(
        `SELECT jp.usuario_id, u.nombre_usuario 
         FROM jugadores_partidas jp 
         JOIN usuarios u ON jp.usuario_id = u.id
         WHERE jp.codigo_sala = ?
         ORDER BY jp.fecha_union`,
        [codigo_sala]
      );

      // Crear arreglo de jugadoresInfo para iniciar la partida
      const jugadoresInfo = jugadores.map(j => ({
        id: j.usuario_id,
        nombreUsuario: j.nombre_usuario
      }));

      await connection.release();

      // Iniciar la partida con el gameLogicHandler
      const tipoPartida = salaActualizada.max_jugadores === 2 ? '1v1' :
                        salaActualizada.max_jugadores === 4 ? '2v2' : '3v3';

      try {
        // Crear nueva partida en el gameLogicHandler
        await gameLogicHandler.crearNuevaPartida(
          codigo_sala, 
          jugadoresInfo, 
          tipoPartida, 
          salaActualizada.puntos_victoria
        );

        // Notificar a los jugadores que la partida ha comenzado
        const io = req.app.get('io');
        io.to(codigo_sala).emit('partida_iniciada', { 
          codigo_sala, 
          mensaje: 'La partida ha comenzado' 
        });

        return res.json({ 
          mensaje: 'Te has unido a la sala y la partida ha comenzado', 
          codigo_sala 
        });
      } catch (error) {
        console.error('Error al iniciar la partida:', error);
        return res.status(500).json({ 
          error: 'Error al iniciar la partida', 
          detalles: error.message 
        });
      }
    } else {
      await connection.release();

      // Notificar a los usuarios en la sala que un nuevo jugador se unió
      const io = req.app.get('io');
      io.to(codigo_sala).emit('jugador_unido', { 
        usuario_id, 
        nombre_usuario: usuarios[0].nombre_usuario,
        jugadores_actuales: salaActualizada.jugadores_actuales,
        max_jugadores: salaActualizada.max_jugadores
      });

      return res.json({ 
        mensaje: 'Te has unido a la sala correctamente', 
        codigo_sala 
      });
    }
  } catch (error) {
    console.error('Error al unirse a la sala:', error);
    return res.status(500).json({ error: 'Error al unirse a la sala' });
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
       WHERE p.codigo_acceso = ? AND p.estado = 'en curso' AND p.tipo = 'privada'
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