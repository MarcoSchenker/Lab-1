// ia-context.ts
import { Naipe } from './naipes';
import { Canto, Equipo } from './types';
import { Jugador } from './jugador'; // Necesario para oponente.jugador...

// Contexto relevante para decisiones de Envido
export interface EnvidoContext {
    equipoIA: Equipo;
    oponente: Equipo;
    limitePuntaje: number;
    misPuntosEnvido: number;          // Puntos de envido de la IA en esta mano
    ultimoCantoEnvido: Canto | null; // Último canto de envido realizado
    puntosEnvidoAcumulados: number; // Puntos ya en juego por cantos previos
    cartaVistaOponente: Naipe | null; // Última carta jugada por el oponente (si aplica)
    historialEnvidoOponente: { // Para acceder a las stats guardadas en Jugador/IA
        envidoS: number[];
        revire: number[];
        realEnvido: number[];
    };
    probabilidad: { // Métodos de Probabilidad necesarios
        ponderarPuntos: (puntos: number) => number;
        CartaVista: (carta: Naipe | null | undefined) => number;
        medianaEnvidoOponente: (pcc: number[]) => number | null;
    };
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
     probabilidad: { // Métodos de Probabilidad necesarios
        deducirCarta: (puntos: number, jugadas: Naipe[]) => Naipe[] | null;
    };
}