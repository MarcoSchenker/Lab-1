// userRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('./config/db');
const { authenticateToken } = require('./authMiddleware');

// Obtener el perfil del usuario actual (incluyendo monedas)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [profileRows] = await pool.query(`
      SELECT p.*, u.nombre_usuario, u.email
      FROM perfiles p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.usuario_id = ?
    `, [userId]);
    
    if (profileRows.length === 0) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }
    
    // Obtenemos también las estadísticas
    const [statsRows] = await pool.query(`
      SELECT * FROM estadisticas
      WHERE usuario_id = ?
    `, [userId]);
    
    // Combinamos el perfil con las estadísticas
    const profileData = {
      ...profileRows[0],
      estadisticas: statsRows.length > 0 ? statsRows[0] : null
    };
    
    res.json(profileData);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil de usuario' });
  }
});

// Actualizar el apodo del usuario
router.put('/profile/apodo', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { apodo } = req.body;
    
    if (!apodo) {
      return res.status(400).json({ error: 'El apodo es requerido' });
    }
    
    await pool.query(`
      UPDATE perfiles SET apodo = ?
      WHERE usuario_id = ?
    `, [apodo, userId]);
    
    res.json({ message: 'Apodo actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar apodo:', error);
    res.status(500).json({ error: 'Error al actualizar apodo' });
  }
});

module.exports = router;