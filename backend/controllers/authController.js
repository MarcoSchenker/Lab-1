const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

/**
 * Controlador para el registro de usuarios
 */
const registrarUsuario = async (req, res) => {
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
    const defaultImagePath = path.join(__dirname, '../public/foto_anonima.jpg');
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
};

/**
 * Controlador para el login de usuarios
 */
const loginUsuario = async (req, res) => {
  const { nombre_usuario, contraseña } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE nombre_usuario = ?', [nombre_usuario]);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const usuario = rows[0];
    const isMatch = await bcrypt.compare(contraseña, usuario.contraseña);

    if (!isMatch) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    // Generar el access token (válido por 24 horas)
    const accessToken = jwt.sign(
      { id: usuario.id, nombre_usuario: usuario.nombre_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Generar el refresh token (válido por 7 días)
    const refreshToken = jwt.sign(
      { id: usuario.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Inicio de sesión exitoso',
      accessToken,
      refreshToken,
      nombre_usuario: usuario.nombre_usuario,
    });
  } catch (err) {
    console.error('Error al iniciar sesión:', err.message);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

/**
 * Controlador para crear usuarios anónimos
 */
const crearUsuarioAnonimo = async (req, res) => {
  try {
    // Lista de nombres para usuarios anónimos
    const nombres = ['Fulanito', 'Pepito', 'ElKuka', 'DonPedro', 'Darin'];
    const nombreAleatorio = nombres[Math.floor(Math.random() * nombres.length)];
    
    // Sufijo numérico aleatorio
    const sufijo = Math.floor(10000 + Math.random() * 90000);
    const nombre_usuario = `${nombreAleatorio}${sufijo}`;
    
    // Generar contraseña aleatoria segura
    const contraseña = crypto.randomBytes(12).toString('hex');
    
    // Email provisional
    const email = `${nombre_usuario.toLowerCase()}@anonimo.trucho`;
    
    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(contraseña, 10);
    
    // Insertar el usuario temporal en la base de datos
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre_usuario, email, contraseña, es_anonimo) VALUES (?, ?, ?, 1)',
      [nombre_usuario, email, hashedPassword]
    );
    
    const userId = result.insertId;

    const defaultImagePath = path.join(__dirname, '../public/foto_anonima.jpg');
    let defaultImage;

    try {
      defaultImage = fs.readFileSync(defaultImagePath);
    } catch (err) {
      console.error('Error al leer foto_anonima.jpg:', err.message);
      defaultImage = null;
    }

    // Insertar la imagen por defecto en la tabla imagenes_perfil
    if (defaultImage) {
      await pool.query('INSERT INTO imagenes_perfil (usuario_id, imagen) VALUES (?, ?)', [userId, defaultImage]);
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { id: userId, nombre_usuario, es_anonimo: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Usuario anónimo creado exitosamente',
      accessToken: token,
      nombre_usuario,
      es_anonimo: true
    });
  } catch (err) {
    console.error('Error al crear usuario anónimo:', err.message);
    res.status(500).json({ error: 'Error al crear usuario anónimo' });
  }
};

/**
 * Controlador para eliminar usuarios anónimos
 */
const eliminarUsuarioAnonimo = async (req, res) => {
  const { nombre_usuario } = req.params;
  
  try {
    // Verificar que el usuario existe y es anónimo
    const [user] = await pool.query('SELECT id, es_anonimo FROM usuarios WHERE nombre_usuario = ?', [nombre_usuario]);
    
    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    if (!user[0].es_anonimo) {
      return res.status(400).json({ error: 'Solo se pueden eliminar usuarios anónimos' });
    }
    
    // Eliminar el usuario anónimo (las relaciones deberían tener ON DELETE CASCADE)
    await pool.query('DELETE FROM usuarios WHERE id = ?', [user[0].id]);
    
    res.json({ message: 'Usuario anónimo eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar usuario anónimo:', err.message);
    res.status(500).json({ error: 'Error al eliminar usuario anónimo' });
  }
};

/**
 * Controlador para refrescar tokens
 */
const refrescarToken = (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const newAccessToken = jwt.sign(
      { id: decoded.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error('Error al verificar el refresh token:', err.message);
    res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
};

/**
 * Controlador para obtener usuarios disponibles (excluyendo amigos)
 */
const obtenerUsuariosDisponibles = async (req, res) => {
  const { nombre_usuario } = req.query;

  if (!nombre_usuario) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        u.nombre_usuario,
        IFNULL(
          CONCAT('${process.env.BACKEND_URL || 'http://localhost:3001'}/usuarios/', u.nombre_usuario, '/foto-perfil'), 
          '${process.env.BACKEND_URL || 'http://localhost:3001'}/foto_anonima.jpg'
        ) AS foto_perfil
      FROM usuarios u
      WHERE u.nombre_usuario != ? 
      AND u.nombre_usuario NOT IN (
        SELECT u2.nombre_usuario
        FROM amigos a
        JOIN usuarios u2 ON (a.usuario_id = u2.id OR a.amigo_id = u2.id)
        WHERE (a.usuario_id = (SELECT id FROM usuarios WHERE nombre_usuario = ?) 
        OR a.amigo_id = (SELECT id FROM usuarios WHERE nombre_usuario = ?))
        AND a.estado IN ('pendiente', 'aceptado')
      )
      AND u.es_anonimo = 0
      `,
      [nombre_usuario, nombre_usuario, nombre_usuario]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error al obtener usuarios disponibles:', err.message);
    res.status(500).json({ error: 'Error al obtener usuarios disponibles' });
  }
};

/**
 * Controlador para obtener ID de usuario por username
 */
const obtenerIdUsuario = async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
  }

  try {
    const [rows] = await pool.query('SELECT id FROM usuarios WHERE nombre_usuario = ?', [username]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ id: rows[0].id });
  } catch (err) {
    console.error('Error al obtener el ID del usuario:', err.message);
    res.status(500).json({ error: 'Error al obtener el ID del usuario' });
  }
};

/**
 * Controlador para obtener username por ID
 */
const obtenerUsername = async (req, res) => {
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

    res.json({ nombre_usuario: rows[0].nombre_usuario });
  } catch (err) {
    console.error("Error al obtener username:", err.message);
    res.status(500).json({ error: "Error al obtener username" });
  }
};

/**
 * Controlador para obtener lista de usuarios (excluyendo amigos)
 */
const obtenerUsuarios = async (req, res) => {
  const { nombre_usuario } = req.query;

  if (!nombre_usuario) {
    return res.status(400).json({ error: "El nombre de usuario es obligatorio" });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT nombre_usuario 
      FROM usuarios 
      WHERE nombre_usuario != ? 
      AND nombre_usuario NOT IN (
        SELECT user2 AS nombre_usuario FROM amigos WHERE user1 = ?
        UNION
        SELECT user1 AS nombre_usuario FROM amigos WHERE user2 = ?
      )
      `,
      [nombre_usuario, nombre_usuario, nombre_usuario]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error al obtener usuarios:", err.message);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

module.exports = {
  registrarUsuario,
  loginUsuario,
  crearUsuarioAnonimo,
  eliminarUsuarioAnonimo,
  refrescarToken,
  obtenerUsuariosDisponibles,
  obtenerIdUsuario,
  obtenerUsername,
  obtenerUsuarios
};
