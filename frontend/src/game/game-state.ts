// game-state.ts - Gestión del estado del juego

import { Carta, Jugador, Equipo, Palo } from './models';
import { Mazo } from './mazo';

export enum EstadoMano {
  INICIO,
  ENVIDO_FASE,
  TRUCO_FASE,
  FIN_MANO
}

export enum EstadoEnvido {
  NO_CANTADO,
  ENVIDO,
  ENVIDO_ENVIDO,
  REAL_ENVIDO,
  FALTA_ENVIDO
}

export enum EstadoTruco {
  NO_CANTADO,
  TRUCO,
  RETRUCO,
  VALE_CUATRO
}

export type ResultadoMano = {
  equipo: Equipo;
  puntos: number;
  razon: string;
};

export class JuegoTruco {
  private readonly mazo: Mazo;
  private equipos: Equipo[] = [];
  private jugadores: Jugador[] = [];
  private manoActual: number = 0;
  private rondaActual: number = 0;
  private jugadorActual: number = 0;
  private estadoMano: EstadoMano = EstadoMano.INICIO;
  private estadoEnvido: EstadoEnvido = EstadoEnvido.NO_CANTADO;
  private estadoTruco: EstadoTruco = EstadoTruco.NO_CANTADO;
  private envidoCantadoPor: Equipo | null = null;
  private trucoCantadoPor: Equipo | null = null;
  private ultimoEnvidoCantadoPor: Equipo | null = null;
  private ultimoTrucoCantadoPor: Equipo | null = null;
  private cartasEnMesa: { jugador: Jugador; carta: Carta }[] = [];
  private historicoRondas: { jugador: Jugador; carta: Carta }[][] = [];
  private ganadorRonda: Equipo[] = [];
  private cantosTruco: { canto: EstadoTruco; equipo: Equipo }[] = [];
  private cantosEnvido: { canto: EstadoEnvido; equipo: Equipo }[] = [];
  private enEsperaRespuesta: boolean = false;
  private cantoActual: 'TRUCO' | 'ENVIDO' | null = null;
  private equipoEnEspera: Equipo | null = null;
  private puntajeObjetivo: number = 30; // El juego se juega a 30 puntos

  constructor(numeroJugadores: number = 2) {
    if (numeroJugadores < 2 || numeroJugadores > 6) {
      throw new Error('El número de jugadores debe ser entre 2 y 6');
    }
    
    this.mazo = new Mazo();
    this.crearEquiposYJugadores(numeroJugadores);
  }

  private crearEquiposYJugadores(numeroJugadores: number): void {
    // Definimos la cantidad de equipos y jugadores por equipo
    let numEquipos: number;
    let jugadoresPorEquipo: number;

    if (numeroJugadores === 2) {
      numEquipos = 2;
      jugadoresPorEquipo = 1;
    } else if (numeroJugadores === 4) {
      numEquipos = 2;
      jugadoresPorEquipo = 2;
    } else if (numeroJugadores === 6) {
      numEquipos = 2;
      jugadoresPorEquipo = 3;
    } else {
      throw new Error('El número de jugadores debe ser 2, 4 o 6');
    }

    // Crear equipos
    for (let i = 0; i < numEquipos; i++) {
      const equipo = new Equipo(`equipo_${i + 1}`, `Equipo ${i + 1}`);
      this.equipos.push(equipo);
    }

    // Crear jugadores y asignarlos a los equipos
    let jugadorCount = 0;
    for (let e = 0; e < numEquipos; e++) {
      for (let j = 0; j < jugadoresPorEquipo; j++) {
        const posicionGlobal = jugadorCount++;
        const jugador = new Jugador(
          `jugador_${posicionGlobal + 1}`,
          `Jugador ${posicionGlobal + 1}`,
          posicionGlobal
        );
        this.jugadores.push(jugador);
        this.equipos[e].agregarJugador(jugador);
      }
    }

    // Asignar roles iniciales (mano y pie)
    this.asignarRolesIniciales();
  }

  private asignarRolesIniciales(): void {
    // El primer jugador es mano en la primera ronda
    this.jugadores[0].esMano = true;
    
    // Asignar pie a cada equipo (último jugador de cada equipo)
    for (const equipo of this.equipos) {
      const jugadores = equipo.getJugadores();
      jugadores[jugadores.length - 1].esPie = true;
    }
  }

  iniciarJuego(): void {
    this.manoActual = 0;
    this.estadoMano = EstadoMano.INICIO;
    this.iniciarNuevaMano();
  }

  private iniciarNuevaMano(): void {
    // Rotamos el jugador mano
    this.rotarMano();
    
    // Reiniciar el estado de la mano
    this.rondaActual = 0;
    this.estadoMano = EstadoMano.ENVIDO_FASE;
    this.estadoEnvido = EstadoEnvido.NO_CANTADO;
    this.estadoTruco = EstadoTruco.NO_CANTADO;
    this.envidoCantadoPor = null;
    this.trucoCantadoPor = null;
    this.ultimoEnvidoCantadoPor = null;
    this.ultimoTrucoCantadoPor = null;
    this.cartasEnMesa = [];
    this.historicoRondas = [];
    this.ganadorRonda = [];
    this.cantosTruco = [];
    this.cantosEnvido = [];
    this.enEsperaRespuesta = false;
    this.cantoActual = null;
    this.equipoEnEspera = null;
    
    // Resetear las cartas de los jugadores
    for (const equipo of this.equipos) {
      equipo.reiniciarCartas();
    }
    
    // Repartir cartas
    this.repartirCartas();
    
    // Establecer el jugador actual (el que es mano)
    this.jugadorActual = this.jugadores.findIndex(j => j.esMano);
  }

  private rotarMano(): void {
    // Encontrar el jugador que era mano
    const indexManoAnterior = this.jugadores.findIndex(j => j.esMano);
    
    // Quitar el rol de mano
    this.jugadores[indexManoAnterior].esMano = false;
    
    // El siguiente jugador es mano
    const nuevoIndexMano = (indexManoAnterior + 1) % this.jugadores.length;
    this.jugadores[nuevoIndexMano].esMano = true;
    
    // Resetear roles de pie
    for (const jugador of this.jugadores) {
      jugador.esPie = false;
    }
    
    // Asignar nuevos pies
    for (const equipo of this.equipos) {
      const jugadores = equipo.getJugadores();
      const ultimoJugador = jugadores[jugadores.length - 1];
      if (ultimoJugador) {
        ultimoJugador.esPie = true;
      }
    }
  }

  private repartirCartas(): void {
    this.mazo.mezclar();
    
    // Dar 3 cartas a cada jugador
    for (const jugador of this.jugadores) {
      const cartas = this.mazo.repartir(3);
      jugador.recibirCartas(cartas);
    }
  }

  // Jugar una carta
  jugarCarta(jugadorId: string, indexCarta: number): boolean {
    if (this.estadoMano === EstadoMano.FIN_MANO) {
      return false;
    }
    
    if (this.enEsperaRespuesta) {
      return false; // No se puede jugar carta mientras se espera respuesta a un canto
    }
    
    const jugador = this.jugadores.find(j => j.id === jugadorId);
    if (!jugador) {
      return false;
    }
    
    // Verificar si es el turno del jugador
    if (this.jugadores[this.jugadorActual].id !== jugadorId) {
      return false;
    }
    
    try {
      // Si estamos en fase de envido, pasamos a fase de truco después de jugar la primera carta
      if (this.estadoMano === EstadoMano.ENVIDO_FASE) {
        this.estadoMano = EstadoMano.TRUCO_FASE;
      }
      
      const carta = jugador.jugarCarta(indexCarta);
      this.cartasEnMesa.push({ jugador, carta });
      
      // Actualizar jugador actual
      this.siguienteJugador();
      
      // Verificar si la ronda ha terminado
      if (this.cartasEnMesa.length === this.jugadores.length) {
        this.finalizarRonda();
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  private siguienteJugador(): void {
    this.jugadorActual = (this.jugadorActual + 1) % this.jugadores.length;
  }

  private finalizarRonda(): void {
    // Guardar las cartas de esta ronda en el histórico
    this.historicoRondas.push([...this.cartasEnMesa]);
    
    // Determinar el ganador de la ronda
    const ganador = this.determinarGanadorRonda();
    if (ganador) {
      this.ganadorRonda.push(ganador);
    }
    
    // Limpiar la mesa
    this.cartasEnMesa = [];
    
    // Incrementar la ronda
    this.rondaActual++;
    
    // Verificar si la mano ha terminado
    if (this.rondaActual === 3 || this.determinarGanadorMano()) {
      this.finalizarMano();
    } else {
      // El ganador de la ronda es el primero en jugar
      if (ganador) {
        const jugadorGanador = ganador.getJugadores().find(j => 
          this.historicoRondas[this.rondaActual - 1].some(item => item.jugador.id === j.id));
        if (jugadorGanador) {
          this.jugadorActual = this.jugadores.findIndex(j => j.id === jugadorGanador.id);
        }
      }
    }
  }

  private determinarGanadorRonda(): Equipo | null {
    if (this.cartasEnMesa.length === 0) {
      return null;
    }
    
    // Encontrar la carta de mayor valor
    let mejorJugada = this.cartasEnMesa[0];
    
    for (let i = 1; i < this.cartasEnMesa.length; i++) {
      if (this.cartasEnMesa[i].carta.valor > mejorJugada.carta.valor) {
        mejorJugada = this.cartasEnMesa[i];
      }
    }
    
    // Encontrar a qué equipo pertenece el jugador
    for (const equipo of this.equipos) {
      if (equipo.getJugadores().some(j => j.id === mejorJugada.jugador.id)) {
        return equipo;
      }
    }
    
    return null;
  }

  private determinarGanadorMano(): Equipo | null {
    if (this.ganadorRonda.length < 2) {
      return null;
    }
    
    const conteoVictorias = new Map<string, number>();
    
    for (const equipo of this.ganadorRonda) {
      const count = conteoVictorias.get(equipo.id) || 0;
      conteoVictorias.set(equipo.id, count + 1);
      
      // Si un equipo ganó 2 rondas, gana la mano
      if (count + 1 >= 2) {
        return equipo;
      }
    }
    
    // Si hay empate en la tercera ronda, gana el que ganó la primera
    if (this.rondaActual === 3 && this.ganadorRonda.length === 2) {
      return this.ganadorRonda[0];
    }
    
    return null;
  }

  private finalizarMano(): void {
    const ganadorMano = this.determinarGanadorMano();
    
    if (ganadorMano) {
      // Puntos por ganar la mano
      let puntos = 1;
      
      // Puntos adicionales por trucos cantados
      if (this.estadoTruco === EstadoTruco.TRUCO) {
        puntos = 2;
      } else if (this.estadoTruco === EstadoTruco.RETRUCO) {
        puntos = 3;
      } else if (this.estadoTruco === EstadoTruco.VALE_CUATRO) {
        puntos = 4;
      }
      
      ganadorMano.sumarPuntos(puntos);
    }
    
    this.estadoMano = EstadoMano.FIN_MANO;
    this.manoActual++;
    
    // Verificar si alguien ganó el juego
    if (!this.hayGanador()) {
      this.iniciarNuevaMano();
    }
  }

  // Cantar envido
  cantarEnvido(jugadorId: string, tipo: EstadoEnvido): boolean {
    const jugador = this.jugadores.find(j => j.id === jugadorId);
    if (!jugador) {
      return false;
    }
    
    // Verificar si es el turno del jugador
    if (this.jugadores[this.jugadorActual].id !== jugadorId) {
      return false;
    }
    
    // Verificar si estamos en la fase de envido
    if (this.estadoMano !== EstadoMano.ENVIDO_FASE) {
      return false;
    }
    
    // Verificar si ya se jugó alguna carta
    if (this.rondaActual > 0 || this.cartasEnMesa.length > 0) {
      return false;
    }
    
    // Verificar si el jugador es pie (ultimo de su equipo)
    if (!jugador.esPie) {
      return false;
    }
    
    // Encontrar el equipo del jugador
    let equipoJugador: Equipo | null = null;
    for (const equipo of this.equipos) {
      if (equipo.getJugadores().some(j => j.id === jugadorId)) {
        equipoJugador = equipo;
        break;
      }
    }
    
    if (!equipoJugador) {
      return false;
    }
    
    // Verificar que el canto sea válido según el estado actual
    if (!this.esCantoEnvidoValido(tipo)) {
      return false;
    }
    
    // Actualizar estado del envido
    this.estadoEnvido = tipo;
    this.envidoCantadoPor = equipoJugador;
    this.ultimoEnvidoCantadoPor = equipoJugador;
    this.cantosEnvido.push({ canto: tipo, equipo: equipoJugador });
    
    // Poner el juego en espera de respuesta
    this.enEsperaRespuesta = true;
    this.cantoActual = 'ENVIDO';
    
    // Encontrar el equipo contrario que debe responder
    this.equipoEnEspera = this.equipos.find(e => e.id !== equipoJugador!.id) || null;
    
    return true;
  }

  private esCantoEnvidoValido(tipo: EstadoEnvido): boolean {
    switch (this.estadoEnvido) {
      case EstadoEnvido.NO_CANTADO:
        return tipo === EstadoEnvido.ENVIDO || tipo === EstadoEnvido.REAL_ENVIDO || tipo === EstadoEnvido.FALTA_ENVIDO;
      case EstadoEnvido.ENVIDO:
        return tipo === EstadoEnvido.ENVIDO_ENVIDO || tipo === EstadoEnvido.REAL_ENVIDO || tipo === EstadoEnvido.FALTA_ENVIDO;
      case EstadoEnvido.ENVIDO_ENVIDO:
        return tipo === EstadoEnvido.REAL_ENVIDO || tipo === EstadoEnvido.FALTA_ENVIDO;
      case EstadoEnvido.REAL_ENVIDO:
        return tipo === EstadoEnvido.FALTA_ENVIDO;
      default:
        return false;
    }
  }

  // Responder al envido
  responderEnvido(jugadorId: string, aceptar: boolean): boolean {
    if (!this.enEsperaRespuesta || this.cantoActual !== 'ENVIDO') {
      return false;
    }
    
    const jugador = this.jugadores.find(j => j.id === jugadorId);
    if (!jugador) {
      return false;
    }
    
    // Verificar que el jugador pertenezca al equipo que debe responder
    let equipoJugador: Equipo | null = null;
    for (const equipo of this.equipos) {
      if (equipo.getJugadores().some(j => j.id === jugadorId)) {
        equipoJugador = equipo;
        break;
      }
    }
    
    if (!equipoJugador || equipoJugador.id !== this.equipoEnEspera?.id) {
      return false;
    }
    
    // Verificar si el jugador es pie (puede ser cualquier jugador del equipo en este caso)
    if (!jugador.esPie) {
      return false;
    }
    
    this.enEsperaRespuesta = false;
    this.cantoActual = null;
    this.equipoEnEspera = null;
    
    if (aceptar) {
      // Si aceptó, resolver el envido
      this.resolverEnvido();
    } else {
      // Si no aceptó, dar puntos al equipo que cantó
      const puntosRechazado = this.calcularPuntosEnvidoRechazado();
      if (this.ultimoEnvidoCantadoPor) {
        this.ultimoEnvidoCantadoPor.sumarPuntos(puntosRechazado);
      }
    }
    
    return true;
  }

  private calcularPuntosEnvidoRechazado(): number {
    switch (this.estadoEnvido) {
      case EstadoEnvido.ENVIDO:
        return 1;
      case EstadoEnvido.ENVIDO_ENVIDO:
        return 2;
      case EstadoEnvido.REAL_ENVIDO:
        if (this.cantosEnvido.length === 1) {
          return 1; // Solo real envido
        } else {
          // Verificar qué se cantó antes
          const cantosAnteriores = this.cantosEnvido.slice(0, -1);
          if (cantosAnteriores.some(c => c.canto === EstadoEnvido.ENVIDO_ENVIDO)) {
            return 2; // Envido envido rechazado
          } else {
            return 1; // Envido rechazado
          }
        }
      case EstadoEnvido.FALTA_ENVIDO:
        if (this.cantosEnvido.length === 1) {
          return 1; // Solo falta envido
        } else {
          // Verificar cantos anteriores
          const cantosAnteriores = this.cantosEnvido.slice(0, -1);
          const ultimoCanto = cantosAnteriores[cantosAnteriores.length - 1].canto;
          
          switch (ultimoCanto) {
            case EstadoEnvido.ENVIDO:
              return 1;
            case EstadoEnvido.ENVIDO_ENVIDO:
              return 2;
            case EstadoEnvido.REAL_ENVIDO:
              return 3;
            default:
              return 1;
          }
        }
      default:
        return 0;
    }
  }

  private resolverEnvido(): void {
    // Calcular el envido de cada equipo
    const resultados: { equipo: Equipo; puntos: number }[] = [];
    
    for (const equipo of this.equipos) {
      const mejorEnvido = equipo.calcularMejorEnvido();
      resultados.push({ equipo, puntos: mejorEnvido.puntos });
    }
    
    // Determinar el ganador (mayor puntaje)
    resultados.sort((a, b) => b.puntos - a.puntos);
    
    // En caso de empate, gana la mano
    if (resultados[0].puntos === resultados[1].puntos) {
      // Encontrar qué equipo tiene la mano
      const jugadorMano = this.jugadores.find(j => j.esMano);
      if (jugadorMano) {
        for (let i = 0; i < this.equipos.length; i++) {
          if (this.equipos[i].getJugadores().some(j => j.id === jugadorMano.id)) {
            resultados[0] = { equipo: this.equipos[i], puntos: resultados[i].puntos };
            break;
          }
        }
      }
    }
    
    const ganador = resultados[0].equipo;
    const puntosGanados = this.calcularPuntosEnvidoGanado();
    
    ganador.sumarPuntos(puntosGanados);
  }

  private calcularPuntosEnvidoGanado(): number {
    let puntaje = 0;
    
    // Sumar puntos según los cantos realizados
    for (const canto of this.cantosEnvido) {
      switch (canto.canto) {
        case EstadoEnvido.ENVIDO:
          puntaje += 2;
          break;
        case EstadoEnvido.ENVIDO_ENVIDO:
          puntaje += 2;
          break;
        case EstadoEnvido.REAL_ENVIDO:
          puntaje += 3;
          break;
        case EstadoEnvido.FALTA_ENVIDO:
          // Calcular los puntos necesarios para llegar a la puntuación objetivo
          const equipoGanador = this.cantosEnvido[0].equipo;
          const puntosActuales = equipoGanador.getPuntos();
          const puntosRestantes = this.puntajeObjetivo - puntosActuales;
          return puntosRestantes;
      }
    }
    
    return puntaje;
  }

  // Cantar truco
  cantarTruco(jugadorId: string, tipo: EstadoTruco): boolean {
    const jugador = this.jugadores.find(j => j.id === jugadorId);
    if (!jugador) {
      return false;
    }
    
    // Verificar si es el turno del jugador
    if (this.jugadores[this.jugadorActual].id !== jugadorId) {
      return false;
    }
    
    // Verificar si estamos en fase de truco o si es la primera ronda en fase de envido
    if (this.estadoMano !== EstadoMano.TRUCO_FASE && 
        !(this.estadoMano === EstadoMano.ENVIDO_FASE && this.cartasEnMesa.length === 0)) {
      return false;
    }
    
    // Encontrar el equipo del jugador
    let equipoJugador: Equipo | null = null;
    for (const equipo of this.equipos) {
      if (equipo.getJugadores().some(j => j.id === jugadorId)) {
        equipoJugador = equipo;
        break;
      }
    }
    
    if (!equipoJugador) {
      return false;
    }
    
    // Verificar que el canto sea válido según el estado actual
    if (!this.esCantoTrucoValido(tipo)) {
      return false;
    }
    
    // Actualizar estado del truco
    this.estadoTruco = tipo;
    this.trucoCantadoPor = equipoJugador;
    this.ultimoTrucoCantadoPor = equipoJugador;
    this.cantosTruco.push({ canto: tipo, equipo: equipoJugador });
    
    // Poner el juego en espera de respuesta
    this.enEsperaRespuesta = true;
    this.cantoActual = 'TRUCO';
    
    // Encontrar el equipo contrario que debe responder
    this.equipoEnEspera = this.equipos.find(e => e.id !== equipoJugador!.id) || null;
    
    // Si estábamos en fase de envido, pasamos a fase de truco
    if (this.estadoMano === EstadoMano.ENVIDO_FASE) {
      this.estadoMano = EstadoMano.TRUCO_FASE;
    }
    
    return true;
  }

  private esCantoTrucoValido(tipo: EstadoTruco): boolean {
    switch (this.estadoTruco) {
      case EstadoTruco.NO_CANTADO:
        return tipo === EstadoTruco.TRUCO;
      case EstadoTruco.TRUCO:
        return tipo === EstadoTruco.RETRUCO;
      case EstadoTruco.RETRUCO:
        return tipo === EstadoTruco.VALE_CUATRO;
      default:
        return false;
    }
  }

  // Responder al truco
  responderTruco(jugadorId: string, aceptar: boolean): boolean {
    if (!this.enEsperaRespuesta || this.cantoActual !== 'TRUCO') {
      return false;
    }
    
    const jugador = this.jugadores.find(j => j.id === jugadorId);
    if (!jugador) {
      return false;
    }
    
    // Verificar que el jugador pertenezca al equipo que debe responder
    let equipoJugador: Equipo | null = null;
    for (const equipo of this.equipos) {
      if (equipo.getJugadores().some(j => j.id === jugadorId)) {
        equipoJugador = equipo;
        break;
      }
    }
    
    if (!equipoJugador || equipoJugador.id !== this.equipoEnEspera?.id) {
      return false;
    }
    
    this.enEsperaRespuesta = false;
    this.cantoActual = null;
    this.equipoEnEspera = null;
    
    if (!aceptar) {
      // Si no aceptó, finalizar la mano y dar puntos al equipo que cantó
      const puntosRechazado = this.calcularPuntosTrucoRechazado();
      
      if (this.ultimoTrucoCantadoPor) {
        this.ultimoTrucoCantadoPor.sumarPuntos(puntosRechazado);
      }
      
      this.estadoMano = EstadoMano.FIN_MANO;
      this.manoActual++;
      
      // Verificar si alguien ganó el juego
      if (!this.hayGanador()) {
        this.iniciarNuevaMano();
      }
    }
    
    return true;
  }

  private calcularPuntosTrucoRechazado(): number {
    switch (this.estadoTruco) {
      case EstadoTruco.TRUCO:
        return 1;
      case EstadoTruco.RETRUCO:
        return 2;
      case EstadoTruco.VALE_CUATRO:
        return 3;
      default:
        return 0;
    }
  }

  // Verificar si hay un ganador del juego
  hayGanador(): boolean {
    for (const equipo of this.equipos) {
      if (equipo.getPuntos() >= this.puntajeObjetivo) {
        return true;
      }
    }
    return false;
  }

  // Obtener el equipo ganador del juego
  obtenerGanador(): Equipo | null {
    for (const equipo of this.equipos) {
      if (equipo.getPuntos() >= this.puntajeObjetivo) {
        return equipo;
      }
    }
    return null;
  }

  // Métodos getters para acceder al estado del juego
  getEquipos(): Equipo[] {
    return [...this.equipos];
  }

  getJugadores(): Jugador[] {
    return [...this.jugadores];
  }

  getJugadorActual(): Jugador {
    return this.jugadores[this.jugadorActual];
  }

  getEstadoMano(): EstadoMano {
    return this.estadoMano;
  }

  getEstadoEnvido(): EstadoEnvido {
    return this.estadoEnvido;
  }

  getEstadoTruco(): EstadoTruco {
    return this.estadoTruco;
  }

  getRondaActual(): number {
    return this.rondaActual;
  }

  getCartasEnMesa(): { jugador: Jugador; carta: Carta }[] {
    return [...this.cartasEnMesa];
  }

  getHistoricoRondas(): { jugador: Jugador; carta: Carta }[][] {
    return [...this.historicoRondas];
  }

  getGanadorRonda(): Equipo[] {
    return [...this.ganadorRonda];
  }

  getPuntajeObjetivo(): number {
    return this.puntajeObjetivo;
  }

  getPuntos(equipoId: string): number {
    const equipo = this.equipos.find(e => e.id === equipoId);
    return equipo ? equipo.getPuntos() : 0;
  }

  getEnvidoCantadoInfo(): { estado: EstadoEnvido; cantadoPor: Equipo | null } {
    return {
      estado: this.estadoEnvido,
      cantadoPor: this.envidoCantadoPor
    };
  }

  getTrucoCantadoInfo(): { estado: EstadoTruco; cantadoPor: Equipo | null } {
    return {
      estado: this.estadoTruco,
      cantadoPor: this.trucoCantadoPor
    };
  }

  estaEnEsperaRespuesta(): boolean {
    return this.enEsperaRespuesta;
  }

  getTipoCantoActual(): 'TRUCO' | 'ENVIDO' | null {
    return this.cantoActual;
  }

  getEquipoEnEspera(): Equipo | null {
    return this.equipoEnEspera;
  }

  // Método para mostrar información del estado de la partida
  obtenerEstadoPartida(): {
    ronda: number;
    mano: number;
    puntajes: { equipo: string; puntos: number }[];
    jugadorActual: string;
    estadoMano: EstadoMano;
    estadoEnvido: EstadoEnvido;
    estadoTruco: EstadoTruco;
  } {
    return {
      ronda: this.rondaActual,
      mano: this.manoActual,
      puntajes: this.equipos.map(e => ({ equipo: e.nombre, puntos: e.getPuntos() })),
      jugadorActual: this.jugadores[this.jugadorActual].nombre,
      estadoMano: this.estadoMano,
      estadoEnvido: this.estadoEnvido,
      estadoTruco: this.estadoTruco
    };
  }

  // Método para serializar el estado del juego (útil para multijugador online)
  serializarEstado(): string {
    const estado = {
      manoActual: this.manoActual,
      rondaActual: this.rondaActual,
      jugadorActual: this.jugadorActual,
      estadoMano: this.estadoMano,
      estadoEnvido: this.estadoEnvido,
      estadoTruco: this.estadoTruco,
      envidoCantadoPorId: this.envidoCantadoPor?.id || null,
      trucoCantadoPorId: this.trucoCantadoPor?.id || null,
      ultimoEnvidoCantadoPorId: this.ultimoEnvidoCantadoPor?.id || null,
      ultimoTrucoCantadoPorId: this.ultimoTrucoCantadoPor?.id || null,
      cartasEnMesa: this.cartasEnMesa.map(item => ({
        jugadorId: item.jugador.id,
        cartaId: `${item.carta.palo}_${item.carta.numero}`
      })),
      historicoRondas: this.historicoRondas.map(ronda => 
        ronda.map(item => ({
          jugadorId: item.jugador.id,
          cartaId: `${item.carta.palo}_${item.carta.numero}`
        }))
      ),
      ganadorRondaIds: this.ganadorRonda.map(equipo => equipo.id),
      cantosTruco: this.cantosTruco.map(canto => ({
        canto: canto.canto,
        equipoId: canto.equipo.id
      })),
      cantosEnvido: this.cantosEnvido.map(canto => ({
        canto: canto.canto,
        equipoId: canto.equipo.id
      })),
      enEsperaRespuesta: this.enEsperaRespuesta,
      cantoActual: this.cantoActual,
      equipoEnEsperaId: this.equipoEnEspera?.id || null,
      equipos: this.equipos.map(equipo => ({
        id: equipo.id,
        nombre: equipo.nombre,
        puntos: equipo.getPuntos(),
        jugadores: equipo.getJugadores().map(jugador => ({
          id: jugador.id,
          nombre: jugador.nombre,
          posicion: jugador.posicion,
          esMano: jugador.esMano,
          esPie: jugador.esPie,
          cartas: jugador.getCartas().map(carta => ({
            palo: carta.palo,
            numero: carta.numero,
            valor: carta.valor
          }))
        }))
      }))
    };
    
    return JSON.stringify(estado);
  }

  // Método para cargar un estado serializado (útil para multijugador online)
  cargarEstadoSerializado(estadoSerializado: string): void {
    const estado = JSON.parse(estadoSerializado);
    
    // Restaurar estados básicos
    this.manoActual = estado.manoActual;
    this.rondaActual = estado.rondaActual;
    this.jugadorActual = estado.jugadorActual;
    this.estadoMano = estado.estadoMano;
    this.estadoEnvido = estado.estadoEnvido;
    this.estadoTruco = estado.estadoTruco;
    this.enEsperaRespuesta = estado.enEsperaRespuesta;
    this.cantoActual = estado.cantoActual;
    
    // Restaurar equipos y jugadores
    this.equipos = [];
    this.jugadores = [];
    
    for (const equipoData of estado.equipos) {
      const equipo = new Equipo(equipoData.id, equipoData.nombre);
      equipo.setPuntos(equipoData.puntos);
      this.equipos.push(equipo);
      
      for (const jugadorData of equipoData.jugadores) {
        const jugador = new Jugador(
          jugadorData.id,
          jugadorData.nombre,
          jugadorData.posicion
        );
        jugador.esMano = jugadorData.esMano;
        jugador.esPie = jugadorData.esPie;
        
        // Restaurar cartas del jugador
        const cartas: Carta[] = jugadorData.cartas.map((cartaData: any) => ({
          palo: cartaData.palo,
          numero: cartaData.numero,
          valor: cartaData.valor
        }));
        jugador.recibirCartas(cartas);
        
        this.jugadores.push(jugador);
        equipo.agregarJugador(jugador);
      }
    }
    
    // Restaurar referencias a equipos
    if (estado.envidoCantadoPorId) {
      this.envidoCantadoPor = this.equipos.find(e => e.id === estado.envidoCantadoPorId) || null;
    }
    
    if (estado.trucoCantadoPorId) {
      this.trucoCantadoPor = this.equipos.find(e => e.id === estado.trucoCantadoPorId) || null;
    }
    
    if (estado.ultimoEnvidoCantadoPorId) {
      this.ultimoEnvidoCantadoPor = this.equipos.find(e => e.id === estado.ultimoEnvidoCantadoPorId) || null;
    }
    
    if (estado.ultimoTrucoCantadoPorId) {
      this.ultimoTrucoCantadoPor = this.equipos.find(e => e.id === estado.ultimoTrucoCantadoPorId) || null;
    }
    
    if (estado.equipoEnEsperaId) {
      this.equipoEnEspera = this.equipos.find(e => e.id === estado.equipoEnEsperaId) || null;
    }
    
    // Restaurar cartas en mesa
    this.cartasEnMesa = estado.cartasEnMesa.map((item: any) => {
      const jugador = this.jugadores.find(j => j.id === item.jugadorId)!;
      const [palo, numero] = item.cartaId.split('_');
      const carta: Carta = {
        palo: palo as Palo,
        numero: parseInt(numero),
        valor: this.calcularValorCarta(palo as Palo, parseInt(numero)),
        valorEnvido: this.calcularValorEnvido(palo as Palo, parseInt(numero))
      };
      return { jugador, carta };
    });
    
    // Restaurar histórico de rondas
    this.historicoRondas = estado.historicoRondas.map((ronda: any[]) => 
      ronda.map(item => {
        const jugador = this.jugadores.find(j => j.id === item.jugadorId)!;
        const [palo, numero] = item.cartaId.split('_');
        const carta: Carta = {
            palo: palo as Palo,
            numero: parseInt(numero),
            valor: this.calcularValorCarta(palo as Palo, parseInt(numero)),
            valorEnvido: this.calcularValorEnvido(palo as Palo, parseInt(numero))
          };
        return { jugador, carta };
      })
    );
    
    // Restaurar ganador de ronda
    this.ganadorRonda = estado.ganadorRondaIds.map(
      (equipoId: string) => this.equipos.find(e => e.id === equipoId)!
    );
    
    // Restaurar cantos
    this.cantosTruco = estado.cantosTruco.map((canto: any) => ({
      canto: canto.canto,
      equipo: this.equipos.find(e => e.id === canto.equipoId)!
    }));
    
    this.cantosEnvido = estado.cantosEnvido.map((canto: any) => ({
      canto: canto.canto,
      equipo: this.equipos.find(e => e.id === canto.equipoId)!
    }));
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
  
  // Añadir un método para calcular el valor del envido
  private calcularValorEnvido(palo: Palo, numero: number): number {
    // Para el envido, las figuras (10, 11, 12) valen 0
    // y el resto de cartas vale su número
    if (numero >= 10) {
      return 0;
    }
    return numero;
  }
}