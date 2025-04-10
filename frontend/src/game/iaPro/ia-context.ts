// ia-context.ts
import { Naipe } from './naipe';
import { Canto, Equipo } from './types';

// Contexto relevante para decisiones de Envido
export interface EnvidoContext {
    equipoIA: Equipo;
    oponente: Equipo;
    limitePuntaje: number;
    misPuntosEnvido: number;          // Puntos de envido de la IA en esta mano
    ultimoCantoEnvido: Canto | null; // Último canto de envido realizado POR EL OPONENTE o por la IA si es mano? -> Último canto en general.
    puntosEnvidoAcumulados: number; // Puntos que se ganarían SI SE QUIERE (sin contar Falta Envido)
    puntosSiNoQuiero: number;      // Puntos que se ganarían SI NO SE QUIERE
    cartaVistaOponente: Naipe | null; // Última carta jugada por el oponente (si aplica y es relevante para envido)
    statsEnvidoOponente: { // Estadísticas del oponente (provistas por Ronda)
        envidoS: number[];
        revire: number[];
        realEnvido: number[];
        faltaEnvido: number[];
    };
    probabilidad: { // Métodos de Probabilidad necesarios
        ponderarPuntos: (puntos: number) => number;
        evaluarCartaVista: (carta: Naipe | null) => number; // Cambiado de CartaVista a evaluarCartaVista
        medianaEnvidoOponente: (historial: number[]) => number | null;
    };
    // ¿Necesitamos saber quién es mano/pie en el contexto? Podría ser útil.
    esIAManoDeRonda: boolean;
    historialEnvido: { canto: Canto; equipo: Equipo }[];
}

// Contexto relevante para decisiones de Truco
export interface TrucoContext {
    equipoIA: Equipo;
    oponente: Equipo;
    limitePuntaje: number;
    nroMano: number; // 0, 1, 2
    ultimoCantoTruco: Canto | null;
    // Estado de la mesa en la mano actual
    miCartaEnMesa: Naipe | null;
    cartaOponenteEnMesa: Naipe | null;
    // Estado de las manos anteriores
    resultadoMano0: number; // >0 si ganó IA, <0 si ganó Oponente, 0 si parda
    resultadoMano1: number; // >0 si ganó IA, <0 si ganó Oponente, 0 si parda
    // Información sobre cartas
    misCartasEnMano: Naipe[];
    cartasJugadasOponente: Naipe[];
    puntosEnvidoGanadosIA: number; // Puntos que IA ganó en el envido de esta ronda
    puntosEnvidoCantadosOponente: number | null; // Puntos que cantó el oponente (si lo hizo)
    cartaJugadaIAMano0: Naipe | null; // Carta IA en MANO 0
    cartaJugadaOpMano0: Naipe | null; // Carta Oponente en MANO 0
    probabilidad: { // Métodos de Probabilidad necesarios
        deducirCarta: (puntos: number, cartasJugadas: Naipe[]) => Naipe[];
    };
}