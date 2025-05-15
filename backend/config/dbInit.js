// config/dbInit.js
const mysql = require('mysql2/promise');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const defaultImagePath = path.join(__dirname, '../public/foto_anonima.jpg');
const defaultImage = fs.readFileSync(defaultImagePath);

async function initializeDatabase() {
  let connection;

  try {
    // Conectarse sin especificar la base de datos
    const tempConnection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
    });

    console.log('Conectado a MySQL. Verificando base de datos...');

    // Crear la base de datos si no existe
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS truco_db`);
    console.log('Base de datos truco_db verificada o creada');

    // Cerrar la conexión temporal
    await tempConnection.end();

        // Crear una nueva conexión para usar la base de datos
    connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: 'truco_db', // Usar la base de datos creada
          });

    console.log('Conectado a la base de datos truco_db');


    // Crear tablas según el esquema
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        contraseña VARCHAR(255) NOT NULL,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabla usuarios verificada o creada');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS partidas (
        codigo_sala VARCHAR(50) PRIMARY KEY,
        fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_fin TIMESTAMP NULL,
        puntos_victoria INT DEFAULT 15,
        max_jugadores INT DEFAULT 2,
        jugadores_actuales INT DEFAULT 0,
        creador_id INT,
        estado ENUM('esperando', 'en_juego', 'finalizada') DEFAULT 'esperando',
        FOREIGN KEY (creador_id) REFERENCES usuarios(id) ON DELETE SET NULL
      )
    `);
    console.log('Tabla partidas verificada o creada');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS partidas_estado (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo_sala VARCHAR(255) NOT NULL UNIQUE,
        estado_partida ENUM('esperando_configuracion', 'en_curso', 'pausada', 'finalizada') DEFAULT 'esperando_configuracion',
        tipo_partida ENUM('1v1', '2v2', '3v3') NOT NULL,
        jugadores_configurados INT NOT NULL,
        puntaje_objetivo INT DEFAULT 15,
        ronda_actual_numero INT DEFAULT 1,
        mano_actual_numero_en_ronda INT DEFAULT 1,
        jugador_turno_id INT NULL,
        jugador_mano_ronda_id INT NULL,
        mazo_estado JSON NULL,
        cartas_en_mesa_mano_actual JSON NULL,
        estado_envido JSON NULL,
        estado_truco JSON NULL,
        truco_pendiente_por_envido_primero BOOLEAN DEFAULT FALSE,
        orden_juego_ronda_actual JSON NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_ultima_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (codigo_sala) REFERENCES partidas(codigo_sala) ON DELETE CASCADE,
        FOREIGN KEY (jugador_turno_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        FOREIGN KEY (jugador_mano_ronda_id) REFERENCES usuarios(id) ON DELETE SET NULL
      );
    `);
    console.log('Tabla partidas_estado creada.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS partidas_equipos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        partida_estado_id INT NOT NULL,
        nombre_equipo VARCHAR(50),
        puntos_partida INT DEFAULT 0,
        FOREIGN KEY (partida_estado_id) REFERENCES partidas_estado(id) ON DELETE CASCADE
      );
    `);
    console.log('Tabla partidas_equipos creada.');

     await connection.query(`
      CREATE TABLE IF NOT EXISTS partidas_jugadores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        partida_estado_id INT NOT NULL,
        usuario_id INT NOT NULL,
        partida_equipo_id INT NOT NULL,
        cartas_mano JSON NULL, -- Array de objetos Naipe
        es_pie_equipo BOOLEAN DEFAULT FALSE,
        orden_en_equipo INT DEFAULT 1, -- Para saber el orden dentro del equipo si es necesario
        estado_conexion ENUM('conectado', 'desconectado') DEFAULT 'conectado',
        UNIQUE KEY idx_partida_usuario (partida_estado_id, usuario_id), -- Un jugador solo puede estar una vez por partida
        FOREIGN KEY (partida_estado_id) REFERENCES partidas_estado(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (partida_equipo_id) REFERENCES partidas_equipos(id) ON DELETE CASCADE
      );
    `);
    console.log('Tabla partidas_jugadores creada.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS partidas_rondas_historial (
        id INT AUTO_INCREMENT PRIMARY KEY,
        partida_estado_id INT NOT NULL,
        numero_ronda INT NOT NULL,
        ganador_ronda_equipo_id INT NULL,
        puntos_obtenidos_envido INT DEFAULT 0,
        puntos_obtenidos_truco INT DEFAULT 0,
        detalle_manos JSON NULL, -- [{ numero_mano, jugadas: [{usuario_id, naipe}], ganador_mano_equipo_id, fue_parda }]
        fecha_finalizacion_ronda TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partida_estado_id) REFERENCES partidas_estado(id) ON DELETE CASCADE,
        FOREIGN KEY (ganador_ronda_equipo_id) REFERENCES partidas_equipos(id) ON DELETE SET NULL
      );
    `);
    console.log('Tabla partidas_rondas_historial creada.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS partidas_acciones_historial (
        id INT AUTO_INCREMENT PRIMARY KEY,
        partida_estado_id INT NOT NULL,
        ronda_numero INT NOT NULL,
        mano_numero_en_ronda INT NULL,
        usuario_id_accion INT NOT NULL,
        tipo_accion ENUM('JUGAR_CARTA', 'CANTO_ENVIDO', 'CANTO_TRUCO', 'RESPUESTA_CANTO', 'IRSE_AL_MAZO', 'DECLARAR_PUNTOS_ENVIDO', 'SON_BUENAS_ENVIDO') NOT NULL,
        detalle_accion JSON NULL, 
        timestamp_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partida_estado_id) REFERENCES partidas_estado(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id_accion) REFERENCES usuarios(id) -- No ON DELETE CASCADE para mantener historial si se borra usuario
      );
    `);
    console.log('Tabla partidas_acciones_historial creada.');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS estadisticas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        victorias INT DEFAULT 0,
        derrotas INT DEFAULT 0,
        partidas_jugadas INT DEFAULT 0,
        elo INT DEFAULT 1000,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);
    console.log('Tabla estadisticas verificada o creada');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS skins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        precio INT DEFAULT 0,
        creador_id INT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_expiracion TIMESTAMP NULL,
        FOREIGN KEY (creador_id) REFERENCES usuarios(id) ON DELETE SET NULL
      )
    `);
    console.log('Tabla skins verificada o creada');
    
    // Verificar si el campo precio existe en la tabla skins
    try {
      await connection.query(`SELECT precio FROM skins LIMIT 1`);
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        // Si no existe, agregarlo
        await connection.query(`ALTER TABLE skins ADD COLUMN precio INT DEFAULT 0`);
        console.log('Campo precio añadido a la tabla skins');
      } else {
        throw err;
      }
    }
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS perfiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        apodo VARCHAR(100) NULL,
        skin_id INT NULL,
        monedas INT DEFAULT 0,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY (skin_id) REFERENCES skins(id) ON DELETE SET NULL
      )
    `);
    console.log('Tabla perfiles verificada o creada');
    
    // Verificar si el campo monedas existe en la tabla perfiles
    try {
      await connection.query(`SELECT monedas FROM perfiles LIMIT 1`);
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        // Si no existe, agregarlo
        await connection.query(`ALTER TABLE perfiles ADD COLUMN monedas INT DEFAULT 0`);
        console.log('Campo monedas añadido a la tabla perfiles');
      } else {
        throw err;
      }
    }
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS skins_desbloqueadas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        skin_id INT NOT NULL,
        fecha_desbloqueo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY (skin_id) REFERENCES skins(id),
        UNIQUE KEY unique_skin_user (usuario_id, skin_id)
      )
    `);
    console.log('Tabla skins_desbloqueadas verificada o creada');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS personalizacion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tipo ENUM('carta', 'mesa') NOT NULL,
        diseño VARCHAR(255) NOT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);
    console.log('Tabla personalizacion verificada o creada');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS imagenes_perfil (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        imagen LONGBLOB NOT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);
    console.log('Tabla imagenes_perfil verificada o creada');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS jugadores_partidas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        partida_id VARCHAR(50) NOT NULL,
        usuario_id INT NOT NULL,
        puntaje INT DEFAULT 0,
        FOREIGN KEY (partida_id) REFERENCES partidas(codigo_sala),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);
    console.log('Tabla jugadores_partidas verificada o creada');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS amigos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        amigo_id INT NOT NULL,
        estado ENUM('pendiente', 'aceptado', 'rechazado') DEFAULT 'pendiente',
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY (amigo_id) REFERENCES usuarios(id)
      )
    `);
    console.log('Tabla amigos verificada o creada');
    
    // Insertar skins predefinidas si no existen
    await connection.query(`
      INSERT IGNORE INTO skins (codigo, nombre, precio) VALUES 
      ('original', 'Original', 0),
      ('og', 'OG', 100),
      ('pixelart', 'PixelArt', 1000),
      ('wikipedia', 'Wikipedia', 500)
    `);
    console.log('Skins predefinidas verificadas o creadas');
    
    // Actualizar precios de las skins si ya existen
    await connection.query(`UPDATE skins SET precio = 0 WHERE codigo = 'original'`);
    await connection.query(`UPDATE skins SET precio = 100 WHERE codigo = 'og'`);
    await connection.query(`UPDATE skins SET precio = 1000 WHERE codigo = 'pixelart'`);
    await connection.query(`UPDATE skins SET precio = 500 WHERE codigo = 'wikipedia'`);
    
    // Obtener el ID de la skin Original
    const [skinRows] = await connection.query("SELECT id FROM skins WHERE codigo = 'original' LIMIT 1");
    const skinOriginalId = skinRows[0]?.id;
    
    if (!skinOriginalId) {
      throw new Error("No se pudo encontrar la skin Original");
    }
    // Verificar si la columna skin_id ya existe en la tabla perfiles
    const [columnasPerfiles] = await connection.query(`SHOW COLUMNS FROM perfiles LIKE 'skin_id'`);
    
    if (columnasPerfiles.length === 0) {
    
      await connection.query(`ALTER TABLE perfiles ADD COLUMN skin_id INT`);
    console.log("Columna skin_id añadida a la tabla perfiles");
    } else {
    console.log("Columna skin_id ya existe en la tabla perfiles");
    }
    // Actualizar los perfiles existentes que no tengan skin asignada
    await connection.query(`
      UPDATE perfiles SET skin_id = ? WHERE skin_id IS NULL
    `, [skinOriginalId]);
    console.log('Perfiles actualizados con skin por defecto');
    
    // Crear registros en skins_desbloqueadas para cada usuario con la skin Original
    await connection.query(`
      INSERT IGNORE INTO skins_desbloqueadas (usuario_id, skin_id)
      SELECT p.usuario_id, ? FROM perfiles p
      WHERE p.usuario_id NOT IN (
        SELECT usuario_id FROM skins_desbloqueadas WHERE skin_id = ?
      )
    `, [skinOriginalId, skinOriginalId]);
    console.log('Skin Original desbloqueada para todos los usuarios');
    
    // Crear trigger para asignar automáticamente estadísticas y perfil con skin al crear un usuario
    await connection.query(`DROP TRIGGER IF EXISTS after_usuario_insert`);
    
    await connection.query(`
      CREATE TRIGGER after_usuario_insert
      AFTER INSERT ON usuarios
      FOR EACH ROW
      BEGIN
        DECLARE skin_original_id INT;
        
        -- Obtener ID de la skin Original
        SELECT id INTO skin_original_id FROM skins WHERE codigo = 'original' LIMIT 1;
        
        -- Crear estadísticas para el nuevo usuario
        INSERT INTO estadisticas (usuario_id, victorias, derrotas, partidas_jugadas, elo) 
        VALUES (NEW.id, 0, 0, 0, 0);
        
        -- Crear perfil para el nuevo usuario con 100 monedas iniciales
        INSERT INTO perfiles (usuario_id, apodo, skin_id, monedas) 
        VALUES (NEW.id, NEW.nombre_usuario, skin_original_id, 0);
        
        -- Desbloquear skin Original para el nuevo usuario
        INSERT INTO skins_desbloqueadas (usuario_id, skin_id)
        VALUES (NEW.id, skin_original_id);
      END
    `);
    await connection.query(`
      INSERT INTO imagenes_perfil (usuario_id, imagen)
      SELECT id, ? FROM usuarios
      WHERE id NOT IN (SELECT usuario_id FROM imagenes_perfil)
    `, [defaultImage]);
    
    console.log('Imagen por defecto asignada a todos los usuarios sin imagen');
    
    console.log('Trigger after_usuario_insert creado o actualizado');

// Función para eliminar una clave foránea si existe
async function dropForeignKeyIfExists(connection, tableName, foreignKeyName) {
  const [rows] = await connection.query(`
    SELECT CONSTRAINT_NAME 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND TABLE_SCHEMA = DATABASE()
  `, [tableName, foreignKeyName]);

  if (rows.length > 0) {
    await connection.query(`ALTER TABLE ?? DROP FOREIGN KEY ??`, [tableName, foreignKeyName]);
    console.log(`Clave foránea ${foreignKeyName} eliminada de la tabla ${tableName}`);
  } else {
    console.log(`Clave foránea ${foreignKeyName} no existe en la tabla ${tableName}`);
  }
}

// Llamadas para eliminar claves foráneas
await dropForeignKeyIfExists(connection, 'imagenes_perfil', 'imagenes_perfil_ibfk_1');
await dropForeignKeyIfExists(connection, 'estadisticas', 'estadisticas_ibfk_1');
await dropForeignKeyIfExists(connection, 'perfiles', 'perfiles_ibfk_1');
await dropForeignKeyIfExists(connection, 'skins_desbloqueadas', 'skins_desbloqueadas_ibfk_1');
await dropForeignKeyIfExists(connection, 'amigos', 'amigos_ibfk_1');
await dropForeignKeyIfExists(connection, 'amigos', 'amigos_ibfk_2');

// Agregar las restricciones con ON DELETE CASCADE
await connection.query('ALTER TABLE imagenes_perfil ADD CONSTRAINT imagenes_perfil_ibfk_1 FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE');
await connection.query('ALTER TABLE estadisticas ADD CONSTRAINT estadisticas_ibfk_1 FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE');
await connection.query('ALTER TABLE perfiles ADD CONSTRAINT perfiles_ibfk_1 FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE');
await connection.query('ALTER TABLE skins_desbloqueadas ADD CONSTRAINT skins_desbloqueadas_ibfk_1 FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE');
await connection.query('ALTER TABLE amigos ADD CONSTRAINT amigos_ibfk_1 FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE');
await connection.query('ALTER TABLE amigos ADD CONSTRAINT amigos_ibfk_2 FOREIGN KEY (amigo_id) REFERENCES usuarios(id) ON DELETE CASCADE');

// Función para agregar una columna si no existe
async function addColumnIfNotExists(connection, tableName, columnName, columnDefinition) {
  const [rows] = await connection.query(`
    SELECT COLUMN_NAME 
    FROM information_schema.COLUMNS 
    WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = DATABASE()
  `, [tableName, columnName]);

  if (rows.length === 0) {
    await connection.query(`ALTER TABLE ?? ADD COLUMN ?? ${columnDefinition}`, [tableName, columnName]);
    console.log(`Columna ${columnName} añadida a la tabla ${tableName}`);
  } else {
    console.log(`Columna ${columnName} ya existe en la tabla ${tableName}`);
  }
}

// Modificar la tabla partidas para incluir los nuevos campos necesarios
// Verificar y agregar columnas en la tabla `partidas`
await addColumnIfNotExists(connection, 'partidas', 'tipo', "ENUM('publica', 'privada') DEFAULT 'publica'");
await addColumnIfNotExists(connection, 'partidas', 'codigo_acceso', 'VARCHAR(10) NULL');
await addColumnIfNotExists(connection, 'partidas', 'puntos_victoria', 'INT DEFAULT 15');
await addColumnIfNotExists(connection, 'partidas', 'max_jugadores', 'INT DEFAULT 4');
await addColumnIfNotExists(connection, 'partidas', 'tiempo_expiracion', 'TIMESTAMP NULL');
await addColumnIfNotExists(connection, 'partidas', 'creador', 'VARCHAR(255) NULL');
console.log('Tabla partidas actualizada con campo creador');
console.log('Tabla partidas actualizada con nuevos campos');

// Actualizar la tabla jugadores_partidas para incluir si el jugador es anfitrión
await addColumnIfNotExists(connection, 'jugadores_partidas', 'es_anfitrion', 'BOOLEAN DEFAULT FALSE');
console.log('Tabla jugadores_partidas actualizada con campo es_anfitrion');

// Función para crear un índice si no existe
async function createIndexIfNotExists(connection, tableName, indexName, indexDefinition) {
  const [rows] = await connection.query(`
    SELECT INDEX_NAME 
    FROM information_schema.STATISTICS 
    WHERE TABLE_NAME = ? AND INDEX_NAME = ? AND TABLE_SCHEMA = DATABASE()
  `, [tableName, indexName]);

  if (rows.length === 0) {
    await connection.query(`CREATE INDEX ?? ON ?? (${indexDefinition})`, [indexName, tableName]);
    console.log(`Índice ${indexName} creado en la tabla ${tableName}`);
  } else {
    console.log(`Índice ${indexName} ya existe en la tabla ${tableName}`);
  }
}

// Crear índices en la tabla `partidas` 
await createIndexIfNotExists(connection, 'partidas', 'idx_partidas_estado', 'estado');
await createIndexIfNotExists(connection, 'partidas', 'idx_partidas_tipo', 'tipo');
console.log('Índice creado para búsqueda rápida por tipo de partida');

    console.log('Inicialización de la base de datos completada exitosamente');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

module.exports = { initializeDatabase };