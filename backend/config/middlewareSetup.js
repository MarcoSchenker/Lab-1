const cors = require('cors');
const express = require('express');

/**
 * Configura todos los middlewares del servidor Express
 * @param {Express.Application} app - Aplicación Express
 */
function setupMiddleware(app) {
  // Middlewares básicos
  app.use(cors());
  app.use(express.json());
  app.use(express.static('public'));
}

module.exports = {
  setupMiddleware
};
