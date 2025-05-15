const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const friendRoutes = require('./friendRoutes');
const salasRoutes = require('../salasRoute'); // Ya existente, actualizar ruta cuando la muevas
const skinRoutes = require('../skinRoutes'); // Ya existente
const gameRoutes = require('../gameRoutes'); // Ya existente
const paymentRoutes = require('../paymentRoutes'); // Ya existente

/**
 * Configura todas las rutas de la aplicación
 * @param {Express} app - La aplicación Express
 */
function setupRoutes(app) {
  // Rutas principales
  app.use('/usuarios', userRoutes);
  app.use('/auth', authRoutes);
  app.use('/amigos', friendRoutes);
  
  // Rutas con prefijo /api
  app.use('/api/salas', salasRoutes);
  app.use('/api', skinRoutes);
  app.use('/api', paymentRoutes);
  app.use('/api/game', gameRoutes);
  
  // Ruta de ping para verificar conexión a BD
  app.get('/ping', async (req, res) => {
    try {
      const pool = require('../config/db');
      const [rows] = await pool.query('SELECT 1 + 1 AS result');
      res.json({ message: 'Conexión exitosa a MySQL', result: rows[0].result });
    } catch (err) {
      console.error('Error al conectar con la base de datos:', err.message);
      res.status(500).json({ error: 'Error al conectar con la base de datos' });
    }
  });
}

module.exports = setupRoutes;