const bcrypt = require('bcrypt');
const pool = require('../config/db');

/**
 * Controlador para actualizar el nombre de usuario
 */
const actualizarNombreUsuario = async (req, res) => {
  const { username } = req.params;
  const { nuevo_nombre_usuario } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
  }

  try {
    // Verificar si el usuario existe
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE nombre_usuario = ?', [username]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar el nombre de usuario y apodo de perfil
    await pool.query('UPDATE usuarios SET nombre_usuario = ? WHERE nombre_usuario = ?', [nuevo_nombre_usuario, username]);
    await pool.query('UPDATE perfiles SET apodo = ? WHERE apodo = ?', [nuevo_nombre_usuario, username]);

    res.json({ message: 'Nombre de usuario actualizado exitosamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }
    console.error('Error al actualizar el nombre de usuario:', err.message);
    res.status(500).json({ error: 'Error al actualizar el nombre de usuario' });
  }
};

/**
 * Controlador para actualizar la contraseña del usuario
 */
const actualizarContraseña = async (req, res) => {
  const { username } = req.params;
  const { contraseñaActual, nuevaContraseña } = req.body;

  if (!contraseñaActual || !nuevaContraseña) {
    return res.status(400).json({ error: 'Ambas contraseñas son obligatorias' });
  }

  try {
    // Verificar si el usuario existe
    const [rows] = await pool.query('SELECT contraseña FROM usuarios WHERE nombre_usuario = ?', [username]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const contraseñaHash = rows[0].contraseña;

    // Verificar la contraseña actual
    const isMatch = await bcrypt.compare(contraseñaActual, contraseñaHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    // Encriptar la nueva contraseña
    const nuevaContraseñaHash = await bcrypt.hash(nuevaContraseña, 10);

    // Actualizar la contraseña
    await pool.query('UPDATE usuarios SET contraseña = ? WHERE nombre_usuario = ?', [nuevaContraseñaHash, username]);

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    console.error('Error al actualizar la contraseña:', err.message);
    res.status(500).json({ error: 'Error al actualizar la contraseña' });
  }
};

/**
 * Controlador para eliminar el perfil de un usuario
 */
const eliminarPerfil = async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si el usuario existe
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Eliminar el usuario (las relaciones se eliminan automáticamente por ON DELETE CASCADE)
    await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);

    res.json({ message: 'Perfil eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar el perfil:', err.message);
    res.status(500).json({ error: 'Error al eliminar el perfil' });
  }
};

module.exports = {
  actualizarNombreUsuario,
  actualizarContraseña,
  eliminarPerfil
};
