const pool = require('../config/db');

/**
 * Controlador para obtener estadísticas del usuario autenticado
 */
const obtenerEstadisticasUsuarioActual = async (req, res) => {
  try {
    const usuarioId = req.user.id; // Desde el middleware de autenticación

    const [stats] = await pool.query(
      'SELECT elo, victorias, derrotas, partidas_jugadas FROM estadisticas WHERE usuario_id = ?',
      [usuarioId]
    );

    if (stats.length === 0) {
      // Crear estadísticas por defecto si no existen
      await pool.query(
        'INSERT INTO estadisticas (usuario_id, elo, victorias, derrotas, partidas_jugadas) VALUES (?, 500, 0, 0, 0)',
        [usuarioId]
      );
      
      return res.json({
        elo: 500,
        victorias: 0,
        derrotas: 0,
        partidas_jugadas: 0
      });
    }

    res.json(stats[0]);
  } catch (err) {
    console.error('Error al obtener estadísticas del usuario actual:', err.message);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

/**
 * Controlador para obtener estadísticas de un usuario por ID
 */
const obtenerEstadisticasPorId = async (req, res) => {
  const { usuario_id } = req.params;

  try {
    const [user] = await pool.query('SELECT nombre_usuario FROM usuarios WHERE id = ?', [usuario_id]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const [rows] = await pool.query('SELECT * FROM estadisticas WHERE usuario_id = ?', [usuario_id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Estadísticas no encontradas' });
    }

    res.json({
      username: user[0].nombre_usuario,
      ...rows[0],
    });
  } catch (err) {
    console.error('Error al obtener estadísticas:', err.message);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

/**
 * Controlador para obtener estadísticas de un usuario por username
 */
const obtenerEstadisticasPorUsername = async (req, res) => {
  const { username } = req.params;
  
  try {
    // Obtener el ID del usuario
    const [user] = await pool.query('SELECT id FROM usuarios WHERE nombre_usuario = ?', [username]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario_id = user[0].id;
    console.log('Usuario encontrado, ID:', usuario_id);

    const [rows] = await pool.query('SELECT * FROM estadisticas WHERE usuario_id = ?', [usuario_id]);
    if (rows.length === 0) {
      console.log('No se encontraron estadísticas para el usuario:', username);
      return res.json({
        victorias: 0,
        derrotas: 0,
        partidas_jugadas: 0,
        elo: 500,
      });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener estadísticas:', err.message);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

/**
 * Controlador para obtener el ranking de jugadores
 */
const obtenerRanking = async (req, res) => {
  try {
    // Obtener todos los usuarios con sus estadísticas, ordenados por ELO descendente
    // Excluir usuarios anónimos (que empiecen con "Anónimo" o tengan ELO menor a 500)
    const [rows] = await pool.query(`
      SELECT u.id,
             u.nombre_usuario, 
             IFNULL(e.victorias, 0) as victorias, 
             IFNULL(e.derrotas, 0) as derrotas, 
             IFNULL(e.partidas_jugadas, 0) as partidas_jugadas, 
             IFNULL(e.elo, 500) as elo
      FROM usuarios u
      LEFT JOIN estadisticas e ON u.id = e.usuario_id
      WHERE u.es_anonimo = 0
        AND IFNULL(e.elo, 500) >= 500
        AND IFNULL(e.partidas_jugadas, 0) > 0
      ORDER BY e.elo DESC, e.victorias DESC
    `);
    
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener el ranking:', err.message);
    res.status(500).json({ error: 'Error al obtener el ranking' });
  }
};

module.exports = {
  obtenerEstadisticasUsuarioActual,
  obtenerEstadisticasPorId,
  obtenerEstadisticasPorUsername,
  obtenerRanking
};
