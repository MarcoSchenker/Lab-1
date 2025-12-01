const express = require('express');
const router = express.Router();
const pool = require('./config/db');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('./middleware/authMiddleware');
const gameLogicHandler = require('./game-logic/gameLogicHandler'); // Importar gameLogicHandler
const { normalizeSkinName } = require('./utils/skinUtils');

// Middleware de diagnóstico para ver todas las solicitudes
router.use((req, res, next) => {
  console.log(`[salasRoute] ${req.method} ${req.path} - Query:`, req.query);
  next();
});

// Obtener todas las salas disponibles con filtros (RUTA PÚBLICA para invitados)
router.get('/publicas', async (req, res) => {
  console.log('[salasRoute] 🌐 Accediendo a ruta pública /publicas');
  try {
    const { filtro = 'publicas', pagina = 1, limite = 6, excluir_llenas = 'true' } = req.query;
    console.log('[salasRoute] Parámetros recibidos:', { filtro, pagina, limite, excluir_llenas });
    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    
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
      WHERE p.estado = 'en_juego' AND p.tipo = 'publica'
        AND (p.tiempo_expiracion IS NULL OR p.tiempo_expiracion > NOW())
      GROUP BY p.codigo_sala, p.tipo, p.puntos_victoria, p.max_jugadores, p.tiempo_expiracion, p.fecha_inicio
    `;

    // Filtrar salas llenas si se requiere
    if (excluir_llenas === 'true') {
      query += ` HAVING COUNT(jp.id) < p.max_jugadores`;
    }

    query += `
      ORDER BY p.fecha_inicio DESC
      LIMIT ? OFFSET ?
    `;

    const [salas] = await pool.query(query, [parseInt(limite), offset]);

    // Filtrar salas expiradas (igual que en la ruta principal)
    const ahora = new Date();
    const salasActualizadas = salas.filter(sala => {
      if (!sala.tiempo_expiracion) return true;
      const expiracion = new Date(sala.tiempo_expiracion);
      return expiracion > ahora;
    });

    // Consulta simplificada para contar el total de salas públicas disponibles
    let countQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT p.codigo_sala
        FROM partidas p
        LEFT JOIN jugadores_partidas jp ON p.codigo_sala = jp.partida_id
        WHERE p.estado = 'en_juego' AND p.tipo = 'publica'
          AND (p.tiempo_expiracion IS NULL OR p.tiempo_expiracion > NOW())
        GROUP BY p.codigo_sala, p.max_jugadores
    `;

    if (excluir_llenas === 'true') {
      countQuery += ` HAVING COUNT(jp.id) < p.max_jugadores`;
    }

    countQuery += `) as subconsulta`;

    const [countResult] = await pool.query(countQuery);
    const totalSalas = countResult[0]?.total || 0;
    const totalPaginas = Math.ceil(totalSalas / parseInt(limite));

    res.json({
      salas: salasActualizadas,
      paginacion: {
        pagina_actual: parseInt(pagina),
        total_paginas: totalPaginas,
        total_salas: totalSalas,
        limite: parseInt(limite)
      }
    });
  } catch (error) {
    console.error('Error al obtener salas públicas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener todas las salas disponibles con filtros
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { filtro = 'todas', pagina = 1, limite = 6, excluir_llenas = 'true' } = req.query;
    const offset = (parseInt(pagina) - 1) * parseInt(limite);
    
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
        AND (p.tiempo_expiracion IS NULL OR p.tiempo_expiracion > NOW())
    `;

    if (filtro === 'publicas') {
      query += ` AND p.tipo = 'publica'`;
    } else if (filtro === 'privadas') {
      query += ` AND p.tipo = 'privada'`;
    }

    query += `
      GROUP BY p.codigo_sala
    `;

    // Filtrar salas llenas si se requiere
    if (excluir_llenas === 'true') {
      query += ` HAVING COUNT(jp.id) < p.max_jugadores`;
    }

    query += `
      ORDER BY p.fecha_inicio DESC
      LIMIT ? OFFSET ?
    `;

    const [salas] = await pool.query(query, [parseInt(limite), offset]);

    // Consulta para contar el total de salas disponibles (para paginación)
    let countQuery = `
      SELECT COUNT(DISTINCT p.codigo_sala) as total
      FROM partidas p
      LEFT JOIN jugadores_partidas jp ON p.codigo_sala = jp.partida_id
      WHERE p.estado = 'en_juego'
        AND (p.tiempo_expiracion IS NULL OR p.tiempo_expiracion > NOW())
    `;

    if (filtro === 'publicas') {
      countQuery += ` AND p.tipo = 'publica'`;
    } else if (filtro === 'privadas') {
      countQuery += ` AND p.tipo = 'privada'`;
    }

    if (excluir_llenas === 'true') {
      countQuery += ` AND (SELECT COUNT(*) FROM jugadores_partidas WHERE partida_id = p.codigo_sala) < p.max_jugadores`;
    }

    const [countResult] = await pool.query(countQuery);
    const totalSalas = countResult[0].total;
    const totalPaginas = Math.ceil(totalSalas / parseInt(limite));

    // Eliminar salas expiradas
    const ahora = new Date();
    const salasActualizadas = salas.filter(sala => {
      if (sala.tiempo_expiracion) {
        const expiracion = new Date(sala.tiempo_expiracion);
        return expiracion > ahora;
      }
      return true;
    });

    res.json({
      salas: salasActualizadas,
      paginacion: {
        pagina_actual: parseInt(pagina),
        total_paginas: totalPaginas,
        total_salas: totalSalas,
        limite: parseInt(limite)
      }
    });
  } catch (error) {
    console.error('Error al obtener salas:', error);
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
    const usuarioEsAnonimo = Boolean(req.user.es_anonimo);
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

    if (usuarioEsAnonimo && tipo === 'privada') {
      await connection.rollback();
      return res.status(403).json({ error: 'Los usuarios invitados solo pueden crear salas públicas' });
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
      console.log(`[salasRoute] Usuario ${usuarioId} ya está en sala ${codigo_sala}. Jugadores: ${sala.jugadores_actuales}/${sala.max_jugadores}`);
      
      // Verificar si la sala está llena y el juego debería estar iniciado
      if (sala.jugadores_actuales >= sala.max_jugadores) {
        // Verificar si la partida existe en memoria
        const partidaActiva = gameLogicHandler.getGameById(codigo_sala);
        if (!partidaActiva) {
          console.log(`[salasRoute] ⚠️ Sala ${codigo_sala} llena pero sin partida activa. Intentando recuperar...`);
          
          // Obtener todos los jugadores de la sala
          const [jugadores] = await connection.query(
            `SELECT jp.usuario_id, u.nombre_usuario, COALESCE(s.codigo, 'Original') AS skin_codigo
             FROM jugadores_partidas jp 
             JOIN usuarios u ON jp.usuario_id = u.id 
             LEFT JOIN perfiles p ON p.usuario_id = u.id
             LEFT JOIN skins s ON p.skin_id = s.id
             WHERE jp.partida_id = ?`,
            [codigo_sala]
          );
          
          const jugadoresInfo = jugadores.map(j => ({
            id: j.usuario_id,
            nombre_usuario: j.nombre_usuario,
            skin_preferida: normalizeSkinName(j.skin_codigo)
          }));
          
          const tipoPartida = sala.max_jugadores === 2 ? '1v1' : 
                              sala.max_jugadores === 4 ? '2v2' : '3v3';
          
          try {
            await gameLogicHandler.crearNuevaPartida(
              codigo_sala, 
              jugadoresInfo, 
              tipoPartida, 
              sala.puntos_victoria || 15
            );
            console.log(`[salasRoute] ✅ Partida recuperada exitosamente para sala ${codigo_sala}`);
          } catch (err) {
            console.error(`[salasRoute] ❌ Error al recuperar partida ${codigo_sala}:`, err);
          }
        }
      }
      
      await connection.commit();
      return res.status(200).json({ mensaje: 'Ya estás en esta sala' });
    }
    
    // Verificar si la sala está llena
    if (sala.jugadores_actuales >= sala.max_jugadores) {
      await connection.rollback();
      return res.status(400).json({ error: 'La sala está llena' });
    }
    
    // Verificar si la sala es privada (solo se puede acceder con código)
    if (sala.tipo === 'privada') {
      if (!req.body.codigo_acceso) {
        await connection.rollback();
        return res.status(403).json({ error: 'Esta es una sala privada, necesitas un código de acceso' });
      }
      
      // Validar que el código de acceso sea correcto
      if (req.body.codigo_acceso !== sala.codigo_acceso) {
        await connection.rollback();
        return res.status(403).json({ error: 'Código de acceso incorrecto' });
      }
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
        `SELECT jp.usuario_id, u.nombre_usuario, COALESCE(s.codigo, 'Original') AS skin_codigo
         FROM jugadores_partidas jp 
         JOIN usuarios u ON jp.usuario_id = u.id 
         LEFT JOIN perfiles p ON p.usuario_id = u.id
         LEFT JOIN skins s ON p.skin_id = s.id
         WHERE jp.partida_id = ?`,
        [codigo_sala]
      );
      
      await connection.commit();
      
      // Crear jugadoresInfo para gameLogicHandler
      const jugadoresInfo = jugadores.map(j => ({
        id: j.usuario_id,
        nombre_usuario: j.nombre_usuario,
        skin_preferida: normalizeSkinName(j.skin_codigo)
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

// Unirse a una sala como invitado mediante link (soporta usuarios autenticados y anónimos)
router.post('/unirse-invitado/:codigo_sala', async (req, res) => {
  console.log(`[salasRoute] 🟢 POST /unirse-invitado/${req.params.codigo_sala}`);
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    const { codigo_sala } = req.params;
    const { nombre_invitado } = req.body;
    
    // Verificar si hay un usuario autenticado
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let usuarioAutenticado = null;
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        usuarioAutenticado = jwt.verify(token, process.env.JWT_SECRET || 'tu_clave_secreta');
        console.log(`[salasRoute] Usuario autenticado en unirse-invitado: ${usuarioAutenticado.id}`);
      } catch (e) {
        console.log('[salasRoute] Token inválido en unirse-invitado, procediendo como anónimo');
      }
    }

    // Validar nombre de invitado solo si no está autenticado
    if (!usuarioAutenticado && (!nombre_invitado || nombre_invitado.trim() === '')) {
      await connection.rollback();
      return res.status(400).json({ error: 'El nombre de invitado es requerido' });
    }
    
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
    console.log(`[salasRoute] Sala encontrada: ${codigo_sala}, Jugadores: ${sala.jugadores_actuales}/${sala.max_jugadores}`);
    
    // Verificar si la sala ha expirado
    if (sala.tiempo_expiracion) {
      const ahora = new Date();
      const expiracion = new Date(sala.tiempo_expiracion);
      if (expiracion <= ahora) {
        await connection.rollback();
        return res.status(400).json({ error: 'Esta sala ha expirado' });
      }
    }
    
    // Verificar si la sala está llena
    if (sala.jugadores_actuales >= sala.max_jugadores) {
      // Si el usuario ya está en la sala, permitirle entrar
      if (usuarioAutenticado) {
        const [jugadorExistente] = await connection.query(
          `SELECT * FROM jugadores_partidas WHERE partida_id = ? AND usuario_id = ?`,
          [codigo_sala, usuarioAutenticado.id]
        );
        if (jugadorExistente.length > 0) {
           // Verificar si la partida existe en memoria (recuperación)
           const partidaActiva = gameLogicHandler.getGameById(codigo_sala);
           if (!partidaActiva) {
             console.log(`[salasRoute] ⚠️ Sala ${codigo_sala} llena pero sin partida activa. Intentando recuperar...`);
             // ... lógica de recuperación ...
             const [jugadores] = await connection.query(
               `SELECT jp.usuario_id, u.nombre_usuario, COALESCE(s.codigo, 'Original') AS skin_codigo
                FROM jugadores_partidas jp 
                JOIN usuarios u ON jp.usuario_id = u.id 
                LEFT JOIN perfiles p ON p.usuario_id = u.id
                LEFT JOIN skins s ON p.skin_id = s.id
                WHERE jp.partida_id = ?`,
               [codigo_sala]
             );
             
             const jugadoresInfo = jugadores.map(j => ({
               id: j.usuario_id,
               nombre_usuario: j.nombre_usuario,
               skin_preferida: normalizeSkinName(j.skin_codigo)
             }));
             
             const tipoPartida = sala.max_jugadores === 2 ? '1v1' : 
                                 sala.max_jugadores === 4 ? '2v2' : '3v3';
             
             try {
               await gameLogicHandler.crearNuevaPartida(
                 codigo_sala, 
                 jugadoresInfo, 
                 tipoPartida, 
                 sala.puntos_victoria || 15
               );
               console.log(`[salasRoute] ✅ Partida recuperada exitosamente para sala ${codigo_sala}`);
             } catch (err) {
               console.error(`[salasRoute] ❌ Error al recuperar partida ${codigo_sala}:`, err);
             }
           }

           await connection.commit();
           return res.status(200).json({ 
             mensaje: 'Ya estás en esta sala',
             codigo_sala,
             usuario_id: usuarioAutenticado.id,
             nombre_usuario: usuarioAutenticado.nombre_usuario,
             token: token,
             juego_iniciado: true
           });
        }
      }
      
      await connection.rollback();
      return res.status(400).json({ error: 'La sala está llena' });
    }

    let usuarioId;
    let nombreUsuario;
    let esNuevoUsuario = false;

    if (usuarioAutenticado) {
      usuarioId = usuarioAutenticado.id;
      nombreUsuario = usuarioAutenticado.nombre_usuario;
      
      // Verificar si ya está en la sala
      const [jugadorExistente] = await connection.query(
        `SELECT * FROM jugadores_partidas WHERE partida_id = ? AND usuario_id = ?`,
        [codigo_sala, usuarioId]
      );
      
      if (jugadorExistente.length > 0) {
        await connection.commit();
        // Verificar si el juego ya inició
        const juegoIniciado = sala.estado === 'en_juego';
        return res.status(200).json({ 
          mensaje: 'Ya estás en esta sala',
          codigo_sala,
          usuario_id: usuarioId,
          nombre_usuario: nombreUsuario,
          token: token, // Devolver el mismo token
          juego_iniciado: juegoIniciado
        });
      }
    } else {
      // Crear usuario anónimo temporal
      const nombreUsuarioUnico = `Invitado_${nombre_invitado}_${Date.now()}`;
      const emailTemporal = `${nombreUsuarioUnico}@temp.com`;
      const contraseñaTemporal = 'temp_password';
      const fechaExpiracion = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 horas
      
      const [usuarioResult] = await connection.query(
        `INSERT INTO usuarios (nombre_usuario, email, contraseña, es_anonimo, fecha_expiracion) 
         VALUES (?, ?, ?, true, ?)`,
        [nombreUsuarioUnico, emailTemporal, contraseñaTemporal, fechaExpiracion]
      );
      
      usuarioId = usuarioResult.insertId;
      nombreUsuario = nombreUsuarioUnico;
      esNuevoUsuario = true;
    }
    
    // Insertar al usuario como jugador de la sala
    await connection.query(
      `INSERT INTO jugadores_partidas (partida_id, usuario_id, es_anfitrion) VALUES (?, ?, false)`,
      [codigo_sala, usuarioId]
    );
    
    // Verificar si ahora la sala está llena para iniciar la partida
    const nuevaCantidadJugadores = sala.jugadores_actuales + 1;
    if (nuevaCantidadJugadores === sala.max_jugadores) {
      // Iniciar la partida (código similar al existente)
      await connection.query(
        `UPDATE partidas SET estado = 'en_juego' WHERE codigo_sala = ?`,
        [codigo_sala]
      );
      
      // Obtener todos los jugadores de la sala
      const [jugadores] = await connection.query(
        `SELECT jp.usuario_id, u.nombre_usuario, COALESCE(s.codigo, 'Original') AS skin_codigo
         FROM jugadores_partidas jp 
         JOIN usuarios u ON jp.usuario_id = u.id 
         LEFT JOIN perfiles p ON p.usuario_id = u.id
         LEFT JOIN skins s ON p.skin_id = s.id
         WHERE jp.partida_id = ?`,
        [codigo_sala]
      );
      
      await connection.commit();
      
      // Crear jugadoresInfo para gameLogicHandler
      const jugadoresInfo = jugadores.map(j => ({
        id: j.usuario_id,
        nombre_usuario: j.nombre_usuario,
        skin_preferida: normalizeSkinName(j.skin_codigo)
      }));
      
      // Iniciar la partida con gameLogicHandler
      const tipoPartida = sala.max_jugadores === 2 ? '1v1' : 
                          sala.max_jugadores === 4 ? '2v2' : '3v3';
      
      try {
        const partidaCreada = await gameLogicHandler.crearNuevaPartida(
          codigo_sala, 
          jugadoresInfo, 
          tipoPartida, 
          sala.puntos_victoria || 15
        );
        
        if (partidaCreada) {
          // Preparar token de respuesta
          let tokenRespuesta = token;
          if (esNuevoUsuario) {
            const jwt = require('jsonwebtoken');
            tokenRespuesta = jwt.sign(
              { 
                id: usuarioId, 
                nombre_usuario: nombreUsuario,
                isAnonymous: true 
              },
              process.env.JWT_SECRET || 'tu_clave_secreta',
              { expiresIn: '24h' }
            );
          }
          
          // Notificar a sockets en lobby para redirección
          const io = req.app.get('io');
          if (io) {
            setTimeout(() => {
              io.to(codigo_sala).emit('iniciar_redireccion_juego', { codigoSala: codigo_sala });
            }, 100);
          }
          
          return res.status(200).json({ 
            mensaje: 'Te has unido exitosamente',
            codigo_sala,
            usuario_id: usuarioId,
            nombre_usuario: nombreUsuario,
            token: tokenRespuesta,
            juego_iniciado: true
          });
        }
      } catch (error) {
        console.error('[salasRoute] Error al iniciar la partida para invitado:', error);
        return res.status(500).json({ error: 'Error al iniciar la partida' });
      }
    } else {
      await connection.commit();
      
      // Preparar token de respuesta
      let tokenRespuesta = token;
      if (esNuevoUsuario) {
        const jwt = require('jsonwebtoken');
        tokenRespuesta = jwt.sign(
          { 
            id: usuarioId, 
            nombre_usuario: nombreUsuario,
            isAnonymous: true 
          },
          process.env.JWT_SECRET || 'tu_clave_secreta',
          { expiresIn: '24h' }
        );
      }
      
      return res.status(200).json({ 
        mensaje: 'Te has unido exitosamente',
        codigo_sala,
        usuario_id: usuarioId,
        nombre_usuario: nombreUsuario,
        token: tokenRespuesta,
        juego_iniciado: false
      });
    }
    
  } catch (error) {
    console.error('Error al unirse como invitado:', error);
    if (connection) await connection.rollback();
    return res.status(500).json({ error: 'Error al unirse como invitado' });
  } finally {
    if (connection) connection.release();
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

// Generar enlace de invitación para una sala
router.get('/generar-link/:codigo_sala', authenticateToken, async (req, res) => {
  try {
    const { codigo_sala } = req.params;
    const usuarioId = req.user.id;
    
    // Verificar que el usuario sea el creador de la sala
    const [salas] = await pool.query(
      `SELECT * FROM partidas WHERE codigo_sala = ? AND estado = 'en_juego'`,
      [codigo_sala]
    );
    
    if (salas.length === 0) {
      return res.status(404).json({ error: 'Sala no encontrada' });
    }
    
    const sala = salas[0];
    
    // Verificar que el usuario esté en la sala
    const [jugadores] = await pool.query(
      `SELECT * FROM jugadores_partidas WHERE partida_id = ? AND usuario_id = ?`,
      [codigo_sala, usuarioId]
    );
    
    if (jugadores.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a esta sala' });
    }
    
    // Generar el enlace de invitación
    const baseUrl = process.env.FRONTEND_URL || req.headers.origin || '';
    if (!baseUrl) {
      console.error('[salasRoute] FRONTEND_URL no configurada para generar enlaces');
      return res.status(500).json({ error: 'Configuración de FRONTEND_URL faltante' });
    }
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const enlaceInvitacion = `${normalizedBaseUrl}/unirse-invitado/${codigo_sala}`;
    
    res.json({
      enlace_invitacion: enlaceInvitacion,
      codigo_sala: codigo_sala,
      valido_hasta: sala.tiempo_expiracion
    });
    
  } catch (error) {
    console.error('Error al generar enlace de invitación:', error);
    res.status(500).json({ error: 'Error al generar enlace de invitación' });
  }
});

// Obtener información básica de una sala (público, para invitados)
router.get('/info/:codigo_sala', async (req, res) => {
  try {
    const { codigo_sala } = req.params;
    
    const [salas] = await pool.query(
      `SELECT 
        p.codigo_sala, 
        p.max_jugadores, 
        p.puntos_victoria,
        p.tiempo_expiracion,
        p.creador,
        COUNT(jp.id) as jugadores_actuales
      FROM partidas p
      LEFT JOIN jugadores_partidas jp ON p.codigo_sala = jp.partida_id
      WHERE p.codigo_sala = ? AND p.estado = 'en_juego'
      GROUP BY p.codigo_sala`,
      [codigo_sala]
    );

    if (salas.length === 0) {
      return res.status(404).json({ error: 'Sala no encontrada' });
    }

    const sala = salas[0];
    
    // Verificar si la sala ha expirado
    if (sala.tiempo_expiracion) {
      const ahora = new Date();
      const expiracion = new Date(sala.tiempo_expiracion);
      if (expiracion <= ahora) {
        return res.status(400).json({ error: 'Esta sala ha expirado' });
      }
    }

    res.json(sala);
  } catch (error) {
    console.error('Error al obtener información de sala:', error);
    res.status(500).json({ error: 'Error al obtener información de la sala' });
  }
});

module.exports = router;