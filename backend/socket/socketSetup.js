const { Server } = require('socket.io');
const { setupAuthHandlers } = require('./socketMiddleware');
const { setupGameHandlers, lastPlayerStates } = require('./handlers/gameSocketHandlers');
const gameLogicHandler = require('../game-logic/gameLogicHandler');
require('dotenv').config();

const resolveCorsOrigins = () => {
  const origins = [];
  if (process.env.FRONTEND_URL) origins.push(process.env.FRONTEND_URL);
  if (process.env.BACKEND_URL) origins.push(process.env.BACKEND_URL);
  if (process.env.EXTRA_SOCKET_ORIGINS) {
    origins.push(
      ...process.env.EXTRA_SOCKET_ORIGINS
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
    );
  }
  return Array.from(new Set(origins));
};

/**
 * Configura y inicializa el servidor Socket.IO
 * @param {http.Server} server - Servidor HTTP
 * @returns {SocketIO.Server} - Instancia del servidor Socket.IO
 */
function setupSocketServer(server) {
  const allowedOrigins = resolveCorsOrigins();
  const corsConfig = {
    origin: allowedOrigins.length ? allowedOrigins : '*',
    methods: ["GET", "POST"],
    credentials: true,
  };

  if (!allowedOrigins.length) {
    corsConfig.credentials = false;
  }

  const io = new Server(server, { cors: corsConfig });

  // Inicializar gameLogicHandler con io
  gameLogicHandler.initializeGameLogic(io);
  
  // ✅ Conectar el caché de estados entre módulos
  gameLogicHandler.setPlayerStatesCache(lastPlayerStates);
  console.log('[socketSetup] ✅ Caché de estados conectado entre gameLogicHandler y gameSocketHandlers');

  // Configurar manejadores de eventos de conexión
  io.on('connection', (socket) => {
    console.log(`Nuevo socket conectado: ${socket.id}`);
    
    // Configurar autenticación
    setupAuthHandlers(socket);
    
    // Configurar manejadores de juego
    setupGameHandlers(socket, io);
    
    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log(`Socket ${socket.id} (Usuario ${socket.currentUserId || 'N/A'}) se ha desconectado.`);
      
      if (socket.currentRoom && socket.currentUserId) {
        // Notificar a los otros jugadores
        io.to(socket.currentRoom).emit('jugador_desconectado_broadcast', { 
          usuario_id: socket.currentUserId,
          nombre_usuario: socket.nombreUsuario
        });
        
        // Manejar la desconexión en la lógica del juego si existe el método
        if (typeof gameLogicHandler.manejarDesconexionJugador === 'function') {
          try {
            gameLogicHandler.manejarDesconexionJugador(socket.currentRoom, socket.currentUserId);
          } catch (error) {
            console.error(`Error al manejar desconexión del jugador ${socket.currentUserId}:`, error);
          }
        }
      }
    });
  });

  return io;
}

/**
 * Para poder acceder a io desde otros módulos
 */
let ioInstance = null;

function setIoInstance(io) {
  ioInstance = io;
}

function getIoInstance() {
  return ioInstance;
}

module.exports = {
  setupSocketServer,
  setIoInstance,
  getIoInstance
};
