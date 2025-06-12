const express = require('express');
const router = express.Router();
const perfilController = require('../controllers/perfilController');

// Rutas de fotos de perfil
router.post('/usuarios/:usuario_nombre_usuario/foto-perfil', 
  perfilController.upload.single('foto'), 
  perfilController.subirFotoPerfil
);
router.get('/usuarios/:usuario_nombre_usuario/foto-perfil', perfilController.obtenerFotoPerfilPorUsername);
router.get('/usuarios/:userId/foto', perfilController.obtenerFotoPerfilPorId);
router.get('/usuarios/:usuario_id/foto-perfil', perfilController.obtenerFotoPerfilAlternativo);

module.exports = router;
