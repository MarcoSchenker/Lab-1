// Importar módulos
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/db');

// Inicializar Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta de prueba para verificar la conexión
app.get('/ping', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ message: 'Conexión exitosa a MySQL', result: rows[0].result });
  } catch (err) {
    console.error('Error al conectar con la base de datos:', err.message);
    res.status(500).json({ error: 'Error al conectar con la base de datos' });
  }
});

// Endpoint básico
app.get('/', (req, res) => {
  res.send('Servidor Truco está activo 🎴');
});

// Endpoint para registrar un usuario
app.post('/usuarios', async (req, res) => {
  const { nombre_usuario, email, contraseña } = req.body;

  try {
    // Encriptar la contraseña antes de guardarla
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    // Insertar el usuario en la base de datos
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre_usuario, email, contraseña) VALUES (?, ?, ?)',
      [nombre_usuario, email, hashedPassword]
    );

    res.status(201).json({ message: 'Usuario registrado exitosamente', userId: result.insertId });
  } catch (err) {
    console.error('Error al registrar usuario:', err.message);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Endpoint para iniciar sesión
app.post('/login', async (req, res) => {
  const { nombre_usuario, contraseña } = req.body;

  try {
    // Buscar el usuario en la base de datos
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE nombre_usuario = ?', [nombre_usuario]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = rows[0];

    // Verificar la contraseña
    const bcrypt = require('bcrypt');
    const isMatch = await bcrypt.compare(contraseña, usuario.contraseña);

    if (!isMatch) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Generar un token JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: usuario.id, nombre_usuario: usuario.nombre_usuario }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.json({ message: 'Inicio de sesión exitoso', token });
  } catch (err) {
    console.error('Error al iniciar sesión:', err.message);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Endpoint para obtener estadísticas de un usuario
app.get('/estadisticas/:usuario_id', async (req, res) => {
  const { usuario_id } = req.params;

  try {
    const [rows] = await pool.query('SELECT * FROM estadisticas WHERE usuario_id = ?', [usuario_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Estadísticas no encontradas' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener estadísticas:', err.message);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// WebSocket básico
io.on('connection', (socket) => {
  console.log('Nuevo jugador conectado');

  socket.on('disconnect', () => {
    console.log('Jugador desconectado');
  });
});

// Arrancar el servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🔥 Servidor escuchando en http://localhost:${PORT}`);
});
