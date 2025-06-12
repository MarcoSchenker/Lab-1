const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracionController');

// Rutas de configuración de usuario
router.put('/usuarios/:username/username', configuracionController.actualizarNombreUsuario);
router.put('/usuarios/:username/password', configuracionController.actualizarContraseña);
router.delete('/usuarios/:id', configuracionController.eliminarPerfil);

module.exports = router;
