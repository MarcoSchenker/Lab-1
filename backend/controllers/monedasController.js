const pool = require('../config/db');

/**
 * Controlador para obtener el balance de monedas de un usuario
 */
const obtenerMonedas = async (req, res) => {
  const { usuario_id } = req.params;
  
  try {
    const [rows] = await pool.query('SELECT monedas FROM perfiles WHERE usuario_id = ?', [usuario_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Perfil de usuario no encontrado' });
    }
    
    res.json({ monedas: rows[0].monedas });
  } catch (err) {
    console.error('Error al obtener monedas:', err.message);
    res.status(500).json({ error: 'Error al obtener monedas' });
  }
};

/**
 * Controlador para añadir monedas a un usuario
 */
const añadirMonedas = async (req, res) => {
  const { usuario_id } = req.params;
  const { cantidad } = req.body;
  
  if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser un número positivo' });
  }
  
  try {
    await pool.query(
      'UPDATE perfiles SET monedas = monedas + ? WHERE usuario_id = ?',
      [cantidad, usuario_id]
    );
    
    const [rows] = await pool.query('SELECT monedas FROM perfiles WHERE usuario_id = ?', [usuario_id]);
    
    res.json({ 
      message: 'Monedas añadidas exitosamente', 
      monedas_actuales: rows[0].monedas 
    });
  } catch (err) {
    console.error('Error al añadir monedas:', err.message);
    res.status(500).json({ error: 'Error al añadir monedas' });
  }
};

module.exports = {
  obtenerMonedas,
  añadirMonedas
};
