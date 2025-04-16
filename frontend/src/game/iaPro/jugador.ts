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
    // Buscar la carta por referencia o por sus propiedades únicas (valor y palo)
    // La comparación por referencia (===) es ideal si los objetos son los mismos.
    const index = this.cartasEnMano.findIndex(c => c === carta);

    // Si la búsqueda por referencia falla (podría pasar si el objeto se clona en algún punto),
    // intentar buscar por valor y palo como fallback.
    // const indexFallback = this.cartasEnMano.findIndex(c => c.valor === carta.valor && c.palo === carta.palo);
    // const finalIndex = (index !== -1) ? index : indexFallback;

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