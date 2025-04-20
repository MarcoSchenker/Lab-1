import { Jugador } from './iaPro/jugador';
import { Naipe } from './iaPro/naipe';
import { AccionesPosibles, Equipo} from './iaPro/types';
export type LogType = 'public' | 'debug';

/**
 * Define la interfaz de comunicación desde la lógica del juego (Partida, Ronda)
 * hacia la capa de interfaz de usuario (React).
 */
export interface GameCallbacks {
    setPartidaTerminada: () => void;
    setTurno: (equipo: Equipo) => void;
    setNumeroMano: (mano: number) => void;
    clearLog: () => void;
    displayLog: (message: string, type: LogType) => void;
    updateScores: (score1: number, score2: number) => void;
    updatePlayerNames: (name1: string, name2: string) => void;
    displayPlayerCards: (jugador: Jugador) => void;
    displayPlayedCard: (jugador: Jugador, carta: Naipe, manoNumero: number, jugadaEnMano: number) => void;
    showPlayerCall: (jugador: Jugador | null, mensaje: string) => void;
    actualizarAccionesPosibles: (acciones: AccionesPosibles) => void;
    iniciarNuevaRondaUI: () => void;
    highlightWinningCard?: (ganador: Jugador, manoNumero: number, jugadaEnManoGanadora: number) => void;
    displayRoundWinner?: (winnerName: string) => void;
    // clearPlayedCards?: () => void; // Ya no es necesario, manejado por iniciarNuevaRondaUI
    
}