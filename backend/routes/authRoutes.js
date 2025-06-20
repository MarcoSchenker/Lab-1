const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas de autenticación
router.post('/usuarios', authController.registrarUsuario);
router.post('/login', authController.loginUsuario);
router.post('/refresh-token', authController.refrescarToken);

// Rutas de usuarios anónimos
router.post('/usuario-anonimo', authController.crearUsuarioAnonimo);
router.delete('/usuario-anonimo/:nombre_usuario', authController.eliminarUsuarioAnonimo);

// Rutas de consulta de usuarios
router.get('/username', authController.obtenerUsername);
router.get('/usuarios', authController.obtenerUsuarios);
router.get('/usuarios/id', authController.obtenerIdUsuario);
router.get('/usuarios-disponibles', authController.obtenerUsuariosDisponibles);

module.exports = router;
