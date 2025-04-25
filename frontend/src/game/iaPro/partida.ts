// src/game/iaPro/partida.ts
import { Jugador } from './jugador';
import { IA } from './ia';
import { Ronda } from './ronda';
import { AccionesPosibles, Canto, Equipo } from './types';
import { GameCallbacks } from '../game-callbacks';
import { getRandomInt } from './utils';
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
    private ganadorPartida: Equipo | null;

    constructor(gameCallbacks: GameCallbacks, debug: boolean = false) {
        this.callbacks = gameCallbacks;
        this.debugMode = debug;

        // Inicializa equipos con placeholders o valores por defecto seguros
        this.equipoPrimero = { jugador: null!, puntos: 0, esMano: false, manosGanadasRonda: 0 };
        this.equipoSegundo = { jugador: null!, puntos: 0, esMano: false, manosGanadasRonda: 0 };
        this.ganadorPartida = null;
    }

    /**
     * Inicia una nueva partida, configurando jugadores, puntajes y la primera ronda.
     */
    public iniciar(nombreJugadorUno: string, nombreJugadorDos: string, limite: number = 30): void {
        if (this.partidaTerminada && !this.primeraRonda) {
            console.warn("Reiniciando una partida ya terminada.");
        }

        this.partidaTerminada = false;
        this.primeraRonda = true; // Marcar que es la primera ronda
        this.limitePuntaje = limite;

        // Crear jugadores
        this.equipoPrimero.jugador = new Jugador(nombreJugadorUno, true); // Humano
        this.equipoSegundo.jugador = new IA(nombreJugadorDos); // IA

        // Resetear puntajes
        this.equipoPrimero.puntos = 0;
        this.equipoSegundo.puntos = 0;

        // Determinar quién es mano al azar para la primera ronda
        const humanoEsManoPrimero = getRandomInt(0, 1) === 0;
        this.equipoPrimero.esMano = humanoEsManoPrimero;
        this.equipoSegundo.esMano = !humanoEsManoPrimero;

        // Actualizar UI inicial
        this.callbacks.updatePlayerNames(nombreJugadorUno, nombreJugadorDos);
        this.callbacks.updateScores(0, 0);
        this.callbacks.clearLog();
        this.callbacks.displayLog("==   Partida Iniciada  ==", 'public');
        if (this.debugMode) {
            this.callbacks.displayLog(`${humanoEsManoPrimero ? nombreJugadorUno : nombreJugadorDos} empieza siendo mano.`, 'debug');
        }

        // Iniciar la lógica de la primera ronda llamando a continuar
        this.continuar();
    }

    /**
     * Continúa la partida iniciando la siguiente ronda si no ha terminado.
     * Este método se llama al inicio y después de cada ronda.
     */
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

        // Alternar quién es mano, EXCEPTO en la primera ronda (ya se asignó en iniciar)
        if (!this.primeraRonda) {
            const tempMano = this.equipoPrimero.esMano;
            this.equipoPrimero.esMano = this.equipoSegundo.esMano;
            this.equipoSegundo.esMano = tempMano;
            if (this.debugMode) {
                this.callbacks.displayLog(`Debug: Se alterna la mano. Ahora es mano ${this.equipoPrimero.esMano ? this.equipoPrimero.jugador.nombre : this.equipoSegundo.jugador.nombre}.`, 'debug');
            }
        } else {
            // Después de la primera ronda, ya no es la primera
            this.primeraRonda = false;
        }
        this.callbacks.iniciarNuevaRondaUI();
        this.callbacks.displayLog(`Iniciando Ronda (Mano: ${this.equipoPrimero.esMano ? this.equipoPrimero.jugador.nombre : this.equipoSegundo.jugador.nombre})`, 'public');

        // Crear e iniciar la nueva instancia de Ronda
        const nuevaRonda = new Ronda(
            this.equipoPrimero,
            this.equipoSegundo,
            this.callbacks,
            // Callback que se ejecutará cuando la Ronda termine
            (puntosEq1: number, puntosEq2: number) => this.onRondaTerminadaCallback(puntosEq1, puntosEq2),
            this.limitePuntaje,
            this.debugMode
        );
        this.rondaActual = nuevaRonda;
        this.rondaActual.iniciar();
    }

    /**
     * Callback que se ejecuta cuando la clase Ronda publicrma que ha terminado.
     * @param puntosEq1 Puntos ganados por el equipo 1 en la ronda.
     * @param puntosEq2 Puntos ganados por el equipo 2 en la ronda.
     */
    private onRondaTerminadaCallback(puntosEq1: number, puntosEq2: number): void {
        this.equipoPrimero.puntos += puntosEq1;
        this.equipoSegundo.puntos += puntosEq2;
        this.rondaActual = null; // La ronda terminó

        if (this.debugMode) {
            this.callbacks.displayLog(`Debug: Fin Ronda. Puntos Ronda: ${this.equipoPrimero.jugador.nombre}=${puntosEq1}, ${this.equipoSegundo.jugador.nombre}=${puntosEq2}.`, 'debug');
        }
        this.callbacks.displayLog(`Puntaje Total: ${this.equipoPrimero.jugador.nombre}=${this.equipoPrimero.puntos}, ${this.equipoSegundo.jugador.nombre}=${this.equipoSegundo.puntos}`, 'public');
        setTimeout(() => {
            this.continuar();
        }, 2000);
    }
    private finalizarPartida(): void {
        this.partidaTerminada = true;
        this.rondaActual = null; // Asegurarse de que no hay ronda activa

        // Deshabilitar todas las acciones en la UI
        const accionesDeshabilitadas: AccionesPosibles = {
            puedeJugarCarta: false, puedeCantarEnvido: [], puedeCantarTruco: [], puedeResponder: [], puedeMazo: false
        };
        this.callbacks.actualizarAccionesPosibles(accionesDeshabilitadas);
        this.callbacks.setPartidaTerminada(); // Notificar a la UI que la partida terminó

        // Determinar ganador y perdedor
        const ganador = this.equipoPrimero.puntos >= this.limitePuntaje ? this.equipoPrimero : this.equipoSegundo;
        this.ganadorPartida = ganador;
        const perdedor = ganador === this.equipoPrimero ? this.equipoSegundo : this.equipoPrimero;

        // Mostrar mensajes de fin de partida
        this.callbacks.displayLog("=======================", 'public');
        this.callbacks.displayLog(`¡PARTIDA TERMINADA!`, 'public');
        this.callbacks.displayLog(`Ganador: ${ganador.jugador.nombre} (${ganador.puntos})`, 'public');
        this.callbacks.displayLog(`Perdedor: ${perdedor.jugador.nombre} (${perdedor.puntos})`, 'public');
        this.callbacks.displayLog("=======================", 'public');

    }
    /**
     * Delega el manejo de una carta jugada por el humano a la ronda actual.
     * @param carta El Naipe que el jugador humano seleccionó.
     */
    public handleHumanPlayCard(carta: Naipe): void {
        if (this.rondaActual && !this.partidaTerminada) {

            this.rondaActual.handleHumanPlayCard(carta);
        } else if (this.partidaTerminada) {
             console.warn("Intento de jugar carta con partida terminada.");
             this.callbacks.displayLog("La partida ya ha terminado.", 'public');
        } else {
            console.warn("Intento de jugar carta sin ronda activa.");
            this.callbacks.displayLog("Error: No hay una ronda activa para jugar.", 'debug');
        }
    }

    /**
     * Delega el manejo de un canto realizado por el humano a la ronda actual.
     * @param canto El Canto que el jugador humano seleccionó.
     */
    public handleHumanCanto(canto: Canto): void {
        if (this.rondaActual && !this.partidaTerminada) {
            this.rondaActual.handleHumanCanto(canto);
        } else if (this.partidaTerminada) {
             console.warn("Intento de cantar con partida terminada.");
             this.callbacks.displayLog("La partida ya ha terminado.", 'public');
        } else {
            console.warn("Intento de cantar sin ronda activa.");
            this.callbacks.displayLog("Error: No hay una ronda activa para cantar.", 'debug');
        }
    }
    public setLimitePuntaje(limite: number): void {
        this.limitePuntaje = Math.max(1, limite); // Evitar límites inválidos
        this.callbacks.displayLog(`Límite de puntaje cambiado a: ${this.limitePuntaje}`, 'public');
    }

    public setDebugMode(activado: boolean): void {
        this.debugMode = activado;
        this.callbacks.displayLog(`Modo Debug ${activado ? 'Activado' : 'Desactivado'}`, 'debug');
        // Propagar el modo debug a la ronda actual si existe
        if (this.rondaActual) {
            this.rondaActual.setDebugMode(activado);
        }
    }
    public getRondaActual(): Ronda | null {
        return this.rondaActual;
    }
    public getGanadorPartida(): Equipo | null {
        return this.ganadorPartida;
    }
}