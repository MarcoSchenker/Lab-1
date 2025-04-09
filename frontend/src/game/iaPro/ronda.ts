import { Jugador } from './jugador';
import { IA } from './ia'; // Importar IA
import { Naipe, generarBarajaCompleta } from './naipes';
import { Canto, Equipo, PuntosEnvido, PuntosTruco, Palo } from './types';
import { UIHandler } from './ui';
import { getRandomInt, shuffleArray, getLast } from './utils'; // Importar utils

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
            case Canto.Mazo: return "Me voy al Mazo";
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
        this.equipoPrimero.manos = 0; // Manos ganadas en ESTA ronda
        this.equipoSegundo.manos = 0;

        this.repartirCartas();

        this.ui.displayPlayerCards(this.equipoPrimero.jugador);
        this.ui.displayPlayerCards(this.equipoSegundo.jugador);
        this.ui.limpiarMesa();

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
        const baraja = generarBarajaCompleta();
        shuffleArray(baraja); // Barajar

        const cartasJ1: Naipe[] = [];
        const cartasJ2: Naipe[] = [];

        // Repartir alternando (normalmente empieza el pie a recibir)
        for (let i = 0; i < 6; i++) {
            const carta = baraja.pop(); // Sacar del final
            if (!carta) throw new Error("Error al repartir, mazo vacío inesperadamente.");

            // Asumiendo que equipoPie recibe primero impar, equipoMano par
            if (i % 2 === 0) { // Cartas 1, 3, 5
                if(this.equipoPie === this.equipoPrimero) cartasJ1.push(carta);
                else cartasJ2.push(carta);
            } else { // Cartas 2, 4, 6
                 if(this.equipoMano === this.equipoPrimero) cartasJ1.push(carta);
                 else cartasJ2.push(carta);
            }
        }

        this.equipoPrimero.jugador.setCartas(cartasJ1);
        this.equipoSegundo.jugador.setCartas(cartasJ2);

         if (this.debugMode) {
             this.ui.displayLog(`Debug Cartas ${this.equipoPrimero.jugador.nombre}: ${cartasJ1.map(c=>c.getNombre()).join(', ')}`);
             this.ui.displayLog(`Debug Cartas ${this.equipoSegundo.jugador.nombre}: ${cartasJ2.map(c=>c.getNombre()).join(', ')}`);
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
                     this.ui.limpiarMesa(); // Limpiar mesa UI
                     this.estadoRonda = EstadoRonda.InicioMano; // Volver a empezar mano
                     this.puedeEnvido = false; // Ya no se puede envido después de la primera mano
                     continue; // Procesar inicio de la nueva mano

                case EstadoRonda.RondaTerminada:
                    // Ya está en el estado final, salir del bucle
                    break;

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
             // Habilitar acciones para el humano
             const posiblesCantosEnvido = this.puedeEnvido ? this.getPosiblesCantosEnvido() : [];
             const posiblesCantosTruco = this.getPosiblesCantosTruco();
             this.ui.setButtonState(posiblesCantosEnvido, posiblesCantosTruco, true); // Habilita jugar carta y mazo
             this.continuarFlujo(true); // Esperar acción humana
        } else {
            // Turno de la IA
            const ia = jugadorActual as IA;
            let accionRealizada = false;

             // 1. ¿Cantar Envido? (Solo si puede y no se resolvió)
             if (this.puedeEnvido && !this.envidoResuelto) {
                 const cantoEnvidoIA = ia.envido(getLast(this.cantosEnvido)?.canto, this.calcularPuntosEnvido().acumulado, getLast(this.getOponente(this.equipoEnTurno).jugador.cartasJugadas), this, this.limitePuntaje);
                 if (cantoEnvidoIA !== Canto.Paso) {
                     this.registrarCanto(cantoEnvidoIA, this.equipoEnTurno);
                     accionRealizada = true;
                 }
             }

             // 2. ¿Cantar Truco? (Si no cantó envido y puede)
             if (!accionRealizada && this.puedeCantarTruco(this.equipoEnTurno)) {
                 const cantoTrucoIA = ia.truco(false, getLast(this.cantosTruco)?.canto, this, this.limitePuntaje);
                 if (cantoTrucoIA !== Canto.Paso) {
                     this.registrarCanto(cantoTrucoIA, this.equipoEnTurno);
                     accionRealizada = true;
                 }
             }

             // 3. Jugar Carta (Si no cantó nada)
             if (!accionRealizada) {
                 const cartaJugada = ia.jugarCarta(this); // Pasar la ronda como contexto
                 this.registrarJugada(cartaJugada, this.equipoEnTurno);
                 accionRealizada = true;
             }

             // Si IA actuó, continuar flujo (procesará el siguiente estado)
             if(accionRealizada) {
                 setTimeout(() => this.continuarFlujo(), 1000); // Pequeña pausa para IA
             } else {
                 console.error("Error: IA no realizó ninguna acción en turno normal");
                 // Forzar jugar carta como fallback?
                 const cartaJugada = ia.jugarCarta(this);
                 this.registrarJugada(cartaJugada, this.equipoEnTurno);
                 setTimeout(() => this.continuarFlujo(), 1000);
             }
        }
    }

    /** Gestiona la respuesta al Envido */
     private gestionarRespuestaEnvido(): void {
        if (!this.equipoDebeResponderEnvido) return; // Seguridad
        const jugadorResponde = this.equipoDebeResponderEnvido.jugador;

        if (jugadorResponde.esHumano) {
            const posiblesRespuestas = this.getPosiblesRespuestasEnvido();
            this.ui.setButtonState(posiblesRespuestas, [], false); // Solo respuestas envido y Quiero/NoQuiero
            this.continuarFlujo(true); // Esperar humano
        } else {
            const ia = jugadorResponde as IA;
            const ultimoCanto = getLast(this.cantosEnvido)?.canto ?? null; // Usar ??
            const respuestaIA = ia.envido(ultimoCanto, this.calcularPuntosEnvido().acumulado, getLast(this.getOponente(this.equipoDebeResponderEnvido).jugador.cartasJugadas), this, this.limitePuntaje);

            if (respuestaIA === Canto.Paso) {
                console.warn("IA pasó en respuesta envido, forzando No Quiero");
                this.registrarRespuesta(Canto.NoQuiero, this.equipoDebeResponderEnvido);
            } else {
                 this.registrarRespuesta(respuestaIA, this.equipoDebeResponderEnvido);
            }
            setTimeout(() => this.continuarFlujo(), 1000); // Pausa y continuar
        }
     }

     /** Gestiona la respuesta al Truco */
     private gestionarRespuestaTruco(): void {
         if (!this.equipoDebeResponderTruco) return; // Seguridad
         const jugadorResponde = this.equipoDebeResponderTruco.jugador;

         if (jugadorResponde.esHumano) {
             const posiblesRespuestas = this.getPosiblesRespuestasTruco();
             this.ui.setButtonState([], posiblesRespuestas, false); // Solo respuestas truco y Quiero/NoQuiero
             this.continuarFlujo(true); // Esperar humano
         } else {
             const ia = jugadorResponde as IA;
             const ultimoCanto = getLast(this.cantosTruco)?.canto ?? null;
             const respuestaIA = ia.truco(true, ultimoCanto, this, this.limitePuntaje);

             if (respuestaIA === Canto.Paso) {
                 console.warn("IA pasó en respuesta truco, forzando No Quiero");
                 this.registrarRespuesta(Canto.NoQuiero, this.equipoDebeResponderTruco);
             } else {
                 this.registrarRespuesta(respuestaIA, this.equipoDebeResponderTruco);
             }
             setTimeout(() => this.continuarFlujo(), 1000); // Pausa y continuar
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
        } else if (canto === Canto.Mazo) {
             this.trucoNoQueridoPor = equipoQueCanta; // Irse al mazo es como no querer el truco implícito
             this.estadoRonda = EstadoRonda.RondaTerminada;
        }

        this.ui.setButtonState([],[], false); // Deshabilitar todo mientras se procesa
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

        this.ui.setButtonState([],[], false);
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

        // Mostrar en UI
        this.ui.displayPlayedCard(equipoQueJuega.jugador, carta, this.numeroDeMano + 1); // numeroMano es 0, 1, 2 -> pos 1 a 6

        this.jugadasEnMano++;
        // Pasar turno SIEMPRE después de jugar carta
        this.equipoEnTurno = this.getOponente(equipoQueJuega);

        // Ya no se puede envido si se jugó la primera carta
        if (this.numeroDeMano === 0 && this.jugadasEnMano >= 1) {
            this.puedeEnvido = false;
        }

        this.estadoRonda = EstadoRonda.EsperandoJugadaNormal; // Preparar para sig. jugada/fin de mano
        this.ui.setButtonState([],[], false);
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
             // Decidir ganador por defecto o terminar? Por ahora, Parda y sigue Mano.
              this.ui.displayLog(`Mano ${this.numeroDeMano + 1}: PARDA (Error?)`);
              this.equipoPrimero.manos++;
              this.equipoSegundo.manos++;
              this.equipoEnTurno = this.equipoMano; // En parda, la siguiente mano la empieza el mano de la ronda
              return;
         }

         const ganadorMano = this.determinarGanadorMano(cartaEq1, cartaEq2);

         if (ganadorMano === this.equipoPrimero) {
             this.ui.displayLog(`Mano ${this.numeroDeMano + 1}: Gana ${this.equipoPrimero.jugador.nombre}`);
             this.equipoPrimero.manos++;
             this.equipoEnTurno = this.equipoPrimero; // El que gana la mano empieza la siguiente
             this.ui.highlightWinningCard(this.equipoPrimero.jugador, this.numeroDeMano + 1);
         } else if (ganadorMano === this.equipoSegundo) {
             this.ui.displayLog(`Mano ${this.numeroDeMano + 1}: Gana ${this.equipoSegundo.jugador.nombre}`);
             this.equipoSegundo.manos++;
             this.equipoEnTurno = this.equipoSegundo;
             this.ui.highlightWinningCard(this.equipoSegundo.jugador, this.numeroDeMano + 1);
         } else { // Parda
             this.ui.displayLog(`Mano ${this.numeroDeMano + 1}: PARDA`);
             this.equipoPrimero.manos++;
             this.equipoSegundo.manos++;
             this.equipoEnTurno = this.equipoMano; // En parda, la siguiente mano la empieza el mano de la ronda
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
     private calcularPuntosEnvido(): { ganador: number; perdedor: number; acumulado: number } {
        let g = 0, p = 0, a = 0; // Ganador, Perdedor, Acumulado (para IA)
        let faltaActiva = false;

        for (const item of this.cantosEnvido) {
            // Ignorar respuestas Quiero/NoQuiero para el cálculo base
            if(this.esRespuesta(item.canto)) continue;

            a += 1; // Contar cuántos cantos válidos hubo
            switch (item.canto) {
                case Canto.Envido:
                    g += 2; p = 1; // Si no quiere, es 1
                    break;
                case Canto.EnvidoEnvido: // Asumiendo que este es el 2do envido
                    g += 2; p = g - 1; // Acumula el no quiero
                    break;
                case Canto.RealEnvido:
                    g += 3; p = g - 1;
                    break;
                case Canto.FaltaEnvido:
                    faltaActiva = true;
                    p = g > 0 ? g : 1; // Si ya había puntos, el no quiero es eso, sino 1
                    // Puntos ganador se calculan al final
                    break;
            }
        }
        if (faltaActiva) {
             const puntosOponente = Math.max(this.equipoPrimero.puntos, this.equipoSegundo.puntos);
             g = this.limitePuntaje - puntosOponente;
             if (g <= 0) g = 1; // Como mínimo 1 punto si ya ganó
        }
        // Si no se cantó nada, vale 0
        return { ganador: g, perdedor: p, acumulado: a };
     }

     /** Resuelve el Envido después de Quiero/NoQuiero */
     private resolverEnvido(querido: boolean): void {
        this.envidoResuelto = true;
        this.equipoDebeResponderEnvido = null;

        const puntosCalculados = this.calcularPuntosEnvido();
        let equipoGanador: Equipo | null = null;
        let puntosOtorgados = 0;

        if (querido) {
             const p1 = this.equipoPrimero.jugador.getPuntosDeEnvido(this.equipoPrimero.jugador.cartas);
             const p2 = this.equipoSegundo.jugador.getPuntosDeEnvido(this.equipoSegundo.jugador.cartas);

             this.ui.showPlayerCall(this.equipoMano.jugador, `${this.cantoToString(p1)}`);
             // Llamar a stats IA si el humano es mano
             if (this.equipoMano.jugador.esHumano && !this.equipoPie.jugador.esHumano) {
                 (this.equipoPie.jugador as IA).statsEnvido(this.cantosEnvido.map(c=>c.canto), this.cantosEnvido.map(c=>c.equipo), p1);
             }

             if (p1 >= p2) { // Gana mano (o empata)
                 equipoGanador = this.equipoMano;
                 puntosOtorgados = puntosCalculados.ganador;
                 // No mostramos los puntos del pie si pierde o empata
             } else { // Gana pie
                 equipoGanador = this.equipoPie;
                 puntosOtorgados = puntosCalculados.ganador;
                 this.ui.showPlayerCall(this.equipoPie.jugador, `${this.cantoToString(p2)}`);
                 // Llamar a stats IA si el humano es pie y gana
                 if (this.equipoPie.jugador.esHumano && !this.equipoMano.jugador.esHumano) {
                     (this.equipoMano.jugador as IA).statsEnvido(this.cantosEnvido.map(c=>c.canto), this.cantosEnvido.map(c=>c.equipo), p2);
                 }
             }

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
             equipoGanador.jugador.puntosGanadosEnvido = puntosOtorgados; // Guardar para IA Truco
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
        const equipoIA = this.getEquipo(ia)!;
        const oponente = this.getOponente(equipoIA);

        // Calcular resultados manos anteriores para el contexto
        let resMano0 = 0, resMano1 = 0;
        if (this.numeroDeMano > 0 && this.cartasMesa[0] && this.cartasMesa[1]) {
            const ganadorMano0 = this.determinarGanadorMano(this.cartasMesa[0]!, this.cartasMesa[1]!);
            resMano0 = (ganadorMano0 === equipoIA) ? 1 : ((ganadorMano0 === oponente) ? -1 : 0);
        }
        if (this.numeroDeMano > 1 && this.cartasMesa[2] && this.cartasMesa[3]) {
            const ganadorMano1 = this.determinarGanadorMano(this.cartasMesa[2]!, this.cartasMesa[3]!);
            resMano1 = (ganadorMano1 === equipoIA) ? 1 : ((ganadorMano1 === oponente) ? -1 : 0);
        }

        // Obtener los puntos que cantó el oponente si el envido se resolvió con "Quiero"
        let puntosOponenteEnvido: number | null = null;
        if (this.envidoResuelto && this.cantosEnvido.some(c => c.canto === Canto.Quiero)) {
            // Si IA ganó el envido, los puntos del oponente son los que él tendría
            if (this.getEquipo(ia)?.jugador.puntosGanadosEnvido > 0) {
                 puntosOponenteEnvido = oponente.jugador.getPuntosDeEnvido(oponente.jugador.cartas);
            }
            // Si Oponente ganó el envido, los puntos que él cantó son los suyos
            else if (this.getOponente(equipoIA).jugador.puntosGanadosEnvido > 0) {
                 puntosOponenteEnvido = oponente.jugador.getPuntosDeEnvido(oponente.jugador.cartas);
                 // Nota: La IA original guardaba esto en _rondaActual.puntosGuardados.
                 // Aquí lo calculamos al momento si es necesario.
            }
        }


        return {
            equipoIA: equipoIA,
            oponente: oponente,
            limitePuntaje: this.limitePuntaje,
            nroMano: this.numeroDeMano,
            ultimoCantoTruco: getLast(this.cantosTruco.filter(c => !this.esRespuesta(c.canto)))?.canto ?? null, // Solo el último CANTO
            miCartaEnMesa: this.cartasMesa[this.numeroDeMano * 2 + (equipoIA === this.equipoPrimero ? 0 : 1)] ?? null,
            cartaOponenteEnMesa: this.cartasMesa[this.numeroDeMano * 2 + (equipoIA === this.equipoPrimero ? 1 : 0)] ?? null,
            resultadoMano0: resMano0,
            resultadoMano1: resMano1,
            misCartasEnMano: ia.cartasEnMano,
            cartasJugadasOponente: oponente.jugador.cartasJugadas,
            puntosEnvidoGanadosIA: ia.puntosGanadosEnvido,
            puntosEnvidoCantadosOponente: puntosOponenteEnvido, // Poblado ahora
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

        // Condición de No Quiero (o Mazo) ya chequeada en finalizarRonda

        // Regla: El primero en ganar 2 manos, gana.
        if (e1.manos >= 2 && e1.manos > e2.manos) return e1;
        if (e2.manos >= 2 && e2.manos > e1.manos) return e2;

        // Si se jugaron las 3 manos:
        if (this.numeroDeMano === 3) { // Ya se resolvió la mano 3 antes de llamar aquí
             // Si llegaron 2 manos cada uno (imposible si se resolvió bien?) -> gana mano
             // Si llegaron 1 mano cada uno (3 pardas) -> gana mano
             if (e1.manos === e2.manos) return this.equipoMano;
             // Si uno tiene 2 y otro 1 (o 0) -> ya debería haber ganado arriba
        }

         // Caso especial: Parda la primera, gana quien gane la segunda.
         // (Esto se maneja porque si alguien gana la 2da, tendrá 2 manos vs 1 del otro)

         // Caso especial: Parda la segunda (y no la primera), gana quien ganó la primera.
         // (Si se empata la 2da mano, ambos suman 1. Quien ganó la 1ra tendrá 2 manos y ganará)

         // Caso especial: Parda la tercera, gana quien ganó la primera.
         // (Si se empata la 3ra, y antes iban 1 a 1, ahora van 2 a 2 -> Gana mano)

        return null; // No hay ganador aún
     }

    /** Finaliza la ronda, calcula puntos y llama al callback */
     private finalizarRonda(): void {
         this.estadoRonda = EstadoRonda.RondaTerminada; // Asegurar estado final
         this.ui.setButtonState([], [], false); // Deshabilitar todo

         let ganadorRondaEquipo: Equipo | null = null;
         let puntosTrucoCalculados = this.calcularPuntosTruco();
         let puntosGanados = 0;

         if (this.trucoNoQueridoPor) {
             ganadorRondaEquipo = this.getOponente(this.trucoNoQueridoPor);
             puntosGanados = puntosTrucoCalculados.noQuerido;
             this.ui.displayLog(`Ronda: ${ganadorRondaEquipo.jugador.nombre} gana ${puntosGanados}pts (No Querido / Mazo)`);
         } else {
             // Determinar ganador por manos jugadas
             ganadorRondaEquipo = this.determinarGanadorRonda();
             if (ganadorRondaEquipo) {
                 puntosGanados = puntosTrucoCalculados.querido;
                 this.ui.displayLog(`Ronda: ${ganadorRondaEquipo.jugador.nombre} gana ${puntosGanados}pts (Truco)`);
             } else {
                  // Esto no debería pasar si la lógica es correcta, pero como fallback:
                  console.error("Error: Ronda terminada sin ganador de truco determinado.");
                  ganadorRondaEquipo = this.equipoMano; // Gana el mano por defecto?
                  puntosGanados = 1; // Vale 1 punto?
             }
         }

         // Sumar puntos de la ronda (Truco + Envido)
         let puntosTotalesEq1 = 0;
         let puntosTotalesEq2 = 0;

         if (ganadorRondaEquipo === this.equipoPrimero) {
             puntosTotalesEq1 += puntosGanados;
         } else if (ganadorRondaEquipo === this.equipoSegundo) {
             puntosTotalesEq2 += puntosGanados;
         }

         // Sumar puntos del envido resuelto (si hubo)
         if (this.equipoPrimero.jugador.puntosGanadosEnvido > 0) {
            puntosTotalesEq1 += this.equipoPrimero.jugador.puntosGanadosEnvido;
         } else if (this.equipoSegundo.jugador.puntosGanadosEnvido > 0) {
            puntosTotalesEq2 += this.equipoSegundo.jugador.puntosGanadosEnvido;
         }

         this.ui.displayLog(`--- Fin Ronda ---`);

         // Llamar al callback de Partida para actualizar puntajes globales
         // Usar setTimeout para dar tiempo a ver el último log/estado
         setTimeout(() => {
             this.onRondaTerminada(puntosTotalesEq1, puntosTotalesEq2);
         }, 2000); // Espera 2 segundos
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

    public handleHumanPlayCard(carta: Naipe): void {
        if (this.equipoEnTurno.jugador.esHumano && this.estadoRonda === EstadoRonda.EsperandoJugadaNormal) {
             this.equipoEnTurno.jugador.registrarCartaJugada(carta); // Humano actualiza su mano
             this.registrarJugada(carta, this.equipoEnTurno);
             this.continuarFlujo(); // Procesar la jugada
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
                  canto === Canto.Mazo )
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