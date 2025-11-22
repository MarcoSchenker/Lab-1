// src/game/iaPro/ronda-actions.ts
import { Canto, Equipo, AccionesPosibles } from './types';
import { Ronda, EstadoRonda } from './ronda'; // Importar Ronda y EstadoRonda
import { getLast } from './utils';

// Helper (puedes moverlo a utils.ts si prefieres)
function esRespuesta(canto: Canto): boolean {
    return canto === Canto.Quiero || canto === Canto.NoQuiero;
}

// --- Funciones para calcular acciones posibles ---

export function calcularAccionesPosiblesParaTurno(ronda: Ronda): AccionesPosibles {
    const puedeJugar = ronda.estadoRonda === EstadoRonda.EsperandoJugadaNormal || ronda.estadoRonda === EstadoRonda.InicioMano;
    const envidoPosible = getPosiblesCantosEnvido(ronda);
    const trucoPosible = getPosiblesCantosTruco(ronda);
    // Simplificación: Siempre se puede ir al mazo si no se ha resuelto el truco o la ronda no ha terminado por envido no querido
    const puedeMazo = ronda.estadoRonda !== EstadoRonda.RondaTerminada && !ronda.trucoHandler.trucoNoQueridoPor;

    return {
        puedeJugarCarta: puedeJugar,
        puedeCantarEnvido: puedeJugar ? envidoPosible : [],
        puedeCantarTruco: puedeJugar ? trucoPosible : [],
        puedeResponder: [], // No está respondiendo en un turno normal
        puedeMazo: puedeMazo
    };
}

export function calcularAccionesPosiblesParaRespuestaEnvido(ronda: Ronda): AccionesPosibles {
    if (ronda.equipoEnTurno !== ronda.envidoHandler.equipoDebeResponderEnvido) {
        return { puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false };
    }
    return {
        puedeJugarCarta: false,
        puedeCantarEnvido: [],
        puedeCantarTruco: [],
        puedeResponder: getPosiblesRespuestasEnvido(ronda),
        puedeMazo: true // Se puede ir al mazo en lugar de responder
    };
}

export function calcularAccionesPosiblesParaRespuestaTruco(ronda: Ronda): AccionesPosibles {
    if (ronda.equipoEnTurno !== ronda.trucoHandler.equipoDebeResponderTruco) {
         return { puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false };
    }
    return {
        puedeJugarCarta: false,
        puedeCantarEnvido: [],
        puedeCantarTruco: [],
        puedeResponder: getPosiblesRespuestasTruco(ronda),
        puedeMazo: true // Se puede ir al mazo en lugar de responder
    };
}

// --- Funciones de obtención de cantos/respuestas específicas ---

export function getPosiblesCantosEnvido(ronda: Ronda): Canto[] {
    const trucoBloquea = ronda.trucoHandler.equipoDebeResponderTruco && !ronda.trucoPendientePorEnvidoPrimero;
    if (!ronda.envidoHandler.puedeEnvido || ronda.envidoHandler.envidoResuelto || ronda.envidoHandler.equipoDebeResponderEnvido || trucoBloquea || ronda.trucoHandler.trucoQuerido) return [];
    if (ronda.numeroDeMano !== 0) return [];
    // Validar jugadas en mano
    if (ronda.equipoEnTurno === ronda.equipoMano && ronda.jugadasEnMano > 0) return [];
    if (ronda.equipoEnTurno === ronda.equipoPie && ronda.jugadasEnMano > 1) return [];

    return [Canto.Envido, Canto.RealEnvido, Canto.FaltaEnvido];
}

export function getPosiblesRespuestasEnvido(ronda: Ronda): Canto[] {
    console.log("[getPosiblesRespuestasEnvido] Estado:", ronda.estadoRonda, "Turno:", ronda.equipoEnTurno.jugador.nombre, "Debe responder:", ronda.envidoHandler.equipoDebeResponderEnvido?.jugador.nombre);

    if (!ronda.envidoHandler.equipoDebeResponderEnvido || ronda.equipoEnTurno !== ronda.envidoHandler.equipoDebeResponderEnvido) {
        console.log("[getPosiblesRespuestasEnvido] No corresponde responder envido.");
        return [];
    }

    const ultimo = getLast(ronda.envidoHandler.cantosEnvido.filter(c => !esRespuesta(c.canto)))?.canto;
    const respuestas: Canto[] = [Canto.Quiero, Canto.NoQuiero];
    if (!ultimo) {
        console.log("[getPosiblesRespuestasEnvido] No hay último canto.");
        return [];
    }

    switch (ultimo) {
        case Canto.Envido: respuestas.push(Canto.EnvidoEnvido, Canto.RealEnvido, Canto.FaltaEnvido); break;
        case Canto.EnvidoEnvido: respuestas.push(Canto.RealEnvido, Canto.FaltaEnvido); break;
        case Canto.RealEnvido: respuestas.push(Canto.FaltaEnvido); break;
    }
    console.log("[getPosiblesRespuestasEnvido] Respuestas posibles:", respuestas);
    return respuestas;
}

export function puedeCantarTruco(ronda: Ronda, equipo: Equipo): boolean {
    const handler = ronda.trucoHandler;

    if (ronda.envidoHandler.equipoDebeResponderEnvido) return false; // Envido pendiente
    if (handler.trucoNoQueridoPor || handler.equipoSeFueAlMazo) return false; // Truco resuelto negativo
    if (handler.equipoDebeResponderTruco === equipo) return false; // Debe responder, no cantar

    // ¿Se llegó a ValeCuatro y se aceptó?
    const ultimoNivelObj = getLast(handler.cantosTruco.filter(c => !esRespuesta(c.canto)));
    const ultimoNivel = ultimoNivelObj?.canto;
    if (ultimoNivel === Canto.ValeCuatro && handler.trucoQuerido) return false;

    // ¿Fue mi propio canto el último y estoy esperando respuesta?
    const ultimoCantoGeneralObj = getLast(handler.cantosTruco);
    if (ultimoCantoGeneralObj && !esRespuesta(ultimoCantoGeneralObj.canto) && ultimoCantoGeneralObj.equipo === equipo) {
        return false; // No puedo cantar si espero respuesta a mi canto
    }
    return true;
}

/**
 * Determina QUÉ cantos de Truco específicos (Truco, ReTruco, ValeCuatro)
 * puede hacer el jugador en turno, aplicando la regla de escalada.
 */
export function getPosiblesCantosTruco(ronda: Ronda): Canto[] {
    const handler = ronda.trucoHandler;
    const equipoActual = ronda.equipoEnTurno;
    const cantos = handler.cantosTruco;

    // Primero, usar la función general para ver si se puede cantar ALGO
    if (!puedeCantarTruco(ronda, equipoActual)) {
        return [];
    }

    // Determinar qué canto específico es posible
    const ultimoCantoGeneral = getLast(cantos);
    const ultimoCantoRealObj = getLast(cantos.filter(c => !esRespuesta(c.canto)));
    const ultimoNivelCantado = ultimoCantoRealObj?.canto;

    // Caso 1: No se ha cantado nada aún.
    if (!ultimoCantoGeneral) {
        return [Canto.Truco];
    }

    // Caso 2: El Truco ya fue aceptado (querido).
    if (handler.trucoQuerido) {
        // ¿Puede escalar el jugador actual? SÓLO si él dijo el último "Quiero".
        if (ultimoCantoGeneral?.canto === Canto.Quiero && ultimoCantoGeneral.equipo === equipoActual) {
            // Sí, puede escalar. ¿A qué nivel?
            switch (ultimoNivelCantado) { // Nivel que se aceptó
                case Canto.Truco:
                    return [Canto.ReTruco];    // Aceptó Truco -> Puede cantar ReTruco
                case Canto.ReTruco:
                    return [Canto.ValeCuatro]; // Aceptó ReTruco -> Puede cantar ValeCuatro
                default:
                    return []; // No se puede escalar V4 o estado raro
            }
        } else {
            return [];
        }
    } else {
        return [];
    }
}
export function getPosiblesRespuestasTruco(ronda: Ronda): Canto[] {
    if (!ronda.trucoHandler.equipoDebeResponderTruco || ronda.equipoEnTurno !== ronda.trucoHandler.equipoDebeResponderTruco) return [];

    const ultimo = getLast(ronda.trucoHandler.cantosTruco.filter(c => !esRespuesta(c.canto)))?.canto;
    const respuestas: Canto[] = [Canto.Quiero, Canto.NoQuiero];
    if (!ultimo) return []; // No debería pasar

    switch (ultimo) {
        case Canto.Truco: respuestas.push(Canto.ReTruco); break;
        case Canto.ReTruco: respuestas.push(Canto.ValeCuatro); break;
        // No se puede contra-cantar ValeCuatro
    }
    return respuestas;
}