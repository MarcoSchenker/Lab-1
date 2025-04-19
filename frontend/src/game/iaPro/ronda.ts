import { Jugador } from './jugador';
import { Naipe } from './naipe';
import { Canto, Equipo, AccionesPosibles} from './types';
import { GameCallbacks } from '../game-callbacks';
import { RondaEnvidoHandler } from './ronda-envido';
import { RondaTurnoHandler } from './ronda-turno';
import { RondaTrucoHandler } from './ronda-truco';
import { IA } from './ia';

export enum EstadoRonda {
    InicioMano = "InicioMano",
    EsperandoJugadaNormal = "EsperandoJugadaNormal",
    EsperandoRespuestaEnvido = "EsperandoRespuestaEnvido",
    EsperandoRespuestaTruco = "EsperandoRespuestaTruco",
    ManoTerminada = "ManoTerminada",
    RondaTerminada = "RondaTerminada",
}

export class Ronda {
    // Estado Interno
    public numeroDeMano: number = 0; // 0, 1, 2
    public estadoRonda: EstadoRonda = EstadoRonda.InicioMano;
    public jugadasEnMano: number = 0; // Contador de jugadas en la mano actual
    private flujoEnEjecucion: boolean = false; // 🔐 Protección contra doble ejecución

    // Handlers especializados
    public envidoHandler: RondaEnvidoHandler;
    public trucoHandler: RondaTrucoHandler;
    public turnoHandler: RondaTurnoHandler;

    // Referencias y Configuración
    public equipoMano: Equipo;
    public equipoPie: Equipo;
    public equipoEnTurno: Equipo;
    public limitePuntaje: number;
    public debugMode: boolean;

    // Callbacks
    private onRondaTerminada: (puntosEq1: number, puntosEq2: number) => void; // Callback para Partida
    public callbacks: GameCallbacks; // Callbacks para la UI (React)
    
    public equipoPrimero: Equipo;
    public equipoSegundo: Equipo;

    constructor(
        equipoPrimero: Equipo,
        equipoSegundo: Equipo,
        gameCallbacks: GameCallbacks, // Recibe callbacks de UI
        onRondaTerminadaCallback: (puntosEq1: number, puntosEq2: number) => void,
        limitePuntaje: number = 30,
        debugMode: boolean = false
    ) {
        this.equipoPrimero = equipoPrimero;
        this.equipoSegundo = equipoSegundo;
        this.callbacks = gameCallbacks; // Almacenar callbacks de UI
        this.onRondaTerminada = onRondaTerminadaCallback;
        this.limitePuntaje = limitePuntaje;
        this.debugMode = debugMode;
        this.envidoHandler = new RondaEnvidoHandler(this);
        this.trucoHandler = new RondaTrucoHandler(this);
        this.turnoHandler = new RondaTurnoHandler(this);
        // Determinar mano/pie y turno inicial
        if (equipoPrimero.esMano) {
            this.equipoMano = equipoPrimero;
            this.equipoPie = equipoSegundo;
        } else {
            this.equipoMano = equipoSegundo;
            this.equipoPie = equipoPrimero;
        }
        this.equipoEnTurno = this.equipoMano; // Siempre empieza el mano de la ronda
    }

    /** Inicia la ronda: prepara jugadores, reparte cartas y comienza el flujo */
    public iniciar(): void {
        this.callbacks.displayLog("-- Nueva Ronda --", 'public');

        // Reiniciar handlers especializados
        this.turnoHandler.nuevaRonda();
        this.envidoHandler.nuevaRonda();
        this.trucoHandler.nuevaRonda(); 

        // Resetear estado de jugadores y ronda
        this.equipoPrimero.jugador.nuevaRonda();
        this.equipoSegundo.jugador.nuevaRonda();
        this.equipoPrimero.manosGanadasRonda = 0;
        this.equipoSegundo.manosGanadasRonda = 0;
        this.numeroDeMano = 0;
        this.jugadasEnMano = 0;
        this.equipoEnTurno = this.equipoMano; // Reiniciar turno
        this.estadoRonda = EstadoRonda.InicioMano;

        this.turnoHandler.repartirCartas(); // Llama a callbacks de debug si aplica
        this.callbacks.setNumeroMano(this.numeroDeMano);
        this.callbacks.displayPlayerCards(this.equipoPrimero.jugador); // Actualiza mano del humano
        this.callbacks.clearPlayedCards(); // Limpia mesa visual

        if (this.debugMode) {
            this.callbacks.displayLog(`Debug: Mano=${this.equipoMano.jugador.nombre}, Pie=${this.equipoPie.jugador.nombre}`, 'debug');
            this.callbacks.displayLog(`Debug: ${this.equipoPrimero.jugador.nombre} Envido=${this.equipoPrimero.jugador.getPuntosDeEnvido(this.equipoPrimero.jugador.cartas)}`, 'debug');
            this.callbacks.displayLog(`Debug: ${this.equipoSegundo.jugador.nombre} Envido=${this.equipoSegundo.jugador.getPuntosDeEnvido(this.equipoSegundo.jugador.cartas)}`, 'debug');
        }

        console.log("Estado inicial", this);

        // Iniciar el flujo del juego
        this.continuarFlujo();
    }

   /** Motor principal de estados de la ronda - REFACTORIZADO FINAL */
   private continuarFlujo(enEsperaHumano: boolean = false): void {
        // Evitar múltiples ejecuciones simultáneas
        if (this.flujoEnEjecucion) {
            if (this.debugMode) console.log("Flujo ya en ejecución, se ignora nueva llamada.");
            return;
        }

        this.flujoEnEjecucion = true;

        try {
            if (enEsperaHumano) {
                this.actualizarAccionesParaTurnoActual();
                return;
            }

            while (this.estadoRonda !== EstadoRonda.RondaTerminada) {
                this.callbacks.setTurno(this.equipoEnTurno);

                if (this.debugMode) {
                    this.callbacks.displayLog(
                        `Estado=${EstadoRonda[this.estadoRonda]}, Turno=${this.equipoEnTurno.jugador.nombre}, Mano=${this.numeroDeMano}, JugadaMano=${this.turnoHandler.jugadasEnManoActual}`,
                        'debug'
                    );
                }

                let esperarHumano = false;
                const jugadorActual = this.equipoEnTurno.jugador;
                const esHumano = jugadorActual.esHumano;

                if (!esHumano) {
                    this.callbacks.actualizarAccionesPosibles({
                        puedeJugarCarta: false,
                        puedeCantarEnvido: [],
                        puedeCantarTruco: [],
                        puedeResponder: [],
                        puedeMazo: false
                    });
                }

                switch (this.estadoRonda) {
                    case EstadoRonda.EsperandoRespuestaEnvido:
                        esperarHumano = esHumano || !this.envidoHandler.registrarRespuesta(this.decidirRespuestaIAEnvido(), this.equipoEnTurno);
                        esperarHumano = esHumano ? true : !this.procesarRespuestaIAEnvido();
                        break;

                    case EstadoRonda.EsperandoRespuestaTruco:
                        esperarHumano = esHumano ? true : !this.trucoHandler.procesarRespuestaTruco();
                        break;

                    case EstadoRonda.InicioMano:
                    case EstadoRonda.EsperandoJugadaNormal:
                        if (esHumano) {
                            esperarHumano = true;
                        } else {
                            if (!this.procesarCantoIAEnvido()) {
                                if (!this.procesarCantoIATruco()) {
                                    this.turnoHandler.procesarTurnoNormalIA();
                                }
                            }
                            esperarHumano = false;
                        }
                        break;

                    case EstadoRonda.ManoTerminada:
                        this.turnoHandler.procesarFinDeMano();
                        continue;

                    default:
                        console.error("Estado de ronda desconocido:", this.estadoRonda);
                        this.estadoRonda = EstadoRonda.RondaTerminada;
                        continue;
                }

                if (esperarHumano) {
                    this.actualizarAccionesParaTurnoActual();
                    return;
                }
            }

            if (this.estadoRonda === EstadoRonda.RondaTerminada) {
                this.finalizarRondaLogica();
            }
        } finally {
            this.flujoEnEjecucion = false; // Liberar flag cuando termina
        }
    }

private decidirRespuestaIAEnvido(): Canto {
    const ia = this.equipoEnTurno.jugador as IA; //  Obtiene la instancia de la IA
    const contextoEnvido = this.envidoHandler.crearContextoEnvido(ia); //  Crea el contexto para la IA
    const respuestaIA = ia.envido(contextoEnvido); //  Llama al método envido de la IA para obtener la respuesta

    //  Validar la respuesta de la IA (opcional, pero recomendado)
    if (!this.envidoHandler.getPosiblesRespuestas().includes(respuestaIA)) {
        return Canto.NoQuiero;
    }

    return respuestaIA;
}

/** Lógica para que la IA decida si canta Envido y lo registre */
private procesarCantoIAEnvido(): boolean {
    const ia = this.equipoEnTurno.jugador as IA;
    if (this.envidoHandler.getPosiblesCantos().length > 0) {
        const contextoEnvido = this.envidoHandler.crearContextoEnvido(ia);
        const cantoEnvidoIA = ia.envido(contextoEnvido); // IA decide si canta y qué
        if (cantoEnvidoIA !== Canto.Paso && this.envidoHandler.getPosiblesCantos().includes(cantoEnvidoIA)) {
            return this.envidoHandler.registrarCanto(cantoEnvidoIA, this.equipoEnTurno);
        }
    }
    return false; // No cantó Envido
}

 /** Lógica para que la IA decida si canta Truco y lo registre */
private procesarCantoIATruco(): boolean {
    const ia = this.equipoEnTurno.jugador as IA;
    if (this.trucoHandler.getPosiblesCantos().length > 0) {
        const contextoTruco = this.trucoHandler.crearContextoTruco(ia);
        const cantoTrucoIA = ia.truco(false, contextoTruco); // false: no está respondiendo
         if (cantoTrucoIA !== Canto.Paso && this.trucoHandler.getPosiblesCantos().includes(cantoTrucoIA)) {
            return this.trucoHandler.registrarCanto(cantoTrucoIA, this.equipoEnTurno);
        }
    }
    return false; // No cantó Truco
}

 /** Lógica para que la IA decida su respuesta al Envido y la registre */
 private procesarRespuestaIAEnvido(): boolean {
     const ia = this.equipoEnTurno.jugador as IA;
     const contextoEnvido = this.envidoHandler.crearContextoEnvido(ia);
     let respuestaIA = ia.envido(contextoEnvido); // IA decide respuesta

     const accionesPosiblesIA = this.envidoHandler.getPosiblesRespuestas();
     console.log("[procesarRespuestaIAEnvido] IA:", ia.nombre, 
         "Respuesta IA:", respuestaIA, 
         "Acciones posibles:", accionesPosiblesIA);

     if (!accionesPosiblesIA.includes(respuestaIA)) {
          console.warn(`IA ${ia.nombre} intentó respuesta inválida de Envido (${respuestaIA}). Forzando NoQuiero.`);
          respuestaIA = Canto.NoQuiero;
     }
     if (respuestaIA === Canto.Paso) respuestaIA = Canto.NoQuiero; // No pasar

     return this.envidoHandler.registrarRespuesta(respuestaIA, this.equipoEnTurno);
 }

    /** Calcula y actualiza las acciones posibles para el jugador en turno (usado para UI) */
    private actualizarAccionesParaTurnoActual(): void {
        let acciones: AccionesPosibles = {
            puedeJugarCarta: false,
            puedeCantarEnvido: [],
            puedeCantarTruco: [],
            puedeResponder: [],
            puedeMazo: true // Asumimos que casi siempre se puede ir al mazo
        };

         // Solo calcular si es turno del humano, sino se deshabilitan
         if (this.equipoEnTurno.jugador.esHumano) {
            switch (this.estadoRonda) {
                case EstadoRonda.InicioMano:
                case EstadoRonda.EsperandoJugadaNormal:
                    acciones.puedeJugarCarta = this.turnoHandler.puedeJugarCarta(); // Preguntar al handler de turno
                    if (acciones.puedeJugarCarta) { // Solo se puede cantar si se puede jugar carta (regla general)
                         acciones.puedeCantarEnvido = this.envidoHandler.getPosiblesCantos();
                         acciones.puedeCantarTruco = this.trucoHandler.getPosiblesCantos(); // Preguntar al handler de truco
                    }
                    acciones.puedeMazo = true; // Se puede ir al mazo en turno normal
                    break;
                case EstadoRonda.EsperandoRespuestaEnvido:
                    acciones.puedeResponder = this.envidoHandler.getPosiblesRespuestas();
                    acciones.puedeMazo = true; 
                    // No puede jugar carta, ni cantar otra cosa mientras responde envido
                    acciones.puedeJugarCarta = false;
                    acciones.puedeCantarEnvido = [];
                    acciones.puedeCantarTruco = [];
                    break;
                case EstadoRonda.EsperandoRespuestaTruco:
                    acciones.puedeResponder = this.trucoHandler.getPosiblesRespuestas();
                    acciones.puedeMazo = true;
                     // No puede jugar carta, ni cantar otra cosa mientras responde truco
                    acciones.puedeJugarCarta = false;
                    acciones.puedeCantarEnvido = [];
                    acciones.puedeCantarTruco = [];
                    break;
                // En otros estados (ManoTerminada, RondaTerminada), no hay acciones.
            }
         } else {
             // Si es turno IA, acciones vacías (o ya deshabilitadas en continuarFlujo)
              acciones = { puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false };
         }
        this.callbacks.actualizarAccionesPosibles(acciones);
    }

   /** Finaliza la ronda, calcula puntos y notifica a Partida */
   private finalizarRondaLogica(): void {
    this.estadoRonda = EstadoRonda.RondaTerminada; // Asegurar estado final
    this.callbacks.actualizarAccionesPosibles({ puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false });

    let ganadorRondaEquipo: Equipo | null = null;
    let puntosGanadosTruco = 0;

    // Determinar ganador y puntos del Truco (delegado a trucoHandler)
    const resultadoTruco = this.trucoHandler.getResultadoTrucoFinal(); // Necesita este método
    ganadorRondaEquipo = resultadoTruco.ganador;
    puntosGanadosTruco = resultadoTruco.puntos;

    if (resultadoTruco.fueMazo || resultadoTruco.fueNoQuerido) {
         this.callbacks.displayLog(`Ronda: ${ganadorRondaEquipo?.jugador.nombre ?? 'Nadie'} gana ${puntosGanadosTruco}pts (${resultadoTruco.fueMazo ? 'Mazo' : 'No Querido'})`, 'public');
    } else if (ganadorRondaEquipo) {
         this.callbacks.displayLog(`Ronda: ${ganadorRondaEquipo.jugador.nombre} gana ${puntosGanadosTruco}pts (Truco)`, 'public');
         if (this.callbacks.displayRoundWinner) {
             this.callbacks.displayRoundWinner(ganadorRondaEquipo.jugador.nombre);
         }
    } else {
         // Esto no debería pasar en truco normal, quizás sí si hay un error
          this.callbacks.displayLog(`Ronda: EMPATE (Error?)`, 'debug');
          ganadorRondaEquipo = this.equipoMano; // Desempate por mano como fallback?
          puntosGanadosTruco = 1; // Otorgar 1 punto por defecto?
    }

    // Obtener puntos del Envido (ya están en los jugadores)
    let puntosGanadosEnvidoEq1 = this.equipoPrimero.jugador.puntosGanadosEnvidoRonda;
    let puntosGanadosEnvidoEq2 = this.equipoSegundo.jugador.puntosGanadosEnvidoRonda;

    // Calcular puntos totales para Partida
    let puntosEq1 = (ganadorRondaEquipo === this.equipoPrimero) ? puntosGanadosTruco : 0;
    let puntosEq2 = (ganadorRondaEquipo === this.equipoSegundo) ? puntosGanadosTruco : 0;

    // Sumar puntos del envido
    puntosEq1 += puntosGanadosEnvidoEq1;
    puntosEq2 += puntosGanadosEnvidoEq2;

    // Notificar a Partida (considerar si el delay es necesario aquí o en la UI)
    setTimeout(() => {
        this.onRondaTerminada(puntosEq1, puntosEq2);
    }, 1500); // Delay para visualización
}

   /** Procesa la jugada de carta del humano */
   public handleHumanPlayCard(carta: Naipe): void {
    if (this.equipoEnTurno.jugador.esHumano && (this.estadoRonda === EstadoRonda.EsperandoJugadaNormal || this.estadoRonda === EstadoRonda.InicioMano)) {
       const exito = this.turnoHandler.registrarJugada(carta, this.equipoEnTurno); // Delegar registro al handler de turno
       if (exito) {
            this.continuarFlujo(); // Continuar flujo si la jugada fue válida
       } else {
             // Opcional: Mostrar mensaje de error si la jugada no fue válida (ej. carta no en mano)
             this.callbacks.displayLog("Error al jugar la carta.", 'debug');
             this.actualizarAccionesParaTurnoActual(); // Refrescar acciones por si acaso
       }
    } else {
        console.warn("Intento de jugar carta humana fuera de turno o estado inválido.");
         this.actualizarAccionesParaTurnoActual(); // Refrescar acciones
    }
}

/** Procesa el canto/respuesta del humano */
public handleHumanCanto(canto: Canto): void {
    // Agregar logs para debug
    console.log("Estado Actual:", EstadoRonda[this.estadoRonda]);
    console.log("Equipo en Turno:", this.equipoEnTurno.jugador.nombre, "esHumano:", this.equipoEnTurno.jugador.esHumano);
    console.log("Equipo Humano:", this.equipoPrimero.jugador.esHumano ? "Equipo 1" : "Equipo 2");
     if (!this.equipoEnTurno.jugador.esHumano) {
         console.warn("Intento de canto humano fuera de turno.");
          this.actualizarAccionesParaTurnoActual(); // Refrescar acciones
         return;
     }

    let accionRealizada = false;
    const esEnvido = [Canto.Envido, Canto.EnvidoEnvido, Canto.RealEnvido, Canto.FaltaEnvido].includes(canto);
    const esTruco = [Canto.Truco, Canto.ReTruco, Canto.ValeCuatro].includes(canto);
    const esRespuesta = this.esRespuesta(canto);
    const esMazo = canto === Canto.IrAlMazo;

    // 1. Intentar procesar como respuesta
    if (this.estadoRonda === EstadoRonda.EsperandoRespuestaEnvido && (esEnvido || esRespuesta)) {
         accionRealizada = this.envidoHandler.registrarRespuesta(canto, this.equipoEnTurno);
    } else if (this.estadoRonda === EstadoRonda.EsperandoRespuestaTruco && (esTruco || esRespuesta)) {
        accionRealizada = this.trucoHandler.registrarRespuesta(canto, this.equipoEnTurno); // Delegar a trucoHandler
    }

    // 2. Si no fue respuesta, intentar procesar como canto inicial
    if (
        !accionRealizada &&
        (this.estadoRonda === EstadoRonda.InicioMano || this.estadoRonda === EstadoRonda.EsperandoJugadaNormal) &&
        !esRespuesta
    ) {
        if (esEnvido) {
            accionRealizada = this.envidoHandler.registrarCanto(canto, this.equipoEnTurno);
        } else if (esTruco) {
            accionRealizada = this.trucoHandler.registrarCanto(canto, this.equipoEnTurno);
        } else if (esMazo) {
            accionRealizada = this.trucoHandler.registrarMazo(this.equipoEnTurno);
        }
    }

    // 3. Continuar flujo si la acción fue válida
    if (accionRealizada) {
         this.continuarFlujo();
    } else {
        console.warn(`Intento de canto/respuesta humano inválido: ${canto} en estado ${EstadoRonda[this.estadoRonda]}`);
        this.callbacks.displayLog(`No puedes ${this.cantoToString(canto)} ahora.`, 'public');
         this.actualizarAccionesParaTurnoActual(); // Refrescar acciones
    }
}

    /** Permite a Partida actualizar el modo debug */
    public setDebugMode(activado: boolean): void {
        this.debugMode = activado;
    }

    public getCartasMesa(): (Naipe | null)[] {
        return this.turnoHandler.cartasMesa;
    }
    public getManosGanadas(jugador: Jugador): number {
        if (this.equipoPrimero.jugador === jugador) {
            return this.equipoPrimero.manosGanadasRonda;
        } else if (this.equipoSegundo.jugador === jugador) {
            return this.equipoSegundo.manosGanadasRonda;
        }
        return 0; // O quizás lanzar un error si el jugador no pertenece a la ronda
    }
    public getOtroJugador(jugador: Jugador): Jugador {
        if (this.equipoPrimero.jugador === jugador) {
            return this.equipoSegundo.jugador;
        } else if (this.equipoSegundo.jugador === jugador) {
            return this.equipoPrimero.jugador;
        }
        // Manejar el caso en que el jugador no pertenece a la ronda (lanzar error o devolver null)
        throw new Error("Jugador no pertenece a esta ronda");
    }
    // --- Métodos de Ayuda ---
    public getOponente(equipo: Equipo): Equipo {
        return equipo === this.equipoPrimero ? this.equipoSegundo : this.equipoPrimero;
    }

    public getEquipo(jugador: Jugador): Equipo | null {
        if (this.equipoPrimero.jugador === jugador) return this.equipoPrimero;
        if (this.equipoSegundo.jugador === jugador) return this.equipoSegundo;
        return null;
    }

     public cantoToString(canto: Canto | number): string {
        if (typeof canto === 'number') return canto.toString(); // Para puntos de envido
        // Simple mapeo, podría ser más extenso
        switch (canto) {
            case Canto.Envido: return "Envido";
            case Canto.RealEnvido: return "Real Envido";
            case Canto.FaltaEnvido: return "Falta Envido";
            case Canto.EnvidoEnvido: return "Envido Envido"; // Añadir si es necesario
            case Canto.Truco: return "Truco";
            case Canto.ReTruco: return "Retruco";
            case Canto.ValeCuatro: return "Vale Cuatro";
            case Canto.Quiero: return "Quiero";
            case Canto.NoQuiero: return "No Quiero";
            case Canto.IrAlMazo: return "Me voy al Mazo";
            case Canto.Paso: return "(Paso)"; // Para IA
            default: return "";
        }
    }

    public esRespuesta(canto: Canto): boolean {
        return canto === Canto.Quiero || canto === Canto.NoQuiero;
    }
}