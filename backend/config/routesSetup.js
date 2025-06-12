const testRoutes = require('../routes/testRoutes');
const authRoutes = require('../routes/authRoutes');
const estadisticasRoutes = require('../routes/estadisticasRoutes');
const monedasRoutes = require('../routes/monedasRoutes');
const amigosRoutes = require('../routes/amigosRoutes');
const perfilRoutes = require('../routes/perfilRoutes');
const configuracionRoutes = require('../routes/configuracionRoutes');

// Rutas existentes que ya estaban modularizadas
const salasRoutes = require('../salasRoute');
const skinsRoutes = require('../routes/skinRoutes');
const gameRoutes = require('../routes/gameRoutes');
const paymentRoutes = require('../routes/paymentRoutes');
const debugRoutes = require('../routes/debugRoutes');

/**
 * Configura todas las rutas del servidor
 * @param {Express.Application} app - Aplicación Express
 */
function setupRoutes(app) {
  // Rutas básicas y de testing
  app.use('/', testRoutes);
  
  // Rutas de autenticación y usuarios
  app.use('/', authRoutes);
  
  // Rutas de estadísticas
  app.use('/', estadisticasRoutes);
  
  // Rutas de monedas
  app.use('/', monedasRoutes);
  
  // Rutas de amigos
  app.use('/', amigosRoutes);
  
  // Rutas de perfil (fotos)
  app.use('/', perfilRoutes);
  
  // Rutas de configuración de usuario
  app.use('/', configuracionRoutes);
  
  // Rutas que ya estaban modularizadas
  app.use('/api/salas', salasRoutes);
  app.use('/api', skinsRoutes);
  app.use('/api', paymentRoutes);
  app.use('/api/game', gameRoutes);
  app.use('/api/debug', debugRoutes);
}

module.exports = {
  setupRoutes
};
