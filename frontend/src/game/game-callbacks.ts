// src/game-logic/game-callbacks.ts
// Ajusta las rutas si tu estructura es diferente (ej: './jugador' si están en la misma carpeta)
import { Jugador } from './iaPro/jugador';
import { Naipe } from './iaPro/naipe';
import { AccionesPosibles, Equipo} from './iaPro/types';
export type LogType = 'public' | 'debug';

/**
 * Define la interfaz de comunicación desde la lógica del juego (Partida, Ronda)
 * hacia la capa de interfaz de usuario (React).
 */
export interface GameCallbacks {
    // Actualizaciones Generales del Estado de la Partida/Ronda
    setPartidaTerminada: () => void;
    setTurno: (equipo: Equipo) => void; // Informa qué equipo tiene el próximo turno
    setNumeroMano: (mano: number) => void; // <--- AÑADIDO: Informa qué mano se está jugando (0, 1, 2)
    displayLog: (message: string, type:LogType) => void; // Añade un mensaje al log del juego
    clearLog: () => void; // Limpia el log

    // Actualizaciones del Estado Visual del Juego
    updateScores: (score1: number, score2: number) => void; // Actualiza los puntajes mostrados
    updatePlayerNames: (name1: string, name2: string) => void; // Establece los nombres (generalmente al inicio)
    displayPlayerCards: (jugador: Jugador) => void; // Actualiza las cartas visibles en la mano del jugador (humano)
    clearPlayedCards: () => void; // Limpia visualmente las cartas de la mesa
    displayPlayedCard: (jugador: Jugador, carta: Naipe, manoNumero: number, jugadaEnMano: number) => void; // Muestra una carta jugada
    showPlayerCall: (jugador: Jugador, mensaje: string) => void; // Muestra un indicador de canto/respuesta
    actualizarAccionesPosibles: (acciones: AccionesPosibles) => void; // Habilita/deshabilita botones/cartas

    // Callbacks Opcionales para Efectos Visuales Adicionales
    highlightWinningCard?: (ganador: Jugador, manoNumero: number, jugadaEnManoGanadora: number) => void;
    displayRoundWinner?: (winnerName: string) => void;
}