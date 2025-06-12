const pool = require('../config/db');
const gameLogicHandler = require('../game-logic/gameLogicHandler');

/**
 * Controlador para verificar la conexión a la base de datos
 */
const pingDatabase = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ message: 'Conexión exitosa a MySQL', result: rows[0].result });
  } catch (err) {
    console.error('Error al conectar con la base de datos:', err.message);
    res.status(500).json({ error: 'Error al conectar con la base de datos' });
  }
};

/**
 * Controlador para crear una partida de prueba
 */
const crearPartidaPrueba = async (req, res) => {
  try {
    console.log('=== EJECUTANDO PRUEBA DE CREACIÓN DE PARTIDA ===');
    const resultado = await gameLogicHandler.crearPartidaPrueba();
    
    if (resultado) {
      res.json({ 
        success: true, 
        message: 'Partida de prueba creada exitosamente',
        codigoSala: resultado.codigoSala 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Error al crear partida de prueba' 
      });
    }
  } catch (err) {
    console.error('Error en prueba de creación de partida:', err);
    res.status(500).json({ error: 'Error en prueba de creación de partida' });
  }
};

/**
 * Controlador para obtener estado de partida sin autenticación (para testing)
 */
const obtenerEstadoPrueba = async (req, res) => {
  try {
    const { codigo_sala, jugador_id } = req.params;
    console.log(`=== PROBANDO OBTENER ESTADO ===`);
    console.log(`Sala: ${codigo_sala}, Jugador: ${jugador_id}`);
    
    const estado = gameLogicHandler.obtenerEstadoJuegoParaJugador(codigo_sala, parseInt(jugador_id));
    
    if (estado) {
      res.json({ 
        success: true, 
        estado 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Estado no encontrado' 
      });
    }
  } catch (err) {
    console.error('Error en prueba de obtener estado:', err);
    res.status(500).json({ error: 'Error en prueba de obtener estado' });
  }
};

/**
 * Endpoint básico para verificar que el servidor está activo
 */
const serverStatus = (req, res) => {
  res.send('Servidor Truco está activo 🎴');
};

module.exports = {
  pingDatabase,
  crearPartidaPrueba,
  obtenerEstadoPrueba,
  serverStatus
};
