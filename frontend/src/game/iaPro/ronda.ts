import { Jugador } from './jugador';
import { IA } from './ia'; // Importar IA
import { Naipe } from './naipe';
import { Canto, Equipo, PuntosEnvido, PuntosTruco, Palo , AccionesPosibles} from './types';
import { UIHandler } from './ui';
import { getRandomInt, shuffleArray, getLast } from './utils'; // Importar utils
import { EnvidoContext, TrucoContext } from './ia-context'; // Importar contexto de Envido

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

    constructor(
        public equipoPrimero: Equipo, // Humano
        public equipoSegundo: Equipo, // IA
        public ui: UIHandler,
        private onRondaTerminada: (puntosEq1: number, puntosEq2: number) => void,
        limitePuntaje: number = 15,
        debugMode: boolean = false
    ) {
        this.limitePuntaje = limitePuntaje;
        this.debugMode = debugMode;

        // Determinar quién es mano y pie para esta ronda
        if (equipoPrimero.esMano) {
            this.equipoMano = equipoPrimero;
            this.equipoPie = equipoSegundo;
        } else {
            this.equipoMano = equipoSegundo;
            this.equipoPie = equipoPrimero;
        }
        this.equipoEnTurno = this.equipoMano; // Siempre empieza el mano
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

    // --- Lógica Principal de la Ronda ---

    /** Inicia la ronda: reparte cartas y comienza el flujo */
    public iniciar(): void {
        this.ui.displayLog("-- Nueva Ronda --");
        // Preparar jugadores
        this.equipoPrimero.jugador.nuevaRonda();
        this.equipoSegundo.jugador.nuevaRonda();
        this.equipoPrimero.manosGanadasRonda = 0;
        this.equipoSegundo.manosGanadasRonda = 0;

        this.repartirCartas();

        this.ui.displayPlayerCards(this.equipoPrimero.jugador);
        this.ui.displayPlayerCards(this.equipoSegundo.jugador);
        this.ui.clearPlayedCards();

        if (this.debugMode) {
             this.ui.displayLog(`Debug: Mano=${this.equipoMano.jugador.nombre}, Pie=${this.equipoPie.jugador.nombre}`);
             this.ui.displayLog(`Debug: ${this.equipoPrimero.jugador.nombre} Envido=${this.equipoPrimero.jugador.getPuntosDeEnvido(this.equipoPrimero.jugador.cartas)}`);
             this.ui.displayLog(`Debug: ${this.equipoSegundo.jugador.nombre} Envido=${this.equipoSegundo.jugador.getPuntosDeEnvido(this.equipoSegundo.jugador.cartas)}`);
        }

        this.estadoRonda = EstadoRonda.InicioMano;
        this.continuarFlujo();
    }

    /** Reparte 3 cartas a cada jugador */
    private repartirCartas(): void {
        const baraja = Naipe.generarBarajaCompleta();
        shuffleArray(baraja); // Barajar

        const cartasJ1: Naipe[] = [];
        const cartasJ2: Naipe[] = [];

        // Repartir alternando (normalmente empieza el pie a recibir)
        for (let i = 0; i < 6; i++) {
            const carta = baraja.pop(); // Sacar del final
            if (!carta) throw new Error("Error al repartir, mazo vacío inesperadamente.");

            // Asumiendo que equipoPie recibe primero impar, equipoMano par
            if (i % 2 === 0) { // Cartas 1, 3, 5
                if (this.equipoPie === this.equipoPrimero) cartasJ1.push(carta);
                else cartasJ2.push(carta);
            } else { // Cartas 2, 4, 6
                if (this.equipoMano === this.equipoPrimero) cartasJ1.push(carta);
                else cartasJ2.push(carta);
            }
        }

        this.equipoPrimero.jugador.cartas = cartasJ1;
        this.equipoPrimero.jugador.cartasEnMano = [...cartasJ1]; // Copia para poder modificarla
        this.equipoSegundo.jugador.cartas = cartasJ2;
        this.equipoSegundo.jugador.cartasEnMano = [...cartasJ2]; // Copia para poder modificarla

        if (this.debugMode) {
            this.ui.displayLog(`Debug Cartas ${this.equipoPrimero.jugador.nombre}: ${cartasJ1.map(c => c.getNombre()).join(', ')}`);
            this.ui.displayLog(`Debug Cartas ${this.equipoSegundo.jugador.nombre}: ${cartasJ2.map(c => c.getNombre()).join(', ')}`);
        }
    }


    /** Motor de estados de la ronda */
    private continuarFlujo(enEsperaHumano: boolean = false): void {
        if (enEsperaHumano) {
            // El flujo se detiene aquí, esperando la acción del humano vía UI -> handleHuman...
            return;
        }

        // Bucle para procesar estados hasta esperar humano o terminar ronda
        while (this.estadoRonda !== EstadoRonda.RondaTerminada) {
            if (this.debugMode) this.ui.displayLog(`Debug: Estado Ronda = ${EstadoRonda[this.estadoRonda]}, Turno = ${this.equipoEnTurno.jugador.nombre}`);

            switch (this.estadoRonda) {
                case EstadoRonda.InicioMano:
                case EstadoRonda.EsperandoJugadaNormal:
                    // ¿Se terminó la mano actual?
                    if (this.jugadasEnMano === 2) {
                         this.estadoRonda = EstadoRonda.ManoTerminada;
                         continue; // Volver al inicio del while para procesar ManoTerminada
                    }
                     // ¿Hay respuesta pendiente? (Si sí, no debería estar en este estado, pero chequear)
                    if (this.equipoDebeResponderEnvido) {
                         this.estadoRonda = EstadoRonda.EsperandoRespuestaEnvido;
                         continue;
                    }
                    if (this.equipoDebeResponderTruco) {
                         this.estadoRonda = EstadoRonda.EsperandoRespuestaTruco;
                         continue;
                    }
                     // Turno normal
                     this.gestionarTurnoNormal();
                     return; // Salir del while (espera humano o procesó IA)

                case EstadoRonda.EsperandoRespuestaEnvido:
                     this.gestionarRespuestaEnvido();
                     return; // Salir del while

                case EstadoRonda.EsperandoRespuestaTruco:
                     this.gestionarRespuestaTruco();
                     return; // Salir del while

                case EstadoRonda.ManoTerminada:
                     this.resolverManoActual(); // Determina ganador, actualiza manos, cambia turno
                     // ¿Terminó la ronda después de resolver la mano?
                     if (this.determinarGanadorRonda() !== null) {
                        this.estadoRonda = EstadoRonda.RondaTerminada;
                        continue; // Procesar fin de ronda
                     }
                     // Si no terminó la ronda, empieza la siguiente mano
                     this.numeroDeMano++;
                     this.jugadasEnMano = 0;
                     this.cartasMesa = [null, null, null, null, null, null]; // Limpiar mesa lógica para sig. mano
                     this.ui.clearPlayedCards(); // Limpiar mesa UI
                     this.estadoRonda = EstadoRonda.InicioMano; // Volver a empezar mano
                     this.puedeEnvido = false; // Ya no se puede envido después de la primera mano
                     continue; // Procesar inicio de la nueva mano
            } // Fin switch estadoRonda
        } // Fin while

        // Si llegamos aquí, la ronda terminó
        if (this.estadoRonda === EstadoRonda.RondaTerminada) {
            this.finalizarRonda();
        }
    }
    

    /** Gestiona el turno normal (jugar carta o cantar) */
    private gestionarTurnoNormal(): void {
        const jugadorActual = this.equipoEnTurno.jugador;

        if (jugadorActual.esHumano) {
            const acciones: AccionesPosibles = {
                puedeJugarCarta: true, // Siempre puede intentar jugar carta si es su turno normal
                puedeCantarEnvido: this.puedeEnvido ? this.getPosiblesCantosEnvido() : [],
                puedeCantarTruco: this.getPosiblesCantosTruco(),
                puedeResponder: [], // No está respondiendo en este estado
                puedeMazo: true // Generalmente puede irse al mazo
            };
            this.ui.actualizarAccionesPosibles(acciones); // Actualizar la UI con las acciones posibles
            this.continuarFlujo(true); // Esperar acción humana
        } else {
            // Lógica para la IA
            const ia = jugadorActual as IA;
            let accionRealizada = false;

            // 1. ¿Cantar Envido?
            if (this.puedeEnvido && !this.envidoResuelto) {
                const contextoEnvido = this.crearContextoEnvido(ia);
                const cantoEnvidoIA = ia.envido(contextoEnvido);
                if (cantoEnvidoIA !== Canto.Paso) {
                    this.registrarCanto(cantoEnvidoIA, this.equipoEnTurno);
                    accionRealizada = true;
                }
            }

            // 2. ¿Cantar Truco?
            if (!accionRealizada && this.puedeCantarTruco(this.equipoEnTurno)) {
                const contextoTruco = this.crearContextoTruco(ia); // Crear contexto
                const cantoTrucoIA = ia.truco(false, contextoTruco); // Pasar contexto
                if (cantoTrucoIA !== Canto.Paso) {
                    this.registrarCanto(cantoTrucoIA, this.equipoEnTurno);
                    accionRealizada = true;
                }
            }

            // 3. Jugar Carta
            if (!accionRealizada) {
                const cartaJugada = ia.jugarCarta(this);
                this.registrarJugada(cartaJugada, this.equipoEnTurno);
                accionRealizada = true;
            }

            if (accionRealizada) {
                setTimeout(() => this.continuarFlujo(), 1000); // Pausa para la IA
            }
        }
    }

    /** Gestiona la respuesta al Envido */
    private gestionarRespuestaEnvido(): void {
        if (!this.equipoDebeResponderEnvido) return;

        const jugadorResponde = this.equipoDebeResponderEnvido.jugador;

        if (jugadorResponde.esHumano) {
            const acciones: AccionesPosibles = {
                puedeJugarCarta: false, // No puede jugar carta mientras responde envido
                puedeCantarEnvido: [], // No puede iniciar otro canto de envido
                puedeCantarTruco: [], // No puede cantar truco mientras responde envido
                puedeResponder: this.getPosiblesRespuestasEnvido(), // Solo respuestas/contracantos de envido
                puedeMazo: true // Puede irse al mazo en lugar de responder
            };
            this.ui.actualizarAccionesPosibles(acciones); // Actualizar la UI con las acciones posibles
            this.continuarFlujo(true); // Esperar acción humana
        } else {
            const ia = jugadorResponde as IA;
            const contextoEnvido = this.crearContextoEnvido(ia);
            const respuestaIA = ia.envido(contextoEnvido);

            if (respuestaIA === Canto.Paso) {
                this.registrarRespuesta(Canto.NoQuiero, this.equipoDebeResponderEnvido);
            } else {
                this.registrarRespuesta(respuestaIA, this.equipoDebeResponderEnvido);
            }
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

    

     /** Gestiona la respuesta al Truco */
     private gestionarRespuestaTruco(): void {
         if (!this.equipoDebeResponderTruco) return;

         const jugadorResponde = this.equipoDebeResponderTruco.jugador;

         if (jugadorResponde.esHumano) {
             const acciones: AccionesPosibles = {
                 puedeJugarCarta: false, // No puede jugar carta mientras responde truco
                 puedeCantarEnvido: [], // No puede iniciar otro canto de envido
                 puedeCantarTruco: [], // No puede iniciar otro canto de truco
                 puedeResponder: this.getPosiblesRespuestasTruco(), // Solo respuestas/contracantos de truco
                 puedeMazo: true // Puede irse al mazo en lugar de responder
             };
             this.ui.actualizarAccionesPosibles(acciones); // Actualizar la UI con las acciones posibles
             this.continuarFlujo(true); // Esperar acción humana
         } else {
             const ia = jugadorResponde as IA;
             const contextoTruco = this.crearContextoTruco(ia); // Crear contexto
             const respuestaIA = ia.truco(true, contextoTruco); // Pasar contexto
             if (respuestaIA === Canto.Paso) {
                 this.registrarRespuesta(Canto.NoQuiero, this.equipoDebeResponderTruco);
             } else {
                 this.registrarRespuesta(respuestaIA, this.equipoDebeResponderTruco);
             }
             setTimeout(() => this.continuarFlujo(), 1000);
         }
     }

    // --- Métodos de Registro de Acciones ---

    /** Registra un canto (Envido o Truco inicial) */
    private registrarCanto(canto: Canto, equipoQueCanta: Equipo): void {
        const esEnvido = [Canto.Envido, Canto.RealEnvido, Canto.FaltaEnvido].includes(canto);
        const esTruco = [Canto.Truco, Canto.ReTruco, Canto.ValeCuatro].includes(canto);

        this.ui.showPlayerCall(equipoQueCanta.jugador, this.cantoToString(canto));

        if (esEnvido) {
            if (!this.puedeEnvido) return; // No deberia pasar si la UI está bien
            this.cantosEnvido.push({ canto, equipo: equipoQueCanta });
            this.equipoDebeResponderEnvido = this.getOponente(equipoQueCanta);
            this.equipoDebeResponderTruco = null; // Envido tiene prioridad
            this.puedeEnvido = false; // Solo se puede iniciar envido una vez (o hasta que se resuelva?) - REVISAR REGLA
            this.estadoRonda = EstadoRonda.EsperandoRespuestaEnvido;
        } else if (esTruco) {
             if (!this.puedeCantarTruco(equipoQueCanta)) return; // Validar
             this.cantosTruco.push({ canto, equipo: equipoQueCanta });
             this.equipoDebeResponderTruco = this.getOponente(equipoQueCanta);
             this.equipoDebeResponderEnvido = null;
             this.estadoRonda = EstadoRonda.EsperandoRespuestaTruco;
        } else if (canto === Canto.IrAlMazo) {
             this.trucoNoQueridoPor = equipoQueCanta; // Irse al mazo es como no querer el truco implícito
             this.estadoRonda = EstadoRonda.RondaTerminada;
        }

        this.ui.hideAllActionButtons(); // Deshabilitar todo mientras se procesa
        // Continuar flujo se llama desde donde se llamó registrarCanto (IA o handleHuman)
    }

     /** Registra una respuesta (Quiero, No Quiero, u otro canto) */
    private registrarRespuesta(respuesta: Canto, equipoQueResponde: Equipo): void {
        const esRespuestaSN = this.esRespuesta(respuesta);
        this.ui.showPlayerCall(equipoQueResponde.jugador, this.cantoToString(respuesta));

        if (this.equipoDebeResponderEnvido === equipoQueResponde) {
            this.cantosEnvido.push({ canto: respuesta, equipo: equipoQueResponde });
            this.equipoDebeResponderEnvido = null; // Se respondió

            if (esRespuestaSN) {
                this.resolverEnvido(respuesta === Canto.Quiero);
                this.estadoRonda = EstadoRonda.EsperandoJugadaNormal; // Volver al flujo normal
                // El turno sigue siendo de quien cantó originalmente? O de quien respondió? -> Quien cantó originalmente.
                // this.equipoEnTurno = getLast(this.cantosEnvido)?.equipo ?? this.equipoMano; // Volver turno
            } else {
                // Fue un contra-canto de envido (Ej: Envido -> Real Envido)
                this.equipoDebeResponderEnvido = this.getOponente(equipoQueResponde); // Ahora responde el otro
                this.estadoRonda = EstadoRonda.EsperandoRespuestaEnvido;
            }

        } else if (this.equipoDebeResponderTruco === equipoQueResponde) {
            this.cantosTruco.push({ canto: respuesta, equipo: equipoQueResponde });
            this.equipoDebeResponderTruco = null; // Se respondió

            if (esRespuestaSN) {
                this.resolverTruco(respuesta === Canto.Quiero);
                this.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
                 // El turno sigue siendo de quien cantó originalmente? O de quien respondió? -> Quien respondió.
                 this.equipoEnTurno = equipoQueResponde;
            } else {
                // Fue un contra-canto de truco (Ej: Truco -> ReTruco)
                this.equipoDebeResponderTruco = this.getOponente(equipoQueResponde);
                this.estadoRonda = EstadoRonda.EsperandoRespuestaTruco;
            }
        }

        this.ui.hideAllActionButtons();
         // Continuar flujo se llama desde donde se llamó registrarRespuesta (IA o handleHuman)
    }

    /** Registra una carta jugada */
    private registrarJugada(carta: Naipe, equipoQueJuega: Equipo): void {
        if (equipoQueJuega !== this.equipoEnTurno) {
            console.error("Error: Jugó un equipo fuera de turno.");
            return;
        }

        // Registrar en el jugador (humano ya lo hizo desde UI, IA necesita hacerlo)
        if (!equipoQueJuega.jugador.esHumano) {
           // IA ya lo hizo en su método jugarCarta si usamos ese flujo
           // equipoQueJuega.jugador.registrarCartaJugada(carta); <--- No es necesario si IA lo hace
        }

        // Guardar en la mesa lógica
        const mesaIndex = this.numeroDeMano * 2 + (equipoQueJuega === this.equipoPrimero ? 0 : 1);
        this.cartasMesa[mesaIndex] = carta;

        // Mostrar en UI (Pasar mano 0-2 y jugada 0-1)
        this.ui.displayPlayedCard(equipoQueJuega.jugador, carta, this.numeroDeMano, this.jugadasEnMano); // <-- Añadir this.jugadasEnMano

        this.jugadasEnMano++; // Incrementar DESPUÉS de usar el valor actual para UI
        // ...
        // Pasar turno SIEMPRE después de jugar carta
        this.equipoEnTurno = this.getOponente(equipoQueJuega);

        // Ya no se puede envido si se jugó la primera carta
        if (this.numeroDeMano === 0 && this.jugadasEnMano >= 1) {
            this.puedeEnvido = false;
        }

        this.estadoRonda = EstadoRonda.EsperandoJugadaNormal; // Preparar para sig. jugada/fin de mano
        this.ui.hideAllActionButtons();
         // Continuar flujo se llama desde donde se llamó registrarJugada (IA o handleHuman)
    }

     // --- Métodos de Resolución ---

     /** Determina el ganador de la mano actual y actualiza contadores */
     private resolverManoActual(): void {
         const indiceCarta1 = this.numeroDeMano * 2;
         const indiceCarta2 = indiceCarta1 + 1;
         const cartaEq1 = this.cartasMesa[indiceCarta1];
         const cartaEq2 = this.cartasMesa[indiceCarta2];

         if (!cartaEq1 || !cartaEq2) {
             console.error("Error al resolver mano: faltan cartas en la mesa.");
             this.ui.displayLog(`Mano ${this.numeroDeMano + 1}: PARDA (Error?)`);
             this.equipoEnTurno = this.equipoMano; // En parda, comienza el mano de la ronda
             return;
         }

         const ganadorMano = this.determinarGanadorMano(cartaEq1, cartaEq2);

         if (ganadorMano === this.equipoPrimero) {
             this.ui.displayLog(`Mano ${this.numeroDeMano + 1}: Gana ${this.equipoPrimero.jugador.nombre}`);
             this.equipoPrimero.manosGanadasRonda++; // Actualizar manos ganadas
             this.equipoEnTurno = this.equipoPrimero; // El ganador comienza la siguiente mano
         } else if (ganadorMano === this.equipoSegundo) {
             this.ui.displayLog(`Mano ${this.numeroDeMano + 1}: Gana ${this.equipoSegundo.jugador.nombre}`);
             this.equipoSegundo.manosGanadasRonda++; // Actualizar manos ganadas
             this.equipoEnTurno = this.equipoSegundo; // El ganador comienza la siguiente mano
         } else { // Parda
             this.ui.displayLog(`Mano ${this.numeroDeMano + 1}: PARDA`);
             // En caso de parda, no se actualizan las manos ganadas.
             this.equipoEnTurno = this.equipoMano; // En parda, comienza el mano de la ronda
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

     /** Resuelve el Envido después de Quiero/NoQuiero */
     private resolverEnvido(querido: boolean): void {
        this.envidoResuelto = true;
        this.equipoDebeResponderEnvido = null;

        const puntosCalculados = this.calcularPuntosEnvido();
        let equipoGanador: Equipo | null = null;
        let puntosOtorgados = 0;

        let puntosOponenteSiQuerido: number | null = null; // Variable para stats

    if (querido) {
         const p1 = this.equipoPrimero.jugador.getPuntosDeEnvido(this.equipoPrimero.jugador.cartas);
         const p2 = this.equipoSegundo.jugador.getPuntosDeEnvido(this.equipoSegundo.jugador.cartas);

         this.ui.showPlayerCall(this.equipoMano.jugador, `${this.cantoToString(p1)}`);

         if (p1 >= p2) { // Gana mano (o empata)
             equipoGanador = this.equipoMano;
             puntosOtorgados = puntosCalculados.ganador;
             puntosOponenteSiQuerido = p2; // Guardar puntos del perdedor para stats
             // No mostramos puntos del pie si pierde/empata
         } else { // Gana pie
             equipoGanador = this.equipoPie;
             puntosOtorgados = puntosCalculados.ganador;
             puntosOponenteSiQuerido = p1; // Guardar puntos del perdedor para stats
             this.ui.showPlayerCall(this.equipoPie.jugador, `${this.cantoToString(p2)}`);
         }

         // --- LLAMAR A statsEnvido ---
         // La IA que PERDIÓ el envido debe registrar los puntos que cantó el GANADOR
         const equipoPerdedor = (equipoGanador === this.equipoPrimero) ? this.equipoSegundo : this.equipoPrimero;
         if (!equipoPerdedor.jugador.esHumano) {
             (equipoPerdedor.jugador as IA).statsEnvido(this.cantosEnvido, puntosOponenteSiQuerido); // Pasar historial y puntos del ganador
         }
         // --- FIN LLAMADA statsEnvido ---

        } else { // No querido
            // Gana el último que cantó (no la respuesta)
            const ultimoCantoObj = getLast(this.cantosEnvido.filter(c => !this.esRespuesta(c.canto)));
            if (ultimoCantoObj) {
                 equipoGanador = ultimoCantoObj.equipo;
                 puntosOtorgados = puntosCalculados.perdedor;
            } else {
                console.error("Error: Envido No Querido sin canto previo?");
            }
        }

        if (equipoGanador && puntosOtorgados > 0) {
             this.ui.displayLog(`Envido: Gana ${puntosOtorgados}pts ${equipoGanador.jugador.nombre}`);
             equipoGanador.jugador.puntosGanadosEnvidoRonda = puntosOtorgados; // Guardar para IA Truco
             this.puntosEnvidoGanados = puntosOtorgados; // Guardar para puntaje final ronda
             // Los puntos se suman al final de la ronda en finalizarRonda
        }
        // Continuar flujo normal
        this.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
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
         this.equipoDebeResponderTruco = null;
         if (!querido) {
             // El que respondió No Quiero es el perdedor
             const equipoQueRespondio = getLast(this.cantosTruco)?.equipo ?? null;
             if(equipoQueRespondio) {
                this.trucoNoQueridoPor = equipoQueRespondio;
                this.estadoRonda = EstadoRonda.RondaTerminada; // Termina la ronda inmediatamente
             } else {
                 console.error("Error: Truco No Querido sin respuesta previa?");
             }
         } else {
             // El juego continua, los puntos se decidirán al final de la ronda
             this.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
         }
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

    /** Finaliza la ronda, calcula puntos y llama al callback */
    private finalizarRonda(): void {
        this.estadoRonda = EstadoRonda.RondaTerminada; // Asegurar estado final
        const acciones: AccionesPosibles = {
            puedeJugarCarta: false,
            puedeCantarEnvido: [],
            puedeCantarTruco: [],
            puedeResponder: [],
            puedeMazo: false
        };
        this.ui.actualizarAccionesPosibles(acciones); // Deshabilitar todo

        // Lógica para calcular puntos y determinar ganador
        let ganadorRondaEquipo: Equipo | null = null;
        let puntosTrucoCalculados = this.calcularPuntosTruco();
        let puntosGanados = 0;

        if (this.trucoNoQueridoPor) {
            ganadorRondaEquipo = this.getOponente(this.trucoNoQueridoPor);
            puntosGanados = puntosTrucoCalculados.noQuerido;
            this.ui.displayLog(`Ronda: ${ganadorRondaEquipo.jugador.nombre} gana ${puntosGanados}pts (No Querido / Mazo)`);
        } else {
            ganadorRondaEquipo = this.determinarGanadorRonda();
            if (ganadorRondaEquipo) {
                puntosGanados = puntosTrucoCalculados.querido;
                this.ui.displayLog(`Ronda: ${ganadorRondaEquipo.jugador.nombre} gana ${puntosGanados}pts (Truco)`);
            }
        }

        // Sumar puntos y llamar al callback
        setTimeout(() => {
            this.onRondaTerminada(
                ganadorRondaEquipo === this.equipoPrimero ? puntosGanados : 0,
                ganadorRondaEquipo === this.equipoSegundo ? puntosGanados : 0
            );
        }, 2000);
    }

    // --- Métodos para obtener acciones posibles (Usados por UI y IA) ---

    private getPosiblesCantosEnvido(): Canto[] {
        if (!this.puedeEnvido || this.envidoResuelto) return [];

        const ultimo = getLast(this.cantosEnvido)?.canto;
        // Lógica simple: si no se cantó nada, se puede E, R, F
        if (!ultimo) return [Canto.Envido, Canto.RealEnvido, Canto.FaltaEnvido];
        // Si ya se cantó, no se puede volver a cantar (se responde)
        return [];
    }

    private getPosiblesRespuestasEnvido(): Canto[] {
        if (this.envidoResuelto || !this.equipoDebeResponderEnvido) return [];
        const ultimo = getLast(this.cantosEnvido)?.canto;
        const respuestas: Canto[] = [Canto.Quiero, Canto.NoQuiero];
        switch(ultimo) {
            case Canto.Envido:
                respuestas.push(Canto.EnvidoEnvido, Canto.RealEnvido, Canto.FaltaEnvido);
                break;
            case Canto.EnvidoEnvido:
                 respuestas.push(Canto.RealEnvido, Canto.FaltaEnvido);
                 break;
            case Canto.RealEnvido:
                 respuestas.push(Canto.FaltaEnvido);
                 break;
            // Si fue FaltaEnvido, solo se puede Q/NQ
        }
        return respuestas;
    }

     private puedeCantarTruco(equipo: Equipo): boolean {
        if (this.trucoResuelto) return false; // Ya se dijo Q/NQ
        const ultimoCantoObj = getLast(this.cantosTruco);
        // Si no hay cantos, cualquiera puede cantar Truco
        if (!ultimoCantoObj) return true;
        // Si el último fue respuesta (Q/NQ), puede cantar el que respondió Q
        if (this.esRespuesta(ultimoCantoObj.canto)) {
            return ultimoCantoObj.canto === Canto.Quiero && ultimoCantoObj.equipo === equipo;
        }
        // Si el último fue un canto (T, RT, V4), no puede cantar el mismo equipo
        return ultimoCantoObj.equipo !== equipo;
    }

    private getPosiblesCantosTruco(): Canto[] {
        if (!this.puedeCantarTruco(this.equipoEnTurno)) return [];

        const ultimo = getLast(this.cantosTruco)?.canto;
        if (!ultimo || this.esRespuesta(ultimo)) {
            return [Canto.Truco];
        }
        switch (ultimo) {
            case Canto.Truco: return [Canto.ReTruco];
            case Canto.ReTruco: return [Canto.ValeCuatro];
            case Canto.ValeCuatro: return []; // No hay más
            default: return [];
        }
    }

    private getPosiblesRespuestasTruco(): Canto[] {
         if (this.trucoResuelto || !this.equipoDebeResponderTruco) return [];
         const ultimo = getLast(this.cantosTruco)?.canto;
         const respuestas: Canto[] = [Canto.Quiero, Canto.NoQuiero];
         switch(ultimo) {
            case Canto.Truco:
                respuestas.push(Canto.ReTruco);
                break;
            case Canto.ReTruco:
                 respuestas.push(Canto.ValeCuatro);
                 break;
            // Si fue ValeCuatro, solo se puede Q/NQ
        }
        return respuestas;
    }


    // --- Handlers para acciones del Humano (llamados desde UI) ---

    public handleHumanPlayCard(indiceCarta: number): void { // Recibe el índice
        const equipoHumano = this.equipoEnTurno; // Asumiendo que es el humano
        if (equipoHumano.jugador.esHumano && this.estadoRonda === EstadoRonda.EsperandoJugadaNormal) {
            // Obtener la carta usando el índice ANTES de registrar/eliminarla
            const cartaJugada = equipoHumano.jugador.cartasEnMano[indiceCarta];
    
            if (cartaJugada) {
                // Llamar a registrarCartaJugada con el ÍNDICE
                const cartaConfirmada = equipoHumano.jugador.registrarCartaJugada(indiceCarta); // Pasa el índice
    
                if (cartaConfirmada) {
                     // Ahora que tenemos la carta, la registramos en la ronda
                     this.registrarJugada(cartaConfirmada, equipoHumano);
                     this.continuarFlujo(); // Procesar la jugada
                } else {
                    console.error(`Error: No se pudo registrar la jugada del humano con índice ${indiceCarta}`);
                }
            } else {
                 console.error(`Error: Índice de carta humana inválido: ${indiceCarta}`);
            }
        } else {
             console.warn(`Intento de jugar carta humana fuera de turno o estado incorrecto.`);
        }
    }

    public handleHumanCanto(canto: Canto): void {
         const equipoHumano = this.equipoPrimero; // Asumiendo que humano es equipo1
         if (equipoHumano === this.equipoEnTurno && this.estadoRonda === EstadoRonda.EsperandoJugadaNormal) {
             // Validar si el canto es posible
             const esEnvido = [Canto.Envido, Canto.RealEnvido, Canto.FaltaEnvido].includes(canto);
             const esTruco = [Canto.Truco].includes(canto); // Solo puede iniciar Truco
             if ((esEnvido && this.getPosiblesCantosEnvido().includes(canto)) ||
                 (esTruco && this.getPosiblesCantosTruco().includes(canto)) ||
                  canto === Canto.IrAlMazo )
             {
                 this.registrarCanto(canto, equipoHumano);
                 this.continuarFlujo();
             } else {
                  console.warn(`Canto inválido ${canto} intentado por humano en estado ${EstadoRonda[this.estadoRonda]}`);
             }
         }
         // Manejar respuesta/contra-canto
         else if (equipoHumano === this.equipoDebeResponderEnvido || equipoHumano === this.equipoDebeResponderTruco) {
              // Validar si la respuesta es posible
             const posiblesRespuestas = (equipoHumano === this.equipoDebeResponderEnvido)
                                        ? this.getPosiblesRespuestasEnvido()
                                        : this.getPosiblesRespuestasTruco();
             if (posiblesRespuestas.includes(canto)) {
                 this.registrarRespuesta(canto, equipoHumano);
                 this.continuarFlujo();
             } else {
                 console.warn(`Respuesta inválida ${canto} intentado por humano`);
             }
         }
    }
}