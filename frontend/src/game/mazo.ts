// mazo.ts - Implementación del mazo de cartas para el Truco argentino

import { Carta, Palo } from './models';

export class Mazo {
  private cartas: Carta[] = [];
  
  constructor() {
    this.inicializar();
  }
  
  private inicializar(): void {
    // Vaciar el mazo
    this.cartas = [];
    
    // Agregar todas las cartas del mazo español de 40 cartas (sin 8, 9)
    const palos = [Palo.ORO, Palo.COPA, Palo.ESPADA, Palo.BASTO];
    
    for (const palo of palos) {
        for (const numero of [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]) {
          const valorEnvido = numero >= 10 ? 0 : numero;
          const carta: Carta = {
            palo,
            numero,
            valor: this.calcularValorCarta(palo, numero),
            valorEnvido: valorEnvido
          };
          this.cartas.push(carta);
        }
      }
  }
  
  private calcularValorCarta(palo: Palo, numero: number): number {
    // Valores especiales para el truco argentino
    if (numero === 1) {
      if (palo === Palo.ESPADA) return 14;  // Ancho de espada (1 de espada)
      if (palo === Palo.BASTO) return 13;   // Ancho de basto (1 de basto)
    }
    if (numero === 7) {
      if (palo === Palo.ESPADA) return 12;  // Siete de espada
      if (palo === Palo.ORO) return 11;     // Siete de oro
    }
    
    // Valores normales
    switch (numero) {
      case 3: return 10;
      case 2: return 9;
      case 1: return 8; // Para los 1 que no son espada ni basto
      case 12: return 7;
      case 11: return 6;
      case 10: return 5;
      case 7: return 4; // Para los 7 que no son espada ni oro
      case 6: return 3;
      case 5: return 2;
      case 4: return 1;
      default: return 0;
    }
  }
  
  mezclar(): void {
    // Algoritmo Fisher-Yates para mezclar las cartas
    for (let i = this.cartas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cartas[i], this.cartas[j]] = [this.cartas[j], this.cartas[i]];
    }
  }
  
  repartir(cantidad: number): Carta[] {
    if (cantidad > this.cartas.length) {
      throw new Error(`No hay suficientes cartas en el mazo (quedan ${this.cartas.length})`);
    }
    
    const cartasRepartidas: Carta[] = [];
    for (let i = 0; i < cantidad; i++) {
      const carta = this.cartas.pop();
      if (carta) {
        cartasRepartidas.push(carta);
      }
    }
    
    return cartasRepartidas;
  }
  
  getCantidadCartas(): number {
    return this.cartas.length;
  }
  
  reiniciar(): void {
    this.inicializar();
  }
}