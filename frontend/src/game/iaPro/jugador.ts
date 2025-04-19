// jugador.ts
import { Naipe } from './naipe';
import { Palo } from './types';

export class Jugador {
  public cartas: Naipe[] = [];          // Las 3 cartas iniciales de la ronda
  public cartasEnMano: Naipe[] = [];    // Cartas disponibles para jugar
  public cartasJugadasRonda: Naipe[] = []; // Cartas jugadas en la ronda actual
  public puntosGanadosEnvidoRonda: number = 0; // Para estadísticas o lógica IA


  // Estadísticas (usadas principalmente por la IA)
  public statsEnvidoCantadosOponente: number[] = [];
  public statsRealEnvidoCantadosOponente: number[] = [];
  public statsFaltaEnvidoCantadosOponente: number[] = []; // Incluye EE, R de Falta

  // Estadísticas del Oponente (registradas por la IA sobre este jugador)
  public statsEnvidoSCantados: number[] = [];
  public statsRevireCantados: number[] = [];
  public statsRealEnvidoCantados: number[] = [];
  public statsFaltaEnvidoCantados: number[] = [];

  constructor(public nombre: string, public readonly esHumano: boolean) {}

  /** Reinicia el estado del jugador para una nueva ronda */
  nuevaRonda(): void {
    this.cartas = [];
    this.cartasEnMano = [];
    this.cartasJugadasRonda = [];
    this.puntosGanadosEnvidoRonda = 0;
  }

  public getPuntosDeEnvido(cartas: Naipe[]): number {
    // Agrupar cartas por palo
    const palos: { [palo: string]: number[] } = {};
    for (const carta of cartas) {
        if (!palos[carta.palo]) palos[carta.palo] = [];
        // Las figuras valen 0 para el envido
        palos[carta.palo].push(carta.numero > 7 ? 0 : carta.numero);
    }

    let max = 0;
    for (const valores of Object.values(palos)) {
        if (valores.length >= 2) {
            // Tomar las dos más altas
            valores.sort((a, b) => b - a);
            const suma = valores[0] + valores[1] + 20;
            if (suma > max) max = suma;
        }
    }

    // Si no hay dos cartas del mismo palo, tomar la carta más alta (máximo 7)
    if (max === 0) {
        max = Math.max(...cartas.map(c => (c.numero > 7 ? 0 : c.numero)));
    }

    return max;
  }

  /** Registra una carta jugada por la IA (eliminándola de la mano) */
  registrarCartaJugadaIA(carta: Naipe): boolean {
    return this.registrarCartaJugadaPorObjeto(carta); // Reutilizar la nueva lógica
}

/**
 * Busca y elimina una carta específica de la mano del jugador y la registra como jugada.
 * @param carta El objeto Naipe a jugar.
 * @returns `true` si la carta se encontró y se jugó, `false` en caso contrario.
 */
registrarCartaJugadaPorObjeto(carta: Naipe): boolean {
  const index = this.cartasEnMano.findIndex(c => 
      c.numero === carta.numero && c.palo === carta.palo
  );
  if (index > -1) {
      // Eliminar la carta de la mano usando splice
      this.cartasEnMano.splice(index, 1);
      // Añadir la carta a las jugadas de la ronda
      this.cartasJugadasRonda.push(carta);
      console.log(`${this.nombre} jugó ${carta.getNombre()}. Mano restante: ${this.cartasEnMano.map(c=>c.getNombre()).join(', ')}`)
      return true; // Éxito
  } else {
      console.error(`[${this.nombre}] Intentó jugar carta no encontrada en mano: ${carta.getNombre()}. Mano actual: ${this.cartasEnMano.map(c=>c.getNombre()).join(', ')}`);
      return false; // Fallo
  }
}
}