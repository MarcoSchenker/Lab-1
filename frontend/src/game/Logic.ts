// Definición de constantes y tipos
enum Palo {
  ORO = "oro",
  COPA = "copa",
  ESPADA = "espada",
  BASTO = "basto"
}

enum ValorCarta {
  UNO = 1,
  DOS = 2,
  TRES = 3,
  CUATRO = 4,
  CINCO = 5,
  SEIS = 6,
  SIETE = 7,
  DIEZ = 10,  // Sota
  ONCE = 11,  // Caballo
  DOCE = 12   // Rey
}

enum TipoCanto {
  ENVIDO = "envido",
  ENVIDO_ENVIDO = "envido envido",
  REAL_ENVIDO = "real envido",
  FALTA_ENVIDO = "falta envido",
  TRUCO = "truco",
  RETRUCO = "retruco",
  VALE_CUATRO = "vale cuatro"
}

enum EstadoEnvido {
  NO_QUERIDO = 'NO_QUERIDO',
  ENVIDO_SIMPLE = 'ENVIDO_SIMPLE',
  ENVIDO_ENVIDO = 'ENVIDO_ENVIDO',
  REAL_ENVIDO = 'REAL_ENVIDO',
  FALTA_ENVIDO = 'FALTA_ENVIDO'
}

enum EstadoTruco {
  NO_QUERIDO = 'NO_QUERIDO',
  TRUCO = 'TRUCO',
  RETRUCO = 'RETRUCO',
  VALE_CUATRO = 'VALE_CUATRO'
}

enum ResultadoRonda {
  GANADOR_EQUIPO1 = "ganador equipo 1",
  GANADOR_EQUIPO2 = "ganador equipo 2",
  EMPATE = "empate",
  PENDIENTE = "pendiente"
}

// Clase Carta
class Carta {
  readonly palo: Palo;
  readonly valor: ValorCarta;
  private _pesoTruco: number;

  constructor(palo: Palo, valor: ValorCarta) {
    this.palo = palo;
    this.valor = valor;
    this._pesoTruco = this.calcularPesoTruco();
  }

  private calcularPesoTruco(): number {
    // Asignar el peso según las reglas del Truco
    if (this.valor === ValorCarta.UNO) {
      if (this.palo === Palo.ESPADA) return 14;  // 1 de espada (macho)
      if (this.palo === Palo.BASTO) return 13;   // 1 de basto (hembra)
      return 8;  // Otros 1
    }
    if (this.valor === ValorCarta.SIETE) {
      if (this.palo === Palo.ESPADA) return 12;  // 7 de espada
      if (this.palo === Palo.ORO) return 11;     // 7 de oro
      return 4;  // Otros 7
    }
    if (this.valor === ValorCarta.TRES) return 10;
    if (this.valor === ValorCarta.DOS) return 9;
    if (this.valor === ValorCarta.DOCE) return 7;
    if (this.valor === ValorCarta.ONCE) return 6;
    if (this.valor === ValorCarta.DIEZ) return 5;
    if (this.valor === ValorCarta.SEIS) return 3;
    if (this.valor === ValorCarta.CINCO) return 2;
    if (this.valor === ValorCarta.CUATRO) return 1;

    return 0;  // No debería llegar aquí
  }

  get pesoTruco(): number {
    return this._pesoTruco;
  }

  get valorEnvido(): number {
    // Para el envido, las figuras (10, 11, 12) valen 0, el resto su valor
    return (this.valor >= ValorCarta.DIEZ) ? 0 : this.valor;
  }

  toString(): string {
    return `${this.valor} de ${this.palo}`;
  }
}

// Clase Jugador
class Jugador {
  readonly id: number;
  readonly nombre: string;
  private _mano: Carta[] = [];
  private _cartasJugadas: Carta[] = [];
  private _equipoId: number;

  constructor(id: number, nombre: string, equipoId: number) {
    this.id = id;
    this.nombre = nombre;
    this._equipoId = equipoId;
  }

  get equipoId(): number {
    return this._equipoId;
  }

  get mano(): Carta[] {
    return [...this._mano];
  }

  set mano(cartas: Carta[]) {
    this._mano = [...cartas];
    this._cartasJugadas = [];
  }

  get cartasJugadas(): Carta[] {
    return [...this._cartasJugadas];
  }

  jugarCarta(indice: number): Carta {
    if (indice < 0 || indice >= this._mano.length) {
      throw new Error("Índice de carta inválido");
    }
    const carta = this._mano[indice];
    this._mano.splice(indice, 1);
    this._cartasJugadas.push(carta);
    return carta;
  }

  calcularEnvido(): number {
    // Agrupar cartas por palo
    const cartasPorPalo = new Map<Palo, Carta[]>();
    
    for (const carta of this._mano) {
      if (!cartasPorPalo.has(carta.palo)) {
        cartasPorPalo.set(carta.palo, []);
      }
      cartasPorPalo.get(carta.palo)!.push(carta);
    }

    let mayorEnvido = 0;
    
    // Calcular envido por cada palo
    for (const [_, cartas] of cartasPorPalo.entries()) {
      if (cartas.length >= 2) {
        // Ordenar cartas por valor de envido (descendente)
        cartas.sort((a, b) => b.valorEnvido - a.valorEnvido);
        
        // Tomar las dos cartas con mayor valor de envido
        const envido = 20 + cartas[0].valorEnvido + cartas[1].valorEnvido;
        mayorEnvido = Math.max(mayorEnvido, envido);
      }
    }

    // Si no hay flor (2+ cartas del mismo palo), buscar la carta con mayor valor
    if (mayorEnvido === 0) {
      for (const carta of this._mano) {
        mayorEnvido = Math.max(mayorEnvido, carta.valorEnvido);
      }
    }

    return mayorEnvido;
  }
}

// Clase Equipo
class Equipo {
  readonly id: number;
  readonly nombre: string;
  readonly jugadores: Jugador[] = [];
  private _puntos: number = 0;
  private _puntosRonda: number = 0;

  constructor(id: number, nombre: string) {
    this.id = id;
    this.nombre = nombre;
  }

  agregarJugador(jugador: Jugador): void {
    this.jugadores.push(jugador);
  }

  get puntos(): number {
    return this._puntos;
  }

  sumarPuntos(puntos: number): void {
    this._puntos += puntos;
  }

  get puntosRonda(): number {
    return this._puntosRonda;
  }

  reiniciarPuntosRonda(): void {
    this._puntosRonda = 0;
  }

  sumarPuntosRonda(puntos: number): void {
    this._puntosRonda += puntos;
  }

  // Calcula el envido máximo del equipo (el máximo de todos los jugadores)
  calcularEnvidoEquipo(): number {
    let maxEnvido = 0;
    for (const jugador of this.jugadores) {
      const envidoJugador = jugador.calcularEnvido();
      maxEnvido = Math.max(maxEnvido, envidoJugador);
    }
    return maxEnvido;
  }
}

// Clase Mazo
class Mazo {
  private cartas: Carta[] = [];

  constructor() {
    this.inicializar();
  }

  inicializar(): void {
    this.cartas = [];
    const palos = [Palo.ORO, Palo.COPA, Palo.ESPADA, Palo.BASTO];
    const valores = [
      ValorCarta.UNO, ValorCarta.DOS, ValorCarta.TRES, ValorCarta.CUATRO,
      ValorCarta.CINCO, ValorCarta.SEIS, ValorCarta.SIETE,
      ValorCarta.DIEZ, ValorCarta.ONCE, ValorCarta.DOCE
    ];

    // Crear todas las cartas del mazo español de 40 cartas
    for (const palo of palos) {
      for (const valor of valores) {
        this.cartas.push(new Carta(palo, valor));
      }
    }
  }

  mezclar(): void {
    // Algoritmo de Fisher-Yates para mezclar el mazo
    for (let i = this.cartas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cartas[i], this.cartas[j]] = [this.cartas[j], this.cartas[i]];
    }
  }

  repartir(cantidadCartas: number): Carta[] {
    if (cantidadCartas > this.cartas.length) {
      throw new Error("No hay suficientes cartas en el mazo");
    }
    return this.cartas.splice(0, cantidadCartas);
  }
}

// Clase Ronda
class Ronda {
  private cartasJugadas: Map<Jugador, Carta> = new Map();
  private resultado: ResultadoRonda = ResultadoRonda.PENDIENTE;
  readonly numero: number;
  
  constructor(numero: number) {
    this.numero = numero;
  }

  jugarCarta(jugador: Jugador, carta: Carta): void {
    if (this.cartasJugadas.has(jugador)) {
      throw new Error(`El jugador ${jugador.nombre} ya jugó una carta en esta ronda`);
    }
    this.cartasJugadas.set(jugador, carta);
  }

  getCartaJugador(jugador: Jugador): Carta | undefined {
    return this.cartasJugadas.get(jugador);
  }

  getCartasJugadas(): Map<Jugador, Carta> {
    return new Map(this.cartasJugadas);
  }

  determinarGanador(equipos: Equipo[]): ResultadoRonda {
    // Si no todos han jugado, la ronda está pendiente
    if (this.resultado !== ResultadoRonda.PENDIENTE) {
      return this.resultado;
    }

    let cartaMasAlta: Carta | null = null;
    let jugadorGanador: Jugador | null = null;
    let empate = false;

    // Buscar la carta con el mayor peso de truco
    for (const [jugador, carta] of this.cartasJugadas.entries()) {
      if (!cartaMasAlta) {
        cartaMasAlta = carta;
        jugadorGanador = jugador;
      } else if (carta.pesoTruco > cartaMasAlta.pesoTruco) {
        cartaMasAlta = carta;
        jugadorGanador = jugador;
        empate = false;
      } else if (carta.pesoTruco === cartaMasAlta.pesoTruco) {
        empate = true;
      }
    }

    // Determinar el resultado de la ronda
    if (empate) {
      this.resultado = ResultadoRonda.EMPATE;
    } else if (jugadorGanador) {
      const equipoGanador = equipos.find(e => e.id === jugadorGanador!.equipoId);
      this.resultado = equipoGanador?.id === 1 ? ResultadoRonda.GANADOR_EQUIPO1 : ResultadoRonda.GANADOR_EQUIPO2;
    }

    return this.resultado;
  }

  get estaCompleta(): boolean {
    return this.resultado !== ResultadoRonda.PENDIENTE;
  }
}
// Clase Mano (representa una mano completa del juego con 3 rondas)
class Mano {
  private equipos: Equipo[];
  private jugadores: Jugador[];
  private rondas: Ronda[] = [];
  private rondaActual: number = 0;
  private jugadorMano: number = 0;  // Índice del jugador mano
  private turnoActual: number = 0;  // Índice del jugador con el turno
  private estadoEnvido: EstadoEnvido = EstadoEnvido.NO_CANTADO;
  private estadoTruco: EstadoTruco = EstadoTruco.NO_CANTADO;
  private ultimoEquipoQueCanto: number | null = null;
  private mazo: Mazo;
  private resultadosRondas: ResultadoRonda[] = [];
  private equipoGanadorMano: number | null = null;
  private puntosEnvido: number = 0;

  constructor(equipos: Equipo[], jugadores: Jugador[]) {
    this.equipos = equipos;
    this.jugadores = jugadores;
    this.mazo = new Mazo();
    
    // Inicializar las 3 rondas
    for (let i = 0; i < 3; i++) {
      this.rondas.push(new Ronda(i + 1));
    }
  }

  iniciar(): void {
    // Mezclar el mazo
    this.mazo.mezclar();
    
    // Repartir cartas a los jugadores (3 cartas a cada uno)
    for (const jugador of this.jugadores) {
      jugador.mano = this.mazo.repartir(3);
    }
    
    // Establecer el jugador mano (primer jugador del equipo 1)
    this.jugadorMano = 0;
    this.turnoActual = this.jugadorMano;
  }

  get jugadorActual(): Jugador {
    return this.jugadores[this.turnoActual];
  }

  pasarTurno(): void {
    this.turnoActual = (this.turnoActual + 1) % this.jugadores.length;
  }

  jugarCarta(indiceJugador: number, indiceCarta: number): boolean {
    if (this.rondaActual >= 3 || this.equipoGanadorMano !== null) {
      return false;  // La mano ya terminó
    }

    const jugador = this.jugadores[indiceJugador];
    
    if (indiceJugador !== this.turnoActual) {
      throw new Error("No es el turno de este jugador");
    }

    // Jugar la carta seleccionada
    const carta = jugador.jugarCarta(indiceCarta);
    
    // Registrar la carta jugada en la ronda actual
    this.rondas[this.rondaActual].jugarCarta(jugador, carta);
    
    // Pasar al siguiente turno
    this.pasarTurno();
    
    // Verificar si todos los jugadores han jugado en esta ronda
    let todoJugaron = true;
    for (const j of this.jugadores) {
      if (this.rondas[this.rondaActual].getCartaJugador(j) === undefined) {
        todoJugaron = false;
        break;
      }
    }
    
    if (todoJugaron) {
      const resultado = this.rondas[this.rondaActual].determinarGanador(this.equipos);
      this.resultadosRondas[this.rondaActual] = resultado;
      
      // Establecer el próximo turno basado en el ganador de la ronda
      if (resultado === ResultadoRonda.GANADOR_EQUIPO1 || resultado === ResultadoRonda.GANADOR_EQUIPO2) {
        // Buscar el índice del primer jugador del equipo ganador
        const equipoGanador = resultado === ResultadoRonda.GANADOR_EQUIPO1 ? 1 : 2;
        let primerJugadorEquipoGanador = -1;
        for (let i = 0; i < this.jugadores.length; i++) {
          if (this.jugadores[i].equipoId === equipoGanador) {
            primerJugadorEquipoGanador = i;
            break;
          }
        }
        if (primerJugadorEquipoGanador !== -1) {
          this.turnoActual = primerJugadorEquipoGanador;
        }
      }
      
      this.rondaActual++;
      this.verificarFinMano();
    }
    
    return true;
  }

  private verificarFinMano(): void {
    // Verificar si ya tenemos un ganador después de las rondas jugadas
    if (this.rondaActual >= 3) {
      this.determinarGanadorMano();
      return;
    }

    // Contar victorias de cada equipo
    let victoriasEquipo1 = 0;
    let victoriasEquipo2 = 0;
    
    for (const resultado of this.resultadosRondas) {
      if (resultado === ResultadoRonda.GANADOR_EQUIPO1) victoriasEquipo1++;
      else if (resultado === ResultadoRonda.GANADOR_EQUIPO2) victoriasEquipo2++;
    }
    
    // Un equipo gana si tiene 2 victorias
    if (victoriasEquipo1 >= 2) {
      this.equipoGanadorMano = 1;
      this.asignarPuntosMano();
    } else if (victoriasEquipo2 >= 2) {
      this.equipoGanadorMano = 2;
      this.asignarPuntosMano();
    } else if (this.rondaActual === 3) {
      // Si llegamos a la tercera ronda sin un ganador claro
      this.determinarGanadorMano();
    }
  }

  private determinarGanadorMano(): void {
    // Contar victorias y empates
    let victoriasEquipo1 = 0;
    let victoriasEquipo2 = 0;
    let empates = 0;
    
    for (const resultado of this.resultadosRondas) {
      if (resultado === ResultadoRonda.GANADOR_EQUIPO1) victoriasEquipo1++;
      else if (resultado === ResultadoRonda.GANADOR_EQUIPO2) victoriasEquipo2++;
      else if (resultado === ResultadoRonda.EMPATE) empates++;
    }
    
    // Determinar el ganador según las reglas del Truco
    if (victoriasEquipo1 > victoriasEquipo2) {
      this.equipoGanadorMano = 1;
    } else if (victoriasEquipo2 > victoriasEquipo1) {
      this.equipoGanadorMano = 2;
    } else {
      // En caso de empate, gana el equipo que ganó la primera ronda no empatada
      for (let i = 0; i < this.resultadosRondas.length; i++) {
        const resultado = this.resultadosRondas[i];
        if (resultado === ResultadoRonda.GANADOR_EQUIPO1) {
          this.equipoGanadorMano = 1;
          break;
        } else if (resultado === ResultadoRonda.GANADOR_EQUIPO2) {
          this.equipoGanadorMano = 2;
          break;
        }
      }
      
      // Si todas las rondas fueron empate, gana el equipo mano
      if (this.equipoGanadorMano === null) {
        this.equipoGanadorMano = this.jugadores[this.jugadorMano].equipoId;
      }
    }
    
    this.asignarPuntosMano();
  }

  private asignarPuntosMano(): void {
    if (this.equipoGanadorMano === null) return;
    
    let puntos = 1;  // Puntos base por ganar la mano
    
    // Agregar puntos según el estado del truco
    switch (this.estadoTruco) {
      case EstadoTruco.TRUCO:
        puntos = 2;
        break;
      case EstadoTruco.RETRUCO:
        puntos = 3;
        break;
      case EstadoTruco.VALE_CUATRO:
        puntos = 4;
        break;
    }
    
    // Asignar los puntos al equipo ganador
    const equipoGanador = this.equipos.find(e => e.id === this.equipoGanadorMano);
    if (equipoGanador) {
      equipoGanador.sumarPuntos(puntos);
    }
  }

  // Métodos para cantar envido y truco
  
  cantarEnvido(indiceJugador: number): boolean {
    if (this.rondaActual > 0 || this.estadoEnvido !== EstadoEnvido.NO_CANTADO || indiceJugador !== this.turnoActual) {
      return false;
    }
    
    this.estadoEnvido = EstadoEnvido.ENVIDO_SIMPLE;
    this.ultimoEquipoQueCanto = this.jugadores[indiceJugador].equipoId;
    this.puntosEnvido = 2;  // Envido simple vale 2 puntos
    return true;
  }

  cantarEnvidoEnvido(indiceJugador: number): boolean {
    if (this.rondaActual > 0 || this.estadoEnvido !== EstadoEnvido.ENVIDO_SIMPLE || 
        this.jugadores[indiceJugador].equipoId === this.ultimoEquipoQueCanto) {
      return false;
    }
    
    this.estadoEnvido = EstadoEnvido.ENVIDO_ENVIDO;
    this.ultimoEquipoQueCanto = this.jugadores[indiceJugador].equipoId;
    this.puntosEnvido = 4;  // Envido-Envido vale 4 puntos
    return true;
  }
  
  cantarRealEnvido(indiceJugador: number): boolean {
    if (this.rondaActual > 0 || this.estadoEnvido === EstadoEnvido.NO_QUERIDO || 
        this.estadoEnvido === EstadoEnvido.QUERIDO || indiceJugador !== this.turnoActual) {
      return false;
    }
    
    this.estadoEnvido = EstadoEnvido.REAL_ENVIDO;
    this.ultimoEquipoQueCanto = this.jugadores[indiceJugador].equipoId;
    this.puntosEnvido += 3;  // Real Envido suma 3 puntos más
    return true;
  }
  
  cantarFaltaEnvido(indiceJugador: number): boolean {
    if (this.rondaActual > 0 || this.estadoEnvido === EstadoEnvido.NO_QUERIDO || 
        this.estadoEnvido === EstadoEnvido.QUERIDO || indiceJugador !== this.turnoActual) {
      return false;
    }
    
    this.estadoEnvido = EstadoEnvido.FALTA_ENVIDO;
    this.ultimoEquipoQueCanto = this.jugadores[indiceJugador].equipoId;
    // Falta Envido: Puntos necesarios para llegar a 30 (o lo que sea el puntaje para ganar)
    this.puntosEnvido = 30; // Simplificado, en una implementación real sería variable
    return true;
  }
  
  quererEnvido(indiceJugador: number): boolean {
    if (this.estadoEnvido === EstadoEnvido.NO_CANTADO || 
        this.estadoEnvido === EstadoEnvido.QUERIDO || 
        this.estadoEnvido === EstadoEnvido.NO_QUERIDO || 
        this.jugadores[indiceJugador].equipoId === this.ultimoEquipoQueCanto) {
      return false;
    }
    
    this.estadoEnvido = EstadoEnvido.QUERIDO;
    
    // Determinar el ganador del envido
    const equipo1 = this.equipos.find(e => e.id === 1);
    const equipo2 = this.equipos.find(e => e.id === 2);
    
    if (!equipo1 || !equipo2) return false;
    
    const puntosEquipo1 = equipo1.calcularEnvidoEquipo();
    const puntosEquipo2 = equipo2.calcularEnvidoEquipo();
    
    // En caso de empate, gana el equipo mano
    const equipoMano = this.jugadores[this.jugadorMano].equipoId;
    
    if (puntosEquipo1 > puntosEquipo2 || (puntosEquipo1 === puntosEquipo2 && equipoMano === 1)) {
      equipo1.sumarPuntos(this.puntosEnvido);
    } else {
      equipo2.sumarPuntos(this.puntosEnvido);
    }
    
    return true;
  }
  
  noQuererEnvido(indiceJugador: number): boolean {
    if (this.estadoEnvido === EstadoEnvido.NO_CANTADO || 
        this.estadoEnvido === EstadoEnvido.QUERIDO || 
        this.estadoEnvido === EstadoEnvido.NO_QUERIDO || 
        this.jugadores[indiceJugador].equipoId === this.ultimoEquipoQueCanto) {
      return false;
    }
    
    this.estadoEnvido = EstadoEnvido.NO_QUERIDO;
    
    // Determinar puntos a otorgar por no querer
    let puntos = 1; // Por defecto, no querer envido simple da 1 punto
    
    switch (this.estadoEnvido) {
      case EstadoEnvido.ENVIDO_SIMPLE:
        puntos = 1;
        break;
      case EstadoEnvido.ENVIDO_ENVIDO:
        puntos = 2;
        break;
      case EstadoEnvido.REAL_ENVIDO:
        puntos = 1;
        break;
      case EstadoEnvido.FALTA_ENVIDO:
        puntos = 3; // Simplificado, depende de los cantos previos
        break;
    }
    
    // Equipo que cantó gana los puntos por no querer
    const equipoGanador = this.equipos.find(e => e.id === this.ultimoEquipoQueCanto);
    if (equipoGanador) {
      equipoGanador.sumarPuntos(puntos);
    }
    
    return true;
  }
  
  cantarTruco(indiceJugador: number): boolean {
    if (this.estadoTruco !== EstadoTruco.NO_CANTADO || indiceJugador !== this.turnoActual) {
      return false;
    }
    
    this.estadoTruco = EstadoTruco.TRUCO;
    this.ultimoEquipoQueCanto = this.jugadores[indiceJugador].equipoId;
    return true;
  }
  
  cantarRetruco(indiceJugador: number): boolean {
    if (this.estadoTruco !== EstadoTruco.TRUCO || 
        this.jugadores[indiceJugador].equipoId === this.ultimoEquipoQueCanto) {
      return false;
    }
    
    this.estadoTruco = EstadoTruco.RETRUCO;
    this.ultimoEquipoQueCanto = this.jugadores[indiceJugador].equipoId;
    return true;
  }
  
  cantarValeCuatro(indiceJugador: number): boolean {
    if (this.estadoTruco !== EstadoTruco.RETRUCO || 
        this.jugadores[indiceJugador].equipoId === this.ultimoEquipoQueCanto) {
      return false;
    }
    
    this.estadoTruco = EstadoTruco.VALE_CUATRO;
    this.ultimoEquipoQueCanto = this.jugadores[indiceJugador].equipoId;
    return true;
  }
  
  quererTruco(indiceJugador: number): boolean {
    if (this.jugadores[indiceJugador].equipoId === this.ultimoEquipoQueCanto) {
      return false;
    }
    
    // No hacemos nada especial, simplemente se sigue jugando
    return true;
  }
  
    // Completando el método noQuererTruco que estaba incompleto
// Clase Mano - continuación del método noQuererTruco
  noQuererTruco(indiceJugador: number): boolean {
    if (this.jugadores[indiceJugador].equipoId === this.ultimoEquipoQueCanto) {
      return false;
    }
    
    this.estadoTruco = EstadoTruco.NO_QUERIDO;
    
    // Asignar puntos al equipo que cantó el truco según el último estado
    let puntos = 1;
    
    switch (this.estadoTruco) {
      case EstadoTruco.TRUCO:
        puntos = 1;
        break;
      case EstadoTruco.RETRUCO:
        puntos = 2;
        break;
      case EstadoTruco.VALE_CUATRO:
        puntos = 3;
        break;
    }
    
    // Asignar puntos al equipo que cantó
    const equipoGanador = this.equipos.find(e => e.id === this.ultimoEquipoQueCanto);
    if (equipoGanador) {
      equipoGanador.sumarPuntos(puntos);
    }
    
    // La mano termina cuando no se quiere el truco
    this.equipoGanadorMano = this.ultimoEquipoQueCanto;
    
    return true;
  }

  get estaTerminada(): boolean {
    return this.equipoGanadorMano !== null;
  }

  get ganador(): number | null {
    return this.equipoGanadorMano;
  }
}

// Clase Partida para manejar el juego completo
class Partida {
  private equipos: Equipo[] = [];
  private jugadores: Jugador[] = [];
  private manoActual: Mano | null = null;
  private jugadorManoIndex: number = 0;
  private puntajeParaGanar: number = 30;
  private formato: string; // "1v1", "2v2", "3v3"

  constructor(formato: string = "2v2", puntajeParaGanar: number = 30) {
    this.formato = formato;
    this.puntajeParaGanar = puntajeParaGanar;
    this.inicializarEquiposYJugadores(formato);
  }

  private inicializarEquiposYJugadores(formato: string): void {
    this.equipos = [
      new Equipo(1, "Equipo 1"),
      new Equipo(2, "Equipo 2")
    ];

    this.jugadores = [];
    
    let jugadoresPorEquipo = 2; // Por defecto 2v2
    
    if (formato === "1v1") {
      jugadoresPorEquipo = 1;
    } else if (formato === "3v3") {
      jugadoresPorEquipo = 3;
    }
    
    // Crear jugadores para el equipo 1
    for (let i = 0; i < jugadoresPorEquipo; i++) {
      const jugador = new Jugador(i, `Jugador ${i + 1} (E1)`, 1);
      this.jugadores.push(jugador);
      this.equipos[0].agregarJugador(jugador);
    }
    
    // Crear jugadores para el equipo 2
    for (let i = 0; i < jugadoresPorEquipo; i++) {
      const jugador = new Jugador(jugadoresPorEquipo + i, `Jugador ${jugadoresPorEquipo + i + 1} (E2)`, 2);
      this.jugadores.push(jugador);
      this.equipos[1].agregarJugador(jugador);
    }
  }

  iniciarNuevaMano(): void {
    if (this.hayGanador()) {
      throw new Error("La partida ya tiene un ganador");
    }
    
    // Rotar el jugador mano
    this.jugadorManoIndex = (this.jugadorManoIndex + 1) % this.jugadores.length;
    
    // Reordenar jugadores para que el jugador mano sea el primero
    const jugadoresOrdenados = [...this.jugadores];
    const jugadoresMano = jugadoresOrdenados.splice(0, this.jugadorManoIndex);
    this.jugadores = [...jugadoresOrdenados, ...jugadoresMano];
    
    this.manoActual = new Mano(this.equipos, this.jugadores);
    this.manoActual.iniciar();
  }

  jugarCarta(indiceJugador: number, indiceCarta: number): boolean {
    if (!this.manoActual || this.manoActual.estaTerminada) {
      return false;
    }
    
    const resultado = this.manoActual.jugarCarta(indiceJugador, indiceCarta);
    
    // Si la mano terminó, verificar si hay un ganador de la partida
    if (this.manoActual.estaTerminada) {
      this.verificarGanadorPartida();
    }
    
    return resultado;
  }

  cantarEnvido(indiceJugador: number): boolean {
    return this.manoActual?.cantarEnvido(indiceJugador) || false;
  }

  cantarEnvidoEnvido(indiceJugador: number): boolean {
    return this.manoActual?.cantarEnvidoEnvido(indiceJugador) || false;
  }

  cantarRealEnvido(indiceJugador: number): boolean {
    return this.manoActual?.cantarRealEnvido(indiceJugador) || false;
  }

  cantarFaltaEnvido(indiceJugador: number): boolean {
    return this.manoActual?.cantarFaltaEnvido(indiceJugador) || false;
  }

  quererEnvido(indiceJugador: number): boolean {
    return this.manoActual?.quererEnvido(indiceJugador) || false;
  }

  noQuererEnvido(indiceJugador: number): boolean {
    return this.manoActual?.noQuererEnvido(indiceJugador) || false;
  }

  cantarTruco(indiceJugador: number): boolean {
    return this.manoActual?.cantarTruco(indiceJugador) || false;
  }

  cantarRetruco(indiceJugador: number): boolean {
    return this.manoActual?.cantarRetruco(indiceJugador) || false;
  }

  cantarValeCuatro(indiceJugador: number): boolean {
    return this.manoActual?.cantarValeCuatro(indiceJugador) || false;
  }

  quererTruco(indiceJugador: number): boolean {
    return this.manoActual?.quererTruco(indiceJugador) || false;
  }

  noQuererTruco(indiceJugador: number): boolean {
    const resultado = this.manoActual?.noQuererTruco(indiceJugador) || false;
    
    if (resultado && this.manoActual?.estaTerminada) {
      this.verificarGanadorPartida();
    }
    
    return resultado;
  }

  private verificarGanadorPartida(): void {
    // Verificar si algún equipo alcanzó el puntaje para ganar
    for (const equipo of this.equipos) {
      if (equipo.puntos >= this.puntajeParaGanar) {
        // La partida tiene un ganador
        return;
      }
    }
  }

  hayGanador(): boolean {
    return this.equipos.some(equipo => equipo.puntos >= this.puntajeParaGanar);
  }

  getGanador(): Equipo | null {
    for (const equipo of this.equipos) {
      if (equipo.puntos >= this.puntajeParaGanar) {
        return equipo;
      }
    }
    return null;
  }

  getPuntajes(): { [equipoId: number]: number } {
    const puntajes: { [equipoId: number]: number } = {};
    for (const equipo of this.equipos) {
      puntajes[equipo.id] = equipo.puntos;
    }
    return puntajes;
  }

  getEstadoManoActual(): any {
    if (!this.manoActual) {
      return null;
    }
    
    return {
      jugadorActual: this.manoActual.jugadorActual,
      estaTerminada: this.manoActual.estaTerminada,
      ganador: this.manoActual.ganador
    };
  }

  getJugadores(): Jugador[] {
    return [...this.jugadores];
  }

  getEquipos(): Equipo[] {
    return [...this.equipos];
  }
}

// Clase principal para manejar el juego
export class JuegoTruco {
  private partida: Partida | null = null;
  
  constructor() {}
  
  iniciarNuevaPartida(formato: string = "2v2", puntajeParaGanar: number = 30): void {
    this.partida = new Partida(formato, puntajeParaGanar);
    this.partida.iniciarNuevaMano();
  }
  
  // Método para manejar las acciones del juego
  ejecutarAccion(tipo: string, indiceJugador: number, indiceCarta?: number): boolean {
    if (!this.partida) {
      return false;
    }
    
    switch (tipo) {
      case "jugarCarta":
        if (indiceCarta === undefined) return false;
        return this.partida.jugarCarta(indiceJugador, indiceCarta);
      case "cantarEnvido":
        return this.partida.cantarEnvido(indiceJugador);
      case "cantarEnvidoEnvido":
        return this.partida.cantarEnvidoEnvido(indiceJugador);
      case "cantarRealEnvido":
        return this.partida.cantarRealEnvido(indiceJugador);
      case "cantarFaltaEnvido":
        return this.partida.cantarFaltaEnvido(indiceJugador);
      case "quererEnvido":
        return this.partida.quererEnvido(indiceJugador);
      case "noQuererEnvido":
        return this.partida.noQuererEnvido(indiceJugador);
      case "cantarTruco":
        return this.partida.cantarTruco(indiceJugador);
      case "cantarRetruco":
        return this.partida.cantarRetruco(indiceJugador);
      case "cantarValeCuatro":
        return this.partida.cantarValeCuatro(indiceJugador);
      case "quererTruco":
        return this.partida.quererTruco(indiceJugador);
      case "noQuererTruco":
        return this.partida.noQuererTruco(indiceJugador);
      case "nuevaMano":
        if (this.partida.hayGanador()) {
          return false;
        }
        this.partida.iniciarNuevaMano();
        return true;
      default:
        return false;
    }
  }
  
  getEstadoJuego(): any {
    if (!this.partida) {
      return {
        estado: "no_iniciado"
      };
    }
    
    return {
      estado: this.partida.hayGanador() ? "terminado" : "en_curso",
      puntajes: this.partida.getPuntajes(),
      ganador: this.partida.getGanador()?.nombre || null,
      manoActual: this.partida.getEstadoManoActual(),
      jugadores: this.partida.getJugadores().map(j => ({
        id: j.id,
        nombre: j.nombre,
        equipoId: j.equipoId,
        cartas: j.mano
      }))
    };
  }
}

// Ejemplo de uso:
// const juego = new JuegoTruco();
// juego.iniciarNuevaPartida("2v2");
// 
// // Jugar una carta
// juego.ejecutarAccion("jugarCarta", 0, 1);  // Jugador 0 juega su carta en posición 1
// 
// // Cantar envido
// juego.ejecutarAccion("cantarEnvido", 0);  // Jugador 0 canta Envido
// juego.ejecutarAccion("quererEnvido", 1);  // Jugador 1 quiere el Envido
// 
// // Ver estado del juego
// console.log(juego.getEstadoJuego());
