const express = require('express');
const cors = require('cors');

/**
 * Configura todos los middleware básicos para la aplicación
 * @param {Express} app - La aplicación Express
 */
function setupMiddleware(app) {
  // CORS
  app.use(cors());
  
  // Parseo de JSON y URL encoded
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Servir archivos estáticos
  app.use(express.static('public'));
}

module.exports = setupMiddleware;