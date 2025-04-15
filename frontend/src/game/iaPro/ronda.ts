import { Jugador } from './jugador';
import { IA } from './ia'; // Importar IA
import { Naipe } from './naipe';
import { Canto, Equipo, PuntosEnvido, PuntosTruco, Palo , AccionesPosibles} from './types';
import { getRandomInt, shuffleArray, getLast } from './utils'; // Importar utils
import { EnvidoContext, TrucoContext } from './ia-context'; // Importar contexto de Envido
import { GameCallbacks } from '../game-callbacks';

// Define estados más explícitos para la ronda
enum EstadoRonda {
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
    private equipoMano: Equipo;
    private equipoPie: Equipo;
    private equipoEnTurno: Equipo;
    private limitePuntaje: number;
    private debugMode: boolean;

    // Estado Envido
    private cantosEnvido: { canto: Canto, equipo: Equipo }[] = [];
    private equipoDebeResponderEnvido: Equipo | null = null;
    private envidoResuelto: boolean = false;
    private puntosEnvidoGanados: number = 0; // Puntos ganados por el envido en esta ronda

    // Estado Truco
    private cantosTruco: { canto: Canto, equipo: Equipo }[] = [];
    private equipoDebeResponderTruco: Equipo | null = null;
    private trucoResuelto: boolean = false; // Si se dijo Quiero/NoQuiero
    private trucoNoQueridoPor: Equipo | null = null;
    private puntosTrucoGanados: number = 0; // Puntos ganados por el truco en esta ronda

    // Cartas jugadas en la mesa (para fácil acceso)
    private cartasMesa: (Naipe | null)[] = [null, null, null, null, null, null]; // [J1M0, J2M0, J1M1, J2M1, J1M2, J2M2]

    // Callbacks
    private onRondaTerminada: (puntosEq1: number, puntosEq2: number) => void; // Callback para Partida
    private callbacks: GameCallbacks; // Callbacks para la UI (React)

    constructor(
        public equipoPrimero: Equipo,
        public equipoSegundo: Equipo,
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


    /** Motor principal de estados de la ronda */
    private continuarFlujo(enEsperaHumano: boolean = false): void {
        console.log("continuarFlujo", this)

        if (enEsperaHumano) {
            // Se detiene aquí, esperando la acción del humano que será gatillada por la UI
            return;
        }

        // Bucle para procesar automáticamente hasta necesitar input humano o terminar
        while (this.estadoRonda !== EstadoRonda.RondaTerminada) {

            // Notificar a React quién tiene el turno ANTES de procesar el estado
            this.callbacks.setTurno(this.equipoEnTurno);

            if (this.debugMode) {
                this.callbacks.displayLog(`Debug: Estado=${EstadoRonda[this.estadoRonda]}, Turno=${this.equipoEnTurno.jugador.nombre}, Mano=${this.numeroDeMano}, Jugada=${this.jugadasEnMano}`);
            }

            switch (this.estadoRonda) {
                case EstadoRonda.InicioMano:
                case EstadoRonda.EsperandoJugadaNormal:
                    if (this.equipoEnTurno.jugador.esHumano) {
                        this.gestionarTurnoNormal();
                        return; // Esperar input del humano
                    } else {
                        this.gestionarTurnoNormal(); // La IA realiza su acción
                    }
                    break;

                case EstadoRonda.EsperandoRespuestaEnvido:
                    this.gestionarRespuestaEnvido();
                    return; // Salir del bucle

                case EstadoRonda.EsperandoRespuestaTruco:
                    this.gestionarRespuestaTruco();
                    return; // Salir del bucle

                case EstadoRonda.ManoTerminada:
                    this.resolverManoActual(); // Determina ganador, actualiza contadores, cambia turno
                    const ganadorRonda = this.determinarGanadorRonda(); // Verifica si la ronda terminó

                    if (ganadorRonda !== null) {
                        this.estadoRonda = EstadoRonda.RondaTerminada;
                        continue; // Procesar fin de ronda
                    } else {
                        // Iniciar siguiente mano
                        this.numeroDeMano++;
                        this.callbacks.setNumeroMano(this.numeroDeMano);
                        this.jugadasEnMano = 0;
                        this.cartasMesa = Array(6).fill(null);
                        this.callbacks.clearPlayedCards(); // Limpiar mesa visual
                        this.estadoRonda = EstadoRonda.InicioMano;
                        this.puedeEnvido = false; // Ya no se puede envido
                        // El turno ya se estableció en resolverManoActual
                        // Notificar turno de nuevo por si acaso? No, ya se hará al inicio del loop
                        continue; // Procesar inicio de la nueva mano
                    }

                default:
                    console.error("Estado de ronda desconocido:", this.estadoRonda);
                    this.estadoRonda = EstadoRonda.RondaTerminada; // Forzar fin en caso de error
                    continue;

            } // Fin switch
        } // Fin while

        // Si el bucle terminó porque estadoRonda es RondaTerminada
        if (this.estadoRonda === EstadoRonda.RondaTerminada) {
            this.finalizarRonda();
        }
    }
    

   /** Gestiona el turno normal: jugar carta o iniciar un canto */
   private gestionarTurnoNormal(): void {
    const jugadorActual = this.equipoEnTurno.jugador;

    if (jugadorActual.esHumano) {
        const acciones = this.calcularAccionesPosiblesParaTurno();
        this.callbacks.actualizarAccionesPosibles(acciones); // Informar a React qué puede hacer
        this.continuarFlujo(true); // Esperar input del usuario
    } else {
        // Deshabilitar acciones humanas mientras IA "piensa"
         this.callbacks.actualizarAccionesPosibles({ puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false });

        // --- Lógica de Decisión IA ---
        const ia = jugadorActual as IA;
        let accionRealizada = false;

        // 1. Decidir si cantar Envido (si es posible)
        if (this.puedeEnvido && !this.envidoResuelto && this.getPosiblesCantosEnvido().length > 0) {
            const contextoEnvido = this.crearContextoEnvido(ia);
            const cantoEnvidoIA = ia.envido(contextoEnvido);
            if (cantoEnvidoIA !== Canto.Paso) {
                this.registrarCanto(cantoEnvidoIA, this.equipoEnTurno);
                accionRealizada = true;
            }
        }

        // 2. Decidir si cantar Truco (si no cantó envido y es posible)
        if (!accionRealizada && this.getPosiblesCantosTruco().length > 0) { // Usa el getter para validar
            const contextoTruco = this.crearContextoTruco(ia);
            const cantoTrucoIA = ia.truco(false, contextoTruco); // false = no está respondiendo
            if (cantoTrucoIA !== Canto.Paso && this.getPosiblesCantosTruco().includes(cantoTrucoIA)) { // Doble check
                this.registrarCanto(cantoTrucoIA, this.equipoEnTurno);
                accionRealizada = true;
            }
        }

        // 3. Jugar Carta (si no cantó nada)
        if (!accionRealizada) {
            // Asegurarse que realmente puede jugar carta (debería si está en este estado)
            if (this.calcularAccionesPosiblesParaTurno().puedeJugarCarta) {
                 const cartaJugada = ia.jugarCarta(this); // IA actualiza su propia mano y devuelve la carta
                 this.registrarJugada(cartaJugada, this.equipoEnTurno);
                 accionRealizada = true;
            } else {
                console.error(`Error: IA ${ia.nombre} intentó jugar carta pero no era posible según el estado.`);
                // TODO: ¿Qué hacer aquí? ¿Forzar fin de ronda? ¿Pasar turno?
                // Por ahora, loguear y continuar podría causar un bucle. Mejor finalizar.
                 this.estadoRonda = EstadoRonda.RondaTerminada; // Forzar fin
            }
        }
        // --- Fin Lógica IA ---

        // Continuar flujo después de un breve delay para simular pensamiento IA
         if(this.estadoRonda !== EstadoRonda.RondaTerminada) { // Solo si no se forzó el fin
            setTimeout(() => this.continuarFlujo(), 1000);
         } else {
             setTimeout(() => this.continuarFlujo(), 100); // Si se forzó fin, procesar rápido
         }
    }
}

    /** Gestiona la espera de una respuesta al Envido */
    private gestionarRespuestaEnvido(): void {
        if (!this.equipoDebeResponderEnvido) {
            console.error("Error: gestionando respuesta envido sin equipo que deba responder.");
            this.estadoRonda = EstadoRonda.EsperandoJugadaNormal; // Intentar recuperar
            this.continuarFlujo();
            return;
        }
        const jugadorResponde = this.equipoDebeResponderEnvido.jugador;

        if (jugadorResponde.esHumano) {
            const acciones = this.calcularAccionesPosiblesParaRespuestaEnvido();
            this.callbacks.actualizarAccionesPosibles(acciones);
            this.continuarFlujo(true); // Esperar input
        } else {
             // Deshabilitar acciones humanas mientras IA responde
             this.callbacks.actualizarAccionesPosibles({ puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false });

            const ia = jugadorResponde as IA;
            const contextoEnvido = this.crearContextoEnvido(ia);
            let respuestaIA = ia.envido(contextoEnvido); // true = está respondiendo

             // Validar que la respuesta sea posible
             const accionesPosiblesIA = this.getPosiblesRespuestasEnvido();
             if (!accionesPosiblesIA.includes(respuestaIA) && respuestaIA !== Canto.Paso) {
                 console.warn(`IA ${ia.nombre} intentó respuesta inválida de Envido (${respuestaIA}). Forzando NoQuiero.`);
                 respuestaIA = Canto.NoQuiero;
             }
             if (respuestaIA === Canto.Paso) { // IA no encontró canto/respuesta válida
                 respuestaIA = Canto.NoQuiero; // Default a no querer si pasa
             }

            this.registrarRespuesta(respuestaIA, this.equipoDebeResponderEnvido);

            setTimeout(() => this.continuarFlujo(), 1000);
        }
    }

    /** Gestiona la espera de una respuesta al Truco */
    private gestionarRespuestaTruco(): void {
         if (!this.equipoDebeResponderTruco) {
            console.error("Error: gestionando respuesta truco sin equipo que deba responder.");
            this.estadoRonda = EstadoRonda.EsperandoJugadaNormal; // Intentar recuperar
            this.continuarFlujo();
            return;
        }
        const jugadorResponde = this.equipoDebeResponderTruco.jugador;

        if (jugadorResponde.esHumano) {
            const acciones = this.calcularAccionesPosiblesParaRespuestaTruco();
            this.callbacks.actualizarAccionesPosibles(acciones);
            this.continuarFlujo(true); // Esperar input
        } else {
            // Deshabilitar acciones humanas mientras IA responde
            this.callbacks.actualizarAccionesPosibles({ puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false });

            const ia = jugadorResponde as IA;
            const contextoTruco = this.crearContextoTruco(ia);
            let respuestaIA = ia.truco(true, contextoTruco); // true = está respondiendo

             // Validar que la respuesta sea posible
             const accionesPosiblesIA = this.getPosiblesRespuestasTruco();
             if (!accionesPosiblesIA.includes(respuestaIA) && respuestaIA !== Canto.Paso) {
                 console.warn(`IA ${ia.nombre} intentó respuesta inválida de Truco (${respuestaIA}). Forzando NoQuiero.`);
                 respuestaIA = Canto.NoQuiero;
             }
             if (respuestaIA === Canto.Paso) { // IA no encontró canto/respuesta válida
                 respuestaIA = Canto.NoQuiero; // Default a no querer si pasa
             }

            this.registrarRespuesta(respuestaIA, this.equipoDebeResponderTruco);

            setTimeout(() => this.continuarFlujo(), 1000);
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

        this.callbacks.showPlayerCall(equipoQueCanta.jugador, this.cantoToString(canto));

        if (esEnvido) {
            // Validar si realmente puede cantar envido (doble check)
            if (!this.getPosiblesCantosEnvido().includes(canto) && !this.getPosiblesRespuestasEnvido().includes(canto)) {
                 console.warn(`Canto/Respuesta Envido inválido ${canto} registrado por ${equipoQueCanta.jugador.nombre}`);
                 return; // No registrar canto inválido
            }
            this.cantosEnvido.push({ canto, equipo: equipoQueCanta });
            this.equipoDebeResponderEnvido = this.getOponente(equipoQueCanta);
            this.equipoDebeResponderTruco = null; // Envido interrumpe Truco pendiente
            // this.puedeEnvido = false; // Se setea en jugar carta o resolver envido
            this.estadoRonda = EstadoRonda.EsperandoRespuestaEnvido;
            this.equipoEnTurno = this.equipoDebeResponderEnvido; // Turno pasa a quien responde

        } else if (esTruco) {
             // Validar si realmente puede cantar truco (doble check)
            if (!this.getPosiblesCantosTruco().includes(canto) && !this.getPosiblesRespuestasTruco().includes(canto)) {
                console.warn(`Canto/Respuesta Truco inválido ${canto} registrado por ${equipoQueCanta.jugador.nombre}`);
                return; // No registrar canto inválido
            }
            this.cantosTruco.push({ canto, equipo: equipoQueCanta });
            this.equipoDebeResponderTruco = this.getOponente(equipoQueCanta);
            this.equipoDebeResponderEnvido = null; // Truco interrumpe Envido pendiente? No, al revés.
            this.estadoRonda = EstadoRonda.EsperandoRespuestaTruco;
            this.equipoEnTurno = this.equipoDebeResponderTruco; // Turno pasa a quien responde

        } else if (canto === Canto.IrAlMazo) {
            this.trucoNoQueridoPor = equipoQueCanta;
            this.puntosTrucoGanados = this.calcularPuntosTruco().noQuerido; // Calcular puntos del estado actual
            this.estadoRonda = EstadoRonda.RondaTerminada; // Termina inmediatamente
            // Los puntos del envido ya deberían estar acumulados si se jugó
        }
        // El flujo continuará y seteará el turno y acciones correctas
    }

    private registrarRespuesta(respuesta: Canto, equipoQueResponde: Equipo): void {
        const esRespuestaSN = this.esRespuesta(respuesta);
        this.callbacks.showPlayerCall(equipoQueResponde.jugador, this.cantoToString(respuesta));

        if (this.equipoDebeResponderEnvido === equipoQueResponde) {
            // Validar respuesta
            if (!this.getPosiblesRespuestasEnvido().includes(respuesta)) {
                console.warn(`Respuesta Envido inválida ${respuesta} registrada por ${equipoQueResponde.jugador.nombre}`);
                return;
            }

            this.cantosEnvido.push({ canto: respuesta, equipo: equipoQueResponde });
            this.equipoDebeResponderEnvido = null; // Ya no se espera respuesta a este nivel

            if (esRespuestaSN) {
                this.resolverEnvido(respuesta === Canto.Quiero); // Resuelve y acumula puntos envido
                this.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
                // El turno vuelve a quien cantó originalmente para que juegue su carta
                this.equipoEnTurno = this.getOponente(equipoQueResponde);
            } else { // Fue un contra-canto (EE, R, F)
                this.equipoDebeResponderEnvido = this.getOponente(equipoQueResponde); // Ahora responde el otro
                this.estadoRonda = EstadoRonda.EsperandoRespuestaEnvido;
                this.equipoEnTurno = this.equipoDebeResponderEnvido; // Turno pasa al que debe responder
            }

        } else if (this.equipoDebeResponderTruco === equipoQueResponde) {
             // Validar respuesta
            if (!this.getPosiblesRespuestasTruco().includes(respuesta)) {
                 console.warn(`Respuesta Truco inválida ${respuesta} registrada por ${equipoQueResponde.jugador.nombre}`);
                 return;
            }

            this.cantosTruco.push({ canto: respuesta, equipo: equipoQueResponde });
            this.equipoDebeResponderTruco = null; // Ya no se espera respuesta a este nivel

            if (esRespuestaSN) {
                this.resolverTruco(respuesta === Canto.Quiero); // Puede terminar la ronda si es NoQuiero
                // Si fue Quiero, el juego sigue
                if (this.estadoRonda !== EstadoRonda.RondaTerminada) {
                    this.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
                    // Turno pasa a quien respondió (para jugar o escalar)
                    this.equipoEnTurno = equipoQueResponde;
                }
            } else { // Fue un contra-canto (RT, V4)
                this.equipoDebeResponderTruco = this.getOponente(equipoQueResponde); // Ahora responde el otro
                this.estadoRonda = EstadoRonda.EsperandoRespuestaTruco;
                this.equipoEnTurno = this.equipoDebeResponderTruco; // Turno pasa al que debe responder
            }
        } else {
            console.error("Error: Se registró respuesta sin equipo que deba responder.");
        }
         // El flujo continuará y seteará el turno y acciones correctas
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

        // --- Lógica de Registro ---
        // Calcular índice en la mesa
        const playerIndex = equipoQueJuega === this.equipoPrimero ? 0 : 1;
        const mesaIndex = this.numeroDeMano * 2 + playerIndex;
        // const mesaIndex = this.numeroDeMano * 2 + (this.jugadasEnMano); // Corrección: índice por jugada

        if (mesaIndex >= this.cartasMesa.length) {
            console.error(`Error: Índice de mesa inválido ${mesaIndex}`);
            return;
        }
        this.cartasMesa[mesaIndex] = carta;
        equipoQueJuega.jugador.cartasJugadasRonda.push(carta); // Crucial para IA

        // --- Notificar a la UI ---
        this.callbacks.displayPlayedCard(equipoQueJuega.jugador, carta, this.numeroDeMano, this.jugadasEnMano);
        // Si jugó el humano, actualizar su mano visualmente (ya lo hizo al clickear, pero por si acaso)
        if (equipoQueJuega.jugador.esHumano) {
            this.callbacks.displayPlayerCards(equipoQueJuega.jugador);
        }
        // -------------------------

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

        // El estado vuelve a normal para la siguiente jugada o fin de mano
        this.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
        // El flujo continuará y seteará el turno y acciones correctas
    }

     // --- Métodos de Resolución ---

     // --- Métodos de Resolución (usan callbacks) ---

    private resolverManoActual(): void {
        // Asegurarse que se jugaron ambas cartas de la mano
        // Los índices dependen de quién fue mano/pie en la ronda
        const indiceMano = this.equipoMano === this.equipoPrimero ? 0 : 1;
        const indicePie = this.equipoPie === this.equipoPrimero ? 0 : 1;
        const cartaMano = this.cartasMesa[this.numeroDeMano * 2 + indiceMano];
        const cartaPie = this.cartasMesa[this.numeroDeMano * 2 + indicePie];

        let ganadorManoEquipo: Equipo | null = null;
        let cartaGanadora: Naipe | null = null;
        let jugadorGanador: Jugador | null = null;
        let jugadaGanadoraIndex = -1; // 0 si la jugó el mano, 1 si la jugó el pie

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
            jugadaGanadoraIndex = 0; // Mano jugó la ganadora
        } else if (cartaPie.valor > cartaMano.valor) {
            ganadorManoEquipo = this.equipoPie;
            cartaGanadora = cartaPie;
            jugadorGanador = this.equipoPie.jugador;
            jugadaGanadoraIndex = 1; // Pie jugó la ganadora
        } else { // Parda
            ganadorManoEquipo = null; // Nadie gana la mano
            this.callbacks.displayLog(`Mano ${this.numeroDeMano + 1}: Parda`);
            this.equipoEnTurno = this.equipoMano; // En parda, empieza el mano de la ronda
            return; // Salir, no hay highlight ni cambio de turno basado en ganador
        }

        // Si hubo ganador de la mano
        this.callbacks.displayLog(`Mano ${this.numeroDeMano + 1}: Gana ${ganadorManoEquipo.jugador.nombre} (${cartaGanadora.getNombre()})`);
        ganadorManoEquipo.manosGanadasRonda++;
        this.equipoEnTurno = ganadorManoEquipo; // El ganador empieza la siguiente mano

        // --- Callback opcional para highlight ---
        if (this.callbacks.highlightWinningCard && jugadorGanador && cartaGanadora) {
            // Necesitamos saber qué jugada fue (0 o 1 en la mano actual)
             // La jugada 0 es del mano, la 1 del pie.
            this.callbacks.highlightWinningCard(jugadorGanador, this.numeroDeMano, jugadaGanadoraIndex);
        }
        // ---------------------------------------
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
        // this.equipoDebeResponderEnvido = null; // Se hace en registrarRespuesta

        const puntosCalculados = this.calcularPuntosEnvido();
        let equipoGanador: Equipo | null = null;
        let puntosOtorgados = 0;
        let puntosOponenteSiQuerido: number | null = null; // Para stats IA

        if (querido) {
            const pMano = this.equipoMano.jugador.getPuntosDeEnvido(this.equipoMano.jugador.cartas);
            const pPie = this.equipoPie.jugador.getPuntosDeEnvido(this.equipoPie.jugador.cartas);

            // Mostrar puntos de ambos
            this.callbacks.showPlayerCall(this.equipoMano.jugador, `${this.cantoToString(pMano)}`);
            // Pausa breve para que se vean ambos cantos
            setTimeout(() => {
                 this.callbacks.showPlayerCall(this.equipoPie.jugador, `${this.cantoToString(pPie)}`);
            }, 600);


            if (pMano >= pPie) { // Gana mano (o empata)
                equipoGanador = this.equipoMano;
                puntosOtorgados = puntosCalculados.ganador;
                puntosOponenteSiQuerido = pPie; // Puntos del perdedor
            } else { // Gana pie
                equipoGanador = this.equipoPie;
                puntosOtorgados = puntosCalculados.ganador;
                puntosOponenteSiQuerido = pMano; // Puntos del perdedor
            }

            // Registrar stats en la IA perdedora
             const equipoPerdedor = (equipoGanador === this.equipoPrimero) ? this.equipoSegundo : this.equipoPrimero;
             if (!equipoPerdedor.jugador.esHumano && equipoPerdedor.jugador instanceof IA) {
                 // Pasar los puntos del *ganador* a la IA perdedora para stats
                  const puntosGanador = equipoGanador === this.equipoMano ? pMano : pPie;
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
            equipoGanador.jugador.puntosGanadosEnvidoRonda = puntosOtorgados; // Guardar para contexto Truco IA
            // Acumular puntos para el final de la ronda
            if(equipoGanador === this.equipoPrimero) this.puntosEnvidoGanados += puntosOtorgados;
            else this.puntosEnvidoGanados += puntosOtorgados; // Error, debe ser por equipo
            // Corrección:
             this.puntosEnvidoGanados = puntosOtorgados; // Solo puede haber un ganador de envido
             // Al final, se asignarán al equipo correcto.
        }
        // No cambia estadoRonda aquí, se maneja en registrarRespuesta/continuarFlujo
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
        this.trucoResuelto = true; // Marca que se respondió al último canto
        // this.equipoDebeResponderTruco = null; // Se hace en registrarRespuesta

        if (!querido) {
            const equipoQueRespondio = getLast(this.cantosTruco)?.equipo ?? null;
            if (equipoQueRespondio) {
                this.trucoNoQueridoPor = equipoQueRespondio;
                this.puntosTrucoGanados = this.calcularPuntosTruco().noQuerido; // Calcular puntos del estado actual
                this.estadoRonda = EstadoRonda.RondaTerminada; // Termina la ronda
            } else { console.error("Error: Truco No Querido sin respuesta previa?"); }
        }
        // Si fue querido, el juego simplemente continúa. Los puntos se calculan al final.
        // No cambia estadoRonda aquí, se maneja en registrarRespuesta/continuarFlujo
    }


     /** Determina si hay un ganador de la ronda */
     private determinarGanadorRonda(): Equipo | null {
        const e1 = this.equipoPrimero;
        const e2 = this.equipoSegundo;

        // El primero en ganar 2 manos gana
        if (e1.manosGanadasRonda >= 2) return e1;
        if (e2.manosGanadasRonda >= 2) return e2;

        // Si se jugaron las 3 manos (numeroDeMano llega a 2 y se resuelve)
        if (this.numeroDeMano >= 2 && this.jugadasEnMano === 0) { // Mano 2 resuelta, no hay más jugadas
            // Si ambos tienen 1 mano ganada, gana el mano de la ronda
            if (e1.manosGanadasRonda === 1 && e2.manosGanadasRonda === 1) {
                return this.equipoMano;
            }
            // Si uno tiene más manos ganadas, gana ese equipo
            if (e1.manosGanadasRonda > e2.manosGanadasRonda) return e1;
            if (e2.manosGanadasRonda > e1.manosGanadasRonda) return e2;
            // Si ambos tienen 0 manos ganadas (3 pardas), gana el mano de la ronda
            if (e1.manosGanadasRonda === 0 && e2.manosGanadasRonda === 0) {
                return this.equipoMano;
            }
        }

        return null; // No hay ganador aún
     }

     private finalizarRonda(): void {
        this.estadoRonda = EstadoRonda.RondaTerminada; // Asegurar estado final

        // Deshabilitar acciones en la UI
        this.callbacks.actualizarAccionesPosibles({ puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false });

        let ganadorRondaEquipo: Equipo | null = null;
        let puntosGanadosTruco = 0;
        let puntosGanadosEnvidoTotal = this.puntosEnvidoGanados; // Usar el valor acumulado en resolverEnvido

        // Determinar ganador y puntos del truco
        if (this.trucoNoQueridoPor) {
            ganadorRondaEquipo = this.getOponente(this.trucoNoQueridoPor);
            puntosGanadosTruco = this.puntosTrucoGanados; // Ya se calcularon al no querer/mazo
            this.callbacks.displayLog(`Ronda: ${ganadorRondaEquipo.jugador.nombre} gana ${puntosGanadosTruco}pts (No Querido / Mazo)`);
        } else {
            ganadorRondaEquipo = this.determinarGanadorRonda();
            if (ganadorRondaEquipo) {
                puntosGanadosTruco = this.calcularPuntosTruco().querido; // Calcular puntos del truco querido
                this.callbacks.displayLog(`Ronda: ${ganadorRondaEquipo.jugador.nombre} gana ${puntosGanadosTruco}pts (Truco)`);
                if (this.callbacks.displayRoundWinner) {
                    this.callbacks.displayRoundWinner(ganadorRondaEquipo.jugador.nombre);
                }
            } else {
                this.callbacks.displayLog(`Ronda: EMPATE (No debería pasar con la lógica actual)`);
                 ganadorRondaEquipo = this.equipoMano; // Desempate por mano si algo falla
                 puntosGanadosTruco = 1; // Dar 1 punto por defecto?
            }
        }

        // Calcular puntos totales para cada equipo
        let puntosEq1 = (ganadorRondaEquipo === this.equipoPrimero) ? puntosGanadosTruco : 0;
        let puntosEq2 = (ganadorRondaEquipo === this.equipoSegundo) ? puntosGanadosTruco : 0;

        // Sumar puntos del envido al equipo correcto
        // Necesitamos saber quién ganó el envido para asignar correctamente
         if (this.equipoPrimero.jugador.puntosGanadosEnvidoRonda > 0) {
             puntosEq1 += this.equipoPrimero.jugador.puntosGanadosEnvidoRonda;
         }
         if (this.equipoSegundo.jugador.puntosGanadosEnvidoRonda > 0) {
             puntosEq2 += this.equipoSegundo.jugador.puntosGanadosEnvidoRonda;
         }


        // Notificar a Partida con los puntos finales de la ronda
        setTimeout(() => {
            this.onRondaTerminada(puntosEq1, puntosEq2);
        }, 1500); // Pausa para que se vea el resultado
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

   public handleHumanPlayCard(indiceCarta: number): void {
       // La validación de turno y estado se hace aquí dentro
       this.registrarJugada(this.equipoEnTurno.jugador.cartasEnMano[indiceCarta], this.equipoEnTurno); // Llama a registrarJugada
       // La lógica interna de registrarJugada valida turno y estado
       // Si la jugada es válida, el flujo continuará automáticamente
   }

   public handleHumanCanto(canto: Canto): void {
       // Determinar si es un canto inicial o una respuesta
       if (this.equipoDebeResponderEnvido === this.equipoEnTurno && this.calcularAccionesPosiblesParaRespuestaEnvido().puedeResponder.includes(canto)) {
           this.registrarRespuesta(canto, this.equipoEnTurno);
       } else if (this.equipoDebeResponderTruco === this.equipoEnTurno && this.calcularAccionesPosiblesParaRespuestaTruco().puedeResponder.includes(canto)) {
            this.registrarRespuesta(canto, this.equipoEnTurno);
       } else if (this.calcularAccionesPosiblesParaTurno().puedeCantarEnvido.includes(canto) ||
                  this.calcularAccionesPosiblesParaTurno().puedeCantarTruco.includes(canto) ||
                  (canto === Canto.IrAlMazo && this.calcularAccionesPosiblesParaTurno().puedeMazo)) {
           this.registrarCanto(canto, this.equipoEnTurno);
       } else {
           console.warn(`Intento de canto/respuesta humano inválido: ${canto} en estado ${EstadoRonda[this.estadoRonda]}`);
           this.callbacks.displayLog(`No puedes ${this.cantoToString(canto)} ahora.`);
           // No continuar flujo si la acción no fue válida
           return;
       }
       // Si la acción fue válida, continuar el flujo
       this.continuarFlujo();
   }

    /** Permite a Partida actualizar el modo debug */
    public setDebugMode(activado: boolean): void {
        this.debugMode = activado;
    }
}