import { Jugador } from './jugador';
import { IA } from './ia'; // Importar IA
import { Naipe } from './naipe';
import { Canto, Equipo, PuntosEnvido, PuntosTruco, Palo , AccionesPosibles} from './types';
import { getRandomInt, shuffleArray, getLast } from './utils'; // Importar utils
import { EnvidoContext, TrucoContext } from './ia-context'; // Importar contexto de Envido
import { GameCallbacks } from '../game-callbacks';
import * as Calculos from './ronda-calculos';
import * as Actions from './ronda-actions';

// Define estados más explícitos para la ronda
export enum EstadoRonda {
    InicioMano,
    EsperandoJugadaNormal,
    EsperandoRespuestaEnvido,
    EsperandoRespuestaTruco,
    ManoTerminada,
    RondaTerminada
}

export class Ronda {
    // Estado Interno
    public numeroDeMano: number = 0; // 0, 1, 2
    public jugadasEnMano: number = 0; // Cartas jugadas en la mano actual (0, 1, 2)
    public puedeEnvido: boolean = true;
    public estadoRonda: EstadoRonda = EstadoRonda.InicioMano;

    // Referencias y Configuración
    public equipoMano: Equipo;
    public equipoPie: Equipo;
    public equipoEnTurno: Equipo;
    public limitePuntaje: number;
    public debugMode: boolean;

    // Estado Envido
    public cantosEnvido: { canto: Canto, equipo: Equipo }[] = [];
    public equipoDebeResponderEnvido: Equipo | null = null;
    public envidoResuelto: boolean = false;
    public puntosEnvidoGanados: number = 0; // Puntos ganados por el envido en esta ronda

    // Estado Truco
    public cantosTruco: { canto: Canto, equipo: Equipo }[] = [];
    public equipoDebeResponderTruco: Equipo | null = null;
    public trucoResuelto: boolean = false; // Si se dijo Quiero/NoQuiero
    public trucoNoQueridoPor: Equipo | null = null;
    public puntosTrucoGanados: number = 0; // Puntos ganados por el truco en esta ronda

    // Cartas jugadas en la mesa (para fácil acceso)
    private cartasMesa: (Naipe | null)[] = [null, null, null, null, null, null]; // [J1M0, J2M0, J1M1, J2M1, J1M2, J2M2]

    // Callbacks
    private onRondaTerminada: (puntosEq1: number, puntosEq2: number) => void; // Callback para Partida
    private callbacks: GameCallbacks; // Callbacks para la UI (React)
    
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


    // --- Métodos de Ayuda ---
    public getOponente(equipo: Equipo): Equipo {
        return equipo === this.equipoPrimero ? this.equipoSegundo : this.equipoPrimero;
    }

    public getEquipo(jugador: Jugador): Equipo | null {
        if (this.equipoPrimero.jugador === jugador) return this.equipoPrimero;
        if (this.equipoSegundo.jugador === jugador) return this.equipoSegundo;
        return null;
    }

     private cantoToString(canto: Canto | number): string {
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

    private esRespuesta(canto: Canto): boolean {
        return canto === Canto.Quiero || canto === Canto.NoQuiero;
    }

    /** Inicia la ronda: prepara jugadores, reparte cartas y comienza el flujo */
    public iniciar(): void {
        this.callbacks.displayLog("-- Nueva Ronda --");

        // Resetear estado de jugadores y ronda
        this.equipoPrimero.jugador.nuevaRonda();
        this.equipoSegundo.jugador.nuevaRonda();
        this.equipoPrimero.manosGanadasRonda = 0;
        this.equipoSegundo.manosGanadasRonda = 0;
        this.cantosEnvido = [];
        this.cantosTruco = [];
        this.cartasMesa = Array(6).fill(null);
        this.numeroDeMano = 0;
        this.jugadasEnMano = 0;
        this.puedeEnvido = true;
        this.envidoResuelto = false;
        this.trucoResuelto = false;
        this.trucoNoQueridoPor = null;
        this.puntosEnvidoGanados = 0;
        this.puntosTrucoGanados = 0;
        this.equipoDebeResponderEnvido = null;
        this.equipoDebeResponderTruco = null;
        this.equipoEnTurno = this.equipoMano; // Reiniciar turno
        this.estadoRonda = EstadoRonda.InicioMano;

        this.repartirCartas(); // Llama a callbacks de debug si aplica
        this.callbacks.setNumeroMano(this.numeroDeMano);

        // Actualizar UI inicial de la ronda
        this.callbacks.displayPlayerCards(this.equipoPrimero.jugador); // Actualiza mano del humano
        this.callbacks.clearPlayedCards(); // Limpia mesa visual

        if (this.debugMode) {
            this.callbacks.displayLog(`Debug: Mano=${this.equipoMano.jugador.nombre}, Pie=${this.equipoPie.jugador.nombre}`);
            this.callbacks.displayLog(`Debug: ${this.equipoPrimero.jugador.nombre} Envido=${this.equipoPrimero.jugador.getPuntosDeEnvido(this.equipoPrimero.jugador.cartas)}`);
            this.callbacks.displayLog(`Debug: ${this.equipoSegundo.jugador.nombre} Envido=${this.equipoSegundo.jugador.getPuntosDeEnvido(this.equipoSegundo.jugador.cartas)}`);
        }

        console.log("Estado inicial", this)

        // Iniciar el flujo del juego
        this.continuarFlujo();
    }
    /** Reparte 3 cartas a cada jugador */
    private repartirCartas(): void {
        const baraja = Naipe.generarBarajaCompleta();
        shuffleArray(baraja);
        const cartasJ1: Naipe[] = [];
        const cartasJ2: Naipe[] = [];
        for (let i = 0; i < 6; i++) {
            const carta = baraja.pop();
            if (!carta) throw new Error("Error al repartir, mazo vacío.");
            if (i % 2 === 0) { (this.equipoPie === this.equipoPrimero ? cartasJ1 : cartasJ2).push(carta); }
            else { (this.equipoMano === this.equipoPrimero ? cartasJ1 : cartasJ2).push(carta); }
        }
        this.equipoPrimero.jugador.cartas = cartasJ1;
        this.equipoPrimero.jugador.cartasEnMano = [...cartasJ1];
        this.equipoSegundo.jugador.cartas = cartasJ2;
        this.equipoSegundo.jugador.cartasEnMano = [...cartasJ2];

        if (this.debugMode) {
            this.callbacks.displayLog(`Debug Cartas ${this.equipoPrimero.jugador.nombre}: ${cartasJ1.map(c => c.getNombre()).join(', ')}`);
            this.callbacks.displayLog(`Debug Cartas ${this.equipoSegundo.jugador.nombre}: ${cartasJ2.map(c => c.getNombre()).join(', ')}`);
        }
    }


    /** Motor principal de estados de la ronda - REFACTORIZADO */
    private continuarFlujo(enEsperaHumano: boolean = false): void {
        if (enEsperaHumano) {
            return; // Esperar acción humana
        }

        while (this.estadoRonda !== EstadoRonda.RondaTerminada) {
            this.callbacks.setTurno(this.equipoEnTurno); // Informar turno a la UI

            if (this.debugMode) {
                this.callbacks.displayLog(`Estado=${EstadoRonda[this.estadoRonda]}, Turno=${this.equipoEnTurno.jugador.nombre}, Mano=${this.numeroDeMano}, Jugada=${this.jugadasEnMano}`);
            }

            // Delegar al método correspondiente según el estado
            switch (this.estadoRonda) {
                case EstadoRonda.InicioMano:
                case EstadoRonda.EsperandoJugadaNormal:
                    // Llamar a _procesarTurnoNormal y verificar si debemos esperar al humano
                    if (this.procesarTurnoNormal()) {
                        return; // Salir del bucle para esperar al humano
                    }
                    break; // Continuar el bucle si la IA actuó

                case EstadoRonda.EsperandoRespuestaEnvido:
                    // Llamar a _procesarRespuestaEnvido y verificar si debemos esperar al humano
                    if (this.procesarRespuestaEnvido()) {
                        return; // Salir del bucle para esperar al humano
                    }
                    break; // Continuar el bucle si la IA actuó

                case EstadoRonda.EsperandoRespuestaTruco:
                     // Llamar a _procesarRespuestaTruco y verificar si debemos esperar al humano
                    if (this.procesarRespuestaTruco()) {
                        return; // Salir del bucle para esperar al humano
                    }
                    break; // Continuar el bucle si la IA actuó

                case EstadoRonda.ManoTerminada:
                    this.procesarFinDeMano(); // Este método actualiza estadoRonda
                    continue; // Volver al inicio del while para procesar el nuevo estado

                default:
                    console.error("Estado de ronda desconocido:", this.estadoRonda);
                    this.estadoRonda = EstadoRonda.RondaTerminada; // Forzar fin
                    continue;
            }
             // Si la IA actuó y no estamos esperando, el bucle while continúa
        } // Fin while

        // Si el bucle terminó porque estadoRonda es RondaTerminada
        if (this.estadoRonda === EstadoRonda.RondaTerminada) {
            this.finalizarRondaLogica();
        }
    }

    /**
     * Procesa el turno normal (jugar carta o cantar).
     * @returns `true` si se debe esperar al humano, `false` si la IA actuó.
     */
    private procesarTurnoNormal(): boolean {
        const jugadorActual = this.equipoEnTurno.jugador;

        if (jugadorActual.esHumano) {
            // Calcular y mostrar acciones posibles para el humano
            const acciones = Actions.calcularAccionesPosiblesParaTurno(this);
            this.callbacks.actualizarAccionesPosibles(acciones);
            return true; // Indicar que se espera al humano
        } else {
            // Deshabilitar acciones humanas mientras IA actúa
            this.callbacks.actualizarAccionesPosibles({ puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false });

            const ia = jugadorActual as IA;
            let accionRealizada = false;

            // 1. Decidir Envido
            if (this.puedeEnvido && !this.envidoResuelto && Actions.getPosiblesCantosEnvido(this).length > 0) {
                const contextoEnvido = this.crearContextoEnvido(ia); // Sin cambios
                const cantoEnvidoIA = ia.envido(contextoEnvido);
                if (cantoEnvidoIA !== Canto.Paso) {
                    this.registrarCanto(cantoEnvidoIA, this.equipoEnTurno); // registrarCanto actualiza estadoRonda
                    accionRealizada = true;
                }
            }

            // 2. Decidir Truco (si no cantó envido)
            if (!accionRealizada && Actions.getPosiblesCantosTruco(this).length > 0) {
                 const contextoTruco = this.crearContextoTruco(ia); // Sin cambios
                 const cantoTrucoIA = ia.truco(false, contextoTruco);
                 if (cantoTrucoIA !== Canto.Paso && Actions.getPosiblesCantosTruco(this).includes(cantoTrucoIA)) {
                    this.registrarCanto(cantoTrucoIA, this.equipoEnTurno); // registrarCanto actualiza estadoRonda
                    accionRealizada = true;
                 }
            }

            // 3. Jugar Carta (si no cantó)
            if (!accionRealizada) {
                if (Actions.calcularAccionesPosiblesParaTurno(this).puedeJugarCarta) {
                     const cartaJugada = ia.jugarCarta(this); // jugarCarta actualiza mano IA
                     this.registrarJugada(cartaJugada, this.equipoEnTurno); // registrarJugada actualiza estadoRonda
                     accionRealizada = true;
                 } else {
                    console.error(`Error: IA ${ia.nombre} intentó jugar carta pero no era posible.`);
                    this.estadoRonda = EstadoRonda.RondaTerminada; // Forzar fin
                 }
            }

            // La IA ya actuó, no esperar
             // Pausa simulada (¡OJO! setTimeout dentro de un bucle síncrono no funciona como se espera)
             // La continuación debe manejarse por la estructura del bucle `continuarFlujo`
             // setTimeout(() => this.continuarFlujo(), 1000); // <- INCORRECTO AQUI
             return false;
        }
    }

    /**
     * Procesa la espera de respuesta al Envido.
     * @returns `true` si se debe esperar al humano, `false` si la IA actuó.
    */
    private procesarRespuestaEnvido(): boolean {
         if (!this.equipoDebeResponderEnvido) {
            console.error("Error: gestionando respuesta envido sin equipo que deba responder.");
            this.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
            return false; // Recuperar y continuar flujo
        }
        const jugadorResponde = this.equipoDebeResponderEnvido.jugador;

        if (jugadorResponde.esHumano) {
            const acciones = Actions.calcularAccionesPosiblesParaRespuestaEnvido(this);
            this.callbacks.actualizarAccionesPosibles(acciones);
            return true; // Esperar al humano
        } else {
             this.callbacks.actualizarAccionesPosibles({ puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false });
             const ia = jugadorResponde as IA;
             const contextoEnvido = this.crearContextoEnvido(ia);
             let respuestaIA = ia.envido(contextoEnvido);

             const accionesPosiblesIA = Actions.getPosiblesRespuestasEnvido(this);
             if (!accionesPosiblesIA.includes(respuestaIA) && respuestaIA !== Canto.Paso) {
                 console.warn(`IA ${ia.nombre} intentó respuesta inválida de Envido (${respuestaIA}). Forzando NoQuiero.`);
                 respuestaIA = Canto.NoQuiero;
             }
             if (respuestaIA === Canto.Paso) {
                 respuestaIA = Canto.NoQuiero;
             }

             this.registrarRespuesta(respuestaIA, this.equipoDebeResponderEnvido); // Actualiza estadoRonda
             // setTimeout(() => this.continuarFlujo(), 1000); // <- INCORRECTO AQUI
             return false; // IA actuó, no esperar
        }
    }

     /**
      * Procesa la espera de respuesta al Truco.
      * @returns `true` si se debe esperar al humano, `false` si la IA actuó.
      */
     private procesarRespuestaTruco(): boolean {
          if (!this.equipoDebeResponderTruco) {
             console.error("Error: gestionando respuesta truco sin equipo que deba responder.");
             this.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
             return false; // Recuperar y continuar flujo
         }
         const jugadorResponde = this.equipoDebeResponderTruco.jugador;

         if (jugadorResponde.esHumano) {
             const acciones = Actions.calcularAccionesPosiblesParaRespuestaTruco(this);
             this.callbacks.actualizarAccionesPosibles(acciones);
             return true; // Esperar al humano
         } else {
             this.callbacks.actualizarAccionesPosibles({ puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false });
             const ia = jugadorResponde as IA;
             const contextoTruco = this.crearContextoTruco(ia);
             let respuestaIA = ia.truco(true, contextoTruco);

             const accionesPosiblesIA = Actions.getPosiblesRespuestasTruco(this);
             if (!accionesPosiblesIA.includes(respuestaIA) && respuestaIA !== Canto.Paso) {
                 console.warn(`IA ${ia.nombre} intentó respuesta inválida de Truco (${respuestaIA}). Forzando NoQuiero.`);
                 respuestaIA = Canto.NoQuiero;
             }
              if (respuestaIA === Canto.Paso) {
                 respuestaIA = Canto.NoQuiero;
             }

             this.registrarRespuesta(respuestaIA, this.equipoDebeResponderTruco); // Actualiza estadoRonda
             // setTimeout(() => this.continuarFlujo(), 1000); // <- INCORRECTO AQUI
             return false; // IA actuó, no esperar
         }
     }
    

     /** Procesa el final de una mano (determina ganador, cambia turno, prepara siguiente mano o fin de ronda) */
    private procesarFinDeMano(): void {
        this.resolverManoActual(); // Resuelve la mano y establece el turno para la siguiente

        const ganadorRonda = this.determinarGanadorRonda(); // Verifica si la ronda terminó

        if (ganadorRonda !== null) {
            this.estadoRonda = EstadoRonda.RondaTerminada;
        } else {
            // Iniciar siguiente mano
            this.numeroDeMano++;
            this.callbacks.setNumeroMano(this.numeroDeMano);
            this.jugadasEnMano = 0;
             // Limpiar cartas de la mesa para la siguiente mano (visual y lógico)
            this.cartasMesa = Array(6).fill(null); // Limpiar lógico
            this.callbacks.clearPlayedCards(); // Limpiar visual
            this.estadoRonda = EstadoRonda.InicioMano;
            this.puedeEnvido = false; // Ya no se puede envido
            // El turno ya se estableció en _resolverManoActualLogica
        }
    }



    private crearContextoEnvido(ia: IA): EnvidoContext {
        const equipoIA = this.getEquipo(ia)!;
        const oponente = this.getOponente(equipoIA);
        const puntosCalculados = this.calcularPuntosEnvido(); // Calcula puntos si quiero/no quiero
    
        // Obtener la última carta jugada por el oponente (si aplica)
        let cartaVistaOponente: Naipe | null = null;
        if (!equipoIA.esMano && this.numeroDeMano === 0 && this.jugadasEnMano === 1) {
            const indiceOpMesa = 0; // El oponente (mano) juega primero en mano 0
            cartaVistaOponente = this.cartasMesa[indiceOpMesa];
        }
    
        // Inicializar statsOponente con tipo explícito
        let statsOponente: {
            envidoS: number[];
            revire: number[];
            realEnvido: number[];
            faltaEnvido: number[];
        } = {
            envidoS: [],
            revire: [],
            realEnvido: [],
            faltaEnvido: []
        };
    
        if (oponente.jugador instanceof IA) {
            // Si el oponente es otra IA, obtener las stats desde la instancia de IA
            statsOponente = {
                envidoS: oponente.jugador.statsEnvidoSCantados,
                revire: oponente.jugador.statsRevireCantados,
                realEnvido: oponente.jugador.statsRealEnvidoCantados,
                faltaEnvido: oponente.jugador.statsFaltaEnvidoCantados
            };
        } else {
            // Si el oponente es humano, asumir que las stats están en la clase base Jugador
            statsOponente = {
                envidoS: oponente.jugador.statsEnvidoSCantados,
                revire: oponente.jugador.statsRevireCantados,
                realEnvido: oponente.jugador.statsRealEnvidoCantados,
                faltaEnvido: oponente.jugador.statsFaltaEnvidoCantados
            };
        }
    
        return {
            equipoIA: equipoIA,
            oponente: oponente,
            limitePuntaje: this.limitePuntaje,
            misPuntosEnvido: ia.getPuntosDeEnvido(ia.cartas), // Calcular puntos IA
            ultimoCantoEnvido: getLast(this.cantosEnvido)?.canto ?? null, // El último canto registrado
            puntosEnvidoAcumulados: puntosCalculados.ganador, // Puntos si se quiere
            puntosSiNoQuiero: puntosCalculados.perdedor, // Puntos si no se quiere
            cartaVistaOponente: cartaVistaOponente,
            statsEnvidoOponente: statsOponente, // Pasar las stats obtenidas
            probabilidad: { // Pasar métodos de la instancia de probabilidad de la IA
                ponderarPuntos: ia.prob.ponderarPuntos.bind(ia.prob),
                evaluarCartaVista: ia.prob.evaluarCartaVista.bind(ia.prob),
                medianaEnvidoOponente: ia.prob.medianaEnvidoOponente.bind(ia.prob)
            },
            esIAManoDeRonda: equipoIA.esMano, // Indicar si IA es mano
            historialEnvido: this.cantosEnvido // Pasar historial completo si es necesario
        };
    }

    // --- Métodos de Registro de Acciones (usan callbacks) --- //

    private registrarCanto(canto: Canto, equipoQueCanta: Equipo): void {
        const esEnvido = [Canto.Envido, Canto.EnvidoEnvido, Canto.RealEnvido, Canto.FaltaEnvido].includes(canto);
        const esTruco = [Canto.Truco, Canto.ReTruco, Canto.ValeCuatro].includes(canto);

        // Validar acción posible usando el módulo Actions
        let accionValida = false;
        if (esEnvido && (Actions.getPosiblesCantosEnvido(this).includes(canto) || Actions.getPosiblesRespuestasEnvido(this).includes(canto))) {
            accionValida = true;
        } else if (esTruco && (Actions.getPosiblesCantosTruco(this).includes(canto) || Actions.getPosiblesRespuestasTruco(this).includes(canto))) {
            accionValida = true;
        } else if (canto === Canto.IrAlMazo && Actions.calcularAccionesPosiblesParaTurno(this).puedeMazo) { // Asumiendo que mazo es posible en turno normal
             accionValida = true;
        }

        if (!accionValida) {
             console.warn(`Canto/Respuesta inválido ${canto} registrado por ${equipoQueCanta.jugador.nombre}`);
             // Podríamos notificar a la UI aquí también
             return; // No registrar canto inválido
        }

        this.callbacks.showPlayerCall(equipoQueCanta.jugador, this.cantoToString(canto));

        if (esEnvido) {
            this.cantosEnvido.push({ canto, equipo: equipoQueCanta });
            this.equipoDebeResponderEnvido = this.getOponente(equipoQueCanta);
            this.equipoDebeResponderTruco = null;
            this.estadoRonda = EstadoRonda.EsperandoRespuestaEnvido;
            this.equipoEnTurno = this.equipoDebeResponderEnvido;
        } else if (esTruco) {
            this.cantosTruco.push({ canto, equipo: equipoQueCanta });
            this.equipoDebeResponderTruco = this.getOponente(equipoQueCanta);
            this.equipoDebeResponderEnvido = null; // Envido se interrumpe
            this.estadoRonda = EstadoRonda.EsperandoRespuestaTruco;
            this.equipoEnTurno = this.equipoDebeResponderTruco;
        } else if (canto === Canto.IrAlMazo) {
            this.trucoNoQueridoPor = equipoQueCanta;
            // Usar el cálculo externo
            this.puntosTrucoGanados = Calculos.calcularPuntosTruco(this.cantosTruco).noQuerido;
            this.estadoRonda = EstadoRonda.RondaTerminada;
        }
    }

    private registrarRespuesta(respuesta: Canto, equipoQueResponde: Equipo): void {
        const esRespuestaSN = this.esRespuesta(respuesta);
        this.callbacks.showPlayerCall(equipoQueResponde.jugador, this.cantoToString(respuesta));
        let accionValida = false;

        if (this.equipoDebeResponderEnvido === equipoQueResponde) {
            if (!Actions.getPosiblesRespuestasEnvido(this).includes(respuesta)) {
                 console.warn(`Respuesta Envido inválida ${respuesta} registrada por ${equipoQueResponde.jugador.nombre}`);
                 return;
            }
            accionValida = true;
            this.cantosEnvido.push({ canto: respuesta, equipo: equipoQueResponde });
            this.equipoDebeResponderEnvido = null;

            if (esRespuestaSN) {
                this.resolverEnvido(respuesta === Canto.Quiero); // Resolver con método lógico
                this.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
                // El turno vuelve a quien cantó originalmente OJO: si se resolvió envido y había truco pendiente? Revisar flujo.
                 // Por ahora, asumimos que vuelve a quien cantó envido.
                const ultimoCantadorEnvido = getLast(this.cantosEnvido.filter(c => !this.esRespuesta(c.canto)))?.equipo;
                 if (ultimoCantadorEnvido) {
                     this.equipoEnTurno = ultimoCantadorEnvido;
                 } else { // Si no hay cantador (ej: respuesta a nada?), asignar a mano? Raro.
                     console.error("Error: Envido resuelto sin cantador previo?");
                     this.equipoEnTurno = this.equipoMano;
                 }

            } else { // Contra-canto Envido
                this.equipoDebeResponderEnvido = this.getOponente(equipoQueResponde);
                this.estadoRonda = EstadoRonda.EsperandoRespuestaEnvido;
                this.equipoEnTurno = this.equipoDebeResponderEnvido;
            }

        } else if (this.equipoDebeResponderTruco === equipoQueResponde) {
             if (!Actions.getPosiblesRespuestasTruco(this).includes(respuesta)) {
                 console.warn(`Respuesta Truco inválida ${respuesta} registrada por ${equipoQueResponde.jugador.nombre}`);
                 return;
            }
            accionValida = true;
            this.cantosTruco.push({ canto: respuesta, equipo: equipoQueResponde });
            this.equipoDebeResponderTruco = null;

            if (esRespuestaSN) {
                this.resolverTruco(respuesta === Canto.Quiero); // Resolver con método lógico (puede cambiar estadoRonda)
                if (this.estadoRonda !== EstadoRonda.RondaTerminada) {
                    this.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
                    // Turno pasa a quien respondió (para jugar o escalar)
                    this.equipoEnTurno = equipoQueResponde;
                }
            } else { // Contra-canto Truco
                this.equipoDebeResponderTruco = this.getOponente(equipoQueResponde);
                this.estadoRonda = EstadoRonda.EsperandoRespuestaTruco;
                this.equipoEnTurno = this.equipoDebeResponderTruco;
            }
        }

        if (!accionValida) {
             console.error("Error: Se registró respuesta sin equipo que deba responder o inválida.");
        }
    }

    private registrarJugada(carta: Naipe, equipoQueJuega: Equipo): void {
        // Validar si es el turno del equipo
        console.log(`Turno de ${equipoQueJuega.jugador.nombre} para jugar carta.`);
        if (equipoQueJuega !== this.equipoEnTurno) {
            console.error(`Error: Jugó ${equipoQueJuega.jugador.nombre} fuera de turno.`);
            return; // No registrar jugada fuera de turno
        }
         // Validar si el estado permite jugar
         if(this.estadoRonda !== EstadoRonda.EsperandoJugadaNormal && this.estadoRonda !== EstadoRonda.InicioMano) {
              console.warn(`Intento de jugar carta en estado inválido: ${EstadoRonda[this.estadoRonda]}`);
              return;
         }

        // --- INICIO: Lógica de Registro y Actualización de Mano ---

        // 1. Eliminar la carta de la mano del jugador ANTES de notificar a la UI
        const jugador = equipoQueJuega.jugador;
        const exitoAlQuitar = jugador.registrarCartaJugadaPorObjeto(carta);

        if (!exitoAlQuitar) {
            console.error(`Error Crítico: ${jugador.nombre} intentó jugar la carta ${carta.getNombre()} pero no se encontró en su mano.`);
            // Aquí podrías intentar recuperar el estado o forzar fin de ronda/partida
            this.callbacks.displayLog(`Error interno: No se encontró la carta ${carta.getNombre()} en tu mano.`);
            return; // Detener el proceso si la carta no estaba
        }

        // 2. Actualizar cartas en mesa
        const playerIndex = equipoQueJuega === this.equipoPrimero ? 0 : 1;
        const mesaIndex = this.numeroDeMano * 2 + playerIndex;

        if (mesaIndex >= this.cartasMesa.length) {
            console.error(`Error: Índice de mesa inválido ${mesaIndex} al jugar ${carta.getNombre()}`);
            return;
        }
        this.cartasMesa[mesaIndex] = carta;
        // jugador.cartasJugadasRonda.push(carta); // Esto ya lo hace registrarCartaJugadaPorObjeto

        // --- FIN: Lógica de Registro y Actualización de Mano ---


        // --- Notificar a la UI (AHORA con la mano actualizada) ---
        this.callbacks.displayPlayedCard(jugador, carta, this.numeroDeMano, this.jugadasEnMano);
        // Actualizar la mano visual del jugador (Humano o IA - aunque IA no se vea)
        this.callbacks.displayPlayerCards(jugador); // <-- Ahora tiene la mano correcta
        // --------------------------------------------------------

        this.jugadasEnMano++;
        // Pasar turno SIEMPRE después de jugar
        this.equipoEnTurno = this.getOponente(equipoQueJuega);

        // Ya no se puede envido si se jugó la primera carta de la ronda
        if (this.numeroDeMano === 0 && this.jugadasEnMano >= 1 && this.puedeEnvido) {
            this.puedeEnvido = false;
             if (!this.envidoResuelto) { // Si no se cantó envido y se jugó la primera, se pierde
                 if(this.debugMode) this.callbacks.displayLog("Debug: Envido perdido (se jugó la primera carta).");
                 this.envidoResuelto = true; // Marcar como resuelto (sin puntos)
             }
        }

       // Si se completó la mano (ambos jugaron), resolverla
       if (this.jugadasEnMano === 2) {
        this.estadoRonda = EstadoRonda.ManoTerminada;
   } else {
        // Si no, esperar la siguiente jugada normal
        this.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
        }
    }

     // --- Métodos de Resolución (usan callbacks) ---

    private resolverManoActual(): void {
        const indiceMano = this.equipoMano === this.equipoPrimero ? 0 : 1;
        const indicePie = this.equipoPie === this.equipoPrimero ? 0 : 1;
        // Indices para la mano actual en el array plano cartasMesa
        const idxCartaMano = this.numeroDeMano * 2 + indiceMano;
        const idxCartaPie = this.numeroDeMano * 2 + indicePie;
        const cartaMano = this.cartasMesa[idxCartaMano];
        const cartaPie = this.cartasMesa[idxCartaPie];

        let ganadorManoEquipo: Equipo | null = null;
        let cartaGanadora: Naipe | null = null;
        let jugadorGanador: Jugador | null = null;
        let jugadaGanadoraIndex = -1; // 0 para mano, 1 para pie

        if (!cartaMano || !cartaPie) {
            console.error(`Error al resolver mano ${this.numeroDeMano}: faltan cartas.`);
            this.callbacks.displayLog(`Mano ${this.numeroDeMano + 1}: ERROR`);
            this.equipoEnTurno = this.equipoMano; // Empieza el mano
            return;
        }

        if (cartaMano.valor > cartaPie.valor) {
            ganadorManoEquipo = this.equipoMano;
            cartaGanadora = cartaMano;
            jugadorGanador = this.equipoMano.jugador;
            jugadaGanadoraIndex = 0;
        } else if (cartaPie.valor > cartaMano.valor) {
            ganadorManoEquipo = this.equipoPie;
            cartaGanadora = cartaPie;
            jugadorGanador = this.equipoPie.jugador;
            jugadaGanadoraIndex = 1;
        } else { // Parda
            ganadorManoEquipo = null;
            this.callbacks.displayLog(`Mano ${this.numeroDeMano + 1}: Parda`);
            this.equipoEnTurno = this.equipoMano; // En parda, empieza el mano de la ronda
            // Marcar parda en algún lado si es necesario para desempate?
            // Se podría añadir una propiedad a Equipo como manosEmpardadasRonda. Por ahora no.
            return;
        }

        this.callbacks.displayLog(`Mano ${this.numeroDeMano + 1}: Gana ${ganadorManoEquipo.jugador.nombre} (${cartaGanadora?.getNombre()})`);
        ganadorManoEquipo.manosGanadasRonda++;
        this.equipoEnTurno = ganadorManoEquipo; // El ganador empieza la siguiente mano

        if (this.callbacks.highlightWinningCard && jugadorGanador && cartaGanadora) {
             this.callbacks.highlightWinningCard(jugadorGanador, this.numeroDeMano, jugadaGanadoraIndex);
        }
    }
     /** Compara dos cartas y devuelve el equipo ganador o null si es parda */
     private determinarGanadorMano(cartaEq1: Naipe, cartaEq2: Naipe): Equipo | null {
        if (cartaEq1.valor > cartaEq2.valor) {
            return this.equipoPrimero;
        } else if (cartaEq2.valor > cartaEq1.valor) {
            return this.equipoSegundo;
        } else {
            return null; // Parda
        }
     }

     /** Calcula los puntos de envido según los cantos */
     private calcularPuntosEnvido(): { ganador: number; perdedor: number; acumuladoCantos: number } {
        let g = 0, p = 0, a = 0; // Ganador (si quiero), Perdedor (si no quiero), Acumulado (nro cantos)
        let faltaActiva = false;
        let puntosBase = 0; // Puntos del envido antes de falta
    
        for (const item of this.cantosEnvido) {
            if(this.esRespuesta(item.canto)) continue;
    
            a++; // Contar número de cantos
            switch (item.canto) {
                case Canto.Envido:
                    puntosBase = (puntosBase === 0) ? 2 : puntosBase + 2; // 2 o acumula
                    break;
                case Canto.EnvidoEnvido: // Asume que vino de Envido
                    puntosBase += 2;
                    break;
                case Canto.RealEnvido:
                    puntosBase += 3;
                    break;
                case Canto.FaltaEnvido:
                    faltaActiva = true;
                    break; // Se calcula al final
            }
        }
    
        if (faltaActiva) {
             // Puntos si no quiero Falta: son los puntos acumulados antes de la Falta, o 1 si no había nada.
             p = (puntosBase > 0) ? puntosBase : 1;
             // Puntos si quiero Falta:
             const puntosOponente = Math.max(this.equipoPrimero.puntos, this.equipoSegundo.puntos);
             g = this.limitePuntaje - puntosOponente;
             if (g <= 0) g = 1; // Mínimo 1 punto
        } else {
             // Puntos si quiero: son los puntos base calculados, o 1 si solo hubo Truco (o nada).
             g = (puntosBase > 0) ? puntosBase : (a > 0 ? 1 : 0); // Si hubo cantos, al menos 1; si no, 0.
             // Puntos si no quiero: es lo acumulado ANTES del último canto, o 1 si solo fue Envido.
             // Reconstruir esto es complejo. Simplificación: g-1.
             p = (g > 1) ? g - 1 : ((a > 0) ? 1 : 0); // Si se acumuló >1, es g-1. Si solo Envido (g=2), es 1. Si no hubo nada, 0.
             // Corrección: Si solo fue Envido (g=2, a=1), no quiero = 1. OK.
             // Si fue E->EE (g=4, a=2), no quiero = 2. ¿g-1 = 3? -> MAL.
             // Necesitamos calcular p basado en el penúltimo estado.
             // Rehacer cálculo de p:
             if (a === 0) p = 0;
             else if (a === 1) p = 1; // No quiero Envido, RealEnvido o Falta inicial = 1
             else { // a >= 2
                 // Necesitamos el valor *antes* del último canto.
                 // Ej: E -> EE. Antes de EE, valía 2 (g), 1 (p). No quiero EE -> p=2.
                 // Ej: E -> R. Antes de R, valía 2 (g), 1 (p). No quiero R -> p=2.
                 // Ej: E -> EE -> R. Antes de R, valía 4 (g), 2 (p). No quiero R -> p=4.
                 // Regla: p = puntos acumulados ANTES del último canto.
                 let puntosPenultimo = 0;
                 let cantosValidos = this.cantosEnvido.filter(c => !this.esRespuesta(c.canto));
                 for (let i = 0; i < cantosValidos.length - 1; i++) { // Iterar hasta el penúltimo
                     switch (cantosValidos[i].canto) {
                         case Canto.Envido: puntosPenultimo = (puntosPenultimo === 0) ? 2 : puntosPenultimo + 2; break;
                         case Canto.EnvidoEnvido: puntosPenultimo += 2; break;
                         case Canto.RealEnvido: puntosPenultimo += 3; break;
                         // No debería haber Falta aquí si no es el último
                     }
                 }
                 p = (puntosPenultimo > 0) ? puntosPenultimo : 1; // Si antes no había nada (solo el 1er canto), p=1.
             }
        }
    
        // Asegurarse que g sea al menos p si se quiere (excepto Falta)
        if (!faltaActiva && g < p) g = p;
        // Si no se cantó nada (a=0), todo es 0
        if (a === 0) { g = 0; p = 0; }
    
        return { ganador: g, perdedor: p, acumuladoCantos: a };
     }    

     private resolverEnvido(querido: boolean): void {
        this.envidoResuelto = true;
        // Llamar al cálculo externo
        const puntosCalculados = Calculos.calcularPuntosEnvido(
            this.cantosEnvido,
            this.limitePuntaje,
            this.equipoPrimero.puntos, // Pasar puntos actuales por si es Falta Envido
            this.equipoSegundo.puntos
        );
        let equipoGanador: Equipo | null = null;
        let puntosOtorgados = 0;
        let puntosOponenteSiQuerido: number | null = null;

        if (querido) {
            const pMano = this.equipoMano.jugador.getPuntosDeEnvido(this.equipoMano.jugador.cartas);
            const pPie = this.equipoPie.jugador.getPuntosDeEnvido(this.equipoPie.jugador.cartas);

            this.callbacks.showPlayerCall(this.equipoMano.jugador, `${this.cantoToString(pMano)}`);
            setTimeout(() => {
                 this.callbacks.showPlayerCall(this.equipoPie.jugador, `${this.cantoToString(pPie)}`);
            }, 600);

            if (pMano >= pPie) {
                equipoGanador = this.equipoMano;
                puntosOtorgados = puntosCalculados.ganador;
                puntosOponenteSiQuerido = pPie;
            } else {
                equipoGanador = this.equipoPie;
                puntosOtorgados = puntosCalculados.ganador;
                puntosOponenteSiQuerido = pMano;
            }

             const equipoPerdedor = (equipoGanador === this.equipoPrimero) ? this.equipoSegundo : this.equipoPrimero;
             if (!equipoPerdedor.jugador.esHumano && equipoPerdedor.jugador instanceof IA) {
                 const puntosGanador = equipoGanador === this.equipoMano ? pMano : pPie;
                  // La IA necesita saber los puntos del *oponente* (ganador) para aprender
                  equipoPerdedor.jugador.statsEnvido(this.cantosEnvido, puntosGanador);
             }

        } else { // No querido
            const ultimoCantoObj = getLast(this.cantosEnvido.filter(c => !this.esRespuesta(c.canto)));
            if (ultimoCantoObj) {
                 equipoGanador = ultimoCantoObj.equipo;
                 puntosOtorgados = puntosCalculados.perdedor;
            } else { console.error("Error: Envido No Querido sin canto previo?"); }
        }

        if (equipoGanador && puntosOtorgados > 0) {
            this.callbacks.displayLog(`Envido: Gana ${puntosOtorgados}pts ${equipoGanador.jugador.nombre}`);
             // Guardar temporalmente quién ganó y cuántos puntos para asignarlos al final de la ronda
             equipoGanador.jugador.puntosGanadosEnvidoRonda = puntosOtorgados;
             // NO acumular en this.puntosEnvidoGanados aquí, se hará en _finalizarRondaLogica
        }
    }


    /** Calcula los puntos de truco según los cantos */
    private calcularPuntosTruco(): PuntosTruco {
        const ultimoCantoObj = getLast(this.cantosTruco.filter(c => !this.esRespuesta(c.canto)));
        const ultimoCanto = ultimoCantoObj?.canto;

        switch(ultimoCanto){
            case Canto.Truco: return { querido: 2, noQuerido: 1 };
            case Canto.ReTruco: return { querido: 3, noQuerido: 2 };
            case Canto.ValeCuatro: return { querido: 4, noQuerido: 3 };
            default: return { querido: 1, noQuerido: 0 }; // Ronda normal vale 1, no quererla no da puntos
        }
    }
    
    private crearContextoTruco(ia: IA): TrucoContext {
        const equipoIA = this.getEquipo(ia);
        if (!equipoIA) throw new Error("No se encontró el equipo de la IA para crear contexto Truco.");
        const oponente = this.getOponente(equipoIA);
    
        // Calcular resultados de manos anteriores
        let resMano0 = 0, resMano1 = 0;
        const cartaEq1Mano0 = this.cartasMesa[0];
        const cartaEq2Mano0 = this.cartasMesa[1];
        if (this.numeroDeMano > 0 && cartaEq1Mano0 && cartaEq2Mano0) {
            const ganadorMano0 = this.determinarGanadorMano(cartaEq1Mano0, cartaEq2Mano0);
            resMano0 = (ganadorMano0 === equipoIA) ? 1 : ((ganadorMano0 === oponente) ? -1 : 0);
        }
        const cartaEq1Mano1 = this.cartasMesa[2];
        const cartaEq2Mano1 = this.cartasMesa[3];
        if (this.numeroDeMano > 1 && cartaEq1Mano1 && cartaEq2Mano1) {
            const ganadorMano1 = this.determinarGanadorMano(cartaEq1Mano1, cartaEq2Mano1);
            resMano1 = (ganadorMano1 === equipoIA) ? 1 : ((ganadorMano1 === oponente) ? -1 : 0);
        }
    
        // Obtener puntos cantados por el oponente en el envido
        let puntosOponenteEnvido: number | null = null;
        const ultimoCantoEnvido = getLast(this.cantosEnvido);
        if (this.envidoResuelto && ultimoCantoEnvido?.canto === Canto.Quiero) {
            const equipoGanadorEnvido = this.equipoPrimero.jugador.puntosGanadosEnvidoRonda > 0
                ? this.equipoPrimero
                : (this.equipoSegundo.jugador.puntosGanadosEnvidoRonda > 0 ? this.equipoSegundo : null);
            if (equipoGanadorEnvido === equipoIA) {
                puntosOponenteEnvido = oponente.jugador.getPuntosDeEnvido(oponente.jugador.cartas);
            } else if (equipoGanadorEnvido === oponente) {
                puntosOponenteEnvido = oponente.jugador.getPuntosDeEnvido(oponente.jugador.cartas);
            }
        }
    
        // Obtener cartas jugadas en mano 0
        let cartaIA_M0: Naipe | null = null;
        let cartaOp_M0: Naipe | null = null;
        if (cartaEq1Mano0 && cartaEq2Mano0) {
            cartaIA_M0 = (equipoIA === this.equipoPrimero) ? cartaEq1Mano0 : cartaEq2Mano0;
            cartaOp_M0 = (oponente === this.equipoPrimero) ? cartaEq1Mano0 : cartaEq2Mano0;
        }
    
        // Determinar cartas en mesa en la mano actual
        const idxIAMesa = this.numeroDeMano * 2 + (equipoIA === this.equipoPrimero ? 0 : 1);
        const idxOpMesa = this.numeroDeMano * 2 + (oponente === this.equipoPrimero ? 0 : 1);
        const miCartaEnMesaActual = this.cartasMesa[idxIAMesa] ?? null;
        const cartaOpEnMesaActual = this.cartasMesa[idxOpMesa] ?? null;
    
        return {
            equipoIA: equipoIA,
            oponente: oponente,
            limitePuntaje: this.limitePuntaje,
            nroMano: this.numeroDeMano,
            ultimoCantoTruco: getLast(this.cantosTruco.filter(c => !this.esRespuesta(c.canto)))?.canto ?? null,
            miCartaEnMesa: miCartaEnMesaActual,
            cartaOponenteEnMesa: cartaOpEnMesaActual,
            resultadoMano0: resMano0,
            resultadoMano1: resMano1,
            misCartasEnMano: ia.cartasEnMano,
            cartasJugadasOponente: oponente.jugador.cartasJugadasRonda,
            puntosEnvidoGanadosIA: ia.puntosGanadosEnvidoRonda,
            puntosEnvidoCantadosOponente: puntosOponenteEnvido,
            cartaJugadaIAMano0: cartaIA_M0,
            cartaJugadaOpMano0: cartaOp_M0,
            probabilidad: {
                deducirCarta: ia.prob.deducirCarta.bind(ia.prob)
            }
        };
    }

     /** Resuelve el Truco después de Quiero/NoQuiero */
     private resolverTruco(querido: boolean): void {
        this.trucoResuelto = true;

        if (!querido) {
            const equipoQueRespondio = getLast(this.cantosTruco)?.equipo ?? null;
            if (equipoQueRespondio) {
                this.trucoNoQueridoPor = equipoQueRespondio;
                 // Usar cálculo externo
                this.puntosTrucoGanados = Calculos.calcularPuntosTruco(this.cantosTruco).noQuerido;
                this.estadoRonda = EstadoRonda.RondaTerminada; // Termina la ronda
            } else { console.error("Error: Truco No Querido sin respuesta previa?"); }
        }
        // Si fue querido, no pasa nada aquí, los puntos se calculan al final.
    }

     /** Determina si hay un ganador de la ronda */
     private determinarGanadorRonda(): Equipo | null {
        const e1 = this.equipoPrimero;
        const e2 = this.equipoSegundo;

        if (e1.manosGanadasRonda >= 2) return e1;
        if (e2.manosGanadasRonda >= 2) return e2;

        // Comprobar después de la mano 3 (índice 2)
        if (this.numeroDeMano >= 2) { // Si ya se jugó la mano 3 (o hubo 2 victorias antes)
            // Si la primera fue parda y uno ganó la 2da y 3ra
             // Nota: La lógica de parda no está explícitamente guardada, se asume que gana el mano en caso de empate final.

             // Si llegaron a la 3ra mano (implica 1-1 o pardas)
             if (e1.manosGanadasRonda === 1 && e2.manosGanadasRonda === 1) {
                 return this.equipoMano; // Gana el mano de la ronda
             }
             // Podría haber casos de múltiples pardas, el mano siempre tiene ventaja
             if (e1.manosGanadasRonda > e2.manosGanadasRonda) return e1;
             if (e2.manosGanadasRonda > e1.manosGanadasRonda) return e2;
             // Si 0-0 tras 3 manos (3 pardas), gana el mano
             if (e1.manosGanadasRonda === 0 && e2.manosGanadasRonda === 0) {
                 return this.equipoMano;
             }
        }

        return null; // No hay ganador aún
     }

     /** Finaliza la ronda, calcula puntos y notifica a Partida */
     private finalizarRondaLogica(): void {
        this.estadoRonda = EstadoRonda.RondaTerminada; // Asegurar estado final
        this.callbacks.actualizarAccionesPosibles({ puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false });

        let ganadorRondaEquipo: Equipo | null = null;
        let puntosGanadosTruco = 0;
        let puntosGanadosEnvidoEq1 = this.equipoPrimero.jugador.puntosGanadosEnvidoRonda; // Puntos de envido que ganó E1
        let puntosGanadosEnvidoEq2 = this.equipoSegundo.jugador.puntosGanadosEnvidoRonda; // Puntos de envido que ganó E2

        if (this.trucoNoQueridoPor) {
            ganadorRondaEquipo = this.getOponente(this.trucoNoQueridoPor);
            puntosGanadosTruco = this.puntosTrucoGanados; // Ya calculados
            this.callbacks.displayLog(`Ronda: ${ganadorRondaEquipo.jugador.nombre} gana ${puntosGanadosTruco}pts (No Querido / Mazo)`);
        } else {
            ganadorRondaEquipo = this.determinarGanadorRonda();
            if (ganadorRondaEquipo) {
                // Usar cálculo externo
                puntosGanadosTruco = Calculos.calcularPuntosTruco(this.cantosTruco).querido;
                this.callbacks.displayLog(`Ronda: ${ganadorRondaEquipo.jugador.nombre} gana ${puntosGanadosTruco}pts (Truco)`);
                if (this.callbacks.displayRoundWinner) {
                    this.callbacks.displayRoundWinner(ganadorRondaEquipo.jugador.nombre);
                }
            } else {
                this.callbacks.displayLog(`Ronda: EMPATE (Error?)`);
                 ganadorRondaEquipo = this.equipoMano; // Desempate por mano si falla la lógica
                 puntosGanadosTruco = 1;
            }
        }

        // Calcular puntos totales para Partida
        let puntosEq1 = (ganadorRondaEquipo === this.equipoPrimero) ? puntosGanadosTruco : 0;
        let puntosEq2 = (ganadorRondaEquipo === this.equipoSegundo) ? puntosGanadosTruco : 0;

        // Sumar puntos del envido (ya están asignados al jugador correcto)
        puntosEq1 += puntosGanadosEnvidoEq1;
        puntosEq2 += puntosGanadosEnvidoEq2;

        // Notificar a Partida
        setTimeout(() => {
            this.onRondaTerminada(puntosEq1, puntosEq2);
        }, 1500);
    }



    // --- Métodos para calcular acciones posibles (refinados) ---

    private calcularAccionesPosiblesParaTurno(): AccionesPosibles {
        // Lógica compleja que depende del estado actual
        const puedeJugar = this.estadoRonda === EstadoRonda.EsperandoJugadaNormal || this.estadoRonda === EstadoRonda.InicioMano;
        const envidoPosible = this.getPosiblesCantosEnvido();
        const trucoPosible = this.getPosiblesCantosTruco();

        return {
            puedeJugarCarta: puedeJugar,
            puedeCantarEnvido: puedeJugar ? envidoPosible : [], // Solo puede cantar si puede jugar
            puedeCantarTruco: puedeJugar ? trucoPosible : [], // Solo puede cantar si puede jugar
            puedeResponder: [], // No está respondiendo
            puedeMazo: true // Siempre puede irse al mazo (casi siempre)
        };
   }
   private calcularAccionesPosiblesParaRespuestaEnvido(): AccionesPosibles {
        if (this.equipoEnTurno !== this.equipoDebeResponderEnvido) return { puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false};
        return {
            puedeJugarCarta: false,
            puedeCantarEnvido: [],
            puedeCantarTruco: [],
            puedeResponder: this.getPosiblesRespuestasEnvido(),
            puedeMazo: true
        };
    }
    private calcularAccionesPosiblesParaRespuestaTruco(): AccionesPosibles {
        if (this.equipoEnTurno !== this.equipoDebeResponderTruco) return { puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false};
         return {
            puedeJugarCarta: false,
            puedeCantarEnvido: [],
            puedeCantarTruco: [],
            puedeResponder: this.getPosiblesRespuestasTruco(),
            puedeMazo: true
        };
    }

   // --- Getters de acciones/respuestas posibles (refinados) ---

   private getPosiblesCantosEnvido(): Canto[] {
       if (!this.puedeEnvido || this.envidoResuelto || this.equipoDebeResponderEnvido || this.equipoDebeResponderTruco) return [];
       if (this.numeroDeMano !== 0) return [];
       // Mano solo puede en jugada 0
       if (this.equipoEnTurno === this.equipoMano && this.jugadasEnMano > 0) return [];
       // Pie puede en jugada 0 o 1
       if (this.equipoEnTurno === this.equipoPie && this.jugadasEnMano > 1) return [];

       return [Canto.Envido, Canto.RealEnvido, Canto.FaltaEnvido];
   }

   private getPosiblesRespuestasEnvido(): Canto[] {
       // Solo puede responder si es su turno y debe responder envido
       if (!this.equipoDebeResponderEnvido || this.equipoEnTurno !== this.equipoDebeResponderEnvido) return [];

       const ultimo = getLast(this.cantosEnvido.filter(c => !this.esRespuesta(c.canto)))?.canto;
       const respuestas: Canto[] = [Canto.Quiero, Canto.NoQuiero];
       if (!ultimo) return [];

       switch(ultimo) {
           case Canto.Envido: respuestas.push(Canto.EnvidoEnvido, Canto.RealEnvido, Canto.FaltaEnvido); break;
           case Canto.EnvidoEnvido: respuestas.push(Canto.RealEnvido, Canto.FaltaEnvido); break;
           case Canto.RealEnvido: respuestas.push(Canto.FaltaEnvido); break;
       }
       return respuestas;
   }

   private puedeCantarTruco(equipo: Equipo): boolean {
       // No se puede cantar truco si hay un envido pendiente o si ya se resolvió el truco
       if (this.equipoDebeResponderEnvido || this.trucoResuelto) return false;
       // No se puede cantar si se debe responder al truco
       if (this.equipoDebeResponderTruco === equipo) return false;

       const ultimoCantoObj = getLast(this.cantosTruco);
       if (!ultimoCantoObj) return true; // Nadie cantó, puede Truco

       if (this.esRespuesta(ultimoCantoObj.canto)) {
            if(ultimoCantoObj.canto === Canto.NoQuiero) return false; // Nadie más canta
            // Si fue Quiero, puede cantar el que respondió Quiero (si es el equipo actual)
            return ultimoCantoObj.equipo === equipo;
       } else {
            // Si el último fue un canto, no puede cantar el mismo equipo
            return ultimoCantoObj.equipo !== equipo;
       }
   }

   private getPosiblesCantosTruco(): Canto[] {
       if (!this.puedeCantarTruco(this.equipoEnTurno)) return [];

       const ultimoCantoRespondido = getLast(this.cantosTruco.filter(c => !this.esRespuesta(c.canto)))?.canto;

       if (!ultimoCantoRespondido) return [Canto.Truco];

       // Si el último canto fue respondido con Quiero, se puede escalar
        const ultimoReal = getLast(this.cantosTruco);
        if(ultimoReal && ultimoReal.canto === Canto.Quiero && ultimoReal.equipo === this.equipoEnTurno) {
            switch(ultimoCantoRespondido) {
                case Canto.Truco: return [Canto.ReTruco];
                case Canto.ReTruco: return [Canto.ValeCuatro];
                default: return [];
            }
        }
       // Si no hay canto o el último fue NoQuiero, etc.
       return [];
   }

   private getPosiblesRespuestasTruco(): Canto[] {
       // Solo puede responder si es su turno y debe responder truco
       if (!this.equipoDebeResponderTruco || this.equipoEnTurno !== this.equipoDebeResponderTruco) return [];

       const ultimo = getLast(this.cantosTruco.filter(c => !this.esRespuesta(c.canto)))?.canto;
       const respuestas: Canto[] = [Canto.Quiero, Canto.NoQuiero];
       if (!ultimo) return []; // No debería pasar

       switch(ultimo) {
           case Canto.Truco: respuestas.push(Canto.ReTruco); break;
           case Canto.ReTruco: respuestas.push(Canto.ValeCuatro); break;
       }
       return respuestas;
   }

   // --- Handlers para acciones del Humano (reciben llamada desde Partida) ---

   /** Procesa la jugada de carta del humano */
   public handleHumanPlayCard(carta: Naipe): void { // <-- Acepta Naipe
    this.registrarJugada(carta, this.equipoEnTurno); // Llama a registrarJugada modificado
    // Ya no necesita validar aquí, registrarJugada lo hace.
    // Si la jugada es válida, el flujo continuará automáticamente.
    // Si no es válida, registrarJugada mostrará mensaje y no continuará.
    this.continuarFlujo(); // <--- IMPORTANTE: Continuar el flujo después de la acción humana
}

/** Procesa el canto/respuesta del humano */
public handleHumanCanto(canto: Canto): void { // <-- Sin cambios en la firma
    let accionValida = false;
    // Determinar si es un canto inicial o una respuesta y si es válido
   if (this.equipoDebeResponderEnvido === this.equipoEnTurno && this.calcularAccionesPosiblesParaRespuestaEnvido().puedeResponder.includes(canto)) {
       this.registrarRespuesta(canto, this.equipoEnTurno);
       accionValida = true;
   } else if (this.equipoDebeResponderTruco === this.equipoEnTurno && this.calcularAccionesPosiblesParaRespuestaTruco().puedeResponder.includes(canto)) {
        this.registrarRespuesta(canto, this.equipoEnTurno);
        accionValida = true;
   } else if (this.calcularAccionesPosiblesParaTurno().puedeCantarEnvido.includes(canto) ||
              this.calcularAccionesPosiblesParaTurno().puedeCantarTruco.includes(canto) ||
              (canto === Canto.IrAlMazo && this.calcularAccionesPosiblesParaTurno().puedeMazo)) {
       this.registrarCanto(canto, this.equipoEnTurno);
       accionValida = true;
   } else {
       console.warn(`Intento de canto/respuesta humano inválido: ${canto} en estado ${EstadoRonda[this.estadoRonda]}`);
       this.callbacks.displayLog(`No puedes ${this.cantoToString(canto)} ahora.`);
       // No continuar flujo si la acción no fue válida
       return;
   }

   // Si la acción fue válida, continuar el flujo
   if(accionValida) {
        this.continuarFlujo(); // <--- IMPORTANTE: Continuar el flujo después de la acción humana
   }
}

    /** Permite a Partida actualizar el modo debug */
    public setDebugMode(activado: boolean): void {
        this.debugMode = activado;
    }
}