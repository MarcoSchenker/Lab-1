const express = require('express');
const router = express.Router();
const monedasController = require('../controllers/monedasController');

// Rutas de monedas
router.get('/usuarios/:usuario_id/monedas', monedasController.obtenerMonedas);
router.post('/usuarios/:usuario_id/monedas', monedasController.añadirMonedas);

module.exports = router;
