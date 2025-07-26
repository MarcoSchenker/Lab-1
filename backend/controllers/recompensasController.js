const pool = require('../config/db');

/**
 * Sistema de recompensas basado en ELO similar a Chess.com (Glicko)
 * Calcula las recompensas de ELO y monedas después de una partida
 */

/**
 * Calcula el ELO esperado usando la fórmula de ELO estándar
 * @param {number} eloJugador - ELO del jugador
 * @param {number} eloOponente - ELO del oponente
 * @returns {number} - Puntuación esperada (0-1)
 */
function calcularEloEsperado(eloJugador, eloOponente) {
    return 1 / (1 + Math.pow(10, (eloOponente - eloJugador) / 400));
}

/**
 * Calcula el factor K dinámico basado en el ELO del jugador
 * Jugadores con menos ELO tienen cambios más rápidos
 * @param {number} elo - ELO actual del jugador
 * @returns {number} - Factor K
 */
function calcularFactorK(elo) {
    if (elo < 800) return 40;      // Nuevos jugadores - cambios rápidos
    if (elo < 1200) return 32;     // Jugadores intermedios bajos
    if (elo < 1600) return 24;     // Jugadores intermedios
    if (elo < 2000) return 16;     // Jugadores avanzados
    if (elo < 2400) return 12;     // Jugadores expertos
    return 8;                      // Maestros - cambios lentos
}

/**
 * Calcula el cambio de ELO para una partida
 * @param {number} eloJugador - ELO actual del jugador
 * @param {number} eloOponente - ELO del oponente
 * @param {number} resultado - 1 si ganó, 0 si perdió
 * @returns {number} - Cambio en ELO (puede ser negativo)
 */
function calcularCambioElo(eloJugador, eloOponente, resultado) {
    const factorK = calcularFactorK(eloJugador);
    const eloEsperado = calcularEloEsperado(eloJugador, eloOponente);
    const cambio = Math.round(factorK * (resultado - eloEsperado));
    
    // Garantizar cambio mínimo para mantener progresión
    if (resultado === 1 && cambio < 1) return 1;
    if (resultado === 0 && cambio > -1) return -1;
    
    return cambio;
}

/**
 * Calcula las recompensas completas de una partida
 * @param {Object} datosPartida - Información de la partida
 * @returns {Object} - Recompensas calculadas para cada jugador
 */
async function calcularRecompensasPartida(datosPartida) {
    const {
        codigoSala,
        ganadorEquipoId,
        jugadores,
        huboEnvido,
        ganadorEnvidoEquipoId,
        tipoPartida,
        puntosObjetivo
    } = datosPartida;

    console.log(`[RECOMPENSAS] Calculando recompensas para partida ${codigoSala}`);
    console.log(`[RECOMPENSAS] Ganador: ${ganadorEquipoId}, Envido: ${huboEnvido ? 'Sí' : 'No'}`);

    const recompensas = {};

    // Obtener estadísticas actuales de los jugadores
    for (const jugador of jugadores) {
        const [stats] = await pool.query(
            'SELECT elo, victorias, derrotas, partidas_jugadas FROM estadisticas WHERE usuario_id = ?',
            [jugador.id]
        );
        
        if (stats.length === 0) {
            console.log(`[RECOMPENSAS] Creando estadísticas para jugador ${jugador.id}`);
            await pool.query(
                'INSERT INTO estadisticas (usuario_id, elo, victorias, derrotas, partidas_jugadas) VALUES (?, 500, 0, 0, 0)',
                [jugador.id]
            );
            jugador.eloActual = 500;
            jugador.victoriasActuales = 0;
            jugador.derrotasActuales = 0;
            jugador.partidasJugadasActuales = 0;
        } else {
            jugador.eloActual = stats[0].elo;
            jugador.victoriasActuales = stats[0].victorias;
            jugador.derrotasActuales = stats[0].derrotas;
            jugador.partidasJugadasActuales = stats[0].partidas_jugadas;
        }
    }

    // Calcular recompensas para cada jugador
    for (const jugador of jugadores) {
        const esGanador = jugador.equipoId === ganadorEquipoId;
        const ganoEnvido = huboEnvido && jugador.equipoId === ganadorEnvidoEquipoId;
        const perdioEnvido = huboEnvido && jugador.equipoId !== ganadorEnvidoEquipoId;

        // Encontrar oponente para cálculo de ELO
        const oponente = jugadores.find(j => j.equipoId !== jugador.equipoId);
        
        // Calcular cambios de ELO
        let cambioEloPartida = 0;
        let cambioEloEnvido = 0;
        
        if (oponente) {
            // ELO por ganar/perder la partida
            cambioEloPartida = calcularCambioElo(jugador.eloActual, oponente.eloActual, esGanador ? 1 : 0);
            
            // ELO adicional por envido
            if (huboEnvido) {
                cambioEloEnvido = ganoEnvido ? 1 : -1;
            }
        }

        const cambioEloTotal = cambioEloPartida + cambioEloEnvido;
        const nuevoElo = Math.max(100, jugador.eloActual + cambioEloTotal); // ELO mínimo de 100

        // Calcular monedas
        const monedasGanadas = esGanador ? Math.floor(Math.random() * 6) + 5 : 0; // 5-10 monedas si gana

        // Actualizar estadísticas
        const nuevasVictorias = jugador.victoriasActuales + (esGanador ? 1 : 0);
        const nuevasDerrotas = jugador.derrotasActuales + (esGanador ? 0 : 1);
        const nuevasPartidas = jugador.partidasJugadasActuales + 1;

        recompensas[jugador.id] = {
            jugadorId: jugador.id,
            nombreJugador: jugador.nombreUsuario,
            equipoId: jugador.equipoId,
            esGanador,
            
            // ELO
            eloAnterior: jugador.eloActual,
            cambioEloPartida,
            cambioEloEnvido,
            cambioEloTotal,
            nuevoElo,
            
            // Monedas
            monedasGanadas,
            
            // Estadísticas
            nuevasVictorias,
            nuevasDerrotas,
            nuevasPartidas,
            
            // Info envido
            huboEnvido,
            ganoEnvido,
            perdioEnvido
        };

        console.log(`[RECOMPENSAS] ${jugador.nombreUsuario}: ELO ${jugador.eloActual} → ${nuevoElo} (${cambioEloTotal >= 0 ? '+' : ''}${cambioEloTotal}), Monedas: +${monedasGanadas}`);
    }

    return recompensas;
}

/**
 * Aplica las recompensas calculadas a la base de datos
 * @param {Object} recompensas - Recompensas calculadas
 */
async function aplicarRecompensas(recompensas) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        for (const [jugadorId, recompensa] of Object.entries(recompensas)) {
            // Actualizar estadísticas
            await connection.query(
                `UPDATE estadisticas 
                 SET elo = ?, victorias = ?, derrotas = ?, partidas_jugadas = ?
                 WHERE usuario_id = ?`,
                [
                    recompensa.nuevoElo,
                    recompensa.nuevasVictorias,
                    recompensa.nuevasDerrotas,
                    recompensa.nuevasPartidas,
                    jugadorId
                ]
            );

            // Actualizar monedas
            if (recompensa.monedasGanadas > 0) {
                await connection.query(
                    'UPDATE perfiles SET monedas = monedas + ? WHERE usuario_id = ?',
                    [recompensa.monedasGanadas, jugadorId]
                );
            }

            console.log(`[RECOMPENSAS] ✅ Aplicadas recompensas para jugador ${recompensa.nombreJugador}`);
        }

        await connection.commit();
        console.log(`[RECOMPENSAS] ✅ Todas las recompensas aplicadas exitosamente`);
        
    } catch (error) {
        await connection.rollback();
        console.error(`[RECOMPENSAS] ❌ Error aplicando recompensas:`, error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Función principal para procesar recompensas de fin de partida
 * @param {Object} datosPartida - Datos de la partida finalizada
 * @returns {Object} - Recompensas calculadas y aplicadas
 */
async function procesarRecompensasFinPartida(datosPartida) {
    try {
        console.log(`[RECOMPENSAS] 🎮 Procesando recompensas de fin de partida`);
        
        const recompensas = await calcularRecompensasPartida(datosPartida);
        await aplicarRecompensas(recompensas);
        
        console.log(`[RECOMPENSAS] 🏆 Recompensas procesadas exitosamente`);
        return recompensas;
        
    } catch (error) {
        console.error(`[RECOMPENSAS] ❌ Error procesando recompensas:`, error);
        throw error;
    }
}

/**
 * Procesa las recompensas cuando un jugador abandona la partida
 * @param {Object} datosAbandono - Datos del abandono
 * @returns {Object} - Recompensas calculadas para todos los jugadores
 */
async function procesarRecompensasAbandono(datosAbandono) {
    const {
        codigoSala,
        jugadorQueAbandona,
        jugadoresRestantes,
        huboEnvido,
        ganadorEnvidoEquipoId
    } = datosAbandono;

    console.log(`[RECOMPENSAS] 🚪 Procesando abandono de ${jugadorQueAbandona.nombreUsuario} en sala ${codigoSala}`);

    const recompensas = {};
    const todosLosJugadores = [jugadorQueAbandona, ...jugadoresRestantes];

    // Obtener estadísticas actuales de todos los jugadores
    for (const jugador of todosLosJugadores) {
        const [stats] = await pool.query(
            'SELECT elo, victorias, derrotas, partidas_jugadas FROM estadisticas WHERE usuario_id = ?',
            [jugador.id]
        );
        
        if (stats.length === 0) {
            await pool.query(
                'INSERT INTO estadisticas (usuario_id, elo, victorias, derrotas, partidas_jugadas) VALUES (?, 500, 0, 0, 0)',
                [jugador.id]
            );
            jugador.eloActual = 500;
            jugador.victoriasActuales = 0;
            jugador.derrotasActuales = 0;
            jugador.partidasJugadasActuales = 0;
        } else {
            jugador.eloActual = stats[0].elo;
            jugador.victoriasActuales = stats[0].victorias;
            jugador.derrotasActuales = stats[0].derrotas;
            jugador.partidasJugadasActuales = stats[0].partidas_jugadas;
        }
    }

    // Procesar jugador que abandona (DERROTA)
    const oponenteDelQueAbandona = jugadoresRestantes.find(j => j.equipoId !== jugadorQueAbandona.equipoId);
    
    let cambioEloPartidaAbandono = 0;
    let cambioEloEnvidoAbandono = 0;
    
    if (oponenteDelQueAbandona) {
        cambioEloPartidaAbandono = calcularCambioElo(jugadorQueAbandona.eloActual, oponenteDelQueAbandona.eloActual, 0); // 0 = derrota
        
        // Penalización adicional por abandono
        const penalizacionAbandono = -5;
        cambioEloPartidaAbandono += penalizacionAbandono;
        
        // Penalización por envido si había envido y no era su equipo el ganador
        if (huboEnvido && jugadorQueAbandona.equipoId !== ganadorEnvidoEquipoId) {
            cambioEloEnvidoAbandono = -2; // Penalización adicional
        }
    }

    const cambioEloTotalAbandono = cambioEloPartidaAbandono + cambioEloEnvidoAbandono;
    const nuevoEloAbandono = Math.max(100, jugadorQueAbandona.eloActual + cambioEloTotalAbandono);

    recompensas[jugadorQueAbandona.id] = {
        jugadorId: jugadorQueAbandona.id,
        nombreJugador: jugadorQueAbandona.nombreUsuario,
        equipoId: jugadorQueAbandona.equipoId,
        esGanador: false,
        abandonoPartida: true,
        
        // ELO
        eloAnterior: jugadorQueAbandona.eloActual,
        cambioEloPartida: cambioEloPartidaAbandono,
        cambioEloEnvido: cambioEloEnvidoAbandono,
        cambioEloTotal: cambioEloTotalAbandono,
        nuevoElo: nuevoEloAbandono,
        
        // Sin monedas por abandono
        monedasGanadas: 0,
        
        // Estadísticas
        nuevasVictorias: jugadorQueAbandona.victoriasActuales,
        nuevasDerrotas: jugadorQueAbandona.derrotasActuales + 1,
        nuevasPartidas: jugadorQueAbandona.partidasJugadasActuales + 1,
        
        // Info envido
        huboEnvido,
        ganoEnvido: false,
        perdioEnvido: huboEnvido
    };

    // Procesar jugadores restantes (VICTORIA por abandono del oponente)
    for (const jugador of jugadoresRestantes) {
        let cambioEloPartida = 0;
        let cambioEloEnvido = 0;
        
        if (oponenteDelQueAbandona && jugador.id === oponenteDelQueAbandona.id) {
            // Este es el oponente directo - recibe ELO por victoria
            cambioEloPartida = calcularCambioElo(jugador.eloActual, jugadorQueAbandona.eloActual, 1); // 1 = victoria
            
            // Bonus por envido si era su equipo el ganador
            if (huboEnvido && jugador.equipoId === ganadorEnvidoEquipoId) {
                cambioEloEnvido = 2; // Bonus por envido
            }
        }

        const cambioEloTotal = cambioEloPartida + cambioEloEnvido;
        const nuevoElo = Math.max(100, jugador.eloActual + cambioEloTotal);

        // Sin monedas por victoria por abandono (para evitar farming)
        const monedasGanadas = 0;

        recompensas[jugador.id] = {
            jugadorId: jugador.id,
            nombreJugador: jugador.nombreUsuario,
            equipoId: jugador.equipoId,
            esGanador: true,
            victoriaPorAbandono: true,
            
            // ELO
            eloAnterior: jugador.eloActual,
            cambioEloPartida,
            cambioEloEnvido,
            cambioEloTotal,
            nuevoElo,
            
            // Sin monedas por victoria por abandono
            monedasGanadas,
            
            // Estadísticas
            nuevasVictorias: jugador.victoriasActuales + 1,
            nuevasDerrotas: jugador.derrotasActuales,
            nuevasPartidas: jugador.partidasJugadasActuales + 1,
            
            // Info envido
            huboEnvido,
            ganoEnvido: huboEnvido && jugador.equipoId === ganadorEnvidoEquipoId,
            perdioEnvido: false
        };

        console.log(`[RECOMPENSAS] 🏆 ${jugador.nombreUsuario}: Victoria por abandono - ELO ${jugador.eloActual} → ${nuevoElo} (+${cambioEloTotal})`);
    }

    console.log(`[RECOMPENSAS] 💀 ${jugadorQueAbandona.nombreUsuario}: Derrota por abandono - ELO ${jugadorQueAbandona.eloActual} → ${nuevoEloAbandono} (${cambioEloTotalAbandono})`);

    return recompensas;
}

module.exports = {
    calcularRecompensasPartida,
    aplicarRecompensas,
    procesarRecompensasFinPartida,
    procesarRecompensasAbandono, // ✅ Nueva función
    calcularCambioElo,
    calcularFactorK,
    calcularEloEsperado
};
