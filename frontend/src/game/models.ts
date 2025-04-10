// models.ts - Definiciones básicas para el juego de Truco

export enum Palo {
    ESPADA = 'ESPADA',
    BASTO = 'BASTO',
    ORO = 'ORO',
    COPA = 'COPA'
  }
  
  export class Carta {
    constructor(
      public readonly numero: number,
      public readonly palo: Palo
    ) {}
  
    // Valor de la carta según las reglas del truco
    get valor(): number {
      // 1 de espadas es el más alto
      if (this.numero === 1 && this.palo === Palo.ESPADA) return 14;
      // 1 de bastos
      if (this.numero === 1 && this.palo === Palo.BASTO) return 13;
      // 7 de espadas
      if (this.numero === 7 && this.palo === Palo.ESPADA) return 12;
      // 7 de oros
      if (this.numero === 7 && this.palo === Palo.ORO) return 11;
      
      // 3s
      if (this.numero === 3) return 10;
      // 2s
      if (this.numero === 2) return 9;
      // 1 de copa y oro
      if (this.numero === 1 && (this.palo === Palo.COPA || this.palo === Palo.ORO)) return 8;
      // 12s
      if (this.numero === 12) return 7;
      // 11s
      if (this.numero === 11) return 6;
      // 10s
      if (this.numero === 10) return 5;
      // 7 de copa y basto
      if (this.numero === 7 && (this.palo === Palo.COPA || this.palo === Palo.BASTO)) return 4;
      // 6s
      if (this.numero === 6) return 3;
      // 5s
      if (this.numero === 5) return 2;
      // 4s
      if (this.numero === 4) return 1;
      
      // No debería llegar aquí
      return 0;
    }
  
    // Valor de la carta para el envido
    get valorEnvido(): number {
      // Para el envido, las figuras (10, 11, 12) valen 0
      if (this.numero >= 10) return 0;
      // El resto vale su número
      return this.numero;
    }
  
    toString(): string {
      return `${this.numero} de ${this.palo}`;
    }
  }
  
  export class Jugador {
    public cartas: Carta[] = [];
    public cartasJugadas: Carta[] = [];
    public esMano: boolean = false;
    public esPie: boolean = false;
    
    constructor(
      public readonly id: string,
      public readonly nombre: string,
      public readonly posicion: number
    ) {}
  
    recibirCartas(cartas: Carta[]): void {
      this.cartas = cartas;
      this.cartasJugadas = [];
    }
  
    jugarCarta(index: number): Carta {
      if (index < 0 || index >= this.cartas.length) {
        throw new Error('Índice de carta inválido');
      }
      
      const carta = this.cartas[index];
      // Quitamos la carta jugada de la mano
      this.cartas.splice(index, 1);
      // Añadimos la carta al historial de cartas jugadas
      this.cartasJugadas.push(carta);
      
      return carta;
    }
  
    getCartasDisponibles(): Carta[] {
      return this.cartas;
    }
  
    calcularEnvido(): number {
      if (this.cartas.length < 2) return 0;
      
      // Agrupamos cartas por palo
      const cartasPorPalo = new Map<Palo, Carta[]>();
      
      for (const carta of this.cartas) {
        if (!cartasPorPalo.has(carta.palo)) {
          cartasPorPalo.set(carta.palo, []);
        }
        cartasPorPalo.get(carta.palo)!.push(carta);
      }
      
      let mayorEnvido = 0;
      
      // Calculamos el envido para cada palo
      for (const [palo, cartas] of cartasPorPalo.entries()) {
        if (cartas.length >= 2) {
          // Ordenamos por valor de envido descendente
          const cartasOrdenadas = [...cartas].sort((a, b) => b.valorEnvido - a.valorEnvido);
          // Tomamos las 2 mejores cartas y sumamos 20
          const envido = cartasOrdenadas[0].valorEnvido + cartasOrdenadas[1].valorEnvido + 20;
          if (envido > mayorEnvido) {
            mayorEnvido = envido;
          }
        }
      }
      
      // Si no hay envido (no hay 2 cartas del mismo palo), buscamos la carta más alta
      if (mayorEnvido === 0) {
        return Math.max(...this.cartas.map(c => c.valorEnvido));
      }
      
      return mayorEnvido;
    }
    getCartas(): Carta[] {
      return this.cartas;
    }
  }
  
  export class Equipo {
    private jugadores: Jugador[] = [];
    private puntos: number = 0;
  
    constructor(public readonly id: string, public readonly nombre: string) {}
  
    agregarJugador(jugador: Jugador): void {
      this.jugadores.push(jugador);
    }
  
    getJugadores(): Jugador[] {
      return [...this.jugadores];
    }
  
    getPuntos(): number {
      return this.puntos;
    }

    setPuntos(puntos: number): void {
      this.puntos = puntos;
    }
  
    sumarPuntos(puntos: number): void {
      this.puntos += puntos;
    }
  
    // Devuelve el jugador que es el pie del equipo
    getPie(): Jugador {
      return this.jugadores[this.jugadores.length - 1];
    }
  
    // Calcular el mejor envido del equipo
    calcularMejorEnvido(): { puntos: number; jugador: Jugador } {
      let mejorJugador = this.jugadores[0];
      let mejorEnvido = mejorJugador.calcularEnvido();
  
      for (let i = 1; i < this.jugadores.length; i++) {
        const envido = this.jugadores[i].calcularEnvido();
        if (envido > mejorEnvido) {
          mejorEnvido = envido;
          mejorJugador = this.jugadores[i];
        }
      }
  
      return { puntos: mejorEnvido, jugador: mejorJugador };
    }
  
    reiniciarCartas(): void {
      for (const jugador of this.jugadores) {
        jugador.recibirCartas([]);
      }
    }
  }