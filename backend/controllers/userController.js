const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

// Ruta a la imagen por defecto
const defaultImagePath = path.join(__dirname, '../public/foto_anonima.jpg');

/**
 * Registra un nuevo usuario
 */
async function registerUser(req, res) {
  const { nombre_usuario, email, contraseña, fromGoogle } = req.body;

  // Validar que todos los campos estén presentes
  if (!nombre_usuario || !email || !contraseña) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  // Validar el formato del email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }

  // Validar la longitud de la contraseña (solo si no es fromGoogle)
  if (contraseña.length < 6 && !fromGoogle) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    // Insertar el usuario en la base de datos
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre_usuario, email, contraseña) VALUES (?, ?, ?)',
      [nombre_usuario, email, hashedPassword]
    );

    const userId = result.insertId;

    // Leer la imagen por defecto desde el sistema de archivos
    let defaultImage;

    try {
      defaultImage = fs.readFileSync(defaultImagePath);
    } catch (err) {
      console.error('Error al leer foto_anonima.jpg:', err.message);
      return res.status(500).json({ error: 'Error al asignar la imagen por defecto' });
    }

    // Insertar la imagen por defecto en la tabla imagenes_perfil
    await pool.query('INSERT INTO imagenes_perfil (usuario_id, imagen) VALUES (?, ?)', [userId, defaultImage]);

    res.status(201).json({ message: 'Usuario registrado exitosamente', userId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El nombre de usuario o email ya está en uso' });
    }
    console.error('Error al registrar usuario:', err.message);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
}

/**
 * Obtiene un usuario por ID
 */
async function getUserById(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "El id del usuario es obligatorio" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT nombre_usuario FROM usuarios WHERE id = ?", [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error("Error al ver id:", err.message);
    res.status(500).json({ error: "Error al ver id" });
  }
}

// Aquí continuarían el resto de los controladores con lógica similar

module.exports = {
  registerUser,
  getUserById,
  // Exporta el resto de controladores
};