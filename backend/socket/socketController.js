const { setupAuthHandlers } = require('./socketMiddleware');
const { setupGameHandlers } = require('./handlers/gameSocketHandlers');
const gameLogicHandler = require('../game_logic/gameLogicHandler');

/**
 * Configura los manejadores de eventos de Socket.IO
 * @param {SocketIO.Server} io - La instancia del servidor Socket.IO
 */
function setupSocketIO(io) {
  // Inicializar el manejador de lógica del juego con io
  gameLogicHandler.initializeGameLogic(io);
  
  io.on('connection', (socket) => {
    console.log('Un cliente se ha conectado:', socket.id);
    
    // Configurar manejadores de autenticación
    setupAuthHandlers(socket);
    
    // Configurar manejadores de eventos del juego
    setupGameHandlers(socket, io);
    
    socket.on('disconnect', () => {
      console.log(`Socket ${socket.id} desconectado.`);
    });
  });
}

module.exports = setupSocketIO;