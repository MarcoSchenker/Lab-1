/**
 * Middleware que maneja errores 404 (rutas no encontradas)
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({ 
    error: 'Recurso no encontrado',
    path: req.originalUrl
  });
}

/**
 * Middleware que maneja errores generales
 */
function errorHandler(err, req, res, next) {
  console.error('Error en el servidor:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Error interno del servidor' 
    : err.message;
    
  res.status(statusCode).json({ 
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

/**
 * Configura los manejadores de errores en la aplicación
 * @param {Express} app - La aplicación Express
 */
function setupErrorHandlers(app) {
  // Estos middlewares deben ser los últimos en registrarse
  app.use(notFoundHandler);
  app.use(errorHandler);
}

module.exports = {
  notFoundHandler,
  errorHandler,
  setupErrorHandlers
};