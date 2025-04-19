import { Ronda, EstadoRonda } from './ronda';
import { IA } from './ia';
import { Equipo } from './types';
import { Naipe } from './naipe';
import { Jugador } from './jugador';
import { shuffleArray } from './utils';

export class RondaTurnoHandler {
    private ronda: Ronda;


    public cartasMesa: (Naipe | null)[] = Array(6).fill(null);
    public jugadasEnManoActual: number = 0;


    constructor(ronda: Ronda) {
        this.ronda = ronda;
    }


    public nuevaRonda(): void {
        this.cartasMesa = Array(6).fill(null);
        this.jugadasEnManoActual = 0;
    }


    public repartirCartas(): void {
        const baraja = Naipe.generarBarajaCompleta();
        shuffleArray(baraja);
        const cartasJ1: Naipe[] = [];
        const cartasJ2: Naipe[] = [];
        const equipoMano = this.ronda.equipoMano;
        const equipoPie = this.ronda.equipoPie;

        for (let i = 0; i < 6; i++) {
            const carta = baraja.pop();
            if (!carta) throw new Error("Error al repartir, mazo vacío.");
            if (i % 2 === 0) {
                const jugadorRecibe = equipoPie.jugador;
                (jugadorRecibe === this.ronda.equipoPrimero.jugador ? cartasJ1 : cartasJ2).push(carta);
            } else {
                const jugadorRecibe = equipoMano.jugador;
                (jugadorRecibe === this.ronda.equipoPrimero.jugador ? cartasJ1 : cartasJ2).push(carta);
            }
        }

        // Asignar cartas y limpiar jugadas previas
        this.ronda.equipoPrimero.jugador.cartas = [...cartasJ1];
        this.ronda.equipoPrimero.jugador.cartasEnMano = [...cartasJ1];
        this.ronda.equipoPrimero.jugador.cartasJugadasRonda = [];

        this.ronda.equipoSegundo.jugador.cartas = [...cartasJ2];
        this.ronda.equipoSegundo.jugador.cartasEnMano = [...cartasJ2];
        this.ronda.equipoSegundo.jugador.cartasJugadasRonda = [];

        if (this.ronda.debugMode) {
            this.logDebug(`Cartas ${this.ronda.equipoPrimero.jugador.nombre}: ${cartasJ1.map(c => c.getNombre()).join(', ')}`);
            this.logDebug(`Cartas ${this.ronda.equipoSegundo.jugador.nombre}: ${cartasJ2.map(c => c.getNombre()).join(', ')}`);
            this.logDebug(`${this.ronda.equipoPrimero.jugador.nombre} Envido=${this.ronda.equipoPrimero.jugador.getPuntosDeEnvido(cartasJ1)}`);
            this.logDebug(`${this.ronda.equipoSegundo.jugador.nombre} Envido=${this.ronda.equipoSegundo.jugador.getPuntosDeEnvido(cartasJ2)}`);
        }
    }

    public puedeJugarCarta(): boolean {
        const estado = this.ronda.estadoRonda;
        return (estado === EstadoRonda.EsperandoJugadaNormal || estado === EstadoRonda.InicioMano) &&
            !this.ronda.envidoHandler.equipoDebeResponderEnvido &&
            !this.ronda.trucoHandler.equipoDebeResponderTruco;
    }


    public registrarJugada(carta: Naipe, equipoQueJuega: Equipo): boolean {
        if (equipoQueJuega !== this.ronda.equipoEnTurno) {
            this.logDebug(`Jugó ${equipoQueJuega.jugador.nombre} fuera de turno.`);
            return false;
        }


        if (!this.puedeJugarCarta()) {
            this.logDebug(`Intento de jugar carta por ${equipoQueJuega.jugador.nombre} en estado inválido: ${EstadoRonda[this.ronda.estadoRonda]}`);
            return false;
        }

        const jugador = equipoQueJuega.jugador;
        try {
            jugador.registrarCartaJugadaPorObjeto(carta); // Usar el nuevo método
        } catch (error) {
            this.logDebug(`${jugador.nombre} intentó jugar la carta ${carta.getNombre()} pero no se encontró en su mano.`);
            this.ronda.callbacks.displayLog((error as Error).message, 'public');
            return false;
        }


        const playerIndex = equipoQueJuega === this.ronda.equipoPrimero ? 0 : 1;
        const mesaIndex = this.ronda.numeroDeMano * 2 + playerIndex;


        if (mesaIndex < 0 || mesaIndex >= this.cartasMesa.length) {
            this.logDebug(`Índice de mesa inválido ${mesaIndex} al jugar ${carta.getNombre()} en mano ${this.ronda.numeroDeMano}`);
            return false;
        }
        this.cartasMesa[mesaIndex] = carta;


        this.ronda.callbacks.displayPlayedCard(jugador, carta, this.ronda.numeroDeMano, playerIndex);
        this.ronda.callbacks.displayPlayerCards(jugador);


        this.jugadasEnManoActual++;
        this.ronda.envidoHandler.onCartaJugada();
        this.ronda.equipoEnTurno = this.ronda.getOponente(equipoQueJuega);


        if (this.jugadasEnManoActual === 2) {
            this.ronda.estadoRonda = EstadoRonda.ManoTerminada;
        } else {
            this.ronda.estadoRonda = EstadoRonda.EsperandoJugadaNormal;
        }
        return true;
    }

    public procesarTurnoNormalIA(): void {
        const iaJugador = this.ronda.equipoEnTurno.jugador as IA;

        if (!this.puedeJugarCarta()) {
            this.logDebug(`IA ${iaJugador.nombre} intentó jugar carta pero no era posible.`);
            this.ronda.estadoRonda = EstadoRonda.RondaTerminada;
            return;
        }


        const cartaJugada = iaJugador.jugarCarta(this.ronda);
        this.registrarJugada(cartaJugada, this.ronda.equipoEnTurno);
    }

    private resolverManoActual(): void {
        const idxEq1 = 0;
        const idxEq2 = 1;

        const idxCartaEq1 = this.ronda.numeroDeMano * 2 + idxEq1;
        const idxCartaEq2 = this.ronda.numeroDeMano * 2 + idxEq2;
        const cartaEq1 = this.cartasMesa[idxCartaEq1];
        const cartaEq2 = this.cartasMesa[idxCartaEq2];


        let ganadorManoEquipo: Equipo | null = null;
        let cartaGanadora: Naipe | null = null;
        let jugadorGanador: Jugador | null = null;
        let jugadaGanadoraIndex = -1;


        if (!cartaEq1 || !cartaEq2) {
            this.logDebug(`Error al resolver mano ${this.ronda.numeroDeMano}: faltan cartas. Eq1: ${cartaEq1?.getNombre() || 'null'}, Eq2: ${cartaEq2?.getNombre() || 'null'}`);
            this.ronda.callbacks.displayLog(`Mano ${this.ronda.numeroDeMano + 1}: ERROR`, 'debug');
            this.ronda.equipoEnTurno = this.ronda.equipoMano;
            return;
        }


        if (cartaEq1.valor > cartaEq2.valor) {
            ganadorManoEquipo = this.ronda.equipoPrimero;
            cartaGanadora = cartaEq1;
            jugadorGanador = this.ronda.equipoPrimero.jugador;
            jugadaGanadoraIndex = idxEq1;
        } else if (cartaEq2.valor > cartaEq1.valor) {
            ganadorManoEquipo = this.ronda.equipoSegundo;
            cartaGanadora = cartaEq2;
            jugadorGanador = this.ronda.equipoSegundo.jugador;
            jugadaGanadoraIndex = idxEq2;
        } else {
            ganadorManoEquipo = null;
            this.ronda.callbacks.displayLog(`Mano ${this.ronda.numeroDeMano + 1}: Parda`, 'debug');
            this.ronda.equipoEnTurno = this.ronda.equipoMano;


            return;
        }

        // Si hubo ganador
        this.logDebug(`Mano ${this.ronda.numeroDeMano + 1}: Gana <span class="math-inline">\{ganadorManoEquipo\.jugador\.nombre\} \(</span>{cartaGanadora?.getNombre()})`);
        ganadorManoEquipo.manosGanadasRonda++;
        this.ronda.equipoEnTurno = ganadorManoEquipo;


        if (this.ronda.callbacks.highlightWinningCard && jugadorGanador && cartaGanadora) {
            this.ronda.callbacks.highlightWinningCard(jugadorGanador, this.ronda.numeroDeMano, jugadaGanadoraIndex);
        }
    }

    public procesarFinDeMano(): void {
        this.resolverManoActual();
        const ganadorRonda = this.determinarGanadorRonda();


        if (ganadorRonda !== null) {
            this.ronda.estadoRonda = EstadoRonda.RondaTerminada;
        } else if (this.ronda.numeroDeMano >= 2) {
            this.ronda.estadoRonda = EstadoRonda.RondaTerminada;
        } else {
            this.ronda.numeroDeMano++;
            this.ronda.callbacks.setNumeroMano(this.ronda.numeroDeMano);
            this.jugadasEnManoActual = 0;
            this.ronda.callbacks.clearPlayedCards();
            this.ronda.estadoRonda = EstadoRonda.InicioMano;


            const ganadorAnterior = this.getGanadorUltimaMano();
            if (this.ronda.numeroDeMano === 1) {
                // Primera mano terminada, para la segunda juega el ganador
                this.ronda.equipoEnTurno = ganadorAnterior || this.ronda.equipoMano;
            } else if (this.ronda.numeroDeMano === 2) {
                // Segunda mano terminada, para la tercera juega el ganador
                this.ronda.equipoEnTurno = ganadorAnterior || this.ronda.equipoMano;
            }
        }
    }

    public determinarGanadorRonda(): Equipo | null {
        const e1 = this.ronda.equipoPrimero;
        const e2 = this.ronda.equipoSegundo;

        // Caso simple: Alguien ganó 2 o 3 manos
        if (e1.manosGanadasRonda >= 2) return e1;
        if (e2.manosGanadasRonda >= 2) return e2;


        // Casos con pardas después de 3 manos
        if (this.ronda.numeroDeMano >= 2) {
            // Empate 1-1: gana el mano
            if (e1.manosGanadasRonda === 1 && e2.manosGanadasRonda === 1) {
                return this.ronda.equipoMano;
            }
            // Si alguien ganó solo la última mano (y las otras fueron pardas)
            if (e1.manosGanadasRonda === 1 && e2.manosGanadasRonda === 0) return e1;
            if (e2.manosGanadasRonda === 1 && e1.manosGanadasRonda === 0) return e2;


            // Triple parda: gana el mano de la ronda
            if (e1.manosGanadasRonda === 0 && e2.manosGanadasRonda === 0) {
                return this.ronda.equipoMano;
            }
        }
        return null;
    }

    public getUltimaCartaJugadaPor(equipo: Equipo): Naipe | null {
        const esEquipo1 = equipo === this.ronda.equipoPrimero;
        for (let mano = this.ronda.numeroDeMano; mano >= 0; mano--) {
            const idx = mano * 2 + (esEquipo1 ? 0 : 1);
            if (this.cartasMesa[idx]) {
                return this.cartasMesa[idx];
            }
        }
        return null;
    }

    public getResultadosManosAnteriores(equipo: Equipo): { resMano0: number, resMano1: number } {
        let resMano0 = 0;
        let resMano1 = 0;


        // Mano 0
        const cartaEq1M0 = this.cartasMesa[0];
        const cartaEq2M0 = this.cartasMesa[1];
        if (this.ronda.numeroDeMano > 0 && cartaEq1M0 && cartaEq2M0) {
            const ganadorM0 = this.determinarGanadorManoLogica(cartaEq1M0, cartaEq2M0);
            if (ganadorM0 === equipo) resMano0 = 1;
            else if (ganadorM0 === null) resMano0 = 0;
            else resMano0 = -1;
        }


        // Mano 1
        const cartaEq1M1 = this.cartasMesa[2];
        const cartaEq2M1 = this.cartasMesa[3];
        if (this.ronda.numeroDeMano > 1 && cartaEq1M1 && cartaEq2M1) {
            const ganadorM1 = this.determinarGanadorManoLogica(cartaEq1M1, cartaEq2M1);
            if (ganadorM1 === equipo) resMano1 = 1;
            else if (ganadorM1 === null) resMano1 = 0;
            else resMano1 = -1;
        }
        return { resMano0, resMano1 };
    }
    // ronda-turno.ts
    public getEquipoQueSigueMano(mano: number): Equipo {
        // Lógica para determinar el equipo que sigue en la mano (mano 0, 1 o 2)
        return mano === 0 ? this.ronda.equipoMano : this.ronda.getOponente(this.ronda.equipoMano);
    }
    public getGanadorUltimaMano(): Equipo | null {
        // No hay mano anterior si estamos en la mano 0
        if (this.ronda.numeroDeMano === 0) {
            return null;
        }
        // Obtenemos los detalles de la mano anterior
        const manoAnterior = this.getCartasMano(this.ronda.numeroDeMano - 1);
        // Si no pudimos obtener detalles de la mano anterior, no hay ganador
        if (!manoAnterior) {
            return null;
        }
        if (manoAnterior.cartaEq1 && manoAnterior.cartaEq2) {
            const ganador = this.determinarGanadorManoLogica(manoAnterior.cartaEq1, manoAnterior.cartaEq2);
            return ganador;
        } else {
            this.logDebug(`No se pueden comparar las cartas de la mano ${this.ronda.numeroDeMano - 1} porque una o ambas faltan.`);
            return null; // No se puede determinar el ganador si faltan cartas
        }
    }

    public getCartasMano(mano: number): { cartaEq1: Naipe | null; cartaEq2: Naipe | null } | null {
        if (mano < 0 || mano > 2) return null;
        const idxEq1 = mano * 2;
        const idxEq2 = mano * 2 + 1;
        return {
            cartaEq1: this.cartasMesa[idxEq1],
            cartaEq2: this.cartasMesa[idxEq2]
        };
    }

    public getCartasManoActual(equipo: Equipo): { cartaJugadorActual: Naipe | null, cartaOponenteActual: Naipe | null } {
        const manoActual = this.ronda.numeroDeMano;
        const esEquipo1 = equipo === this.ronda.equipoPrimero;
        const idxJugador = manoActual * 2 + (esEquipo1 ? 0 : 1);
        const idxOponente = manoActual * 2 + (esEquipo1 ? 1 : 0);
        return { 
            cartaJugadorActual: this.cartasMesa[idxJugador], 
            cartaOponenteActual: this.cartasMesa[idxOponente] 
        };
    }

    private determinarGanadorManoLogica(cartaEq1: Naipe, cartaEq2: Naipe): Equipo | null {
        if (cartaEq1.valor > cartaEq2.valor) {
            return this.ronda.equipoPrimero;
        } else if (cartaEq2.valor > cartaEq1.valor) {
            return this.ronda.equipoSegundo;
        } else {
            return null; // Parda
        }
    }

    public getCartasMesa(): (Naipe | null)[] {
        return this.cartasMesa;
    }
    private logDebug(mensaje: string): void {
        this.ronda.callbacks.displayLog(mensaje, 'public');
    }
}