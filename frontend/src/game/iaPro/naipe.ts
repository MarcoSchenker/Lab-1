import { Palo } from './types';
import { Ronda } from './ronda'; // Necesario para probGanar si accede a Ronda

export class Naipe {
  constructor(
    public readonly valor: number,       // Valor para el Truco (1-14)
    public readonly puntosEnvido: number, // Puntos para el Envido (0-7)
    public readonly numero: number,     // Número visual (1-12)
    public readonly palo: Palo          // Palo de la carta
  ) {}

  /** Devuelve el nombre legible de la carta */
  getNombre(): string {
    return `${this.numero} de ${this.palo}`;
  }

  /** Devuelve la ruta de la imagen para esta carta */
  getImageSrc(basePath: string = '../cartas/mazoOriginal'): string {
    // Mapea el número a la parte del nombre del archivo (ej. 1->1, 10->10, 11->11, 12->12)
    const numeroArchivo = this.numero;
    return `${basePath}/${numeroArchivo}${this.palo}.png`;
  }

   /**
   * Calcula la probabilidad *bruta* de ganar contra una carta aleatoria de un mazo completo.
   * NOTA: Esta lógica es la original y no considera cartas ya jugadas o en manos.
   * Para una probabilidad real, necesitaría el estado actual del mazo en la ronda.
   */
  probGanar(rondaActual?: Ronda): number { // Ronda es opcional aquí
    // Generamos una baraja completa temporalmente para replicar la lógica original
    const masoCompleto = Naipe.generarBarajaCompleta();
    let cartasMejoresOIguales = 0;

    for (const cartaMazo of masoCompleto) {
      // No nos comparamos con nosotros mismos exactamente, aunque en un mazo completo no pasaría.
      if (!(cartaMazo.palo === this.palo && cartaMazo.numero === this.numero)) {
        if (cartaMazo.valor >= this.valor) {
          cartasMejoresOIguales++;
        }
      }
    }
    // Probabilidad de que una carta aleatoria sea PEOR que la nuestra
    const cartasPeores = masoCompleto.length - 1 - cartasMejoresOIguales; // -1 porque no contamos la nuestra
    return cartasPeores / (masoCompleto.length - 1);
  }

  /**
   * Helper estático para generar una baraja completa (usado en probGanar).
   * La lógica real de generar la baraja para la ronda está en Ronda.
   */
  static generarBarajaCompleta(): Naipe[] {
      // Reutilizamos la lógica de Ronda.generarBaraja aquí
      const baraja: Naipe[] = [];
      baraja.push(new Naipe(14, 1, 1, Palo.Espada));
      baraja.push(new Naipe(13, 1, 1, Palo.Basto));
      baraja.push(new Naipe(12, 7, 7, Palo.Espada));
      baraja.push(new Naipe(11, 7, 7, Palo.Oro));
      baraja.push(new Naipe(10, 3, 3, Palo.Espada));
      baraja.push(new Naipe(10, 3, 3, Palo.Basto));
      baraja.push(new Naipe(10, 3, 3, Palo.Oro));
      baraja.push(new Naipe(10, 3, 3, Palo.Copa));
      baraja.push(new Naipe(9, 2, 2, Palo.Espada));
      baraja.push(new Naipe(9, 2, 2, Palo.Basto));
      baraja.push(new Naipe(9, 2, 2, Palo.Oro));
      baraja.push(new Naipe(9, 2, 2, Palo.Copa));
      baraja.push(new Naipe(8, 1, 1, Palo.Oro));
      baraja.push(new Naipe(8, 1, 1, Palo.Copa));
      baraja.push(new Naipe(7, 0, 12, Palo.Espada));
      baraja.push(new Naipe(7, 0, 12, Palo.Basto));
      baraja.push(new Naipe(7, 0, 12, Palo.Oro));
      baraja.push(new Naipe(7, 0, 12, Palo.Copa));
      baraja.push(new Naipe(6, 0, 11, Palo.Espada));
      baraja.push(new Naipe(6, 0, 11, Palo.Basto));
      baraja.push(new Naipe(6, 0, 11, Palo.Oro));
      baraja.push(new Naipe(6, 0, 11, Palo.Copa));
      baraja.push(new Naipe(5, 0, 10, Palo.Espada));
      baraja.push(new Naipe(5, 0, 10, Palo.Basto));
      baraja.push(new Naipe(5, 0, 10, Palo.Oro));
      baraja.push(new Naipe(5, 0, 10, Palo.Copa));
      baraja.push(new Naipe(4, 7, 7, Palo.Basto));
      baraja.push(new Naipe(4, 7, 7, Palo.Copa)); 
      baraja.push(new Naipe(3, 6, 6, Palo.Espada));
      baraja.push(new Naipe(3, 6, 6, Palo.Basto));
      baraja.push(new Naipe(3, 6, 6, Palo.Oro));
      baraja.push(new Naipe(3, 6, 6, Palo.Copa));
      baraja.push(new Naipe(2, 5, 5, Palo.Espada));
      baraja.push(new Naipe(2, 5, 5, Palo.Basto));
      baraja.push(new Naipe(2, 5, 5, Palo.Oro));
      baraja.push(new Naipe(2, 5, 5, Palo.Copa));
      baraja.push(new Naipe(1, 4, 4, Palo.Espada));
      baraja.push(new Naipe(1, 4, 4, Palo.Basto));
      baraja.push(new Naipe(1, 4, 4, Palo.Oro));
      baraja.push(new Naipe(1, 4, 4, Palo.Copa));
      return baraja;
  }
}