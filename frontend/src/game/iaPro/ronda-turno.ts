// src/game/iaPro/ronda-turno.ts
import { Ronda, EstadoRonda } from './ronda';
import { IA } from './ia';
import { Equipo } from './types';
import { Naipe } from './naipe';
import { Jugador } from './jugador';
import { shuffleArray } from './utils';

// Interfaz para la carta con información adicional para la UI (puedes moverla a types.ts si prefieres)
interface CartaConInfoUI extends Naipe {
    esHumano: boolean;
}

export class RondaTurnoHandler {
    private ronda: Ronda;

    // Almacena las cartas jugadas. El índice es: mano * 2 + (0 para equipo1, 1 para equipo2)
    // Ejemplo: mano 0 -> índices 0 (Eq1), 1 (Eq2)
    //          mano 1 -> índices 2 (Eq1), 3 (Eq2)
    //          mano 2 -> índices 4 (Eq1), 5 (Eq2)
    public cartasMesa: (Naipe | null)[] = Array(6).fill(null);
    public jugadasEnManoActual: number = 0; // Contador de cartas jugadas en la mano actual (0, 1 o 2)

    constructor(ronda: Ronda) {
        this.ronda = ronda;
    }

    public nuevaRonda(): void {
        this.cartasMesa = Array(6).fill(null);
        this.jugadasEnManoActual = 0;
    }

    /** Reparte 3 cartas a cada jugador */
    public repartirCartas(): void {
        const baraja = Naipe.generarBarajaCompleta();
        shuffleArray(baraja);
        const cartasJ1: Naipe[] = [];
        const cartasJ2: Naipe[] = [];
        const equipoMano = this.ronda.equipoMano;
        const equipoPie = this.ronda.equipoPie;

        // Reparto alternado, empezando por el pie (regla común)
        for (let i = 0; i < 6; i++) {
            const carta = baraja.pop();
            if (!carta) throw new Error("Error al repartir, mazo vacío.");
            // El jugador que recibe depende de si i es par (pie) o impar (mano)
            const jugadorRecibe = (i % 2 === 0) ? equipoPie.jugador : equipoMano.jugador;
            // Asignar al array correspondiente (J1 o J2)
            (jugadorRecibe === this.ronda.equipoPrimero.jugador ? cartasJ1 : cartasJ2).push(carta);
        }

        this.ronda.equipoPrimero.jugador.cartas = [...cartasJ1];
        this.ronda.equipoPrimero.jugador.cartasEnMano = [...cartasJ1];
        this.ronda.equipoPrimero.jugador.cartasJugadasRonda = [];

        this.ronda.equipoSegundo.jugador.cartas = [...cartasJ2];
        this.ronda.equipoSegundo.jugador.cartasEnMano = [...cartasJ2];
        this.ronda.equipoSegundo.jugador.cartasJugadasRonda = [];


        // Logs de Debug (si está activado en la ronda)
        if (this.ronda.debugMode) {
            this.logDebug(`Cartas ${this.ronda.equipoPrimero.jugador.nombre}: ${cartasJ1.map(c => c.getNombre()).join(', ')}`);
            this.logDebug(`Cartas ${this.ronda.equipoSegundo.jugador.nombre}: ${cartasJ2.map(c => c.getNombre()).join(', ')}`);
            // Asegurarse que se pasa el array de cartas para calcular el envido inicial
            this.logDebug(`${this.ronda.equipoPrimero.jugador.nombre} Envido=${this.ronda.equipoPrimero.jugador.getPuntosDeEnvido(cartasJ1)}`);
            this.logDebug(`${this.ronda.equipoSegundo.jugador.nombre} Envido=${this.ronda.equipoSegundo.jugador.getPuntosDeEnvido(cartasJ2)}`);
        }
    }

    /** Verifica si el jugador en turno puede jugar una carta */
    public puedeJugarCarta(): boolean {
        const estado = this.ronda.estadoRonda;
        // Se puede jugar si el estado es normal Y no se está esperando respuesta de envido o truco
        return (estado === EstadoRonda.EsperandoJugadaNormal || estado === EstadoRonda.InicioMano) &&
               !this.ronda.envidoHandler.equipoDebeResponderEnvido &&
               !this.ronda.trucoHandler.equipoDebeResponderTruco;
    }

    /**
     * Registra la jugada de una carta por un equipo.
     * Actualiza el estado interno y llama a los callbacks de la UI.
     * @param carta El Naipe jugado.
     * @param equipoQueJuega El Equipo que realiza la jugada.
     * @returns `true` si la jugada fue válida y registrada, `false` en caso contrario.
     */
    public registrarJugada(carta: Naipe, equipoQueJuega: Equipo): boolean {
        // Validaciones previas
        if (equipoQueJuega !== this.ronda.equipoEnTurno) {
            this.logDebug(`Jugó ${equipoQueJuega.jugador.nombre} fuera de turno.`);
            return false;
        }
        if (!this.puedeJugarCarta()) {
            this.logDebug(`Intento de jugar carta por ${equipoQueJuega.jugador.nombre} en estado inválido: ${EstadoRonda[this.ronda.estadoRonda]}`);
            return false;
        }

        const jugador = equipoQueJuega.jugador;

        // Intentar quitar la carta de la mano del jugador
        try {
            // Usar un método en Jugador que quite la carta por objeto/referencia
            jugador.registrarCartaJugadaPorObjeto(carta);
        } catch (error) {
            // Si la carta no estaba en la mano, la jugada es inválida
            this.logDebug(`${jugador.nombre} intentó jugar la carta ${carta.getNombre()} pero no se encontró en su mano.`);
            this.ronda.callbacks.displayLog((error as Error).message, 'public'); // Mostrar error al usuario
            return false; // Jugada inválida
        }

        // Calcular índice en la mesa visual (0-5)
        // playerIndex 0 para equipo1, 1 para equipo2
        const playerIndex = equipoQueJuega.jugador.nombre === this.ronda.equipoPrimero.jugador.nombre ? 0 : 1;
        // Índice basado en la mano actual y quién juega
        const mesaIndex = this.ronda.numeroDeMano * 2 + playerIndex;

        // Validación de índice (seguridad)
        if (mesaIndex < 0 || mesaIndex >= this.cartasMesa.length) {
            console.error(`Índice de mesa inválido ${mesaIndex} al jugar ${carta.getNombre()} en mano ${this.ronda.numeroDeMano}`);
            // Podría intentar recuperar o marcar error, pero retornar false es más seguro
            return false;
        }

        // Poner la carta en nuestro registro interno de la mesa
        this.cartasMesa[mesaIndex] = carta;

        const cartaParaUI: CartaConInfoUI = {
            ...carta, // Copiar propiedades de la carta original
            esHumano: jugador.esHumano, // Añadir si el jugador es humano o no
            getNombre: carta.getNombre.bind(carta), // Asegurar que los métodos están presentes
            getImageSrc: carta.getImageSrc.bind(carta),
            probGanar: carta.probGanar,
        };
        // Llamar al callback para que React actualice la mesa
        this.ronda.callbacks.displayPlayedCard(
            jugador,        // Objeto Jugador (importante para UI si necesita más datos)
            cartaParaUI,    // Carta JUGADA con la info extra 'esHumano'
            this.ronda.numeroDeMano, // Mano actual (0, 1, o 2)
            this.jugadasEnManoActual // Número de jugada DENTRO de la mano (0 o 1)
        );

        // Actualizar la mano visual del jugador (humano) para que desaparezca la carta jugada
        if (jugador.esHumano) {
            this.ronda.callbacks.displayPlayerCards(jugador);
        }

        // Actualizar contadores y estado
        this.jugadasEnManoActual++;
        this.ronda.envidoHandler.onCartaJugada(); // Notificar al handler de envido (puede bloquearlo)

        // Pasar el turno al oponente
        this.ronda.equipoEnTurno = this.ronda.getOponente(equipoQueJuega);

        // Determinar el próximo estado
        if (this.jugadasEnManoActual === 2) {
            // Si ya jugaron los dos en esta mano, la mano termina
            this.ronda.estadoRonda = EstadoRonda.ManoTerminada;
        } else {
            // Si solo jugó uno, se espera la jugada del otro
            this.ronda.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
        }

        return true; // Jugada válida y registrada
    }

    /** Procesa el turno de la IA para jugar una carta */
    public procesarTurnoNormalIA(): void {
        const equipoIA = this.ronda.equipoEnTurno;
        const iaJugador = equipoIA.jugador as IA; // Sabemos que es IA

        if (!this.puedeJugarCarta()) {
            this.logDebug(`IA ${iaJugador.nombre} intentó jugar carta pero no era posible (estado: ${EstadoRonda[this.ronda.estadoRonda]}).`);
            return; // Salir si no puede jugar
        }

        // Pedir a la IA que elija una carta
        const cartaJugada = iaJugador.jugarCarta(this.ronda); // Pasar la instancia de Ronda como contexto

        // Registrar la jugada (esto llamará a displayPlayedCard con esHumano=false)
        this.registrarJugada(cartaJugada, equipoIA);
    }

    /** Resuelve quién ganó la mano actual y actualiza el estado */
    private resolverManoActual(): void {
        // Índices de las cartas jugadas en la mano actual
        const idxCartaEq1 = this.ronda.numeroDeMano * 2 + 0; // Índice para Equipo 1
        const idxCartaEq2 = this.ronda.numeroDeMano * 2 + 1; // Índice para Equipo 2
        const cartaEq1 = this.cartasMesa[idxCartaEq1];
        const cartaEq2 = this.cartasMesa[idxCartaEq2];

        let ganadorManoEquipo: Equipo | null = null;
        let cartaGanadora: Naipe | null = null;
        let jugadorGanador: Jugador | null = null;
        let jugadaGanadoraIndex = -1; // 0 para Eq1, 1 para Eq2

        // Validar que ambas cartas fueron jugadas
        if (!cartaEq1 || !cartaEq2) {
            this.logDebug(`Error al resolver mano ${this.ronda.numeroDeMano + 1}: faltan cartas. Eq1: ${cartaEq1?.getNombre() ?? 'null'}, Eq2: ${cartaEq2?.getNombre() ?? 'null'}`);
            this.ronda.callbacks.displayLog(`Mano ${this.ronda.numeroDeMano + 1}: ERROR INTERNO`, 'debug');
            this.ronda.equipoEnTurno = this.ronda.equipoMano;
            return; // Salir para evitar más errores
        }

        // Comparar valores para determinar ganador
        if (cartaEq1.valor > cartaEq2.valor) { // Usar valor de truco
            ganadorManoEquipo = this.ronda.equipoPrimero;
            cartaGanadora = cartaEq1;
            jugadorGanador = this.ronda.equipoPrimero.jugador;
            jugadaGanadoraIndex = 0;
        } else if (cartaEq2.valor > cartaEq1.valor) { // Usar valor de truco
            ganadorManoEquipo = this.ronda.equipoSegundo;
            cartaGanadora = cartaEq2;
            jugadorGanador = this.ronda.equipoSegundo.jugador;
            jugadaGanadoraIndex = 1;
        } else { // Empate (Parda)
            ganadorManoEquipo = null; // Nadie gana la mano
             this.logDebug(`Mano ${this.ronda.numeroDeMano + 1}: Parda (${cartaEq1.getNombre()} vs ${cartaEq2.getNombre()})`);
            // En caso de parda, la mano siguiente la empieza el que es mano de la ronda
            this.ronda.equipoEnTurno = this.ronda.equipoMano;
            // No se incrementa manosGanadasRonda
        }

        // Si hubo un ganador para esta mano específica
        if (ganadorManoEquipo && cartaGanadora && jugadorGanador) {
            this.logDebug(`Mano ${this.ronda.numeroDeMano + 1}: Gana ${ganadorManoEquipo.jugador.nombre} (${cartaGanadora.getNombre()})`);
            ganadorManoEquipo.manosGanadasRonda++; // Incrementar contador del equipo
            // El ganador de la mano empieza la siguiente mano
            this.ronda.equipoEnTurno = ganadorManoEquipo;

            // Callback opcional para resaltar la carta ganadora en la UI
            if (this.ronda.callbacks.highlightWinningCard) {
                 this.ronda.callbacks.highlightWinningCard(jugadorGanador, this.ronda.numeroDeMano, jugadaGanadoraIndex);
            }
        }
    }

    /** Se llama cuando el estado es ManoTerminada. Resuelve la mano y decide si la ronda continúa o termina. */
    public procesarFinDeMano(): void {
        this.resolverManoActual(); // Determina ganador de la mano actual y actualiza contadores

        // Verificar si la ronda ya tiene un ganador basado en manos ganadas
        const ganadorRonda = this.determinarGanadorRonda();

        if (ganadorRonda !== null) {
            // Si ya hay ganador de la ronda, terminarla
            this.ronda.estadoRonda = EstadoRonda.RondaTerminada;
            this.logDebug(`Ronda determinada por manos: Gana ${ganadorRonda.jugador.nombre}`);
        } else if (this.ronda.numeroDeMano >= 2) {
             // Si se jugaron las 3 manos y aún no hay ganador claro (ej. triple parda o 1-1 y parda)
             // El método determinarGanadorRonda debería haber resuelto esto, pero como fallback:
            this.ronda.estadoRonda = EstadoRonda.RondaTerminada;
             // Determinar ganador final por si acaso (mano gana en triple parda o 1-1 parda)
             const ganadorFinalFallback = this.ronda.equipoMano;
             this.logDebug(`Ronda determinada al final de 3 manos: Gana ${ganadorFinalFallback.jugador.nombre} (por ser mano en empate/parda)`);
             // Aquí no asignamos puntos, solo determinamos estado. La lógica de puntos está en Ronda.finalizarRondaLogica
        } else {
            // Si la ronda aún no termina, pasar a la siguiente mano
            this.ronda.numeroDeMano++;
            this.ronda.callbacks.setNumeroMano(this.ronda.numeroDeMano); // Informar a la UI cambio de mano
            this.jugadasEnManoActual = 0; // Resetear contador de jugadas para la nueva mano

            // Establecer estado inicial de la nueva mano
            this.ronda.estadoRonda = EstadoRonda.InicioMano;

            // El turno para la siguiente mano ya fue asignado en resolverManoActual()
             this.logDebug(`Iniciando Mano ${this.ronda.numeroDeMano + 1}. Turno de ${this.ronda.equipoEnTurno.jugador.nombre}`);
        }
    }

    /**
     * Determina el ganador de la ronda basado en las manos ganadas,
     * aplicando reglas de parda para terminar la ronda antes si es posible.
     * Se llama DESPUÉS de que una mano ha sido resuelta.
     * @returns El Equipo ganador de la ronda, o null si la ronda aún no está definida.
     */
    public determinarGanadorRonda(): Equipo | null {
        const e1 = this.ronda.equipoPrimero;
        const e2 = this.ronda.equipoSegundo;
        // La mano que ACABA de terminar (0, 1, o 2)
        const manoQueTermino = this.ronda.numeroDeMano;
        if (e1.manosGanadasRonda >= 2) return e1;
        if (e2.manosGanadasRonda >= 2) return e2;

        // --- REGLAS DE PARDA (Solo aplican DESPUÉS de terminar la mano 2 o 3) ---

        // --- Checks después de terminar Mano 2 (manoQueTermino === 1) ---
        if (manoQueTermino === 1) {
            const ganadorM0 = this.getGanadorManoEspecifica(0); // Resultado Mano 1
            const ganadorM1 = this.getGanadorManoEspecifica(1); // Resultado Mano 2 (recién terminada)

            // Regla: Parda Primera, Gana Segunda -> Gana el de la Segunda
            // (Esto ya está cubierto por el chequeo de >= 2 manos ganadas arriba)
            // if (ganadorM0 === null && ganadorM1) return ganadorM1;

            // Regla: Gana Primera, Parda Segunda -> Gana el de la Primera
            if (ganadorM0 && ganadorM1 === null) return ganadorM0;

            // Regla: Gana Primera, Parda Segunda -> Gana el de la Primera
            if (ganadorM1 && ganadorM0 === null) return ganadorM1;

            // Otros casos (1-1, Parda-Parda) -> La ronda continúa a mano 3
            return null;
        }

        // --- Checks después de terminar Mano 3 (manoQueTermino === 2) ---
        if (manoQueTermino === 2) {
            // El chequeo de >= 2 manos ganadas ya cubre Gana-Gana-X, Gana-X-Gana, X-Gana-Gana.

            const ganadorM0 = this.getGanadorManoEspecifica(0);
            const ganadorM1 = this.getGanadorManoEspecifica(1);
            const ganadorM2 = this.getGanadorManoEspecifica(2); // Mano 3 recién terminada

            // Regla: 1-1 después de Mano 2, y Mano 3 es Parda -> Gana el que ganó la Primera (M0)
            // Verificamos contando manos ganadas explícitamente
            if (e1.manosGanadasRonda === 1 && e2.manosGanadasRonda === 1 && ganadorM2 === null) {
                this.logDebug("Resolución: 1-1 y Parda en 3ra -> Gana quien ganó la 1ra.");
                // Si la primera también fue parda, gana el mano de la ronda
                return ganadorM0 ? ganadorM0 : this.ronda.equipoMano;
            }

            // Regla: Triple Parda -> Gana Mano
            if (ganadorM0 === null && ganadorM1 === null && ganadorM2 === null) {
                this.logDebug("Resolución: Triple Parda -> Gana Mano de Ronda.");
                return this.ronda.equipoMano;
            }
            // Regla: Gana M0, Parda M1, Parda M2 -> Gana M0
            if (ganadorM0 && ganadorM1 === null && ganadorM2 === null) {
                this.logDebug("Resolución: Gana M0, Parda M1, Parda M2 -> Gana M0.");
                return ganadorM0;
            }
            // Regla: Parda M0, Gana M1, Parda M2 -> Gana M1
            if (ganadorM0 === null && ganadorM1 && ganadorM2 === null) {
                this.logDebug("Resolución: Parda M0, Gana M1, Parda M2 -> Gana M1.");
                return ganadorM1;
            }
            // Si ninguna regla define un ganador claro (no debería pasar después de 3 manos)
            console.warn("determinarGanadorRonda: No se pudo determinar ganador después de 3 manos, fallback a Mano.");
            return this.ronda.equipoMano; // Fallback: el mano gana
        }
        return null;
    }

     /** Helper para obtener el ganador de una mano específica (0, 1 o 2) */
     private getGanadorManoEspecifica(numeroMano: number): Equipo | null {
        if (numeroMano < 0 || numeroMano > 2) return null;
        const idxCartaEq1 = numeroMano * 2 + 0;
        const idxCartaEq2 = numeroMano * 2 + 1;
        const cartaEq1 = this.cartasMesa[idxCartaEq1];
        const cartaEq2 = this.cartasMesa[idxCartaEq2];

        if (!cartaEq1 || !cartaEq2) return this.ronda.equipoMano; // Si faltan cartas, default a mano? Revisar regla. O null? Null es más seguro.

        return this.determinarGanadorManoLogica(cartaEq1, cartaEq2); // Devuelve Equipo o null (parda)
    }


    /** Devuelve la última carta jugada por un equipo específico */
    public getUltimaCartaJugadaPor(equipo: Equipo): Naipe | null {
        const esEquipo1 = equipo === this.ronda.equipoPrimero;
        // Buscar desde la mano actual hacia atrás
        for (let mano = this.ronda.numeroDeMano; mano >= 0; mano--) {
            const idx = mano * 2 + (esEquipo1 ? 0 : 1); // Calcular índice correcto
            if (this.cartasMesa[idx]) {
                return this.cartasMesa[idx]; // Devolver la primera carta encontrada
            }
        }
        return null; // No jugó ninguna carta
    }

    /** Devuelve los resultados de las manos 0 y 1 para un equipo específico (-1: perdió, 0: empató, 1: ganó) */
    public getResultadosManosAnteriores(equipoReferencia: Equipo): { resMano0: number, resMano1: number } {
        let resMano0 = 0; // Resultado mano 0
        let resMano1 = 0; // Resultado mano 1

        // Calcular resultado Mano 0 (si se jugó)
        if (this.ronda.numeroDeMano >= 0) { // La mano 0 siempre se intenta jugar si la ronda empezó
            const ganadorM0 = this.getGanadorManoEspecifica(0);
            if (ganadorM0 === equipoReferencia) resMano0 = 1;
            else if (ganadorM0 === null) resMano0 = 0; // Parda
            else if (ganadorM0) resMano0 = -1; // Ganó el oponente
            // Si ganadorM0 es null (porque faltan cartas), resMano0 queda en 0 (o manejar como error?)
        }

        // Calcular resultado Mano 1 (si se jugó)
        if (this.ronda.numeroDeMano >= 1) {
            const ganadorM1 = this.getGanadorManoEspecifica(1);
            if (ganadorM1 === equipoReferencia) resMano1 = 1;
            else if (ganadorM1 === null) resMano1 = 0; // Parda
            else if (ganadorM1) resMano1 = -1; // Ganó el oponente
        }

        return { resMano0, resMano1 };
    }

    /** Devuelve el equipo que debería jugar después en una mano específica */
    public getEquipoQueSigueMano(mano: number): Equipo {
         // El que empieza la mano 0 es el mano de la ronda
        if (mano === 0) return this.ronda.equipoMano;
        // Para manos 1 y 2, empieza el ganador de la mano anterior
        const ganadorAnterior = this.getGanadorManoEspecifica(mano - 1);
         // Si hubo parda anterior, empieza el mano de la ronda
        return ganadorAnterior || this.ronda.equipoMano;
    }

     /** Devuelve el ganador de la última mano completada */
    public getGanadorUltimaMano(): Equipo | null {
        if (this.ronda.numeroDeMano === 0 && this.jugadasEnManoActual < 2) {
            return null; // No se completó ninguna mano aún
        }
        // Obtener número de la última mano completada
        const ultimaManoCompleta = (this.jugadasEnManoActual === 2)
                                    ? this.ronda.numeroDeMano
                                    : this.ronda.numeroDeMano - 1;

        if (ultimaManoCompleta < 0) return null;

        return this.getGanadorManoEspecifica(ultimaManoCompleta);
    }

    /** Devuelve las cartas jugadas en una mano específica */
    public getCartasMano(mano: number): { cartaEq1: Naipe | null; cartaEq2: Naipe | null } | null {
        if (mano < 0 || mano > 2) return null;
        const idxEq1 = mano * 2;
        const idxEq2 = mano * 2 + 1;
        return {
            cartaEq1: this.cartasMesa[idxEq1],
            cartaEq2: this.cartasMesa[idxEq2]
        };
    }

    /** Devuelve las cartas jugadas en la mano actual por el jugador actual y el oponente */
    public getCartasManoActual(equipoReferencia: Equipo): { cartaJugadorActual: Naipe | null, cartaOponenteActual: Naipe | null } {
        const manoActual = this.ronda.numeroDeMano;
        const esEquipo1 = equipoReferencia === this.ronda.equipoPrimero;
        // Índice de la carta del jugador de referencia en la mano actual
        const idxJugador = manoActual * 2 + (esEquipo1 ? 0 : 1);
        // Índice de la carta del oponente en la mano actual
        const idxOponente = manoActual * 2 + (esEquipo1 ? 1 : 0);
        return {
            cartaJugadorActual: this.cartasMesa[idxJugador],
            cartaOponenteActual: this.cartasMesa[idxOponente]
        };
    }

    /** Lógica pura para determinar el ganador entre dos cartas */
    private determinarGanadorManoLogica(cartaEq1: Naipe, cartaEq2: Naipe): Equipo | null {
        if (cartaEq1.valor > cartaEq2.valor) {
            return this.ronda.equipoPrimero;
        } else if (cartaEq2.valor > cartaEq1.valor) {
            return this.ronda.equipoSegundo;
        } else {
            return null; // Parda
        }
    }

    /** Getter público para las cartas en la mesa */
    public getCartasMesa(): (Naipe | null)[] {
        return [...this.cartasMesa];
    }

    /** Logger interno para modo debug */
    private logDebug(mensaje: string): void {
         if (this.ronda.debugMode) { // Solo loguear si el modo debug está activo
            // Usar displayLog para que aparezca en la UI también
             this.ronda.callbacks.displayLog(`TurnoHandler: ${mensaje}`, 'debug');
         }
    }
}