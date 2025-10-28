const { initializeDatabase } = require('./dbInit');
const back_url = process.env.BACKEND_URL || 'http://localhost';
/**
 * Inicializa la base de datos y otros servicios necesarios
 */
async function initializeServices() {
  try {
    await initializeDatabase();
    console.log('Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    process.exit(1);
  }
}

/**
 * Inicia el servidor en el puerto especificado
 * @param {http.Server} server - Servidor HTTP
 * @param {number} port - Puerto en el que escuchar
 */
function startServer(server, port = 3001) {
  server.listen(port, () => {
    console.log(`🔥 Servidor escuchando en ${back_url}:${port}`);
  });
}

module.exports = {
  initializeServices,
  startServer
};
