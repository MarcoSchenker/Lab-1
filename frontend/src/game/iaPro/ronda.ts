// ronda.ts
import { Jugador } from './jugador';
import { IA } from './ia.placeholder';
import { Naipe } from './naipe';
import { Palo, Canto, PuntosEnvido, PuntosTruco, Equipo } from './types';
import { UIHandler } from './ui';
import { getLast } from './utils';

export class Ronda {
  public numeroDeMano: number = 0;       // 0, 1, 2
  private jugadasEnMano: number = 0;      // 0, 1 (cartas jugadas por CADA jugador en la mano actual)
  private equipoEnTurno: Equipo;
  private equipoQueEsMano: Equipo;

  // Estado Envido
  private puedeEnvido: boolean = true;
  private cantosEnvido: Canto[] = [];
  private quienCantoEnvido: ('H' | 'M')[] = []; // 'H' Humano, 'M' Maquina
  private equipoDebeResponderEnvido: Equipo | null = null;
  private envidoResuelto: boolean = false;
  private puntosEnvidoGanadosPor: Equipo | null = null;
  private puntosEnvidoValor: number = 0;
  private envidoStatsFlag: boolean = true; // Para registrar stats IA una vez

  // Estado Truco
  private cantosTruco: Canto[] = [];
  private equipoDebeResponderTruco: Equipo | null = null;
  private puedeCantarTruco: Equipo | null = null; // Quién puede iniciar/elevar el truco
  private trucoNoQuiso: Equipo | null = null;

  private rondaTerminada: boolean = false;
  private ganadorRonda: Jugador | null = null;

  // Dependencias
  constructor(
    public readonly equipoPrimero: Equipo, // Siempre el Humano
    public readonly equipoSegundo: Equipo, // Siempre la IA
    private readonly ui: UIHandler,
    private readonly onRondaTerminada: (ganador: Jugador, puntosGanadosEquipo1: number, puntosGanadosEquipo2: number) => void,
    private readonly limitePuntajeJuego: number,
    private readonly debugMode: boolean = false
  ) {
    this.equipoQueEsMano = this.equipoPrimero.esMano ? this.equipoPrimero : this.equipoSegundo;
    this.equipoEnTurno = this.equipoQueEsMano; // Empieza el que es mano
    this.puedeCantarTruco = null; // Cualquiera puede iniciar el truco al ppio? O solo el mano? Revisar regla. Asumamos cualquiera.
    this.ui.clearLog();
  }

  /** Inicia la ronda: reparte y comienza el flujo */
  iniciar(): void {
    this.equipoPrimero.jugador.nuevaRonda();
    this.equipoSegundo.jugador.nuevaRonda();
    this.equipoPrimero.manosGanadasRonda = 0;
    this.equipoSegundo.manosGanadasRonda = 0;

    this.repartirCartas();

    this.ui.displayPlayerCards(this.equipoPrimero.jugador);
    this.ui.displayPlayerCards(this.equipoSegundo.jugador);
     if (this.debugMode) {
        this.ui.displayLog(`DEBUG: Cartas ${this.equipoPrimero.jugador.nombre}: ${this.equipoPrimero.jugador.cartas.map(c=>c.getNombre()).join(', ')} (Envido: ${this.equipoPrimero.jugador.getPuntosDeEnvido(this.equipoPrimero.jugador.cartas)})`);
        this.ui.displayLog(`DEBUG: Cartas ${this.equipoSegundo.jugador.nombre}: ${this.equipoSegundo.jugador.cartas.map(c=>c.getNombre()).join(', ')} (Envido: ${this.equipoSegundo.jugador.getPuntosDeEnvido(this.equipoSegundo.jugador.cartas)})`);
     }

    this.continuarFlujo();
  }

  // --- Flujo Principal de la Ronda ---

  private continuarFlujo(forzarFin: boolean = false): void {
    if (this.rondaTerminada) return;
    if (forzarFin) {
        this.finalizarRonda();
        return;
    }

    this.ui.hideAllActionButtons(); // Ocultar botones por defecto

    // 1. Verificar fin de mano/ronda
    if (this.trucoNoQuiso || this.numeroDeMano >= 3) {
      this.finalizarRonda();
      return;
    }

    // Si se jugaron las 2 cartas de la mano actual
    if (this.jugadasEnMano === 2) {
      this.puedeEnvido = false; // Ya no se puede envido después de la primera mano completa
      this.resolverManoActual();
      // Verificar si ya terminó la ronda después de resolver la mano
      if (this.determinarGanadorRonda()) {
          this.finalizarRonda();
          return;
      }
      // Si no terminó, preparar siguiente mano
      this.numeroDeMano++;
      this.jugadasEnMano = 0;
       // El turno para la siguiente mano lo tiene quien ganó la anterior
       // (ya se asignó en resolverManoActual)
       this.ui.displayLog(`--- Comienza Mano ${this.numeroDeMano + 1} ---`);

    }

     // 2. Decidir qué acción corresponde
     if (this.equipoDebeResponderEnvido) {
         this.gestionarRespuestaEnvido();
     } else if (this.equipoDebeResponderTruco) {
         this.gestionarRespuestaTruco();
     } else {
         // Turno normal: Jugar carta o cantar
         this.gestionarTurnoNormal();
     }
  }

  private finalizarRonda(): void {
      if (this.rondaTerminada) return;
      this.rondaTerminada = true;
      this.ui.hideAllActionButtons(); // Ocultar acciones

      if (!this.ganadorRonda) {
          this.ganadorRonda = this.determinarGanadorRonda();
      }

      let puntosGanados1 = 0;
      let puntosGanados2 = 0;

       // Sumar puntos del Envido (si se jugó)
       if (this.envidoResuelto && this.puntosEnvidoGanadosPor) {
           if (this.puntosEnvidoGanadosPor === this.equipoPrimero) {
               puntosGanados1 += this.puntosEnvidoValor;
           } else {
               puntosGanados2 += this.puntosEnvidoValor;
           }
           // Guardar stats IA si no se hizo antes (ej. si se resolvió con No Quiero)
           if (this.envidoStatsFlag && this.equipoSegundo.jugador instanceof IA) {
                const puntosHumano = this.equipoPrimero.jugador.getPuntosDeEnvido(this.equipoPrimero.jugador.cartas);
                (this.equipoSegundo.jugador as IA).statsEnvido(this.cantosEnvido, this.quienCantoEnvido, puntosHumano);
                this.envidoStatsFlag = false;
           }
       }

      // Sumar puntos del Truco
      const puntosTruco = this.calcularPuntosTruco();
      if (this.trucoNoQuiso) {
          const ganador = this.getOponente(this.trucoNoQuiso);
          if (ganador === this.equipoPrimero) puntosGanados1 += puntosTruco.noQuerido;
          else puntosGanados2 += puntosTruco.noQuerido;
           this.ui.displayLog(`${ganador.jugador.nombre} suma ${puntosTruco.noQuerido} puntos (Truco no querido)`);
      } else if (this.ganadorRonda) {
          // Si hubo ganador de ronda por manos
          const ganador = this.ganadorRonda === this.equipoPrimero.jugador ? this.equipoPrimero : this.equipoSegundo;
          const puntos = puntosTruco.querido;
           if (ganador === this.equipoPrimero) puntosGanados1 += puntos;
           else puntosGanados2 += puntos;
           this.ui.displayLog(`${ganador.jugador.nombre} suma ${puntos} puntos (Truco querido)`);
      } else {
          // Caso raro: ronda termina sin ganador claro (ej. Mazo mutuo? No implementado)
          this.ui.displayLog("Ronda terminada sin ganador claro.");
      }

       this.ui.displayRoundWinner(this.ganadorRonda?.nombre ?? "Nadie (Error)");

       // Esperar antes de llamar al callback para que el usuario vea el resultado
       setTimeout(() => {
            this.ui.clearPlayedCards();
            this.onRondaTerminada(this.ganadorRonda!, puntosGanados1, puntosGanados2);
       }, 2500); // Esperar 2.5 segundos
  }

  // --- Gestión de Turnos y Acciones ---

  private gestionarTurnoNormal(): void {
       const jugadorActual = this.equipoEnTurno.jugador;

       if (jugadorActual.esHumano) {
           this.prepararTurnoHumano();
       } else {
           this.ejecutarTurnoIA();
       }
  }

  private prepararTurnoHumano(): void {
      this.ui.displayLog(`--- Tu turno, ${this.equipoPrimero.jugador.nombre} ---`);
      // Habilitar cartas jugables
      this.ui.displayPlayerCards(this.equipoPrimero.jugador); // Asegura que estén visibles y con índices correctos

      // Habilitar cantos posibles
      const ultimoEnvido = getLast(this.cantosEnvido);
      const ultimoTruco = getLast(this.cantosTruco);

      // Envido (solo en la primera mano y si no se resolvió)
      if (this.puedeEnvido && !this.envidoResuelto && this.numeroDeMano === 0) {
          this.ui.setButtonState('#btnEnvido', true, true);
          // Habilitar EE, R, F según corresponda (si IA cantó antes)
          if (this.equipoDebeResponderEnvido === this.equipoPrimero) { // Esto no debería pasar aquí, sino en gestionarRespuestaEnvido
               // Lógica de respuesta Envido
          } else {
              // Puede iniciar envido
          }
      }

      // Truco (siempre se puede iniciar o responder si corresponde)
      if (!this.trucoNoQuiso) {
          let puedeCantar = this.puedeCantarTruco === null || this.puedeCantarTruco === this.equipoPrimero;
           if (!ultimoTruco) {
               this.ui.setButtonState('#btnTruco', puedeCantar, true);
           } else if (puedeCantar) {
               if (ultimoTruco === Canto.Truco) this.ui.setButtonState('#btnReTruco', true, true);
               else if (ultimoTruco === Canto.ReTruco) this.ui.setButtonState('#btnValeCuatro', true, true);
           }
      }

      // Ir al Mazo
      this.ui.setButtonState('#IrAlMazo', true, true);

       // Habilitar botones Quiero/NoQuiero (esto se hace en gestionarRespuesta...)
       // this.ui.setButtonState('#Quiero', false, false);
       // this.ui.setButtonState('#NoQuiero', false, false);
  }

  private ejecutarTurnoIA(): void {
       const jugadorIA = this.equipoSegundo.jugador as IA; // Sabemos que es IA
       this.ui.displayLog(`Turno de ${jugadorIA.nombre}...`);

       // Decisión IA (simulamos un pequeño delay)
       setTimeout(() => {
            if (this.rondaTerminada) return; // Chequear por si acaso

            let accionRealizada = false;

             // 1. Considerar Envido (solo primera mano)
            if (this.puedeEnvido && !this.envidoResuelto && this.numeroDeMano === 0) {
                const cartaVistaHumano = getLast(this.equipoPrimero.jugador.cartasJugadasRonda);
                const cantoIA = jugadorIA.envido(undefined, 0, cartaVistaHumano); // PuntosGanador no aplica al iniciar

                if (cantoIA !== Canto.Paso) {
                     this.registrarCanto(this.equipoSegundo, cantoIA);
                     accionRealizada = true;
                     this.continuarFlujo(); // Pasar al humano para responder
                     return; // Termina turno IA
                }
            }

            // 2. Considerar Truco
             if (!this.trucoNoQuiso && (this.puedeCantarTruco === null || this.puedeCantarTruco === this.equipoSegundo)) {
                 const ultimoTruco = getLast(this.cantosTruco);
                 const cantoIA = jugadorIA.truco(false, ultimoTruco); // No está respondiendo

                 if (cantoIA !== Canto.Paso && this.esCantoTrucoValido(cantoIA, ultimoTruco)) {
                     this.registrarCanto(this.equipoSegundo, cantoIA);
                     accionRealizada = true;
                     this.continuarFlujo(); // Pasar al humano para responder
                     return; // Termina turno IA
                 }
             }

             // 3. Jugar Carta (si no cantó nada)
             const cartaAJugar = jugadorIA.jugarCarta();
             this.registrarJugada(this.equipoSegundo, cartaAJugar);

             // Pasar turno y continuar
             this.pasarTurno();
             this.continuarFlujo();

       }, 1000); // Delay de 1 segundo para la IA
  }

  private gestionarRespuestaEnvido(): void {
       const jugadorQueResponde = this.equipoDebeResponderEnvido!.jugador;
       const ultimoCanto = getLast(this.cantosEnvido)!; // Sabemos que hay un canto

       if (jugadorQueResponde.esHumano) {
           this.ui.displayLog(`Debes responder al ${this.cantoToString(ultimoCanto)}...`);
           this.ui.setButtonState('#Quiero', true, true);
           this.ui.setButtonState('#NoQuiero', true, true);
           // Habilitar cantos superiores si aplican
           if (ultimoCanto === Canto.Envido) this.ui.setButtonState('#btnEnvido', true, true); // Sería EE
           if (ultimoCanto === Canto.Envido || ultimoCanto === Canto.EnvidoEnvido) this.ui.setButtonState('#btnRealEnvido', true, true);
           if (ultimoCanto !== Canto.FaltaEnvido) this.ui.setButtonState('#btnFaltaEnvido', true, true);

       } else {
           // IA Responde Envido
            const jugadorIA = jugadorQueResponde as IA;
            const cartaVistaHumano = getLast(this.equipoPrimero.jugador.cartasJugadasRonda);
            // TODO: Pasar puntos en disputa? calcularPuntosEnvido()
            const puntosEnDisputa = this.calcularPuntosEnvido().ganador; // Estimación
            const respuestaIA = jugadorIA.envido(ultimoCanto, puntosEnDisputa, cartaVistaHumano);

            this.ui.displayLog(`${jugadorIA.nombre} responde al Envido...`);
             setTimeout(() => {
                 if (this.rondaTerminada) return;
                 this.registrarRespuesta(this.equipoSegundo, respuestaIA);
                 this.continuarFlujo();
             }, 1000);
       }
  }

   private gestionarRespuestaTruco(): void {
        const jugadorQueResponde = this.equipoDebeResponderTruco!.jugador;
        const ultimoCanto = getLast(this.cantosTruco)!;

        if (jugadorQueResponde.esHumano) {
            this.ui.displayLog(`Debes responder al ${this.cantoToString(ultimoCanto)}...`);
            this.ui.setButtonState('#Quiero', true, true);
            this.ui.setButtonState('#NoQuiero', true, true);
            // Habilitar canto superior si aplica
            if (ultimoCanto === Canto.Truco) this.ui.setButtonState('#btnReTruco', true, true);
            else if (ultimoCanto === Canto.ReTruco) this.ui.setButtonState('#btnValeCuatro', true, true);

        } else {
            // IA Responde Truco
            const jugadorIA = jugadorQueResponde as IA;
            const respuestaIA = jugadorIA.truco(true, ultimoCanto); // Está respondiendo

            this.ui.displayLog(`${jugadorIA.nombre} responde al Truco...`);
             setTimeout(() => {
                 if (this.rondaTerminada) return;
                 this.registrarRespuesta(this.equipoSegundo, respuestaIA);
                 this.continuarFlujo();
             }, 1000);
        }
   }


  // --- Acciones del Jugador Humano (Callbacks desde UI) ---

  handleHumanPlayCard(index: number): void {
      this.ui.hideAllActionButtons();
      const cartaJugada = this.equipoPrimero.jugador.registrarCartaJugada(index);
      if (cartaJugada) {
          this.registrarJugada(this.equipoPrimero, cartaJugada);
          this.pasarTurno();
          this.continuarFlujo();
      } else {
          this.ui.displayLog("Error: Jugada inválida.");
          this.prepararTurnoHumano(); // Volver a mostrar opciones
      }
  }

  handleHumanCanto(canto: Canto): void {
      this.ui.hideAllActionButtons();
      this.registrarCanto(this.equipoPrimero, canto);
      this.continuarFlujo();
  }

  handleHumanResponse(respuesta: Canto): void {
      this.ui.hideAllActionButtons();
      this.registrarRespuesta(this.equipoPrimero, respuesta);
      this.continuarFlujo();
  }

   handleHumanIrAlMazo(): void {
       this.ui.hideAllActionButtons();
       this.registrarCanto(this.equipoPrimero, Canto.IrAlMazo); // Aunque no es un canto, usamos el log
       this.trucoNoQuiso = this.equipoPrimero; // Equivalente a no querer el último truco (o el base)
       // Resolver envido pendiente si lo hay (como No Quiero)
        if (this.equipoDebeResponderEnvido && !this.envidoResuelto) {
             this.resolverEnvido(false); // Resuelto como "No Quiero"
        }
       this.finalizarRonda(); // Terminar inmediatamente
   }


  // --- Lógica Interna y Registro de Estado ---

  private registrarJugada(equipo: Equipo, carta: Naipe): void {
    // Si es IA, necesita registrar internamente que la jugó
    if (!equipo.jugador.esHumano) {
        (equipo.jugador as IA).registrarCartaJugadaIA(carta);
    }
    this.ui.displayLog(`${equipo.jugador.nombre} juega: ${carta.getNombre()}`);
    // Mostrar carta en la mesa (la UI lo hará)
    this.ui.displayPlayedCard(equipo.jugador, carta, this.numeroDeMano, this.jugadasEnMano);
    // Si ambos jugaron en esta mano, jugadasEnMano aumenta a