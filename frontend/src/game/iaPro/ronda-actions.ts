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
    if (!ronda.envidoHandler.puedeEnvido || ronda.envidoHandler.envidoResuelto || ronda.envidoHandler.equipoDebeResponderEnvido || ronda.trucoHandler.equipoDebeResponderTruco || ronda.trucoHandler.trucoQuerido) return [];
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
    if (ronda.envidoHandler.equipoDebeResponderEnvido || ronda.trucoHandler.trucoResuelto) return false;
    if (ronda.trucoHandler.equipoDebeResponderTruco === equipo) return false; // No puede cantar si debe responder

    const ultimoCantoObj = getLast(ronda.trucoHandler.cantosTruco);
    if (!ultimoCantoObj) return true; // Nadie cantó, puede Truco

    if (esRespuesta(ultimoCantoObj.canto)) {
        if (ultimoCantoObj.canto === Canto.NoQuiero) return false; // Nadie más canta
        // Si fue Quiero, puede escalar el que respondió Quiero (si es el equipo actual)
        return ultimoCantoObj.equipo === equipo;
    } else {
        // Si el último fue un canto (T, RT, V4), no puede cantar el mismo equipo
        return ultimoCantoObj.equipo !== equipo;
    }
}

export function getPosiblesCantosTruco(ronda: Ronda): Canto[] {
    if (!puedeCantarTruco(ronda, ronda.equipoEnTurno)) return [];

    // Último canto NO respondido
    const ultimoCantoNoRespondido = getLast(ronda.trucoHandler.cantosTruco.filter(c => !esRespuesta(c.canto)))?.canto;

    // Si no hay cantos previos O el último fue respondido con Quiero por el equipo en turno
    const ultimoReal = getLast(ronda.trucoHandler.cantosTruco);
    const puedeEscalar = !ultimoReal || (ultimoReal.canto === Canto.Quiero && ultimoReal.equipo === ronda.equipoEnTurno);

    if (puedeEscalar) {
        switch (ultimoCantoNoRespondido) {
            case undefined: return [Canto.Truco];         // No se cantó nada
            case Canto.Truco: return [Canto.ReTruco];    // Se cantó Truco y me respondieron Quiero
            case Canto.ReTruco: return [Canto.ValeCuatro]; // Se cantó ReTruco y me respondieron Quiero
            default: return [];                          // No se puede escalar ValeCuatro
        }
    }

    return []; // No puede cantar en otras situaciones (ej: le cantaron y aún no respondió)
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