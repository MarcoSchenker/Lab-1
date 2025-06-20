// filepath: /Users/ignaciogaspar/Faculty/Lab-1/backend/gameRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const gameLogicHandler = require('../game-logic/gameLogicHandler');

/**
 * @route   POST /api/game/:codigo_sala/iniciar
 * @desc    (Opcional) Endpoint para que el sistema de salas llame cuando una sala está llena y lista para iniciar.
 *          Alternativamente, esta lógica puede estar directamente en salasRoute.js.
 * @access  Restringido (ej. solo llamado internamente por el servidor o con un token especial)
 */
router.post('/:codigo_sala/iniciar', authenticateToken, async (req, res) => {
    const { codigo_sala } = req.params;
    const { jugadoresInfo, tipo_partida, puntos_objetivo } = req.body;

    try {
        const partidaIniciada = await gameLogicHandler.crearNuevaPartida(
            codigo_sala,
            jugadoresInfo,
            tipo_partida,
            puntos_objetivo
        );

        if (partidaIniciada) {
            res.status(200).json({ message: 'Partida iniciada correctamente por gameLogicHandler.' });
        } else {
            res.status(500).json({ message: 'Error al iniciar la partida desde gameLogicHandler.' });
        }
    } catch (error) {
        console.error('Error en endpoint /iniciar al llamar a gameLogicHandler:', error);
        res.status(500).json({ message: 'Error interno al iniciar la partida.' });
    }
});

/**
 * @route   GET /api/game/:codigo_sala/estado
 * @desc    Obtener el estado actual completo del juego para un jugador (para reconexiones)
 * @access  Private (requiere que el usuario sea parte de la partida)
 */
router.get('/:codigo_sala/estado', authenticateToken, async (req, res) => {
    const { codigo_sala } = req.params;
    const usuario_id = req.user.id;

    let connection;
    try {
        connection = await pool.getConnection();
        // 1. Validar que el jugador (usuario_id) es parte de la partida en `codigo_sala`.
        const [partidaJugadorRows] = await connection.execute(
            'SELECT pe.id FROM partidas_estado pe JOIN partidas_jugadores pj ON pe.id = pj.partida_estado_id WHERE pe.codigo_sala = ? AND pj.usuario_id = ? AND pe.estado_partida != ?',
            [codigo_sala, usuario_id, 'finalizada']
        );

        if (partidaJugadorRows.length === 0) {
            return res.status(403).json({ message: 'No autorizado para acceder a esta partida o la partida no existe/finalizó.' });
        }
        const partida_estado_id = partidaJugadorRows[0].id;

        // 2. Obtener el estado completo de `partidas_estado`.
        const [partidaRows] = await connection.execute('SELECT * FROM partidas_estado WHERE id = ?', [partida_estado_id]);
        if (partidaRows.length === 0) {
            return res.status(404).json({ message: 'Estado de la partida no encontrado.' });
        }
        const partidaEstado = partidaRows[0];

        // 3. Obtener información de equipos y jugadores.
        const [equiposRows] = await connection.execute('SELECT * FROM partidas_equipos WHERE partida_estado_id = ?', [partida_estado_id]);
        const [jugadoresRows] = await connection.execute('SELECT * FROM partidas_jugadores WHERE partida_estado_id = ?', [partida_estado_id]);

        // 4. Filtrar información sensible: Solo enviar las cartas del jugador solicitante.
        const jugadoresInfo = jugadoresRows.map(j => {
            if (j.usuario_id === usuario_id) {
                return j; // Devuelve todas las cartas para el jugador que solicita
            }
            return { ...j, cartas_mano: null }; // Oculta cartas de otros jugadores
        });
        
        // 5. Ensamblar y enviar el estado.
        const estadoCompletoJuego = {
            ...partidaEstado,
            equipos: equiposRows,
            jugadores: jugadoresInfo
            // Podrías añadir historial de rondas si es necesario para la UI al reconectar.
        };

        res.json(estadoCompletoJuego);
    } catch (error) {
        console.error('Error al obtener estado del juego:', error);
        res.status(500).json({ message: 'Error interno al obtener estado del juego.' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;