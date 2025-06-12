const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');

// Rutas de testing
router.get('/', testController.serverStatus);
router.get('/ping', testController.pingDatabase);
router.get('/test-crear-partida', testController.crearPartidaPrueba);
router.get('/test-obtener-estado/:codigo_sala/:jugador_id', testController.obtenerEstadoPrueba);

module.exports = router;
