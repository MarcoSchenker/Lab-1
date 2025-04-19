import { Jugador } from './jugador';
import { IA } from './ia';
import { Ronda } from './ronda';
import { AccionesPosibles, Canto, Equipo } from './types';
import { GameCallbacks } from '../game-callbacks';
import { getRandomInt } from './utils'; // Asegúrate de que esta función esté implementada
import { Naipe } from './naipe';

export class Partida {
    public equipoPrimero: Equipo;
    public equipoSegundo: Equipo;
    public limitePuntaje: number = 30;
    private callbacks: GameCallbacks;
    private debugMode: boolean = false;
    private partidaTerminada: boolean = false;
    private rondaActual: Ronda | null = null;
    private primeraRonda: boolean = true;

    constructor(gameCallbacks: GameCallbacks, debug: boolean = false) {
        this.callbacks = gameCallbacks;
        this.debugMode = debug;

        this.equipoPrimero = { jugador: null!, puntos: 0, esMano: false, manosGanadasRonda: 0};
        this.equipoSegundo = { jugador: null!, puntos: 0, esMano: false, manosGanadasRonda: 0};
    }

    public iniciar(nombreJugadorUno: string, nombreJugadorDos: string, limite: number = 30): void {
        if (this.partidaTerminada) {
            console.warn("Intento de iniciar una partida ya terminada.");
            return;
        }

        this.partidaTerminada = false;
        this.primeraRonda = true;
        this.limitePuntaje = limite;

        this.equipoPrimero.jugador = new Jugador(nombreJugadorUno, true);
        this.equipoSegundo.jugador = new IA(nombreJugadorDos);

        this.equipoPrimero.puntos = 0;
        this.equipoSegundo.puntos = 0;

        const humanoEsManoPrimero = getRandomInt(0, 1) === 0;
        this.equipoPrimero.esMano = humanoEsManoPrimero;
        this.equipoSegundo.esMano = !humanoEsManoPrimero;

        this.callbacks.updatePlayerNames(nombreJugadorUno, nombreJugadorDos);
        this.callbacks.updateScores(0, 0);
        this.callbacks.clearLog();
        this.callbacks.displayLog("== Partida Iniciada ==", 'public');
        if (this.debugMode) {
            this.callbacks.displayLog(`Debug: ${humanoEsManoPrimero ? nombreJugadorUno : nombreJugadorDos} empieza siendo mano.`, 'public');
        }

        this.continuar(); // Iniciar la primera ronda después de la configuración
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
            this.callbacks.displayLog(`Debug: ${this.equipoPrimero.esMano ? this.equipoPrimero.jugador.nombre : this.equipoSegundo.jugador.nombre} es mano esta ronda.`, 'public');
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
            this.callbacks.displayLog(`Fin Ronda. Puntos Ronda: E1=${puntosEq1}, E2=${puntosEq2}. Total: E1=${this.equipoPrimero.puntos}, E2=${this.equipoSegundo.puntos}`, 'public');
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

        this.callbacks.displayLog("=======================", 'public');
        this.callbacks.displayLog(`¡PARTIDA TERMINADA!`, 'public');
        this.callbacks.displayLog(`Ganador: ${ganador.jugador.nombre} (${ganador.puntos})`, 'public');
        this.callbacks.displayLog(`Perdedor: ${perdedor.jugador.nombre} (${perdedor.puntos})`, 'public');
        this.callbacks.displayLog("=======================", 'public');

        this.callbacks.displayPlayerCards(this.equipoPrimero.jugador);
        this.callbacks.clearPlayedCards();
    }

    public handleHumanPlayCard(carta: Naipe): void {
        if (this.rondaActual && !this.partidaTerminada) {
            this.rondaActual.handleHumanPlayCard(carta);
        } else {
            console.warn("Intento de jugar carta sin ronda activa o partida terminada.");
            this.callbacks.displayLog("Error: No se puede jugar ahora.", 'debug');
        }
    }

    public handleHumanCanto(canto: Canto): void {
        if (this.rondaActual && !this.partidaTerminada) {
            this.rondaActual.handleHumanCanto(canto);
        } else {
            console.warn("Intento de cantar sin ronda activa o partida terminada.");
            this.callbacks.displayLog("Error: No se puede cantar ahora.", 'debug');
        }
    }

    public setLimitePuntaje(limite: number): void {
        this.limitePuntaje = limite;
        this.callbacks.displayLog(`Límite de puntaje cambiado a: ${limite}`, 'public');
    }

    public setDebugMode(activado: boolean): void {
        this.debugMode = activado;
        this.callbacks.displayLog(`Modo Debug: ${activado ? 'Activado' : 'Desactivado'}`, 'debug');
        if (this.rondaActual) {
            this.rondaActual.setDebugMode(activado);
        }
    }

    public getRondaActual(): Ronda | null {
        return this.rondaActual;
    }
}