// Arreglando los endpoints de skins
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

// Endpoint para listar todas las skins disponibles
router.get('/skins', async (req, res) => {
    try {
      console.log('Solicitud recibida en /api/skins');
      const [rows] = await pool.query('SELECT * FROM skins');
      console.log('Datos obtenidos de la base de datos:', rows);
      res.json(rows);
    } catch (err) {
      console.error('Error al obtener skins:', err.message);
      res.status(500).json({ error: 'Error al obtener skins' });
    }
  });

// Obtener las skins desbloqueadas por un usuario
router.get('/skins/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [skins] = await pool.query(`
      SELECT s.id, s.codigo, s.nombre, s.precio, sd.fecha_desbloqueo
      FROM skins_desbloqueadas sd
      JOIN skins s ON sd.skin_id = s.id
      WHERE sd.usuario_id = ?
    `, [userId]);

    res.json(skins);
  } catch (error) {
    console.error('Error al obtener skins del usuario:', error);
    res.status(500).json({ error: 'Error al obtener skins del usuario' });
  }
});

// Obtener la skin actualmente seleccionada por el usuario
router.get('/skins/selected', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await pool.query(`
      SELECT s.id, s.codigo, s.nombre
      FROM perfiles p
      JOIN skins s ON p.skin_id = s.id
      WHERE p.usuario_id = ?
    `, [userId]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'No se encontró la skin seleccionada' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error al obtener skin seleccionada:', error);
    res.status(500).json({ error: 'Error al obtener skin seleccionada' });
  }
});

// Seleccionar una skin para usar
router.post('/skins/select/:skinId', authenticateToken, async (req, res) => {
  const skinId = req.params.skinId;
  const userId = req.user.id;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verificar si el usuario tiene desbloqueada la skin
    const [skinCheck] = await connection.query(`
      SELECT 1 FROM skins_desbloqueadas
      WHERE usuario_id = ? AND skin_id = ?
    `, [userId, skinId]);

    if (skinCheck.length === 0) {
      await connection.rollback();
      return res.status(403).json({ error: 'No tienes desbloqueada esta skin' });
    }

    // Actualizar el perfil con la nueva skin seleccionada
    await connection.query(`
      UPDATE perfiles SET skin_id = ?
      WHERE usuario_id = ?
    `, [skinId, userId]);

    await connection.commit();

    res.json({ message: 'Skin seleccionada correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al seleccionar skin:', error);
    res.status(500).json({ error: 'Error al seleccionar skin' });
  } finally {
    connection.release();
  }
});

// Comprar/desbloquear una skin
router.post('/skins/unlock/:skinId', authenticateToken, async (req, res) => {
  const skinId = req.params.skinId;
  const userId = req.user.id;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verificar si el usuario ya tiene la skin
    const [skinCheck] = await connection.query(`
      SELECT 1 FROM skins_desbloqueadas
      WHERE usuario_id = ? AND skin_id = ?
    `, [userId, skinId]);

    if (skinCheck.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Ya tienes desbloqueada esta skin' });
    }

    // Obtener el precio de la skin y las monedas del usuario
    const [skinData] = await connection.query(`
      SELECT precio FROM skins WHERE id = ?
    `, [skinId]);

    const [userData] = await connection.query(`
      SELECT monedas FROM perfiles WHERE usuario_id = ?
    `, [userId]);

    if (skinData.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Skin no encontrada' });
    }

    if (userData.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Perfil de usuario no encontrado' });
    }

    const skinPrice = skinData[0].precio;
    const userCoins = userData[0].monedas;

    // Verificar si el usuario tiene suficientes monedas
    if (userCoins < skinPrice) {
      await connection.rollback();
      return res.status(402).json({ error: 'No tienes suficientes monedas para desbloquear esta skin' });
    }

    // Descontar monedas y desbloquear skin
    await connection.query(`
      UPDATE perfiles SET monedas = monedas - ?
      WHERE usuario_id = ?
    `, [skinPrice, userId]);

    await connection.query(`
      INSERT INTO skins_desbloqueadas (usuario_id, skin_id)
      VALUES (?, ?)
    `, [userId, skinId]);

    await connection.commit();

    res.json({
      message: 'Skin desbloqueada correctamente',
      newBalance: userCoins - skinPrice
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al desbloquear skin:', error);
    res.status(500).json({ error: 'Error al desbloquear skin' });
  } finally {
    connection.release();
  }
});

// Endpoint para obtener el perfil completo del usuario
router.get('/usuarios/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(authenticateToken);
    const [profileRows] = await pool.query(`
      SELECT p.monedas, p.apodo, s.id as skin_id, s.codigo as skin_codigo, s.nombre as skin_nombre
      FROM perfiles p
      LEFT JOIN skins s ON p.skin_id = s.id
      WHERE p.usuario_id = ?
    `, [userId]);
    console.log('Datos del perfil obtenidos:', profileRows);
    if (profileRows.length === 0) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }
    
    res.json(profileRows[0]);
  } catch (err) {
    console.error('Error al obtener perfil:', err.message);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// Obtener preferencias de skin para cada jugador en una sala
router.get('/api/game/:codigo_sala/skins', authenticateToken, async (req, res) => {
  try {
    const { codigo_sala } = req.params;
    
    // Obtener todos los jugadores en esta sala
    const jugadores = await obtenerJugadoresSala(codigo_sala);
    
    // Obtener preferencias de skin para cada jugador
    const preferencias = {};
    for (const jugador of jugadores) {
      const [rows] = await pool.query('SELECT skin_id FROM usuario_skins WHERE usuario_id = ? AND activa = 1', 
        [jugador.usuario_id]);
      const skinId = rows.length > 0 ? rows[0].skin_id : 1; // Default a 1 si no hay selección
      
      const [skinInfo] = await pool.query('SELECT nombre FROM skins WHERE id = ?', [skinId]);
      preferencias[jugador.usuario_id] = skinInfo.length > 0 ? skinInfo[0].nombre : 'Original';
    }
    
    res.json(preferencias);
  } catch (error) {
    console.error('Error al obtener preferencias de skins:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;