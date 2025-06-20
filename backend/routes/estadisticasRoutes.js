const express = require('express');
const router = express.Router();
const estadisticasController = require('../controllers/estadisticasController');

// Rutas de estadísticas
router.get('/estadisticas/:usuario_id', estadisticasController.obtenerEstadisticasPorId);
router.get('/estadisticas-username/:username', estadisticasController.obtenerEstadisticasPorUsername);
router.get('/ranking', estadisticasController.obtenerRanking);

module.exports = router;
