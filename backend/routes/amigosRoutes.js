const express = require('express');
const router = express.Router();
const amigosController = require('../controllers/amigosController');

// Rutas de amigos
router.post('/amigos', amigosController.enviarSolicitudAmistad);
router.get('/amigos', amigosController.obtenerAmigos);
router.get('/friend-requests', amigosController.obtenerSolicitudesPendientes);
router.post('/friend-requests/:id/accept', amigosController.aceptarSolicitud);
router.delete('/friend-requests/:id/reject', amigosController.rechazarSolicitud);

module.exports = router;
