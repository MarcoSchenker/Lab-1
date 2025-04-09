// jugador.ts
import { Naipe } from './naipes';
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

  constructor(public nombre: string, public readonly esHumano: boolean) {}

  /** Reinicia el estado del jugador para una nueva ronda */
  nuevaRonda(): void {
    this.cartas = [];
    this.cartasEnMano = [];
    this.cartasJugadasRonda = [];
    this.puntosGanadosEnvidoRonda = 0;
  }

  /** Calcula los puntos de envido para un conjunto de cartas */
  getPuntosDeEnvido(cartas: Naipe[]): number {
    if (!cartas || cartas.length === 0) return 0;

    const cartasValidas = cartas.filter(c => c !== null && c !== undefined);
    if (cartasValidas.length === 0) return 0;


    // Agrupa los puntos de envido por palo
    const puntosPorPalo: { [key in Palo]?: number[] } = {};
    for (const palo in Palo) {
      puntosPorPalo[palo as Palo] = [];
    }

    cartasValidas.forEach(carta => {
       puntosPorPalo[carta.palo]?.push(carta.puntosEnvido);
    });

    let maxPuntos = 0;
    let tieneFlor = false; // Detectar flor (aunque el envido se calcula igual)
    let puntosFlor = 0;

    // Buscar pares o tríos
    for (const palo in puntosPorPalo) {
      const puntos = puntosPorPalo[palo as Palo];
      if (puntos && puntos.length >= 2) {
        puntos.sort((a, b) => b - a); // Ordenar descendente
        maxPuntos = Math.max(maxPuntos, 20 + puntos[0] + puntos[1]);
        if (puntos.length === 3) {
            tieneFlor = true;
            puntosFlor = 20 + puntos[0] + puntos[1] + puntos[2];
            // Aunque tenga flor, el envido se cuenta con las 2 más altas
        }
      }
    }

    // Si no hay pares, buscar la carta más alta
    if (maxPuntos === 0) {
      let maxCartaIndividual = 0;
      cartasValidas.forEach(carta => {
        maxCartaIndividual = Math.max(maxCartaIndividual, carta.puntosEnvido);
      });
      maxPuntos = maxCartaIndividual;
    }

    // console.log(`Puntos envido calculados para ${this.nombre}: ${maxPuntos} (Flor: ${tieneFlor? puntosFlor : 'No'})`);
    return maxPuntos;
  }

  /** Registra una carta jugada por el humano (lógica de arrays) */
  registrarCartaJugada(indice: number): Naipe | undefined {
    if (indice >= 0 && indice < this.cartasEnMano.length) {
        const cartaJugada = this.cartasEnMano.splice(indice, 1)[0];
        if (cartaJugada) {
            this.cartasJugadasRonda.push(cartaJugada);
            return cartaJugada;
        }
    }
    return undefined;
  }

   /** Registra una carta jugada por la IA (lógica de arrays) */
   registrarCartaJugadaIA(carta: Naipe): boolean {
       const index = this.cartasEnMano.findIndex(c => c === carta);
       if (index > -1) {
           this.cartasEnMano.splice(index, 1);
           this.cartasJugadasRonda.push(carta);
           return true;
       }
       console.error(`[IA ${this.nombre}] Intentó registrar carta no encontrada en mano: ${carta.getNombre()}`);
       return false;
   }
}