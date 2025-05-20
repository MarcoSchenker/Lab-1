// Importar módulos
const express = require('express');
const crypto = require('crypto');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();
const pool = require('./config/db');
const { initializeDatabase } = require('./config/dbInit');
const salasRoutes = require('./salasRoute');
const skinsRoutes = require('./routes/skinRoutes'); 
const gameRoutes = require('./routes/gameRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { authenticateToken } = require('./middleware/authMiddleware');
const gameLogicHandler = require('./game_logic/gameLogicHandler');

// Inicializar Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" , methods: ["GET", "POST"]} });
app.set('io', io);
gameLogicHandler.initializeGameLogic(io); 

io.on('connection', (socket) => {
    // ... (autenticación del socket, unirse a sala) ...
    // let currentRoom = socket.handshake.query.codigo_sala; // O como lo estés manejando
    // let currentUserId = socket.decoded_token.id; // Después de la autenticación del socket

    socket.on('cliente_jugar_carta', async (data) => {
        // Asumir que tienes currentRoom y currentUserId en el scope del socket
        // después de 'unirse_sala_juego' y 'autenticar_socket'
        const { codigo_sala, usuario_id } = socket.datosUsuarioSala; // Ejemplo de cómo podrías tener estos datos
        const { carta } = data;
        if (codigo_sala && usuario_id) {
            gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'JUGAR_CARTA', { idUnicoCarta: carta.idUnico });
        }
    });

    socket.on('cliente_cantar', async (data) => {
        const { codigo_sala, usuario_id } = socket.datosUsuarioSala;
        const { tipo_canto, detalle_adicional } = data;
        if (codigo_sala && usuario_id) {
            gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'CANTO', { tipoCanto: tipo_canto, detalleCanto: detalle_adicional });
        }
    });

    socket.on('cliente_responder_canto', async (data) => {
        const { codigo_sala, usuario_id } = socket.datosUsuarioSala;
        const { respuesta, canto_respondido_tipo, nuevo_canto_si_mas, puntos_envido } = data;
        
        if (codigo_sala && usuario_id) {
            // Si es "Son Buenas" para el envido
            if (respuesta === 'SON_BUENAS_ENVIDO') {
                gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'RESPUESTA_CANTO', { 
                    respuesta, 
                    cantoRespondidoTipo: 'ENVIDO'
                });
            } 
            // Si son puntos declarados para el envido
            else if (!isNaN(parseInt(respuesta)) && respuesta > 0) {
                gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'RESPUESTA_CANTO', { 
                    respuesta: parseInt(respuesta), // Convertir a número
                    cantoRespondidoTipo: 'ENVIDO',
                    puntos: parseInt(respuesta)
                });
            }
            // Si es una respuesta normal
            else {
                gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'RESPUESTA_CANTO', { 
                    respuesta, 
                    cantoRespondidoTipo: canto_respondido_tipo,
                    nuevoCantoSiMas: nuevo_canto_si_mas 
                });
            }
        }
    });

    socket.on('cliente_son_buenas_envido', async (data) => {
        const { codigo_sala, usuario_id } = socket.datosUsuarioSala;
        
        if (codigo_sala && usuario_id) {
            gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'RESPUESTA_CANTO', { 
                respuesta: 'SON_BUENAS_ENVIDO', 
                cantoRespondidoTipo: 'ENVIDO'
            });
        }
    });

    // También necesitamos asegurarnos de manejar el evento específico para "retomar_truco_pendiente"
    socket.on('retomar_truco_pendiente', (data) => {
        socket.emit('retomar_truco_pendiente', data);
    });

    socket.on('cliente_irse_al_mazo', async () => {
        const { codigo_sala, usuario_id } = socket.datosUsuarioSala;
        if (codigo_sala && usuario_id) {
            gameLogicHandler.manejarAccionJugador(codigo_sala, usuario_id, 'IRSE_AL_MAZO', {});
        }
    });
    
    socket.on('cliente_solicitar_estado_juego', async () => {
        const { codigo_sala, usuario_id } = socket.datosUsuarioSala;
        if (codigo_sala && usuario_id) {
            const estadoJuego = gameLogicHandler.obtenerEstadoJuegoParaJugador(codigo_sala, usuario_id);
            if (estadoJuego) {
                // El estado ya incluye las cartas del jugador solicitante.
                // PartidaGame.manejarReconexionJugador ya notifica 'jugador_reconectado'
                // y luego el estado completo se envía aquí.
                socket.emit('estado_juego_actualizado', estadoJuego);
            } else {
                socket.emit('error_juego', { message: 'No se pudo obtener el estado del juego o la partida no existe.' });
            }
        }
    });

    socket.on('disconnect', () => {
        // Necesitas una forma de saber a qué sala y usuario estaba asociado este socket.
        // Esto usualmente se guarda cuando el socket se une a una sala.
        // const { codigo_sala, usuario_id } = socket.datosUsuarioSala; // Ejemplo
        // if (codigo_sala && usuario_id) {
        //     gameLogicHandler.manejarDesconexionJugador(codigo_sala, usuario_id);
        // }
        console.log(`Socket ${socket.id} desconectado.`);
    });
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api/salas', salasRoutes);
app.use('/api', skinsRoutes); // Todas las rutas de skins ahora tienen un prefijo /api
app.use('/api', paymentRoutes); // Todas las rutas de pagos ahora tienen un prefijo /api
app.use('/api/game', gameRoutes); // Todas las rutas de juego ahora tienen un prefijo /api


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

  // Validar la longitud de la contraseña (solo si no es fromGoogle)
  if (contraseña.length < 6 && !fromGoogle) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    // Insertar el usuario en la base de datos
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre_usuario, email, contraseña) VALUES (?, ?, ?)',
      [nombre_usuario, email, hashedPassword]
    );

    const userId = result.insertId;

    // Leer la imagen por defecto desde el sistema de archivos
    const fs = require('fs');
    const path = require('path');
    const defaultImagePath = path.join(__dirname, './public/foto_anonima.jpg');
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
});

app.get("/username", async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "El id del usuario es obligatorio" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT nombre_usuario FROM usuarios WHERE id = ?", [id]
    );
  } catch (err) {
    console.error("Error al ver id:", err.message);
    res.status(500).json({ error: "Error al ver id" });
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

app.post('/usuario-anonimo', async (req, res) => {
  try {
    // Lista de nombres para usuarios anónimos
    const nombres = ['Fulanito', 'Pepito', 'ElKuka', 'DonPedro', 'Darin'];
    const nombreAleatorio = nombres[Math.floor(Math.random() * nombres.length)];
    
    // Sufijo numérico aleatorio
    const sufijo = Math.floor(10000 + Math.random() * 90000); // Número entre 10000 y 99999
    
    const nombre_usuario = `${nombreAleatorio}${sufijo}`;
    
    // Generar contraseña aleatoria segura
    const contraseña = crypto.randomBytes(12).toString('hex');
    
    // Email provisional
    const email = `${nombre_usuario.toLowerCase()}@anonimo.trucho`;
    
    // Hashear contraseña
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(contraseña, 10);
    
    // Insertar el usuario temporal en la base de datos
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre_usuario, email, contraseña, es_anonimo) VALUES (?, ?, ?, 1)',
      [nombre_usuario, email, hashedPassword]
    );
    
    const userId = result.insertId;
    
    // Generar token JWT
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: userId, nombre_usuario, es_anonimo: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Duración de sesión
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
        JOIN usuarios u ON (a.usuario_id = u.id OR a.amigo_id = u.id OR u.es_anonimo = 1)
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

    const jwt = require('jsonwebtoken');

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
});

app.post('/refresh-token', (req, res) => {
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
});

app.get('/usuarios/id', async (req, res) => {
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
});

// Endpoint para obtener estadísticas de un usuario
app.get('/estadisticas/:usuario_id', async (req, res) => {
  const { usuario_id } = req.params;

  try {
    const [user] = await pool.query('SELECT nombre_usuario FROM usuarios WHERE id = ?', [usuario_id]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const [rows] = await pool.query('SELECT * FROM estadisticas WHERE usuario_id = ?', [usuario_id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Estadísticas no encontradas' });
    }

    res.json({
      username: user[0].nombre_usuario,
      ...rows[0],
    });
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

// Obtener las skins desbloqueadas por un usuario
app.get('/skins/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [skins] = await pool.query(`
      SELECT s.id, s.codigo, s.nombre, s.precio, sd.fecha_desbloqueo
      FROM skins_desbloqueadas sd
      JOIN skins s ON sd.skin_id = s.id
      WHERE sd.usuario_id = ?
    `, [userId]);

    res.json(skins);
  } catch (error) {
    console.error('Error al obtener skins del usuario:', error);
    res.status(500).json({ error: 'Error al obtener skins del usuario' });
  }
});

// Obtener la skin actualmente seleccionada por el usuario
app.get('/skins/selected', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await pool.query(`
      SELECT s.id, s.codigo, s.nombre
      FROM perfiles p
      JOIN skins s ON p.skin_id = s.id
      WHERE p.usuario_id = ?
    `, [userId]);

    if (result.length === 0) {
      return res.status(404).json({ error: 'No se encontró la skin seleccionada' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error al obtener skin seleccionada:', error);
    res.status(500).json({ error: 'Error al obtener skin seleccionada' });
  }
});

// Seleccionar una skin para usar
app.post('/skins/select/:skinId', authenticateToken, async (req, res) => {
  const skinId = req.params.skinId;
  const userId = req.user.id;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verificar si el usuario tiene desbloqueada la skin
    const [skinCheck] = await connection.query(`
      SELECT 1 FROM skins_desbloqueadas
      WHERE usuario_id = ? AND skin_id = ?
    `, [userId, skinId]);

    if (skinCheck.length === 0) {
      await connection.rollback();
      return res.status(403).json({ error: 'No tienes desbloqueada esta skin' });
    }

    // Actualizar el perfil con la nueva skin seleccionada
    await connection.query(`
      UPDATE perfiles SET skin_id = ?
      WHERE usuario_id = ?
    `, [skinId, userId]);

    await connection.commit();

    res.json({ message: 'Skin seleccionada correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al seleccionar skin:', error);
    res.status(500).json({ error: 'Error al seleccionar skin' });
  } finally {
    connection.release();
  }
});

// Comprar/desbloquear una skin
app.post('/skins/unlock/:skinId', authenticateToken, async (req, res) => {
  const skinId = req.params.skinId;
  const userId = req.user.id;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verificar si el usuario ya tiene la skin
    const [skinCheck] = await connection.query(`
      SELECT 1 FROM skins_desbloqueadas
      WHERE usuario_id = ? AND skin_id = ?
    `, [userId, skinId]);

    if (skinCheck.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Ya tienes desbloqueada esta skin' });
    }

    // Obtener el precio de la skin y las monedas del usuario
    const [skinData] = await connection.query(`
      SELECT precio FROM skins WHERE id = ?
    `, [skinId]);

    const [userData] = await connection.query(`
      SELECT monedas FROM perfiles WHERE usuario_id = ?
    `, [userId]);

    if (skinData.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Skin no encontrada' });
    }

    if (userData.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Perfil de usuario no encontrado' });
    }

    const skinPrice = skinData[0].precio;
    const userCoins = userData[0].monedas;

    // Verificar si el usuario tiene suficientes monedas
    if (userCoins < skinPrice) {
      await connection.rollback();
      return res.status(402).json({ error: 'No tienes suficientes monedas para desbloquear esta skin' });
    }

    // Descontar monedas y desbloquear skin
    await connection.query(`
      UPDATE perfiles SET monedas = monedas - ?
      WHERE usuario_id = ?
    `, [skinPrice, userId]);

    await connection.query(`
      INSERT INTO skins_desbloqueadas (usuario_id, skin_id)
      VALUES (?, ?)
    `, [userId, skinId]);

    await connection.commit();

    res.json({
      message: 'Skin desbloqueada correctamente',
      newBalance: userCoins - skinPrice
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error al desbloquear skin:', error);
    res.status(500).json({ error: 'Error al desbloquear skin' });
  } finally {
    connection.release();
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

// Endpoint para añadir monedas a un usuario
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
    console.error('Error: Los campos "from" y "to" son obligatorios');
    return res.status(400).json({ error: 'Los campos "from" y "to" son obligatorios' });
  }

  try {
    console.log(`Solicitud de amistad: from=${from}, to=${to}`);

        // Obtener los IDs de los usuarios
    const [fromUser] = await pool.query('SELECT id FROM usuarios WHERE nombre_usuario = ?', [from]);
    const [toUser] = await pool.query('SELECT id FROM usuarios WHERE nombre_usuario = ?', [to]);

    if (fromUser.length === 0 || toUser.length === 0) {
      console.error('Error: Uno o ambos usuarios no existen');
      return res.status(404).json({ error: 'Uno o ambos usuarios no existen' });
    }

    const fromId = fromUser[0].id;
    const toId = toUser[0].id;

    // Verificar si ya existe una relación de amistad
    const [existing] = await pool.query(
      'SELECT * FROM amigos WHERE (usuario_id = ? AND amigo_id = ?) OR (usuario_id = ? AND amigo_id = ?)',
      [fromId, toId, toId, fromId]
    );

    if (existing.length > 0) {
      console.error('Error: Ya existe una relación de amistad o solicitud pendiente');
      return res.status(400).json({ error: 'Ya existe una relación de amistad o solicitud pendiente' });
    }

    // Crear la solicitud de amistad
    await pool.query('INSERT INTO amigos (usuario_id, amigo_id, estado) VALUES (?, ?, ?)', [fromId, toId, 'pendiente']);
    console.log('Solicitud de amistad creada exitosamente');
    res.status(201).json({ message: 'Solicitud de amistad enviada' });
  } catch (err) {
    console.error('Error al enviar solicitud de amistad:', err.message);
    res.status(500).json({ error: 'Error al enviar solicitud de amistad' });
  }
});

// Endpoint para obtener la lista de amigos
app.get('/amigos', async (req, res) => {
  const { nombre_usuario } = req.query;

  if (!nombre_usuario) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        u.id AS usuario_id, 
        u.nombre_usuario, 
        IFNULL(
          CONCAT('${process.env.SERVER_URL || 'http://localhost:3001'}/usuarios/', u.nombre_usuario, '/foto-perfil'), 
          '${process.env.SERVER_URL || 'http://localhost:3001'}/foto_anonima.jpg'
        ) AS foto_perfil
      FROM amigos a
      JOIN usuarios u ON (a.usuario_id = u.id OR a.amigo_id = u.id)
      WHERE (a.usuario_id = (SELECT id FROM usuarios WHERE nombre_usuario = ?) 
      OR a.amigo_id = (SELECT id FROM usuarios WHERE nombre_usuario = ?))
      AND a.estado = 'aceptado'
      AND u.nombre_usuario != ?
      `,
      [nombre_usuario, nombre_usuario, nombre_usuario]
    );

    if (rows.length === 0) {
      return res.json({ message: 'No se encontraron amigos', amigos: [] });
    }

    res.json({ amigos: rows });
  } catch (err) {
    console.error('Error al obtener amigos:', err.message);
    res.status(500).json({ error: 'Error al obtener amigos' });
  }
});

// Endpoint para obtener la foto de perfil usando el userId
app.get('/usuarios/:userId/foto', async (req, res) => {
  const { userId } = req.params;

  try {
    // Obtener la imagen de la base de datos
    const [rows] = await pool.query('SELECT imagen FROM imagenes_perfil WHERE usuario_id = ?', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Foto de perfil no encontrada' });
    }

    const imageBuffer = rows[0].imagen;

    // Enviar la imagen como respuesta
    res.set('Content-Type', 'image/jpeg'); // Cambia el tipo MIME si es necesario
    res.send(imageBuffer);
  } catch (err) {
    console.error('Error al obtener la foto de perfil:', err.message);
    res.status(500).json({ error: 'Error al obtener la foto de perfil' });
  }
});

// Endpoint para obtener solicitudes de amistad pendientes
app.get('/friend-requests', async (req, res) => {
  const { to } = req.query;

  if (!to) {
    return res.status(400).json({ error: 'El nombre de usuario es obligatorio' });
  }

  try {
    // Obtener el ID del usuario logueado
    const [toUser] = await pool.query('SELECT id FROM usuarios WHERE nombre_usuario = ?', [to]);

    if (toUser.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const toId = toUser[0].id;

    // Obtener solicitudes de amistad pendientes
    const [rows] = await pool.query(
      `
      SELECT a.id, u.nombre_usuario AS from_user
      FROM amigos a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.amigo_id = ? AND a.estado = 'pendiente'
      `,
      [toId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error al obtener solicitudes de amistad:', err.message);
    res.status(500).json({ error: 'Error al obtener solicitudes de amistad' });
  }
});

app.post('/friend-requests/:id/accept', async (req, res) => {
  const { id } = req.params;

  try {
    // Cambiar el estado de la solicitud a "aceptado"
    await pool.query('UPDATE amigos SET estado = ? WHERE id = ?', ['aceptado', id]);
    res.json({ message: 'Solicitud de amistad aceptada' });
  } catch (err) {
    console.error('Error al aceptar solicitud de amistad:', err.message);
    res.status(500).json({ error: 'Error al aceptar solicitud de amistad' });
  }
});

app.delete('/friend-requests/:id/reject', async (req, res) => {
  const { id } = req.params;

  try {
    // Cambiar el estado de la solicitud a "rechazado"
    await pool.query('DELETE FROM amigos WHERE id = ?', [id]);
    res.json({ message: 'Solicitud de amistad rechazada' });
  } catch (err) {
    console.error('Error al rechazar solicitud de amistad:', err.message);
    res.status(500).json({ error: 'Error al rechazar solicitud de amistad' });
  }
});


// Configuración de multer para manejar archivos en memoria
const storage = multer.memoryStorage(); // Almacena los archivos en memoria
const upload = multer({ storage });

// Endpoint para subir una foto de perfil
app.post('/usuarios/:usuario_nombre_usuario/foto-perfil', upload.single('foto'), async (req, res) => {
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
});

app.get('/usuarios/:usuario_nombre_usuario/foto-perfil', async (req, res) => {
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
    res.set('Content-Type', 'image/jpeg'); // Cambia el tipo MIME si es necesario
    res.send(imageBuffer);
  } catch (err) {
    console.error('Error al obtener la foto de perfil:', err.message);
    res.status(500).json({ error: 'Error al obtener la foto de perfil' });
  }
});

app.get('/usuarios/:usuario_id/foto-perfil', async (req, res) => {
  const { userId } = req.params;

  try {
    // Obtener el ID del usuario
    const [user] = await pool.query('SELECT id FROM usuarios WHERE id = ?', [userId]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener la imagen de la base de datos
    const [rows] = await pool.query('SELECT imagen FROM imagenes_perfil WHERE usuario_id = ?', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Foto de perfil no encontrada' });
    }

    const imageBuffer = rows[0].imagen;

    // Enviar la imagen como respuesta
    res.set('Content-Type', 'image/jpeg'); // Cambia el tipo MIME si es necesario
    res.send(imageBuffer);
  } catch (err) {
    console.error('Error al obtener la foto de perfil:', err.message);
    res.status(500).json({ error: 'Error al obtener la foto de perfil' });
  }
});

app.get('/estadisticas/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    // Obtener el ID del usuario
    const [user] = await pool.query('SELECT id FROM usuarios WHERE nombre_usuario = ?', [username]);
    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario_id = user[0].id;
    console.log('Usuario encontrado, ID:', usuario_id);

    const [rows] = await pool.query('SELECT * FROM estadisticas WHERE usuario_id = ?', [usuario_id]);
    if (rows.length === 0) {
      console.log('No se encontraron estadísticas para el usuario:', username);
      return res.json({
        victorias: 0,
        derrotas: 0,
        partidas_jugadas: 0,
        elo: 0,
      });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener estadísticas:', err.message);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Endpoint para actualizar el nombre de usuario
app.put('/usuarios/:username/username', async (req, res) => {
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
});

// Endpoint para actualizar la contraseña del usuario
app.put('/usuarios/:username/password', async (req, res) => {
  const { username } = req.params;
  const { contraseñaActual, nuevaContraseña } = req.body;

  if (!contraseñaActual || !nuevaContraseña) {
    return res.status(400).json({ error: 'Ambas contraseñas son obligatorias' });
  }

  try {
    const bcrypt = require('bcrypt');

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
});

// Endpoint para eliminar el perfil de un usuario
app.delete('/usuarios/:id', async (req, res) => {
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
});

// Endpoint para obtener el ranking de jugadores ordenado por ELO
app.get('/ranking', async (req, res) => {
  try {
    // Obtener todos los usuarios con sus estadísticas, ordenados por ELO descendente
    const [rows] = await pool.query(`
      SELECT u.id,
             u.nombre_usuario, 
             IFNULL(e.victorias, 0) as victorias, 
             IFNULL(e.derrotas, 0) as derrotas, 
             IFNULL(e.partidas_jugadas, 0) as partidas_jugadas, 
             IFNULL(e.elo, 0) as elo
      FROM usuarios u
      LEFT JOIN estadisticas e ON u.id = e.usuario_id
      ORDER BY e.elo DESC, e.victorias DESC
    `);
    
    res.json(rows);
  } catch (err) {
    console.error('Error al obtener el ranking:', err.message);
    res.status(500).json({ error: 'Error al obtener el ranking' });
  }
});

// Deberás tener acceso a la lógica del juego aquí, o pasar el socket y los datos a módulos de lógica.
// const gameLogicHandler = require('./game_logic/handler'); // Ejemplo

io.on('connection', (socket) => {
    console.log('Un cliente se ha conectado:', socket.id);
    let currentRoom = null; // Para rastrear la sala actual del socket
    let currentUserId = null; // Para rastrear el ID de usuario del socket (necesitarás autenticar el socket)

    // --- Autenticación del Socket (MUY IMPORTANTE) ---
    // Debes tener un mecanismo para asociar un socket conectado con un usuario autenticado.
    // Esto a menudo se hace enviando el token JWT al conectar el socket y validándolo.
    socket.on('autenticar_socket', async (token) => {
        try {
            // Aquí tu lógica para validar el token (similar a authenticateToken middleware)
            // const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // currentUserId = decoded.id;
            // console.log(`Socket ${socket.id} autenticado como usuario ${currentUserId}`);
            // socket.emit('autenticacion_exitosa', { userId: currentUserId });

            // Placeholder:
            if (token === "token_valido_simulado") { // Reemplazar con validación real
                currentUserId = "usuario_id_simulado"; // Reemplazar con ID real del token
                console.log(`Socket ${socket.id} autenticado como usuario ${currentUserId}`);
                socket.emit('autenticacion_exitosa', { userId: currentUserId });
            } else {
                socket.emit('autenticacion_fallida', { message: 'Token inválido' });
                socket.disconnect();
            }
        } catch (err) {
            console.error('Error de autenticación de socket:', err);
            socket.emit('autenticacion_fallida', { message: 'Error de autenticación' });
            socket.disconnect(); // Desconectar si la autenticación falla
        }
    });

    socket.on('unirse_sala_juego', (codigo_sala) => {
        if (!currentUserId) {
            return socket.emit('error_juego', { message: 'Socket no autenticado.' });
        }
        if (currentRoom) {
            socket.leave(currentRoom);
        }
        socket.join(codigo_sala);
        currentRoom = codigo_sala;
        console.log(`Socket ${socket.id} (Usuario ${currentUserId}) se unió a la sala de juego ${currentRoom}`);
        
        // Opcional: solicitar estado si se está reconectando
        // Esto podría hacerse automáticamente si el servidor detecta una reconexión a una partida en curso.
        // O el cliente puede emitir 'cliente_solicitar_estado_juego'
    });
    
    socket.on('cliente_solicitar_estado_juego', async () => {
        if (!currentUserId || !currentRoom) {
            return socket.emit('error_juego', { message: 'No autenticado o no en una sala.' });
        }
        try {
            // Lógica similar al endpoint GET /api/game/:codigo_sala/estado
            // Deberías refactorizar esa lógica en una función reutilizable.
            // const estadoJuego = await obtenerEstadoJuego(currentRoom, currentUserId, pool);
            // socket.emit('estado_juego_actualizado', estadoJuego); // O 'partida_iniciada' si es el primer estado
            socket.emit('estado_juego_actualizado', { message: `Estado para ${currentRoom} (placeholder)`});
        } catch (error) {
            console.error("Error al solicitar estado del juego:", error);
            socket.emit('error_juego', { message: 'Error al obtener estado del juego.' });
        }
    });

    socket.on('cliente_jugar_carta', async (data) => {
        if (!currentUserId || !currentRoom) return socket.emit('error_juego', { message: 'No autenticado o no en una sala.' });
        const { carta } = data;
        console.log(`Usuario ${currentUserId} en sala ${currentRoom} jugó carta:`, carta);
        // Aquí llamarías a tu lógica de juego:
        // gameLogicHandler.jugarCarta(currentRoom, currentUserId, carta, pool, io);
        // Esa función se encargaría de:
        // 1. Validar (partida, turno, carta en mano).
        // 2. Actualizar DB.
        // 3. Emitir 'carta_jugada_broadcast' y 'turno_actualizado' a io.to(currentRoom).
        io.to(currentRoom).emit('carta_jugada_broadcast', { usuario_id: currentUserId, carta, message: 'Carta jugada (placeholder)' });
    });

    socket.on('cliente_cantar', async (data) => {
        if (!currentUserId || !currentRoom) return socket.emit('error_juego', { message: 'No autenticado o no en una sala.' });
        const { tipo_canto, detalle_adicional } = data;
        console.log(`Usuario ${currentUserId} en sala ${currentRoom} cantó: ${tipo_canto}`, detalle_adicional || '');
        // gameLogicHandler.cantar(currentRoom, currentUserId, tipo_canto, detalle_adicional, pool, io);
        io.to(currentRoom).emit('canto_realizado_broadcast', { usuario_id_cantor: currentUserId, tipo_canto, message: 'Canto realizado (placeholder)' });
    });

    socket.on('cliente_responder_canto', async (data) => {
        if (!currentUserId || !currentRoom) return socket.emit('error_juego', { message: 'No autenticado o no en una sala.' });
        const { respuesta, nuevo_canto_si_canto_mas, puntos_envido_declarados } = data;
        console.log(`Usuario ${currentUserId} en sala ${currentRoom} respondió: ${respuesta}`, data);
        // gameLogicHandler.responderCanto(currentRoom, currentUserId, respuesta, ..., pool, io);
        io.to(currentRoom).emit('respuesta_canto_broadcast', { usuario_id_respondedor: currentUserId, respuesta, message: 'Respuesta procesada (placeholder)' });
    });

    socket.on('cliente_irse_al_mazo', async () => {
        if (!currentUserId || !currentRoom) return socket.emit('error_juego', { message: 'No autenticado o no en una sala.' });
        console.log(`Usuario ${currentUserId} en sala ${currentRoom} se fue al mazo.`);
        // gameLogicHandler.irseAlMazo(currentRoom, currentUserId, pool, io);
        io.to(currentRoom).emit('ronda_finalizada_broadcast', { message: `${currentUserId} se fue al mazo (placeholder)` });
    });

    socket.on('disconnect', () => {
        console.log(`Socket ${socket.id} (Usuario ${currentUserId || 'N/A'}) se ha desconectado.`);
        if (currentRoom && currentUserId) {
            // Lógica para manejar desconexión de un jugador en una partida activa:
            // 1. Actualizar estado del jugador a 'desconectado' en DB.
            // 2. Notificar a otros jugadores en la sala de juego.
            // gameLogicHandler.manejarDesconexion(currentRoom, currentUserId, pool, io);
            io.to(currentRoom).emit('jugador_desconectado_broadcast', { usuario_id: currentUserId });
        }
    });
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

module.exports = { app, server, io };
