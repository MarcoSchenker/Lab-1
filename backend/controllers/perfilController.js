const pool = require('../config/db');
const multer = require('multer');

// Configuración de multer para manejar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Controlador para subir una foto de perfil
 */
const subirFotoPerfil = async (req, res) => {
  const { usuario_nombre_usuario } = req.params;

  if (!req.file) {
    console.error('Error: No se subió ninguna imagen');
    return res.status(400).json({ error: 'No se subió ninguna imagen' });
  }

  try {
    // Leer el archivo como un buffer
    const imageBuffer = req.file.buffer;

    // Obtener el ID del usuario
    const [user] = await pool.query('SELECT id FROM usuarios WHERE nombre_usuario = ?', [usuario_nombre_usuario]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario_id = user[0].id;

    // Eliminar la fila existente (si existe)
    await pool.query('DELETE FROM imagenes_perfil WHERE usuario_id = ?', [usuario_id]);

    // Insertar la nueva imagen en la base de datos
    await pool.query('INSERT INTO imagenes_perfil (usuario_id, imagen) VALUES (?, ?)', [usuario_id, imageBuffer]);

    res.json({ message: 'Foto de perfil subida exitosamente' });
  } catch (err) {
    console.error('Error al subir la foto de perfil:', err.message);
    res.status(500).json({ error: 'Error al subir la foto de perfil' });
  }
};

/**
 * Controlador para obtener foto de perfil por nombre de usuario
 */
const obtenerFotoPerfilPorUsername = async (req, res) => {
  const { usuario_nombre_usuario } = req.params;

  try {
    // Obtener el ID del usuario
    const [user] = await pool.query('SELECT id FROM usuarios WHERE nombre_usuario = ?', [usuario_nombre_usuario]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario_id = user[0].id;

    // Obtener la imagen de la base de datos
    const [rows] = await pool.query('SELECT imagen FROM imagenes_perfil WHERE usuario_id = ?', [usuario_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Foto de perfil no encontrada' });
    }

    const imageBuffer = rows[0].imagen;

    // Enviar la imagen como respuesta
    res.set('Content-Type', 'image/jpeg');
    res.send(imageBuffer);
  } catch (err) {
    console.error('Error al obtener la foto de perfil:', err.message);
    res.status(500).json({ error: 'Error al obtener la foto de perfil' });
  }
};

/**
 * Controlador para obtener foto de perfil por ID de usuario
 */
const obtenerFotoPerfilPorId = async (req, res) => {
  const { userId } = req.params;

  try {
    // Obtener la imagen de la base de datos
    const [rows] = await pool.query('SELECT imagen FROM imagenes_perfil WHERE usuario_id = ?', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Foto de perfil no encontrada' });
    }

    const imageBuffer = rows[0].imagen;

    // Enviar la imagen como respuesta
    res.set('Content-Type', 'image/jpeg');
    res.send(imageBuffer);
  } catch (err) {
    console.error('Error al obtener la foto de perfil:', err.message);
    res.status(500).json({ error: 'Error al obtener la foto de perfil' });
  }
};

/**
 * Controlador alternativo para obtener foto de perfil por ID
 */
const obtenerFotoPerfilAlternativo = async (req, res) => {
  const { usuario_id } = req.params;

  try {
    // Verificar que el usuario existe
    const [user] = await pool.query('SELECT id FROM usuarios WHERE id = ?', [usuario_id]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener la imagen de la base de datos
    const [rows] = await pool.query('SELECT imagen FROM imagenes_perfil WHERE usuario_id = ?', [usuario_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Foto de perfil no encontrada' });
    }

    const imageBuffer = rows[0].imagen;

    // Enviar la imagen como respuesta
    res.set('Content-Type', 'image/jpeg');
    res.send(imageBuffer);
  } catch (err) {
    console.error('Error al obtener la foto de perfil:', err.message);
    res.status(500).json({ error: 'Error al obtener la foto de perfil' });
  }
};

module.exports = {
  upload,
  subirFotoPerfil,
  obtenerFotoPerfilPorUsername,
  obtenerFotoPerfilPorId,
  obtenerFotoPerfilAlternativo
};
