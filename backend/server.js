if (typeof global.SlowBuffer === 'undefined' && typeof Buffer !== 'undefined') {
  global.SlowBuffer = Buffer;
  if (!global.SlowBuffer.prototype.equal && typeof Buffer.prototype.equals === 'function') {
    global.SlowBuffer.prototype.equal = Buffer.prototype.equals;
  } else if (!global.SlowBuffer.prototype.equal) {
    global.SlowBuffer.prototype.equal = function (other) {
      if (!Buffer.isBuffer(this) || !Buffer.isBuffer(other)) return false;
      if (this.length !== other.length) return false;
      return this.equals ? this.equals(other) : this.compare(other) === 0;
    };
  }
}

// Importar módulos principales
const express = require('express');
const http = require('http');
require('dotenv').config();

// Importar configuraciones modularizadas
const { setupMiddleware } = require('./config/middlewareSetup');
const { setupRoutes } = require('./config/routesSetup');
const { setupSocketServer, setIoInstance, getIoInstance } = require('./socket/socketSetup');
const { initializeServices, startServer } = require('./config/serverInit');

// Inicializar Express y servidor HTTP
const app = express();
const server = http.createServer(app);

// Configurar Socket.IO
const io = setupSocketServer(server);
app.set('io', io);
setIoInstance(io);

// Configurar middlewares
setupMiddleware(app);

// Configurar rutas
setupRoutes(app);

// Inicializar servicios y arrancar el servidor
(async () => {
  // Don't start server during testing
  if (process.env.NODE_ENV !== 'test') {
    await initializeServices();
    
    const PORT = process.env.PORT || 3001;
    startServer(server, PORT);
  }
})();

// Exportar para uso en otros módulos
module.exports = { app, server, io, getIoInstance };
