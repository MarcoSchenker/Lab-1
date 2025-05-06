// routes/salasRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('./config/db');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('./authMiddleware');

// Obtener todas las salas disponibles con filtros
router.get('/api/salas', authenticateToken, async (req, res) => {
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
        COUNT(jp.id) as jugadores_actuales
      FROM partidas p
      LEFT JOIN jugadores_partidas jp ON p.codigo_sala = jp.partida_id
      WHERE p.estado = 'en curso'
    `;

    // Aplicar filtro si es necesario
    if (filtro === 'publicas') {
      query += ` AND p.tipo = 'publica'`;
    } else if (filtro === 'privadas') {
      query += ` AND p.tipo = 'privada'`;
    }

    // Agrupar y ordenar
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
    console.error('Error al obtener salas:', error);
    res.status(500).json({ error: 'Error al obtener salas' });
  }
});

// Crear una nueva sala
router.post('/api/salas/crear', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const { tipo, puntos_victoria, max_jugadores, codigo_acceso } = req.body;
    const usuarioId = req.user.id;
    const codigoSala = uuidv4().substring(0, 8); // Generar código único para la sala
    
    // Configurar tiempo de expiración para salas privadas (30 minutos)
    let tiempoExpiracion = null;
    if (tipo === 'privada') {
      const expiracion = new Date();
      expiracion.setMinutes(expiracion.getMinutes() + 30);
      tiempoExpiracion = expiracion;
    }

    // Validar los datos recibidos
    if (!tipo || (tipo !== 'publica' && tipo !== 'privada')) {
      await connection.rollback();
      return res.status(400).json({ error: 'Tipo de sala inválido' });
    }

    if (tipo === 'privada' && (!codigo_acceso || codigo_acceso.length < 4)) {
      await connection.rollback();
      return res.status(400).json({ error: 'El código de acceso debe tener al menos 4 caracteres' });
    }

    // Asegurar que puntos_victoria y max_jugadores sean números
    const puntosVictoria = parseInt(puntos_victoria) || 15;
    const maxJugadores = parseInt(max_jugadores) || 4;

    // Insertar la nueva sala
    await connection.query(
      `INSERT INTO partidas 
       (codigo_sala, tipo, puntos_victoria, max_jugadores, codigo_acceso, tiempo_expiracion, estado) 
       VALUES (?, ?, ?, ?, ?, ?, 'en curso')`,
      [codigoSala, tipo, puntosVictoria, maxJugadores, codigo_acceso, tiempoExpiracion]
    );

    // Registrar al usuario como jugador (anfitrión) de la sala
    await connection.query(
      `INSERT INTO jugadores_partidas (partida_id, usuario_id, es_anfitrion) VALUES (?, ?, true)`,
      [codigoSala, usuarioId]
    );

    await connection.commit();
    res.status(201).json({ 
      mensaje: 'Sala creada con éxito', 
      codigo_sala: codigoSala 
    });
  } catch (error) {
    console.error('Error al crear sala:', error);
    if (connection) {
      await connection.rollback();
    }
    return res.status(500).json({ error: 'Error al crear sala' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Unirse a una sala pública
router.post('/api/salas/unirse', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const { codigo_sala } = req.body;
    const usuarioId = req.user.id;
    
    // Verificar si la sala existe y está disponible
    const [salas] = await connection.query(
      `SELECT p.*, COUNT(jp.id) as jugadores_actuales 
       FROM partidas p 
       LEFT JOIN jugadores_partidas jp ON p.codigo_sala = jp.partida_id 
       WHERE p.codigo_sala = ? AND p.estado = 'en curso'
       GROUP BY p.codigo_sala`,
      [codigo_sala]
    );

    if (salas.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Sala no encontrada o finalizada' });
    }

    const sala = salas[0];
    
    // Verificar si el usuario ya está en la sala
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

    await connection.commit();
    res.status(200).json({ mensaje: 'Te has unido a la sala con éxito' });
  } catch (error) {
    console.error('Error al unirse a la sala:', error);
    if (connection) {
      await connection.rollback();
    }
    return res.status(500).json({ error: 'Error al unirse a la sala' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Unirse a una sala privada mediante código de acceso
router.post('/api/salas/unirse-privada', authenticateToken, async (req, res) => {
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
router.post('/api/salas/abandonar', authenticateToken, async (req, res) => {
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