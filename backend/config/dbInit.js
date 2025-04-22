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
        estado ENUM('en curso', 'finalizada') DEFAULT 'en curso'
      )
    `);
    console.log('Tabla partidas verificada o creada');

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