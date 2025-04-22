// src/game/iaPro/ronda-calculos.ts
import { Canto, Equipo } from './types';
import { getLast } from './utils';

/** Calcula los puntos de envido según los cantos realizados hasta el momento */
export function calcularPuntosEnvido(
    cantosEnvido: { canto: Canto, equipo: Equipo }[],
    limitePuntaje: number,
    puntosEquipo1: number,
    puntosEquipo2: number
): { ganador: number; perdedor: number; acumuladoCantos: number } {
    let g = 0, p = 0, a = 0;
    let faltaActiva = false;
    let puntosBase = 0;
    const cantosValidos = cantosEnvido.filter(c => !esRespuesta(c.canto));

    for (const item of cantosValidos) {
        a++;
        switch (item.canto) {
            case Canto.Envido:
                puntosBase = (puntosBase === 0) ? 2 : puntosBase + 2;
                break;
            case Canto.EnvidoEnvido:
                puntosBase += 2;
                break;
            case Canto.RealEnvido:
                puntosBase += 3;
                break;
            case Canto.FaltaEnvido:
                faltaActiva = true;
                break;
        }
    }

    if (faltaActiva) {
        p = (puntosBase > 0) ? puntosBase : 1;
        const puntosOponente = Math.max(puntosEquipo1, puntosEquipo2);
        g = limitePuntaje - puntosOponente;
        if (g <= 0) g = 1;
    } else {
        g = (puntosBase > 0) ? puntosBase : (a > 0 ? 1 : 0);
        if (a === 0) p = 0;
        else if (a === 1) p = 1;
        else {
            let puntosPenultimo = 0;
            for (let i = 0; i < cantosValidos.length - 1; i++) {
                switch (cantosValidos[i].canto) {
                    case Canto.Envido: puntosPenultimo = (puntosPenultimo === 0) ? 2 : puntosPenultimo + 2; break;
                    case Canto.EnvidoEnvido: puntosPenultimo += 2; break;
                    case Canto.RealEnvido: puntosPenultimo += 3; break;
                }
            }
            p = (puntosPenultimo > 0) ? puntosPenultimo : 1;
        }
    }

    if (!faltaActiva && g < p) g = p;
    if (a === 0) { g = 0; p = 0; }

    return { ganador: g, perdedor: p, acumuladoCantos: a };
}

/** Calcula los puntos de truco según el último canto realizado */
export function calcularPuntosTruco(
    cantosTruco: { canto: Canto, equipo: Equipo }[]
): { querido: number; noQuerido: number } {
    const ultimoCantoObj = getLast(cantosTruco.filter(c => !esRespuesta(c.canto)));
    const ultimoCanto = ultimoCantoObj?.canto;

    switch (ultimoCanto) {
        case Canto.Truco: return { querido: 2, noQuerido: 1 };
        case Canto.ReTruco: return { querido: 3, noQuerido: 2 };
        case Canto.ValeCuatro: return { querido: 4, noQuerido: 3 };
        default: return { querido: 1, noQuerido: 1};
    }
}

// Helper (puedes moverlo a utils.ts si prefieres)
function esRespuesta(canto: Canto): boolean {
    return canto === Canto.Quiero || canto === Canto.NoQuiero;
}