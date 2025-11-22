// src/game/iaPro/ronda.ts
import { Jugador } from './jugador';
import { Naipe } from './naipe';
import { Canto, Equipo, AccionesPosibles } from './types';
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

// Interfaz para la carta con información adicional para la UI
interface CartaConInfoUI extends Naipe {
    esHumano: boolean; // Necesario para GameBoard
}

export class Ronda {
    // Estado Interno
    public numeroDeMano: number = 0; // 0, 1, 2
    public estadoRonda: EstadoRonda = EstadoRonda.InicioMano;
    public jugadasEnMano: number = 0; // Contador de jugadas en la mano actual (quizás manejado por turnoHandler)
    private flujoEnEjecucion: boolean = false; // 🔐 Protección contra doble ejecución

    // Handlers especializados
    public envidoHandler: RondaEnvidoHandler;
    public trucoHandler: RondaTrucoHandler;
    public turnoHandler: RondaTurnoHandler;
    public trucoPendientePorEnvidoPrimero: boolean = false;

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

        // Crear Handlers pasándoles la referencia a esta Ronda
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
        // Reiniciar handlers especializados
        this.turnoHandler.nuevaRonda();
        this.envidoHandler.nuevaRonda();
        this.trucoHandler.nuevaRonda();
        this.trucoPendientePorEnvidoPrimero = false;

        // Resetear estado de jugadores y ronda
        this.equipoPrimero.jugador.nuevaRonda();
        this.equipoSegundo.jugador.nuevaRonda();
        this.equipoPrimero.manosGanadasRonda = 0;
        this.equipoSegundo.manosGanadasRonda = 0;
        this.numeroDeMano = 0;
        this.equipoEnTurno = this.equipoMano; // Reiniciar turno
        this.estadoRonda = EstadoRonda.InicioMano;
        // Repartir cartas (turnoHandler debería llamar a los callbacks de debug si aplica)
        this.turnoHandler.repartirCartas();
        

        // Actualizar UI inicial necesaria
        this.callbacks.setNumeroMano(this.numeroDeMano); // Informar mano inicial (0)
        this.callbacks.displayPlayerCards(this.equipoPrimero.jugador); // Mostrar mano inicial del humano

        if (this.debugMode) {
            this.callbacks.displayLog(`Debug Ronda: Mano=${this.equipoMano.jugador.nombre}, Pie=${this.equipoPie.jugador.nombre}`, 'public');
            try {
                this.callbacks.displayLog(`Debug Ronda: ${this.equipoPrimero.jugador.nombre} Envido=${this.equipoPrimero.jugador.getPuntosDeEnvido}`, 'debug');
                this.callbacks.displayLog(`Debug Ronda: ${this.equipoSegundo.jugador.nombre} Envido=${this.equipoSegundo.jugador.getPuntosDeEnvido}`, 'debug');
            } catch (e) {
                 console.error("Error al obtener puntos de envido iniciales", e)
            }
        }

        console.log("Estado inicial Ronda", this);

        // Iniciar el flujo del juego
        this.continuarFlujo();
    }

    private continuarFlujo(enEsperaHumano: boolean = false): void {
    if (this.flujoEnEjecucion) {
        if (this.debugMode) console.log("⚠️ Flujo ya en ejecución, se ignora nueva llamada.");
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
                    `Estado=${EstadoRonda[this.estadoRonda]}, Turno=${this.equipoEnTurno.jugador.nombre}, Mano=${this.numeroDeMano}, Jugadas en Mano=${this.turnoHandler.jugadasEnManoActual}`,
                    'debug'
                );
            }
            const jugadorActual = this.equipoEnTurno.jugador;
            const esHumano = jugadorActual.esHumano;
            let esperarHumano = false;

            if (
                this.estadoRonda === EstadoRonda.EsperandoRespuestaTruco &&
                !esHumano &&
                this.trucoPendientePorEnvidoPrimero
            ) {
                const envidoIA = this.procesarCantoIAEnvido();
                if (envidoIA) {
                    continue;
                }
            }

            if (!esHumano) {
                this.callbacks.actualizarAccionesPosibles({
                    puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false
                });
            }

            switch (this.estadoRonda) {
                case EstadoRonda.EsperandoRespuestaEnvido:
                    if (esHumano) {
                        esperarHumano = true;
                    } else {
                        this.procesarRespuestaIAEnvido();
                        esperarHumano = false;
                    }
                    break;

                case EstadoRonda.EsperandoRespuestaTruco:
                    if (esHumano) {
                        esperarHumano = true;
                    } else {
                        this.trucoHandler.procesarRespuestaTruco();
                        esperarHumano = false;
                    }
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
                    }
                    break;

                case EstadoRonda.ManoTerminada:
                    this.turnoHandler.procesarFinDeMano();
                    //this.callbacks.displayLog(`Fin de la mano: Mano=${this.numeroDeMano}`, `public`);
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
        this.flujoEnEjecucion = false;
    }
}
    
    
    private procesarCantoIAEnvido(): boolean {
        const ia = this.equipoEnTurno.jugador as IA;
        if (this.envidoHandler.getPosiblesCantos().length > 0) {
            const contextoEnvido = this.envidoHandler.crearContextoEnvido(ia);
            const cantoEnvidoIA = ia.envido(contextoEnvido);
            if (cantoEnvidoIA !== Canto.Paso && this.envidoHandler.getPosiblesCantos().includes(cantoEnvidoIA)) {
                return this.envidoHandler.registrarCanto(cantoEnvidoIA, this.equipoEnTurno);
            }
        }
        return false;
    }
    private procesarCantoIATruco(): boolean {
        const ia = this.equipoEnTurno.jugador as IA;
        if (this.trucoHandler.getPosiblesCantos().length > 0) {
            const contextoTruco = this.trucoHandler.crearContextoTruco(ia);
            const cantoTrucoIA = ia.truco(false, contextoTruco);
            if (cantoTrucoIA !== Canto.Paso && this.trucoHandler.getPosiblesCantos().includes(cantoTrucoIA)) {
                return this.trucoHandler.registrarCanto(cantoTrucoIA, this.equipoEnTurno);
            }
        }
        return false;
    }
     private procesarRespuestaIAEnvido(): boolean {
         const ia = this.equipoEnTurno.jugador as IA;
         const contextoEnvido = this.envidoHandler.crearContextoEnvido(ia);
         let respuestaIA = ia.envido(contextoEnvido);
         const accionesPosiblesIA = this.envidoHandler.getPosiblesRespuestas();
         if (!accionesPosiblesIA.includes(respuestaIA) || respuestaIA === Canto.Paso) {
              respuestaIA = Canto.NoQuiero; // Forzar NoQuiero si es inválida o Paso
         }
         return this.envidoHandler.registrarRespuesta(respuestaIA, this.equipoEnTurno);
     }

    /** Calcula y actualiza las acciones posibles para el jugador en turno (UI) */
    private actualizarAccionesParaTurnoActual(): void {
        let acciones: AccionesPosibles = {
            puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false // Default a false/vacío
        };

        // Solo calcular si es turno del humano
        if (this.equipoEnTurno.jugador.esHumano) {
            acciones.puedeMazo = this.estadoRonda !== EstadoRonda.RondaTerminada &&
                            !this.trucoHandler.trucoNoQueridoPor &&
                            !this.trucoHandler.trucoQuerido;

            switch (this.estadoRonda) {
                case EstadoRonda.InicioMano:
                case EstadoRonda.EsperandoJugadaNormal:
                    acciones.puedeJugarCarta = this.turnoHandler.puedeJugarCarta();
                    if (acciones.puedeJugarCarta) { // Solo permitir cantos si se puede jugar
                        acciones.puedeCantarEnvido = this.envidoHandler.getPosiblesCantos();
                        acciones.puedeCantarTruco = this.trucoHandler.getPosiblesCantos();
                    }
                    break;
                case EstadoRonda.EsperandoRespuestaEnvido:
                    acciones.puedeResponder = this.envidoHandler.getPosiblesRespuestas();
                    // No se puede jugar ni cantar otra cosa
                    acciones.puedeJugarCarta = false;
                    acciones.puedeCantarEnvido = [];
                    acciones.puedeCantarTruco = [];
                    break;
                case EstadoRonda.EsperandoRespuestaTruco:
                    acciones.puedeResponder = this.trucoHandler.getPosiblesRespuestas();
                    acciones.puedeJugarCarta = false;
                    acciones.puedeCantarTruco = [];
                    acciones.puedeCantarEnvido = this.trucoPendientePorEnvidoPrimero
                        ? this.envidoHandler.getPosiblesCantos()
                        : [];
                    break;
                default:
                    acciones.puedeMazo = false; // No ir al mazo si la mano/ronda terminó
            }
        }
        this.callbacks.actualizarAccionesPosibles(acciones);
    }

    /** Finaliza la ronda, calcula puntos y notifica a Partida */
    private finalizarRondaLogica(): void {
        this.estadoRonda = EstadoRonda.RondaTerminada;
        // Deshabilitar acciones una última vez
        this.callbacks.actualizarAccionesPosibles({ puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false });

        let ganadorRondaEquipo: Equipo | null = null;
        let puntosGanadosTruco = 0;

        // Delegar determinación del ganador y puntos del Truco al handler
        const resultadoTruco = this.trucoHandler.getResultadoTrucoFinal();
        ganadorRondaEquipo = resultadoTruco.ganador;
        puntosGanadosTruco = resultadoTruco.puntos;

        // Log específico para Mazo o No Querido
        if (resultadoTruco.fueMazo || resultadoTruco.fueNoQuerido) {
            this.callbacks.displayLog(`Ronda: ${ganadorRondaEquipo?.jugador.nombre ?? 'Nadie'} gana ${puntosGanadosTruco}pts (${resultadoTruco.fueMazo ? 'Mazo' : 'No Querido'})`, 'public');
        } else if (ganadorRondaEquipo) {
            // Log para truco ganado jugando
             this.callbacks.displayLog(`Ronda: ${ganadorRondaEquipo.jugador.nombre} gana ${puntosGanadosTruco}pts (Truco)`, 'public');
             // Callback opcional para resaltar ganador visualmente
             if (this.callbacks.displayRoundWinner) {
                this.callbacks.displayRoundWinner(ganadorRondaEquipo.jugador.nombre);
             }
        } else {
             // Situación inesperada (empate en truco?)
             this.callbacks.displayLog(`Ronda: EMPATE INESPERADO EN TRUCO`, 'debug');
             // Fallback: dar puntos al mano? O 0 puntos? Depende de reglas exactas.
              ganadorRondaEquipo = this.equipoMano; // Asignar al mano como fallback
              puntosGanadosTruco = 1; // Dar 1 punto?
        }

        // Obtener puntos de Envido (ya calculados y almacenados por envidoHandler)
        let puntosGanadosEnvidoEq1 = this.equipoPrimero.jugador.puntosGanadosEnvidoRonda;
        let puntosGanadosEnvidoEq2 = this.equipoSegundo.jugador.puntosGanadosEnvidoRonda;

        // Calcular puntos totales para Partida
        let puntosEq1 = (ganadorRondaEquipo === this.equipoPrimero) ? puntosGanadosTruco : 0;
        let puntosEq2 = (ganadorRondaEquipo === this.equipoSegundo) ? puntosGanadosTruco : 0;
        puntosEq1 += puntosGanadosEnvidoEq1;
        puntosEq2 += puntosGanadosEnvidoEq2;

        // Notificar a Partida con los puntos totales de la ronda
        // El delay ya está en onRondaTerminadaCallback dentro de Partida
        this.onRondaTerminada(puntosEq1, puntosEq2);
    }

    // --- Manejadores de Acciones Humanas ---

    /** Procesa la jugada de carta del humano */
    public handleHumanPlayCard(carta: Naipe): void {
        if (this.equipoEnTurno.jugador.esHumano && (this.estadoRonda === EstadoRonda.EsperandoJugadaNormal || this.estadoRonda === EstadoRonda.InicioMano)) {
            const exito = this.turnoHandler.registrarJugada(carta, this.equipoEnTurno);
            if (exito) {
                this.continuarFlujo(); // Continuar el flujo del juego
            } else {
                this.callbacks.displayLog("Jugada inválida.", 'public'); // Mensaje más amigable
                this.actualizarAccionesParaTurnoActual();
            }
        } else {
            console.warn("Intento de jugar carta humana fuera de turno o estado inválido.");
            this.actualizarAccionesParaTurnoActual();
        }
    }

    /** Procesa el canto/respuesta del humano */
    public handleHumanCanto(canto: Canto): void {
        if (!this.equipoEnTurno.jugador.esHumano) {
            console.warn("Intento de canto humano fuera de turno.");
            this.actualizarAccionesParaTurnoActual();
            return;
        }

        let accionRealizada = false;
        const esEnvido = [Canto.Envido, Canto.EnvidoEnvido, Canto.RealEnvido, Canto.FaltaEnvido].includes(canto);
        const esTruco = [Canto.Truco, Canto.ReTruco, Canto.ValeCuatro].includes(canto);
        const esRespuestaPositiva = canto === Canto.Quiero; // 'Quiero' es la respuesta positiva genérica
        const esRespuestaNegativa = canto === Canto.NoQuiero;
        const esRespuesta = esRespuestaPositiva || esRespuestaNegativa;
        const esMazo = canto === Canto.IrAlMazo;

        // Intentar procesar como respuesta
        if (this.estadoRonda === EstadoRonda.EsperandoRespuestaEnvido && (esEnvido || esRespuesta)) {
             accionRealizada = this.envidoHandler.registrarRespuesta(canto, this.equipoEnTurno);
        } else if (this.estadoRonda === EstadoRonda.EsperandoRespuestaTruco) {
            if (esTruco || esRespuesta) {
                accionRealizada = this.trucoHandler.registrarRespuesta(canto, this.equipoEnTurno);
            } else if (esEnvido && this.trucoPendientePorEnvidoPrimero) {
                accionRealizada = this.envidoHandler.registrarCanto(canto, this.equipoEnTurno);
            }
        }

        // Si no fue respuesta, intentar procesar como canto inicial
        if (!accionRealizada && (this.estadoRonda === EstadoRonda.InicioMano || this.estadoRonda === EstadoRonda.EsperandoJugadaNormal)) {
            if (esEnvido) {
                accionRealizada = this.envidoHandler.registrarCanto(canto, this.equipoEnTurno);
            } else if (esTruco) {
                accionRealizada = this.trucoHandler.registrarCanto(canto, this.equipoEnTurno);
            } else if (esMazo) {
                accionRealizada = this.trucoHandler.registrarMazo(this.equipoEnTurno);
            }
        }

        // Continuar flujo si la acción fue válida
        if (accionRealizada) {
             this.continuarFlujo();
        } else {
            console.warn(`Intento de canto/respuesta humano inválido: ${canto} en estado ${EstadoRonda[this.estadoRonda]}`);
            this.callbacks.displayLog(`No puedes ${this.cantoToString(canto)} ahora.`, 'public');
             this.actualizarAccionesParaTurnoActual();
        }
    }

    // --- Métodos Auxiliares y Getters ---

    public getCartasMesa(): (Naipe | null)[] {
        return this.turnoHandler.cartasMesa;
        }

    public setDebugMode(activado: boolean): void {
        this.debugMode = activado;
    }

    public getOponente(equipo: Equipo): Equipo {
        return equipo === this.equipoPrimero ? this.equipoSegundo : this.equipoPrimero;
    }
    public getManosGanadas(jugador: Jugador): number {
        if (this.equipoPrimero.jugador.nombre === jugador.nombre) {
        return this.equipoPrimero.manosGanadasRonda;
        } else if (this.equipoSegundo.jugador.nombre === jugador.nombre) {
        return this.equipoSegundo.manosGanadasRonda;
        }
        return 0; // O quizás lanzar un error si el jugador no pertenece a la ronda
        }
        public getOtroJugador(jugador: Jugador): Jugador {
        if (this.equipoPrimero.jugador.nombre === jugador.nombre) {
        return this.equipoSegundo.jugador;
        } else if (this.equipoSegundo.jugador.nombre === jugador.nombre) {
        return this.equipoPrimero.jugador;
        }
        // Manejar el caso en que el jugador no pertenece a la ronda (lanzar error o devolver null)
        throw new Error("Jugador no pertenece a esta ronda");
        }

    public getEquipo(jugador: Jugador): Equipo | null {
        if (this.equipoPrimero.jugador.nombre === jugador.nombre) return this.equipoPrimero;
        if (this.equipoSegundo.jugador.nombre === jugador.nombre) return this.equipoSegundo;
        return null;
    }

    public cantoToString(canto: Canto): string {
        switch (canto) {
            // Envido
            case Canto.Envido: return "Envido";
            case Canto.EnvidoEnvido: return "Envido envido";
            case Canto.RealEnvido: return "Real envido";
            case Canto.FaltaEnvido: return "Falta envido";
            // Truco
            case Canto.Truco: return "Truco";
            case Canto.ReTruco: return "Re truco";
            case Canto.ValeCuatro: return "Vale cuatro";
            // Respuestas / Acciones
            case Canto.Quiero: return "Quiero";
            case Canto.NoQuiero: return "No quiero";
            case Canto.IrAlMazo: return "Ir al mazo";
            case Canto.Paso: return "Paso";
            default: return "";
        }
    }

    public esRespuesta(canto: Canto): boolean {
        return canto === Canto.Quiero || canto === Canto.NoQuiero;
    }
}