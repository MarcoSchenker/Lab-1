import { Jugador } from './jugador';
import { IA } from './ia';
import { Ronda } from './ronda';
import { AccionesPosibles, Canto, Equipo } from './types';
import { GameCallbacks } from '../game-callbacks';
import { getRandomInt } from './utils'; // Asegúrate de que esta función esté implementada

export class Partida {
    public equipoPrimero: Equipo; // Humano
    public equipoSegundo: Equipo; // IA
    public limitePuntaje: number = 30;
    private callbacks: GameCallbacks;
    private debugMode: boolean = false;
    private partidaTerminada: boolean = false;
    private rondaActual: Ronda | null = null;
    private primeraRonda: boolean = true; // Flag para la primera ronda

    constructor(gameCallbacks: GameCallbacks, debug: boolean = false) {
        this.callbacks = gameCallbacks;
        this.debugMode = debug;

        // Inicializar equipos
        this.equipoPrimero = { jugador: null!, puntos: 0, esMano: false, manosGanadasRonda: 0 };
        this.equipoSegundo = { jugador: null!, puntos: 0, esMano: false, manosGanadasRonda: 0 };
    }

    public iniciar(nombreJugadorUno: string, nombreJugadorDos: string, limite: number = 15): void {
        this.partidaTerminada = false;
        this.primeraRonda = true; // Marcar que es la primera ronda
        this.limitePuntaje = limite;

        this.equipoPrimero.jugador = new Jugador(nombreJugadorUno, true);
        this.equipoSegundo.jugador = new IA(nombreJugadorDos);

        this.equipoPrimero.puntos = 0;
        this.equipoSegundo.puntos = 0;

        // Decidir quién es mano en la primera ronda aleatoriamente
        const humanoEsManoPrimero = getRandomInt(0, 1) === 0; // 0 o 1
        this.equipoPrimero.esMano = humanoEsManoPrimero;
        this.equipoSegundo.esMano = !humanoEsManoPrimero;

        this.callbacks.updatePlayerNames(nombreJugadorUno, nombreJugadorDos);
        this.callbacks.updateScores(0, 0);
        this.callbacks.clearLog();
        this.callbacks.displayLog("== Partida Iniciada ==");
        if (this.debugMode) {
            this.callbacks.displayLog(`Debug: ${humanoEsManoPrimero ? nombreJugadorUno : nombreJugadorDos} empieza siendo mano.`);
        }

        // Iniciar la primera ronda
        this.continuar();
    }

    public continuar(): void {
        if (this.partidaTerminada) {
            console.warn("Intento de continuar una partida ya terminada.");
            return;
        }

        if (this.equipoPrimero.puntos >= this.limitePuntaje || this.equipoSegundo.puntos >= this.limitePuntaje) {
            this.finalizarPartida();
            return;
        }

        this.callbacks.updateScores(this.equipoPrimero.puntos, this.equipoSegundo.puntos);

        // Alternar quién es mano, excepto en la primera ronda
        if (!this.primeraRonda) {
            const tempMano = this.equipoPrimero.esMano;
            this.equipoPrimero.esMano = this.equipoSegundo.esMano;
            this.equipoSegundo.esMano = tempMano;
        } else {
            this.primeraRonda = false;
        }

        if (this.debugMode) {
            this.callbacks.displayLog(`Debug: ${this.equipoPrimero.esMano ? this.equipoPrimero.jugador.nombre : this.equipoSegundo.jugador.nombre} es mano esta ronda.`);
        }

        const nuevaRonda = new Ronda(
            this.equipoPrimero,
            this.equipoSegundo,
            this.callbacks,
            (puntosEq1, puntosEq2) => this.onRondaTerminadaCallback(puntosEq1, puntosEq2),
            this.limitePuntaje,
            this.debugMode
        );
        this.rondaActual = nuevaRonda;
        this.rondaActual.iniciar();
    }

    private onRondaTerminadaCallback(puntosEq1: number, puntosEq2: number): void {
        this.equipoPrimero.puntos += puntosEq1;
        this.equipoSegundo.puntos += puntosEq2;
        this.rondaActual = null;

        if (this.debugMode) {
            this.callbacks.displayLog(`Fin Ronda. Puntos Ronda: E1=${puntosEq1}, E2=${puntosEq2}. Total: E1=${this.equipoPrimero.puntos}, E2=${this.equipoSegundo.puntos}`);
        }

        setTimeout(() => {
            this.continuar();
        }, 1500);
    }

    private finalizarPartida(): void {
        this.partidaTerminada = true;
        this.rondaActual = null;

        const accionesDeshabilitadas: AccionesPosibles = {
            puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false
        };
        this.callbacks.actualizarAccionesPosibles(accionesDeshabilitadas);
        this.callbacks.setPartidaTerminada();

        const ganador = this.equipoPrimero.puntos >= this.limitePuntaje ? this.equipoPrimero : this.equipoSegundo;
        const perdedor = ganador === this.equipoPrimero ? this.equipoSegundo : this.equipoPrimero;

        this.callbacks.displayLog("=======================");
        this.callbacks.displayLog(`¡PARTIDA TERMINADA!`);
        this.callbacks.displayLog(`Ganador: ${ganador.jugador.nombre} (${ganador.puntos})`);
        this.callbacks.displayLog(`Perdedor: ${perdedor.jugador.nombre} (${perdedor.puntos})`);
        this.callbacks.displayLog("=======================");

        this.callbacks.displayPlayerCards(this.equipoPrimero.jugador);
        this.callbacks.clearPlayedCards();
    }

    public handleHumanPlayCard(index: number): void {
        if (this.rondaActual && !this.partidaTerminada) {
            this.rondaActual.handleHumanPlayCard(index);
        } else {
            console.warn("Intento de jugar carta sin ronda activa o partida terminada.");
            this.callbacks.displayLog("Error: No se puede jugar ahora.");
        }
    }

    public handleHumanCanto(canto: Canto): void {
        if (this.rondaActual && !this.partidaTerminada) {
            this.rondaActual.handleHumanCanto(canto);
        } else {
            console.warn("Intento de cantar sin ronda activa o partida terminada.");
            this.callbacks.displayLog("Error: No se puede cantar ahora.");
        }
    }

    public setLimitePuntaje(limite: number): void {
        this.limitePuntaje = limite;
        this.callbacks.displayLog(`Límite de puntaje cambiado a: ${limite}`);
    }

    public setDebugMode(activado: boolean): void {
        this.debugMode = activado;
        this.callbacks.displayLog(`Modo Debug: ${activado ? 'Activado' : 'Desactivado'}`);
        if (this.rondaActual) {
            this.rondaActual.setDebugMode(activado);
        }
    }

    public getRondaActual(): Ronda | null {
        return this.rondaActual;
    }
}