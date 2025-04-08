// probabilidad.ts
import { Naipe } from './naipes';
import { Palo, Canto } from './types';
import { getLast } from './utils'; // Importar utilidad

export class Probabilidad {
  // Parámetros originales para ponderar
  private m1: number = 0.15;
  private m2: number = 0.25;
  private cv1: number = -20; // Original: -20
  private cv2: number = 20; // Original: 20

  /** Pondera los puntos de envido (0-33) a un valor ~probabilístico (0-1) */
  ponderarPuntos(puntos: number): number {
    const pen1 = this.m1 / 7;
    const pen2 = (1 - this.m2) / (33 - 20);
    const h = 1 - 33 * pen2;

    if (puntos <= 7) return Math.max(0, Math.min(1, puntos * pen1)); // Asegurar rango 0-1
    else return Math.max(0, Math.min(1, puntos * pen2 + h)); // Asegurar rango 0-1
  }

  /** Calcula un modificador basado en la carta vista del oponente */
  evaluarCartaVista(carta?: Naipe): number {
    if (!carta) return 0;

    const e = carta.puntosEnvido;
    const m = (this.cv2 - this.cv1) / 7;
    const h = this.cv1;
    // El resultado original puede ser negativo o > 1, ¿debería normalizarse?
    // Por ahora, mantenemos la lógica original.
    return e * m + h;
  }

   /** Calcula la mediana de puntos de envido cantados por el oponente */
   medianaEnvidoOponente(puntosCantados: number[]): number | null {
       if (puntosCantados.length === 0) return null;

       const sorted = [...puntosCantados].sort((a, b) => a - b); // Clonar antes de ordenar
       const mid = Math.floor(sorted.length / 2);

       if (sorted.length % 2 === 0) {
           // Par: promedio de los dos del medio
           return (sorted[mid - 1] + sorted[mid]) / 2;
       } else {
           // Impar: el del medio
           return sorted[mid];
       }
   }

  /** Intenta deducir posibles cartas del oponente basado en puntos cantados y jugadas */
  deducirCarta(puntosCantados: number, cartasJugadasOponente: Naipe[]): Naipe[] {
      // Esta función es compleja y depende mucho de asumir reglas específicas.
      // Se mantiene la lógica original con tipos.
      let posibles: Naipe[] = [];
      const cartasYaJugadasSet = new Set(cartasJugadasOponente.map(c => `${c.palo}-${c.numero}`));

      const agregarPosible = (naipe: Naipe) => {
          if (!cartasYaJugadasSet.has(`${naipe.palo}-${naipe.numero}`)) {
              posibles.push(naipe);
          }
      };

      if (puntosCantados <= 7) {
          // Lógica para puntos bajos (una sola carta cuenta)
           switch (puntosCantados) {
                case 0: // Figuras 10, 11, 12
                    [Palo.Espada, Palo.Basto, Palo.Oro, Palo.Copa].forEach(p => {
                        agregarPosible(new Naipe(7, 0, 12, p));
                        agregarPosible(new Naipe(6, 0, 11, p));
                        agregarPosible(new Naipe(5, 0, 10, p));
                    });
                    break;
                case 1: // Ases
                    agregarPosible(new Naipe(14, 1, 1, Palo.Espada));
                    agregarPosible(new Naipe(13, 1, 1, Palo.Basto));
                    agregarPosible(new Naipe(8, 1, 1, Palo.Oro));
                    agregarPosible(new Naipe(8, 1, 1, Palo.Copa));
                    break;
                case 2: // Doses
                     [Palo.Espada, Palo.Basto, Palo.Oro, Palo.Copa].forEach(p => agregarPosible(new Naipe(9, 2, 2, p)));
                     break;
                case 3: // Treses
                     [Palo.Espada, Palo.Basto, Palo.Oro, Palo.Copa].forEach(p => agregarPosible(new Naipe(10, 3, 3, p)));
                     break;
                case 4: // Cuatros
                    [Palo.Espada, Palo.Basto, Palo.Oro, Palo.Copa].forEach(p => agregarPosible(new Naipe(1, 4, 4, p)));
                    break;
                case 5: // Cincos
                    [Palo.Espada, Palo.Basto, Palo.Oro, Palo.Copa].forEach(p => agregarPosible(new Naipe(2, 5, 5, p)));
                    break;
                case 6: // Seises
                    [Palo.Espada, Palo.Basto, Palo.Oro, Palo.Copa].forEach(p => agregarPosible(new Naipe(3, 6, 6, p)));
                    break;
                case 7: // Sietes buenos
                    agregarPosible(new Naipe(12, 7, 7, Palo.Espada)); // 7 Espada
                    agregarPosible(new Naipe(11, 7, 7, Palo.Oro));   // 7 Oro
                    agregarPosible(new Naipe(4, 7, 7, Palo.Basto)); // 7 Basto (valor truco bajo)
                    agregarPosible(new Naipe(4, 7, 7, Palo.Copa));  // 7 Copa (valor truco bajo)
                    break;
            }
            // Si ya jugó cartas del mismo palo, eliminamos esas posibilidades?
            // La lógica original parece hacerlo después, lo mantenemos así.

      } else { // Envido >= 20 (dos cartas del mismo palo)
            // Iterar sobre las cartas jugadas por el oponente
            for (const cartaJugada of cartasJugadasOponente) {
                 const paloEnvido = cartaJugada.palo;
                 const puntosNecesarios = puntosCantados - 20 - cartaJugada.puntosEnvido;

                 if (puntosNecesarios >= 0 && puntosNecesarios <= 7) {
                     // Generar posibles cartas que sumen los puntos necesarios
                      switch (puntosNecesarios) {
                            case 0:
                                agregarPosible(new Naipe(7, 0, 12, paloEnvido));
                                agregarPosible(new Naipe(6, 0, 11, paloEnvido));
                                agregarPosible(new Naipe(5, 0, 10, paloEnvido));
                                break;
                            case 1:
                                const v1 = paloEnvido === Palo.Espada ? 14 : (paloEnvido === Palo.Basto ? 13 : 8);
                                agregarPosible(new Naipe(v1, 1, 1, paloEnvido));
                                break;
                            case 2: agregarPosible(new Naipe(9, 2, 2, paloEnvido)); break;
                            case 3: agregarPosible(new Naipe(10, 3, 3, paloEnvido)); break;
                            case 4: agregarPosible(new Naipe(1, 4, 4, paloEnvido)); break;
                            case 5: agregarPosible(new Naipe(2, 5, 5, paloEnvido)); break;
                            case 6: agregarPosible(new Naipe(3, 6, 6, paloEnvido)); break;
                            case 7:
                                const v7 = paloEnvido === Palo.Espada ? 12 : (paloEnvido === Palo.Oro ? 11 : 4);
                                agregarPosible(new Naipe(v7, 7, 7, paloEnvido));
                                break;
                        }
                 }
            }
             // ¿Considerar el caso de Flor? Si cantó 30 y jugó un 7 y un 6 del mismo palo,
             // la tercera debe ser la figura (0 puntos). La lógica actual no cubre esto explícitamente.

             // Si ya jugó dos cartas del mismo palo, y los puntos cantados coinciden,
             // no podemos deducir la tercera carta con esta lógica simple.
             if (cartasJugadasOponente.length >= 2) {
                 const palo1 = cartasJugadasOponente[0].palo;
                 const palo2 = cartasJugadasOponente[1].palo;
                 if (palo1 === palo2) {
                      const puntosJugados = 20 + cartasJugadasOponente[0].puntosEnvido + cartasJugadasOponente[1].puntosEnvido;
                      if (puntosJugados === puntosCantados) {
                          // Ya jugó las cartas del envido, no podemos deducir la restante aquí.
                          // Quizás la IA debería saber que la restante es de otro palo.
                      }
                 }
             }

      }

      // Filtrar nuevamente por si se añadieron cartas ya jugadas (aunque agregarPosible ya lo hace)
      posibles = posibles.filter(p => !cartasYaJugadasSet.has(`${p.palo}-${p.numero}`));

      return posibles;
  }

  /** Calcula la probabilidad promedio de ganar con las cartas dadas */
  promedioTruco(cartas: Naipe[], rondaActual?: Ronda): number {
    if (!cartas || cartas.length === 0) return 0;

    let sumaProbabilidades = 0;
    for (const carta of cartas) {
        // Llamamos a probGanar de la Naipe. Necesita la ronda para ser precisa.
        sumaProbabilidades += carta.probGanar(rondaActual);
    }
    return sumaProbabilidades / cartas.length;
  }
}

// utils.ts (Pequeña utilidad para reemplazar Array.prototype.getLast)
export function getLast<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[arr.length - 1] : undefined;
}