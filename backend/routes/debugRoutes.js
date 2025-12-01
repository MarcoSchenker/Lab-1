const express = require('express');
const router = express.Router();
const gameLogicHandler = require('../game-logic/gameLogicHandler');
const { getRoomDebugInfo } = require('../utils/debugUtils');

/**
 * Debug endpoint to check active games
 * For development/debugging purposes only
 */
router.get('/active-games', (req, res) => {
  try {
    const activeGames = gameLogicHandler.getActiveGames();
    res.status(200).json({
      count: Object.keys(activeGames).length,
      rooms: Object.keys(activeGames),
      games: Object.entries(activeGames).map(([room, game]) => ({
        room,
        state: game.estadoPartida,
        type: game.tipoPartida,
        players: game.jugadores?.map(p => ({
          id: p.id,
          name: p.nombreUsuario,
          team: p.equipoId
        })) || [],
        currentRound: game.numeroRondaActual
      }))
    });
  } catch (error) {
    console.error('Error retrieving active games:', error);
    res.status(500).json({ error: 'Error retrieving active games information' });
  }
});

/**
 * Get detailed info about a specific game
 * GET /api/debug/game/:codigoSala
 */
router.get('/game/:codigoSala', async (req, res) => {
    try {
        const { codigoSala } = req.params;
        const partida = gameLogicHandler.getGameById(codigoSala);
        
        if (!partida) {
            return res.status(404).json({ 
                error: `No se encontró partida activa con código ${codigoSala}` 
            });
        }
        
        // Get Socket.IO room info
        const io = req.app.get('io');
        let socketInfo = { error: 'Socket.IO instance not available' };
        
        if (io) {
            socketInfo = await getRoomDebugInfo(io, codigoSala);
        }
        
        // Build game summary with key information
        const partidaInfo = {
            codigoSala: partida.codigoSala,
            tipoPartida: partida.tipoPartida,
            puntosVictoria: partida.puntosVictoria,
            estadoPartida: partida.estadoPartida,
            jugadores: partida.jugadores.map(j => ({
                id: j.id,
                nombreUsuario: j.nombreUsuario,
                equipoId: j.equipoId,
                estadoConexion: j.estadoConexion
            })),
            equipos: partida.equipos.map(e => ({
                id: e.id,
                nombre: e.nombre,
                puntosPartida: e.puntosPartida,
                jugadoresIds: e.jugadores.map(j => j.id)
            })),
            numeroRondaActual: partida.numeroRondaActual,
            socketInfo
        };
        
        res.json(partidaInfo);
    } catch (error) {
        console.error('Error retrieving game details:', error);
        res.status(500).json({ error: 'Error retrieving game details', message: error.message });
    }
});

/**
 * Manually trigger a state update to all clients in a room
 * POST /api/debug/refresh-state/:codigoSala
 */
router.post('/refresh-state/:codigoSala', (req, res) => {
    try {
        const { codigoSala } = req.params;
        const result = gameLogicHandler.forceRefreshGameState(codigoSala);
        
        if (!result.success) {
            return res.status(404).json({ error: result.message });
        }
        
        res.json({ 
            message: `Estado actualizado para sala ${codigoSala}`,
            details: result
        });
    } catch (error) {
        console.error('Error refreshing game state:', error);
        res.status(500).json({ error: 'Error refreshing game state', message: error.message });
    }
});

module.exports = router;
