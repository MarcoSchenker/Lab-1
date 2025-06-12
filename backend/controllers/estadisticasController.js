const pool = require('../config/db');

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
        elo: 0,
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
    const [rows] = await pool.query(`
      SELECT u.id,
             u.nombre_usuario, 
             IFNULL(e.victorias, 0) as victorias, 
             IFNULL(e.derrotas, 0) as derrotas, 
             IFNULL(e.partidas_jugadas, 0) as partidas_jugadas, 
             IFNULL(e.elo, 0) as elo
      FROM usuarios u
      LEFT JOIN estadisticas e ON u.id = e.usuario_id
      ORDER BY e.elo DESC, e.victorias DESC
    `);
    
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener el ranking:', err.message);
    res.status(500).json({ error: 'Error al obtener el ranking' });
  }
};

module.exports = {
  obtenerEstadisticasPorId,
  obtenerEstadisticasPorUsername,
  obtenerRanking
};
