// Importar módulos
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/db');
const { initializeDatabase } = require('./config/dbInit');

// Inicializar Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middlewares
app.use(cors());
app.use(express.json());

// Inicializar la base de datos antes de arrancar el servidor
(async () => {
  try {
    await initializeDatabase();
    console.log('Base de datos inicializada correctamente');
    // El servidor continuará iniciando aquí
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    process.exit(1);
  }
})();

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

  /// Validar la longitud de la contraseña (solo si no es fromGoogle)
  if (contraseña.length < 6 && !fromGoogle) {
  return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(contraseña, 10);
    // Insertar el usuario en la base de datos sin encriptar la contraseña
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre_usuario, email, contraseña) VALUES (?, ?, ?)',
      [nombre_usuario, email, hashedPassword]
    );

    res.status(201).json({ message: 'Usuario registrado exitosamente', userId: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El nombre de usuario o email ya está en uso' });
    }
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Endpoint para obtener usuarios excluyendo al usuario logueado y sus amigos
app.get("/usuarios", async (req, res) => {
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
});

// Endpoint para obtener usuarios disponibles para agregar
app.get('/usuarios-disponibles', async (req, res) => {
  const { nombre_usuario } = req.query;

  if (!nombre_usuario) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT nombre_usuario 
      FROM usuarios 
      WHERE nombre_usuario != ? 
      AND nombre_usuario NOT IN (
        SELECT u.nombre_usuario
        FROM amigos a
        JOIN usuarios u ON (a.usuario_id = u.id OR a.amigo_id = u.id)
        WHERE (a.usuario_id = (SELECT id FROM usuarios WHERE nombre_usuario = ?) 
        OR a.amigo_id = (SELECT id FROM usuarios WHERE nombre_usuario = ?))
        AND a.estado IN ('pendiente', 'aceptado')
      )
      `,
      [nombre_usuario, nombre_usuario, nombre_usuario]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error al obtener usuarios disponibles:', err.message);
    res.status(500).json({ error: 'Error al obtener usuarios disponibles' });
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

    res.json({ message: 'Inicio de sesión exitoso', token, nombre_usuario: usuario.nombre_usuario });
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

// Endpoint para listar todas las skins disponibles
app.get('/skins', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM skins');
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener skins:', err.message);
    res.status(500).json({ error: 'Error al obtener skins' });
  }
});

// Endpoint para obtener la skin actual de un usuario
app.get('/usuarios/:usuario_id/skin', async (req, res) => {
  const { usuario_id } = req.params;
  
  try {
    const [rows] = await pool.query(`
      SELECT s.* FROM skins s
      INNER JOIN perfiles p ON s.id = p.skin_id
      WHERE p.usuario_id = ?
    `, [usuario_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'El usuario no tiene skin asignada' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener la skin del usuario:', err.message);
    res.status(500).json({ error: 'Error al obtener la skin del usuario' });
  }
});

// Endpoint para cambiar la skin de un usuario (entre las desbloqueadas)
app.put('/usuarios/:usuario_id/skin', async (req, res) => {
  const { usuario_id } = req.params;
  const { skin_id } = req.body;
  
  if (!skin_id) {
    return res.status(400).json({ error: 'El ID de la skin es obligatorio' });
  }
  
  try {
    // Verificar que la skin exista y esté desbloqueada para el usuario
    const [skinRows] = await pool.query(`
      SELECT * FROM skins_desbloqueadas 
      WHERE usuario_id = ? AND skin_id = ?
    `, [usuario_id, skin_id]);
    
    if (skinRows.length === 0) {
      return res.status(403).json({ error: 'Skin no desbloqueada para este usuario' });
    }
    
    // Actualizar el perfil del usuario
    await pool.query('UPDATE perfiles SET skin_id = ? WHERE usuario_id = ?', [skin_id, usuario_id]);
    
    res.json({ message: 'Skin actualizada exitosamente' });
  } catch (err) {
    console.error('Error al actualizar la skin:', err.message);
    res.status(500).json({ error: 'Error al actualizar la skin' });
  }
});

// Endpoint para obtener todas las skins desbloqueadas por un usuario
app.get('/usuarios/:usuario_id/skins-desbloqueadas', async (req, res) => {
  const { usuario_id } = req.params;
  
  try {
    const [rows] = await pool.query(`
      SELECT s.* FROM skins s
      INNER JOIN skins_desbloqueadas sd ON s.id = sd.skin_id
      WHERE sd.usuario_id = ?
    `, [usuario_id]);
    
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener skins desbloqueadas:', err.message);
    res.status(500).json({ error: 'Error al obtener skins desbloqueadas' });
  }
});

// Endpoint para obtener skins disponibles para comprar (no desbloqueadas)
app.get('/usuarios/:usuario_id/skins-disponibles', async (req, res) => {
  const { usuario_id } = req.params;
  
  try {
    const [rows] = await pool.query(`
      SELECT s.*, p.monedas AS monedas_usuario FROM skins s
      CROSS JOIN perfiles p
      WHERE p.usuario_id = ?
      AND s.id NOT IN (
        SELECT skin_id FROM skins_desbloqueadas WHERE usuario_id = ?
      )
    `, [usuario_id, usuario_id]);
    
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener skins disponibles:', err.message);
    res.status(500).json({ error: 'Error al obtener skins disponibles' });
  }
});

// Endpoint para comprar una skin
app.post('/usuarios/:usuario_id/comprar-skin', async (req, res) => {
  const { usuario_id } = req.params;
  const { skin_id } = req.body;
  
  if (!skin_id) {
    return res.status(400).json({ error: 'El ID de la skin es obligatorio' });
  }
  
  try {
    // Iniciar transacción
    await pool.query('START TRANSACTION');
    
    // Verificar que la skin exista y no esté desbloqueada
    const [skinRows] = await pool.query(`
      SELECT s.* FROM skins s
      WHERE s.id = ?
      AND NOT EXISTS (
        SELECT 1 FROM skins_desbloqueadas
        WHERE usuario_id = ? AND skin_id = ?
      )
    `, [skin_id, usuario_id, skin_id]);
    
    if (skinRows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Skin no disponible o ya desbloqueada' });
    }
    
    const skin = skinRows[0];
    
    // Verificar que el usuario tenga suficientes monedas
    const [perfilRows] = await pool.query('SELECT monedas FROM perfiles WHERE usuario_id = ?', [usuario_id]);
    
    if (perfilRows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Perfil de usuario no encontrado' });
    }
    
    const monedas = perfilRows[0].monedas;
    
    if (monedas < skin.precio) {
      await pool.query('ROLLBACK');
      return res.status(403).json({ 
        error: 'Monedas insuficientes', 
        monedas: monedas, 
        precio: skin.precio,
        faltante: skin.precio - monedas
      });
    }
    
    // Descontar monedas del perfil
    await pool.query(
      'UPDATE perfiles SET monedas = monedas - ? WHERE usuario_id = ?',
      [skin.precio, usuario_id]
    );
    
    // Desbloquear la skin para el usuario
    await pool.query(
      'INSERT INTO skins_desbloqueadas (usuario_id, skin_id) VALUES (?, ?)',
      [usuario_id, skin_id]
    );
    
    // Confirmar transacción
    await pool.query('COMMIT');
    
    res.json({ 
      message: 'Skin comprada exitosamente', 
      monedas_restantes: monedas - skin.precio 
    });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error al comprar skin:', err.message);
    res.status(500).json({ error: 'Error al comprar skin' });
  }
});

// Endpoint para obtener el balance de monedas de un usuario
app.get('/usuarios/:usuario_id/monedas', async (req, res) => {
  const { usuario_id } = req.params;
  
  try {
    const [rows] = await pool.query('SELECT monedas FROM perfiles WHERE usuario_id = ?', [usuario_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Perfil de usuario no encontrado' });
    }
    
    res.json({ monedas: rows[0].monedas });
  } catch (err) {
    console.error('Error al obtener monedas:', err.message);
    res.status(500).json({ error: 'Error al obtener monedas' });
  }
});

// Endpoint para añadir monedas a un usuario (por ejemplo, al ganar partidas)
app.post('/usuarios/:usuario_id/monedas', async (req, res) => {
  const { usuario_id } = req.params;
  const { cantidad } = req.body;
  
  if (!cantidad || isNaN(cantidad) || cantidad <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser un número positivo' });
  }
  
  try {
    await pool.query(
      'UPDATE perfiles SET monedas = monedas + ? WHERE usuario_id = ?',
      [cantidad, usuario_id]
    );
    
    const [rows] = await pool.query('SELECT monedas FROM perfiles WHERE usuario_id = ?', [usuario_id]);
    
    res.json({ 
      message: 'Monedas añadidas exitosamente', 
      monedas_actuales: rows[0].monedas 
    });
  } catch (err) {
    console.error('Error al añadir monedas:', err.message);
    res.status(500).json({ error: 'Error al añadir monedas' });
  }
});

// Endpoint para enviar una solicitud de amistad
app.post('/amigos', async (req, res) => {
  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ error: 'Los campos "from" y "to" son obligatorios' });
  }

  try {
    // Verificar si ya existe una relación de amistad
    const [existing] = await pool.query(
      'SELECT * FROM amigos WHERE (usuario_id = ? AND amigo_id = ?) OR (usuario_id = ? AND amigo_id = ?)',
      [from, to, to, from]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Ya existe una relación de amistad o solicitud pendiente' });
    }

    // Crear la solicitud de amistad
    await pool.query('INSERT INTO amigos (usuario_id, amigo_id, estado) VALUES (?, ?, ?)', [from, to, 'pendiente']);
    res.status(201).json({ message: 'Solicitud de amistad enviada' });
  } catch (err) {
    console.error('Error al enviar solicitud de amistad:', err.message);
    res.status(500).json({ error: 'Error al enviar solicitud de amistad' });
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
