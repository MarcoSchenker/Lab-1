const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateToken } = require('../middleware/authMiddleware');

// Configuración de multer para manejar archivos
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Controladores
const {
  registerUser,
  getUserById,
  getUsersByName,
  getAvailableUsers,
  updateUsername,
  updatePassword,
  deleteUser,
  getUserCoins,
  addUserCoins,
  getUserStats,
  getRanking,
  uploadProfilePic,
  getProfilePic,
  getProfilePicById
} = require('../controllers/userController');

// Rutas de usuarios

// Registro de usuario
router.post('/', registerUser);

// Obtener username por ID
router.get('/username', getUserById);

// Obtener usuarios para añadir como amigos
router.get('/', getUsersByName);
router.get('/usuarios-disponibles', getAvailableUsers);

// Obtener ID por nombre de usuario
router.get('/id', getUserById);

// Obtener estadísticas de usuario
router.get('/estadisticas/:usuario_id', getUserStats);
router.get('/estadisticas/:username', getUserStats);

// Actualizar nombre de usuario
router.put('/:username/username', authenticateToken, updateUsername);

// Actualizar contraseña
router.put('/:username/password', authenticateToken, updatePassword);

// Eliminar usuario
router.delete('/:id', authenticateToken, deleteUser);

// Obtener ranking
router.get('/ranking', getRanking);

// Manejo de monedas
router.get('/:usuario_id/monedas', getUserCoins);
router.post('/:usuario_id/monedas', authenticateToken, addUserCoins);

// Manejo de foto de perfil
router.post('/:usuario_nombre_usuario/foto-perfil', upload.single('foto'), uploadProfilePic);
router.get('/:usuario_nombre_usuario/foto-perfil', getProfilePic);
router.get('/:usuario_id/foto-perfil', getProfilePicById);
router.get('/:userId/foto', getProfilePicById);

module.exports = router;