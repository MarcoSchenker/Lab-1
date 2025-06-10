/**
 * Utilidades para recuperar y restaurar estados de juego perdidos o corruptos
 */
const { debugLog } = require('./debugUtils');

/**
 * Verifica si un estado de juego es válido y completo
 * @param {Object} estado - Estado del juego a verificar
 * @returns {Object} - Resultado con informacion sobre validez y problemas
 */
function verificarEstadoJuegoCompleto(estado) {
  if (!estado) {
    return { valido: false, problemas: ['Estado no existe'] };
  }

  const problemas = [];

  // Verificar propiedades esenciales
  if (!estado.codigoSala) problemas.push('Falta código de sala');
  if (!estado.tipoPartida) problemas.push('Falta tipo de partida');
  if (!estado.estadoPartida) problemas.push('Falta estado de partida');
  
  // Verificar equipos
  if (!estado.equipos || !Array.isArray(estado.equipos)) {
    problemas.push('No hay equipos o no es un array');
  } else if (estado.equipos.length === 0) {
    problemas.push('Array de equipos está vacío');
  } else {
    // Verificar estructura de equipos
    for (let i = 0; i < estado.equipos.length; i++) {
      const equipo = estado.equipos[i];
      if (!equipo.id) problemas.push(`Equipo ${i} sin ID`);
      if (!Array.isArray(equipo.jugadoresIds)) 
        problemas.push(`Equipo ${equipo.id || i} sin jugadores o no es array`);
    }
  }

  // Verificar jugadores
  if (!estado.jugadores || !Array.isArray(estado.jugadores)) {
    problemas.push('No hay jugadores o no es un array');
  } else if (estado.jugadores.length === 0) {
    problemas.push('Array de jugadores está vacío');
  } else {
    // Verificar estructura de jugadores
    for (let i = 0; i < estado.jugadores.length; i++) {
      const jugador = estado.jugadores[i];
      if (!jugador.id) problemas.push(`Jugador ${i} sin ID`);
      if (!jugador.equipoId) problemas.push(`Jugador ${jugador.id || i} sin equipoId`);
    }
  }

  // Verificar ronda actual
  if (estado.estadoPartida === 'en_juego' && !estado.rondaActual) {
    problemas.push('Partida en juego pero sin ronda actual');
  }

  return { 
    valido: problemas.length === 0,
    problemas,
    incompleto: problemas.length > 0
  };
}

/**
 * Intenta reconstruir un estado mínimo válido a partir de un estado incompleto
 * @param {Object} estadoIncompleto - Estado incompleto o corrupto
 * @returns {Object} - Estado reconstruido o null si es imposible reconstruirlo
 */
function reconstruirEstadoMinimo(estadoIncompleto) {
  try {
    if (!estadoIncompleto || !estadoIncompleto.codigoSala) {
      return null;
    }
    
    debugLog('stateRecovery', 'Intentando reconstruir estado mínimo para sala', 
        { codigoSala: estadoIncompleto.codigoSala });
    
    // Construir un estado básico
    const estadoMinimo = {
      codigoSala: estadoIncompleto.codigoSala,
      tipoPartida: estadoIncompleto.tipoPartida || '1v1',
      puntosVictoria: estadoIncompleto.puntosVictoria || 15,
      estadoPartida: 'recuperando',
      mensajeError: 'Estado de juego reconstruido parcialmente. Reconectando...',
      equipos: [],
      jugadores: [],
      numeroRondaActual: estadoIncompleto.numeroRondaActual || 0,
      indiceJugadorManoGlobal: estadoIncompleto.indiceJugadorManoGlobal || 0,
      rondaActual: null,
      historialRondas: [],
      needsRecovery: true
    };
    
    // Preservar equipos y jugadores si existen
    if (estadoIncompleto.equipos && Array.isArray(estadoIncompleto.equipos)) {
      estadoMinimo.equipos = estadoIncompleto.equipos.map(e => ({
        id: e.id || Math.floor(Math.random() * 10000),
        nombre: e.nombre || `Equipo ${e.id || '?'}`,
        puntosPartida: e.puntosPartida || 0,
        jugadoresIds: e.jugadoresIds || []
      }));
    }
    
    if (estadoIncompleto.jugadores && Array.isArray(estadoIncompleto.jugadores)) {
      estadoMinimo.jugadores = estadoIncompleto.jugadores.map(j => ({
        id: j.id || Math.floor(Math.random() * 10000),
        nombreUsuario: j.nombreUsuario || `Jugador ${j.id || '?'}`,
        equipoId: j.equipoId || 0,
        esPie: j.esPie || false,
        cartasMano: null, // Siempre vacío por seguridad
        cartasJugadasRonda: j.cartasJugadasRonda || [],
        estadoConexion: j.estadoConexion || 'conectado'
      }));
    }
    
    // Si hay jugadores pero no equipos o viceversa, intentar reconstruir la estructura
    if (estadoMinimo.jugadores.length > 0 && estadoMinimo.equipos.length === 0) {
      // Agrupar jugadores por equipoId
      const equiposPorId = {};
      estadoMinimo.jugadores.forEach(jugador => {
        if (!equiposPorId[jugador.equipoId]) {
          equiposPorId[jugador.equipoId] = {
            id: jugador.equipoId,
            nombre: `Equipo ${jugador.equipoId}`,
            puntosPartida: 0,
            jugadoresIds: []
          };
        }
        equiposPorId[jugador.equipoId].jugadoresIds.push(jugador.id);
      });
      
      estadoMinimo.equipos = Object.values(equiposPorId);
    }
    
    debugLog('stateRecovery', 'Estado mínimo reconstruido', { estadoMinimo });
    return estadoMinimo;
  } catch (error) {
    debugLog('stateRecovery', 'Error al reconstruir estado mínimo', { error });
    return null;
  }
}

module.exports = {
  verificarEstadoJuegoCompleto,
  reconstruirEstadoMinimo
};
