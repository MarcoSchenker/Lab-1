import { Jugador } from './jugador';
/** Representa los palos de la baraja española */
export enum Palo {
    Oro = 'oro',
    Copa = 'copa',
    Espada = 'espada',
    Basto = 'basto'
  }
  
  /** Representa los posibles cantos y respuestas en el Truco */
  export enum Canto {
    // Envido
    Envido = 'E',
    EnvidoEnvido = 'EE',
    RealEnvido = 'R',
    FaltaEnvido = 'F',
    // Truco
    Truco = 'T',
    ReTruco = 'RT',
    ValeCuatro = 'V',
    // Respuestas / Acciones
    Quiero = 'S',
    NoQuiero = 'N',
    IrAlMazo = 'M',
    Paso = 'Paso', // Para indicar que no se canta nada
  }
  
  /** Objeto devuelto al calcular puntos de Envido */
  export type PuntosEnvido = {
    ganador: number;
    perdedor: number;
  };
  
  /** Objeto devuelto al calcular puntos de Truco */
  export type PuntosTruco = {
    querido: number;
    noQuerido: number;
  };

  export interface AccionesPosibles {
    puedeJugarCarta: boolean;
    puedeCantarEnvido: Canto[]; // Lista de cantos de envido posibles (E, R, F)
    puedeCantarTruco: Canto[];  // Lista de cantos de truco posibles (T, RT, V)
    puedeResponder: Canto[];   // Lista de respuestas/contracantos posibles (S, N, EE, RT, V, F)
    puedeMazo: boolean;
}
  /** Estructura básica de un equipo */
  export interface Equipo {
    jugador: Jugador; // Puede ser Jugador o IA
    puntos: number;
    esMano: boolean;
    manosGanadasRonda: number;
  }